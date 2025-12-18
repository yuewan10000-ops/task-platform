import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { getCurrentUser, AuthRequest } from '../middleware/auth';

const router = Router();

// 用户创建通过 /auth/register 路由完成

// 获取所有注册用户列表（用于B端后台展示）
router.get('/', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
    
    // 构建查询条件
    const whereCondition: any = {
      account: { not: adminAccount }, // 隐藏后台固定账号
      isSubUser: false, // 只返回业务用户，不返回子用户
    };

    // 如果是子用户，只能看到自己管理的会员
    if (req.currentUser?.isSubUser && req.currentUser.id) {
      whereCondition.managedBySubUserId = req.currentUser.id;
    }
    
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        account: true,
        email: true,
        name: true,
        balance: true,          // 账户余额
        inviteCode: true,      // 注册时使用的邀请码（上级的邀请码）
        myInviteCode: true,    // 用户自己的邀请码
        parentId: true,        // 上级用户ID
        walletAddress: true,   // 钱包地址
        remark: true,          // 备注（仅B端使用）
        isOnline: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // 不返回密码hash等敏感信息
      },
    });
    
    // 获取所有上级用户信息（用于关联）
    const parentIds = users.filter(u => u.parentId).map(u => u.parentId!);
    const parents = parentIds.length > 0 
      ? await prisma.user.findMany({
          where: { id: { in: parentIds } },
          select: {
            id: true,
            account: true,
            name: true,        // 添加name字段
            myInviteCode: true,
          },
        })
      : [];
    const parentMap = new Map(parents.map(p => [p.id, p]));

    // 获取最新做单设置（用于显示当前设置）
    const orderSettings = await prisma.orderSetting.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        maxOrders: true,
        commissionRate: true,
        createdAt: true, // 添加createdAt用于计算完成订单数
      },
    });
    const settingMap = new Map<number, { maxOrders: number; commissionRate: any; createdAt: Date }>();
    for (const s of orderSettings) {
      if (!settingMap.has(s.userId)) {
        settingMap.set(s.userId, { maxOrders: s.maxOrders, commissionRate: s.commissionRate, createdAt: s.createdAt });
      }
    }

    // 计算累计开启订单总数（所有 OrderSetting 的 maxOrders 总和）
    const userIds = users.map((u) => u.id);
    const allSettings = userIds.length
      ? await prisma.orderSetting.findMany({
          where: { userId: { in: userIds } },
          select: {
            userId: true,
            maxOrders: true,
          },
        })
      : [];
    const totalOpenedMap = new Map<number, number>();
    for (const s of allSettings) {
      const current = totalOpenedMap.get(s.userId) || 0;
      totalOpenedMap.set(s.userId, current + Number(s.maxOrders));
    }

    // 获取B端统一设置的佣金比例（全局基础佣金）
    const activeCommissionRate = await prisma.commissionRate.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    const globalCommissionRate = activeCommissionRate 
      ? Number(activeCommissionRate.rate) 
      : 0;

    // 获取每个用户的最新OrderSetting（用于获取用户个人佣金比例）
    // 由于Prisma不支持distinct，我们需要获取所有设置，然后手动筛选每个用户最新的
    const allUserSettings = userIds.length
      ? await prisma.orderSetting.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: 'desc' },
          select: { userId: true, commissionRate: true },
        })
      : [];
    const userCommissionRateMap = new Map<number, number>();
    for (const s of allUserSettings) {
      // 只保留每个用户最新的设置（因为已经按createdAt倒序排列）
      if (!userCommissionRateMap.has(s.userId)) {
        userCommissionRateMap.set(s.userId, Number(s.commissionRate));
      }
    }

    // 获取做单记录统计（完成和未完成数量，以及总佣金）
    // 需要包含createdAt，用于判断订单是否属于最新一次开启的订单
    const records = userIds.length
      ? await prisma.orderRecord.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, status: true, amount: true, createdAt: true },
        })
      : [];
    
    // 先计算总佣金（所有历史完成订单的佣金总和）
    const totalCommissionMap = new Map<number, number>();
    for (const r of records) {
      if (r.status === 'completed') {
        const current = totalCommissionMap.get(r.userId) || 0;
        // 计算佣金：订单金额 × (全局佣金比例 + 用户个人佣金比例)
        const userRate = userCommissionRateMap.get(r.userId) || 0;
        const finalRate = globalCommissionRate + userRate;
        totalCommissionMap.set(r.userId, current + Number(r.amount) * finalRate);
      }
    }
    
    // 合并统计：
    // total            -> 最近一次开启的订单数量（单次开启）
    // cumulative       -> 累计开启订单数量（所有开启记录 maxOrders 之和）
    // completed        -> 最新一次开启的订单中，已完成的订单数（只统计该OrderSetting创建之后完成的）
    // pending          -> 未完成订单数 = 全部订单数 - 完成订单数
    // totalCommission  -> 总佣金金额（所有历史完成订单的佣金总和）
    const statsMap = new Map<number, { total: number; cumulative: number; completed: number; pending: number; totalCommission: number }>();
    for (const userId of userIds) {
      const totalOpened = totalOpenedMap.get(userId) || 0; // 累计
      const latestSetting = settingMap.get(userId);
      const latestOpened = latestSetting ? latestSetting.maxOrders : 0; // 单次
      
      // 只统计最新一次开启的订单中完成的订单数
      let completedInLatest = 0;
      if (latestSetting) {
        const settingCreatedAt = new Date(latestSetting.createdAt).getTime();
        for (const r of records) {
          if (r.userId === userId && r.status === 'completed') {
            const recordCreatedAt = new Date(r.createdAt).getTime();
            // 只统计在该OrderSetting创建之后完成的订单
            if (recordCreatedAt >= settingCreatedAt) {
              completedInLatest += 1;
            }
          }
        }
        // 完成订单数不能超过maxOrders
        completedInLatest = Math.min(completedInLatest, latestOpened);
      }
      
      const pending = Math.max(0, latestOpened - completedInLatest); // 未完成订单数 = 全部订单数 - 完成订单数
      statsMap.set(userId, {
        total: latestOpened, // 全部订单数（单次开启数量）
        cumulative: totalOpened, // 累计开启订单数量
        completed: completedInLatest, // 已完成订单数（只统计最新一次开启的）
        pending: pending, // 未完成订单数
        totalCommission: totalCommissionMap.get(userId) || 0, // 总佣金金额（所有历史完成订单的佣金总和）
      });
    }
    
    // 获取已审核通过的充值总额
    const approvedRecharges = userIds.length
      ? await prisma.rechargeRequest.findMany({
          where: {
            userId: { in: userIds },
            status: 'approved',
          },
          select: {
            userId: true,
            amount: true,
          },
        })
      : [];
    const rechargeMap = new Map<number, number>();
    for (const r of approvedRecharges) {
      const current = rechargeMap.get(r.userId) || 0;
      rechargeMap.set(r.userId, current + Number(r.amount));
    }
    console.log(`[充值统计] 已审核通过的充值记录数: ${approvedRecharges.length}`);
    if (approvedRecharges.length > 0) {
      console.log(`[充值统计] 充值记录详情:`, approvedRecharges.map(r => ({ userId: r.userId, amount: Number(r.amount) })));
    }
    console.log(`[充值统计] rechargeMap:`, Array.from(rechargeMap.entries()));
    
    // 获取所有用户的打针计划（包括未激活的，用于调试）
    const allInjectionPlans = userIds.length
      ? await prisma.injectionPlan.findMany({
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            orderSettingId: true,
            injectionAmount: true,
            isActive: true,
          },
        })
      : [];
    
    // 只使用激活的打针计划
    const injectionPlans = allInjectionPlans.filter(plan => plan.isActive);
    
    console.log(`[打针计划] 总计划数: ${allInjectionPlans.length}, 激活计划数: ${injectionPlans.length}`);
    if (allInjectionPlans.length > 0) {
      console.log(`[打针计划] 计划详情:`, allInjectionPlans.map(p => ({
        userId: p.userId,
        orderSettingId: p.orderSettingId,
        injectionAmount: Number(p.injectionAmount),
        isActive: p.isActive,
      })));
    }
    
    // 计算每个用户的差额（打针订单需要补充的金额）
    // 差额 = 打针金额 - 已审核通过的充值金额
    const differenceMap = new Map<number, number | null>();
    console.log(`[差额计算开始] 用户数量: ${userIds.length}, 打针计划数量: ${injectionPlans.length}`);
    for (const userId of userIds) {
      const latestSetting = settingMap.get(userId);
      if (!latestSetting) {
        differenceMap.set(userId, null);
        continue;
      }
      
      // 计算当前订单序号（基于最新OrderSetting创建后的已完成订单数 + 1）
      const settingCreatedAt = new Date(latestSetting.createdAt).getTime();
      let completedInLatest = 0;
      for (const r of records) {
        if (r.userId === userId && r.status === 'completed') {
          const recordCreatedAt = new Date(r.createdAt).getTime();
          if (recordCreatedAt >= settingCreatedAt) {
            completedInLatest += 1;
          }
        }
      }
      const currentOrderNumber = completedInLatest + 1; // 下一个订单的序号
      
      // 查找该用户的所有打针计划
      const userPlans = injectionPlans.filter(plan => plan.userId === userId);
      console.log(`[差额计算] 用户ID: ${userId}, 当前订单号: ${currentOrderNumber}, 该用户的打针计划数: ${userPlans.length}`);
      
      // 查找匹配的打针计划
      const matchingPlan = userPlans.find(plan => {
        // 如果orderSettingId为空或null，表示应用到所有订单
        if (!plan.orderSettingId) {
          console.log(`[差额计算] 用户ID: ${userId}, 找到通用打针计划 (orderSettingId为null)`);
          return true;
        }
        // 如果orderSettingId等于当前订单号，则匹配
        if (plan.orderSettingId === currentOrderNumber) {
          console.log(`[差额计算] 用户ID: ${userId}, 找到匹配的打针计划 (orderSettingId: ${plan.orderSettingId} === 当前订单号: ${currentOrderNumber})`);
          return true;
        }
        return false;
      });
      
      // 如果有匹配的打针计划，计算差额
      if (matchingPlan) {
        const injectionAmount = Number(matchingPlan.injectionAmount);
        // 获取该用户已审核通过的充值总额
        const totalRecharged = rechargeMap.get(userId) || 0;
        // 差额 = 打针金额 - 已充值金额
        const difference = Math.max(0, injectionAmount - totalRecharged);
        console.log(`[差额计算] 用户ID: ${userId}, 打针金额: ${injectionAmount}, 已充值: ${totalRecharged}, 差额: ${difference}`);
        differenceMap.set(userId, difference);
      } else {
        console.log(`[差额计算] 用户ID: ${userId}, 未找到匹配的打针计划`);
        differenceMap.set(userId, null);
      }
    }
    
    // 为每个用户添加上级、设置、统计、已充值总额、差额
    const usersWithExtras = users.map(user => {
      const parent = user.parentId ? parentMap.get(user.parentId) || null : null;
      const setting = settingMap.get(user.id) || null;
      const stats = statsMap.get(user.id) || { total: 0, completed: 0, pending: 0, totalCommission: 0 };
      const totalRecharged = rechargeMap.get(user.id) || 0;
      const difference = differenceMap.get(user.id) ?? null;
      return {
        ...user,
        parent,
        orderSetting: setting,
        orderStats: stats,
        totalRecharged, // 已充值总额
        difference, // 打针订单差额
      };
    });
    
    // 手动排序：从下到上排列（倒序），在线用户在前，然后按最后登录时间排序；离线用户按创建时间排序
    usersWithExtras.sort((a, b) => {
      // 首先按在线状态排序（在线在前）
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1;
      }
      
      // 如果都是在线用户，按最后登录时间排序（最新的在前）
      if (a.isOnline && b.isOnline) {
        if (a.lastLoginAt && b.lastLoginAt) {
          return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
        }
        if (a.lastLoginAt) return -1;
        if (b.lastLoginAt) return 1;
      }
      
      // 如果都是离线用户，按创建时间倒序排序（最新的在下面，旧的在上面）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    res.json(usersWithExtras);
  } catch (err) {
    next(err);
  }
});

