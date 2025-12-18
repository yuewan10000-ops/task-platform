import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();

// 获取当前用户信息（余额、佣金等）
router.get('/me', async (req, res, next) => {
  try {
    // 从请求头或查询参数获取用户ID（实际应该从token解析）
    // 这里暂时从查询参数获取，后续可以改为从JWT token解析
    const userId = parseInt(req.query.userId as string);
    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        account: true,
        balance: true,
        walletAddress: true,
        myInviteCode: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取B端统一设置的佣金比例（全局基础佣金）
    const activeCommissionRate = await prisma.commissionRate.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    const globalCommissionRate = activeCommissionRate 
      ? Number(activeCommissionRate.rate) 
      : 0;

    // 获取用户个人的佣金比例（从最新的OrderSetting）
    const latestOrderSetting = await prisma.orderSetting.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { commissionRate: true },
    });
    const userCommissionRate = latestOrderSetting 
      ? Number(latestOrderSetting.commissionRate) 
      : 0;

    // 最终佣金比例 = 全局佣金比例 + 用户个人佣金比例
    const commissionRate = globalCommissionRate + userCommissionRate;

    // 获取所有完成的订单（含描述，用于读取实际佣金）
    const allCompletedRecords = await prisma.orderRecord.findMany({
      where: {
        userId,
        status: 'completed',
      },
      select: {
        amount: true,
        description: true,
        createdAt: true,
      },
    });

    // 解析描述中的佣金字段，如果没有则按比例计算
    const parseCommission = (desc: string | null | undefined): number | null => {
      if (!desc) return null;
      try {
        const parsed = JSON.parse(desc);
        const val = parsed?.commission ?? parsed?.c;
        const num = Number(val);
        return Number.isFinite(num) ? num : null;
      } catch {
        return null;
      }
    };

    const calcCommission = (record: { amount: any; description?: string | null }) => {
      const parsed = parseCommission(record.description);
      if (parsed !== null) return parsed;
      return Number(record.amount) * commissionRate;
    };

    // Today's commission / Total commission：当前需求为累计展示，使用统一计算方式
    const totalCommission = allCompletedRecords.reduce((sum, record) => {
      return sum + calcCommission(record);
    }, 0);
    const todayCommission = totalCommission;

    res.json({
      user: {
        id: user.id,
        account: user.account,
        balance: Number(user.balance),
        myInviteCode: user.myInviteCode,
        walletAddress: user.walletAddress,
      },
      todayCommission: todayCommission,
      totalCommission: totalCommission,
    });
  } catch (err) {
    next(err);
  }
});

// 更新用户余额
router.put('/balance', async (req, res, next) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || typeof amount !== 'number') {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newBalance = Number(user.balance) + amount;
    
    // 检查余额是否足够（如果是扣除操作）
    if (newBalance < 0) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: newBalance,
      },
      select: {
        id: true,
        balance: true,
      },
    });

    res.json({
      id: updated.id,
      balance: Number(updated.balance),
    });
  } catch (err) {
    next(err);
  }
});

// 更新当前用户的钱包地址
router.put('/wallet', async (req, res, next) => {
  try {
    const schema = z.object({
      userId: z.number(),
      walletAddress: z.string().min(1),
    });
    const data = schema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: {
        walletAddress: data.walletAddress,
      },
      select: {
        id: true,
        walletAddress: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// 修改登录密码（需要验证旧密码）
router.put('/password/login', async (req, res, next) => {
  try {
    const schema = z.object({
      userId: z.number(),
      oldPassword: z.string().min(1, 'Old password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    });
    const data = schema.parse(req.body);

    // 获取用户并验证旧密码
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { loginPasswordHash: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(data.oldPassword, user.loginPasswordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid old password' });
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        loginPasswordHash: newPasswordHash,
      },
    });

    res.json({ message: 'Login password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// 修改支付密码（需要验证旧密码）
router.put('/password/payment', async (req, res, next) => {
  try {
    const schema = z.object({
      userId: z.number(),
      oldPassword: z.string().min(1, 'Old password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    });
    const data = schema.parse(req.body);

    // 获取用户并验证旧密码
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { payPasswordHash: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(data.oldPassword, user.payPasswordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid old password' });
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        payPasswordHash: newPasswordHash,
      },
    });

    res.json({ message: 'Payment password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

