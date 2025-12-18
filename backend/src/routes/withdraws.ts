import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { getCurrentUser, AuthRequest } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  userId: z.number().int().positive(),
  // 最低取款金额 10
  amount: z.number().min(10, 'Minimum withdrawal amount is 10'),
  walletAddress: z.string().trim().optional(),
  payPassword: z.string().min(1, 'Payment password is required'),
});

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().optional(),
});

// A 端提交取款申请
router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    // 获取用户并校验支付密码
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const ok = await bcrypt.compare(data.payPassword, user.payPasswordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Payment password is incorrect' });
    }

    const currentBalance = Number(user.balance);
    const amount = Number(data.amount);
    if (currentBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance for withdraw' });
    }

    // 在事务中扣减余额并创建取款申请
    const [updatedUser, withdraw] = await prisma.$transaction([
      prisma.user.update({
        where: { id: data.userId },
        data: {
          balance: currentBalance - amount,
          walletAddress: data.walletAddress ?? user.walletAddress,
        },
      }),
      prisma.withdrawRequest.create({
        data: {
          userId: data.userId,
          amount: amount,
          status: 'pending',
          walletAddress: data.walletAddress ?? user.walletAddress,
        },
      }),
    ]);

    res.json({
      withdraw,
      user: { id: updatedUser.id, balance: Number(updatedUser.balance) },
    });
  } catch (err) {
    next(err);
  }
});

// B 端查看取款列表
router.get('/', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    // 构建查询条件
    let whereCondition: any = {};
    
    // 如果是子用户，能看到自己管理的用户的所有取款记录
    if (req.currentUser?.isSubUser && req.currentUser.id) {
      const subUserId = req.currentUser.id;
      
      // 先获取该子用户管理的所有用户ID
      const managedUsers = await prisma.user.findMany({
        where: { managedBySubUserId: subUserId },
        select: { id: true },
      });
      const managedUserIds = managedUsers.map(u => u.id);
      
      // 子用户能看到：自己处理的 或 自己管理的用户的取款记录
      whereCondition = {
        OR: [
          { processedBySubUserId: subUserId },
          { userId: { in: managedUserIds } },
        ],
      };
    }
    
    const list = await prisma.withdrawRequest.findMany({
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
            walletAddress: true,
          },
        },
      },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// A 端获取用户的取款记录
router.get('/user/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const list = await prisma.withdrawRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        note: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// B 端审核通过 / 驳回
router.put('/:id/status', getCurrentUser, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const data = updateSchema.parse(req.body);

    const withdraw = await prisma.withdrawRequest.findUnique({
      where: { id },
    });

    if (!withdraw) {
      return res.status(404).json({ message: 'Withdraw request not found' });
    }

    // 只能审核 pending 状态
    if (withdraw.status !== 'pending') {
      return res.status(400).json({ message: 'Withdraw request already processed' });
    }

    let updated;
    const updateData: any = {
      status: data.status,
      note: data.note,
    };
    
    // 如果是子用户处理的，记录处理者，并自动将会员分配给该子用户
    if (req.currentUser?.isSubUser && req.currentUser.id) {
      updateData.processedBySubUserId = req.currentUser.id;
      
      // 自动将会员分配给该子用户管理
      await prisma.user.update({
        where: { id: withdraw.userId },
        data: { managedBySubUserId: req.currentUser.id },
      });
    }
    
    // 如果是驳回，则把之前扣掉的金额退回给用户
    if (data.status === 'rejected') {
      const amount = Number(withdraw.amount);
      updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: withdraw.userId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        const wr = await tx.withdrawRequest.update({
          where: { id },
          data: updateData,
        });

        return { withdraw: wr, user };
      });
    } else {
      // 通过时只更新状态/备注
      const wr = await prisma.withdrawRequest.update({
        where: { id },
        data: updateData,
      });
      updated = { withdraw: wr };
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;