// 获取单个用户详情
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        account: true,
        email: true,
        name: true,
        inviteCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// 获取用户团队信息：当前用户 + 上级 + 下级列表
router.get('/:id/team', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        account: true,
        name: true,
        myInviteCode: true,
        parentId: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 上级
    let parent = null as null | {
      id: number;
      account: string | null;
      name: string | null;
      myInviteCode: string | null;
    };
    if (user.parentId) {
      parent = await prisma.user.findUnique({
        where: { id: user.parentId },
        select: {
          id: true,
          account: true,
          name: true,
          myInviteCode: true,
        },
      });
    }

    // 下级列表
    const children = await prisma.user.findMany({
      where: { parentId: id },
      select: {
        id: true,
        account: true,
        name: true,
        myInviteCode: true,
      },
      orderBy: { id: 'asc' },
    });

    res.json({
      user,
      parent,
      children,
    });
  } catch (err) {
    next(err);
  }
});

// 更新用户登录密码 / 支付密码（管理员操作）
router.put('/:id/password', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const schema = z.object({
      loginPassword: z.string().min(1).optional(),
      payPassword: z.string().min(1).optional(),
    });
    const data = schema.parse(req.body);
    if (!data.loginPassword && !data.payPassword) {
      return res.status(400).json({ error: 'No password provided' });
    }

    const payload: any = {};
    if (data.loginPassword) {
      const hash = await bcrypt.hash(data.loginPassword, 10);
      payload.loginPasswordHash = hash;
    }
    if (data.payPassword) {
      const hash = await bcrypt.hash(data.payPassword, 10);
      payload.payPasswordHash = hash;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: payload,
      select: { id: true },
    });

    res.json({ id: updated.id });
  } catch (err) {
    next(err);
  }
});

