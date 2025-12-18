import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createSchema = z.object({
  userId: z.number().int().positive(),
  orderSettingId: z.number().int().positive().optional(),
  commissionRate: z.number().nonnegative(), // 订单佣金
  injectionAmount: z.number().nonnegative(), // 打针全额
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  orderSettingId: z.number().int().positive().optional(),
  commissionRate: z.number().nonnegative().optional(),
  injectionAmount: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

// 获取用户的所有打针计划
router.get('/user/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // 获取打针计划
    const plans = await prisma.injectionPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 获取最新 OrderSetting，用于计算当前订单号
    const latestSetting = await prisma.orderSetting.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    let currentOrderNumber: number | null = null;
    if (latestSetting) {
      const settingCreatedAt = new Date(latestSetting.createdAt).getTime();
      const records = await prisma.orderRecord.findMany({
        where: { userId, status: 'completed' },
        select: { createdAt: true },
      });
      let completedInLatest = 0;
      for (const r of records) {
        const recordCreatedAt = new Date(r.createdAt).getTime();
        if (recordCreatedAt >= settingCreatedAt) {
          completedInLatest += 1;
        }
      }
      currentOrderNumber = completedInLatest + 1;
    }

    // 为计划标记状态：完成/未完成/未知
    const plansWithStatus = plans.map(plan => {
      let status: 'completed' | 'pending' | null = null;
      if (currentOrderNumber !== null) {
        if (plan.orderSettingId) {
          status = currentOrderNumber > plan.orderSettingId ? 'completed' : 'pending';
        } else {
          // 通用计划：如果已经完成至少1单，则视为已遇到
          status = currentOrderNumber > 1 ? 'completed' : 'pending';
        }
      }
      return {
        ...plan,
        status,
      };
    });

    res.json(plansWithStatus);
  } catch (err) {
    next(err);
  }
});

// 创建打针计划
router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    const plan = await prisma.injectionPlan.create({
      data: {
        userId: data.userId,
        orderSettingId: data.orderSettingId || null,
        commissionRate: data.commissionRate,
        injectionAmount: data.injectionAmount,
        isActive: data.isActive !== false,
      },
    });

    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

// 更新打针计划
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const data = updateSchema.parse(req.body);

    const plan = await prisma.injectionPlan.update({
      where: { id },
      data,
    });

    res.json(plan);
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Injection plan not found' });
    }
    next(err);
  }
});

// 删除打针计划
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    await prisma.injectionPlan.delete({
      where: { id },
    });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Injection plan not found' });
    }
    next(err);
  }
});

export default router;

