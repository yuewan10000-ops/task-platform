import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { getCurrentUser, AuthRequest } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().nonnegative(), // 允许0，因为可能只上传凭证
  voucherImage: z.string().optional(), // base64图片
});

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().optional(),
});

router.post('/', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    
    // 准备创建数据
    const createData: any = {
      userId: data.userId,
      amount: data.amount,
      status: 'pending',
    };
    
    // 如果是子用户创建的，记录创建者，并自动将会员分配给该子用户
    if (req.currentUser?.isSubUser && req.currentUser.id) {
      createData.createdBySubUserId = req.currentUser.id;
      
      // 自动将会员分配给该子用户管理
      await prisma.user.update({
        where: { id: data.userId },
        data: { managedBySubUserId: req.currentUser.id },
      });
    }
    
    // 只有当 voucherImage 存在且不为空时才添加
    if (data.voucherImage && data.voucherImage.trim()) {
      createData.voucherImage = data.voucherImage;
    }
    
    const recharge = await prisma.rechargeRequest.create({
      data: createData,
    });
    res.json(recharge);
  } catch (err: any) {
    console.error('Error creating recharge request:', err);
    // 提供更详细的错误信息
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Duplicate entry' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    next(err);
  }
});

router.get('/', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    // 构建查询条件
    let whereCondition: any = {};
    
    // 如果是子用户，能看到自己管理的用户的所有充值记录
    if (req.currentUser?.isSubUser && req.currentUser.id) {
      const subUserId = req.currentUser.id;
      
      // 先获取该子用户管理的所有用户ID
      const managedUsers = await prisma.user.findMany({
        where: { managedBySubUserId: subUserId },
        select: { id: true },
      });
      const managedUserIds = managedUsers.map(u => u.id);
      
      // 子用户能看到：自己创建的 或 自己管理的用户的充值记录
      whereCondition = {
        OR: [
          { createdBySubUserId: subUserId },
          { userId: { in: managedUserIds } },
        ],
      };
    }
    
    const list = await prisma.rechargeRequest.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            account: true,
            name: true,
            inviteCode: true,
            myInviteCode: true,
          },
        },
      },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const data = updateSchema.parse(req.body);
    
    // 获取充值请求信息
    const recharge = await prisma.rechargeRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    
    if (!recharge) {
      return res.status(404).json({ message: 'Recharge request not found' });
    }
    
    // 如果状态是 pending，不允许重复审核
    if (recharge.status !== 'pending') {
      return res.status(400).json({ message: 'Recharge request already processed' });
    }
    
    // 更新充值请求状态
    const updateData: any = {
      status: data.status,
      note: data.note,
    };
    
    // 如果是子用户处理的，记录处理者（如果之前没有记录创建者，则记录为创建者）
    if (req.currentUser?.isSubUser && req.currentUser.id) {
      // 如果之前没有创建者，则记录为创建者
      if (!recharge.createdBySubUserId) {
        updateData.createdBySubUserId = req.currentUser.id;
      }
    }
    
    const updated = await prisma.rechargeRequest.update({
      where: { id },
      data: updateData,
    });
    
    // 如果审核通过，更新用户余额
    if (data.status === 'approved') {
      await prisma.user.update({
        where: { id: recharge.userId },
        data: {
          balance: {
            increment: recharge.amount,
          },
        },
      });
    }
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// 获取待审核数量
router.get('/pending/count', async (_req, res, next) => {
  try {
    const count = await prisma.rechargeRequest.count({
      where: { status: 'pending' },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// A 端获取用户的充值记录
router.get('/user/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const list = await prisma.rechargeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

export default router;