// 用户创建通过 /auth/register 路由完成，此处不再提供 POST / 接口

// 更新用户备注
router.put('/:id/remark', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const { remark } = req.body;
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        remark: remark || null,
      },
      select: {
        id: true,
        remark: true,
      },
    });
    
    res.json(user);
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(err);
  }
});

// 将会员分配给子用户管理
router.put('/:id/assign-sub-user', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // 只有admin可以分配会员
    if (req.currentUser?.isSubUser) {
      return res.status(403).json({ error: 'Only admin can assign members' });
    }
    
    const { subUserId } = req.body;
    
    // 如果subUserId为null或0，表示取消分配
    const updateData: any = {
      managedBySubUserId: subUserId && subUserId > 0 ? subUserId : null,
    };
    
    // 验证子用户是否存在（如果提供了subUserId）
    if (subUserId && subUserId > 0) {
      const subUser = await prisma.user.findUnique({
        where: { id: subUserId, isSubUser: true },
        select: { id: true },
      });
      if (!subUser) {
        return res.status(404).json({ error: 'Sub user not found' });
      }
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        managedBySubUserId: true,
      },
    });
    
    res.json(user);
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(err);
  }
});

// 删除用户（级联删除相关记录）
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 使用事务删除用户及其所有关联数据
    await prisma.$transaction(async (tx) => {
      // 删除订单记录
      await tx.orderRecord.deleteMany({
        where: { userId: id },
      });

      // 删除订单设置
      await tx.orderSetting.deleteMany({
        where: { userId: id },
      });

      // 删除充值请求
      await tx.rechargeRequest.deleteMany({
        where: { userId: id },
      });

      // 删除取款请求
      await tx.withdrawRequest.deleteMany({
        where: { userId: id },
      });

      // 删除打针计划
      await tx.injectionPlan.deleteMany({
        where: { userId: id },
      });

      // 更新子用户的parentId为null（解除父子关系）
      await tx.user.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });

      // 最后删除用户本身
      await tx.user.delete({
        where: { id },
      });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    next(err);
  }
});

export default router;

