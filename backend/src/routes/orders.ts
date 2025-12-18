import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createOrderSettingSchema = z.object({
  userId: z.number().int().positive(),
  maxOrders: z.number().int().nonnegative(),
  commissionRate: z.number().nonnegative(), // 比例，1 = 100%
  orderType: z.string().min(1).default('pre-order'),
  amount: z.number().nonnegative().default(0),
  description: z.string().optional(),
});

const createOrderRecordSchema = z.object({
  userId: z.number().int().positive(),
  orderType: z.string().min(1),
  amount: z.number().nonnegative(),
  status: z.string().default('pending'),
  description: z.string().optional(),
  // 可选佣金（用于打针订单固定佣金）；如果不传则按佣金比例计算
  commission: z.number().nonnegative().optional(),
});

// 获取用户的做单设置（最新一条）
router.get('/settings/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const settings = await prisma.orderSetting.findMany({
      where: { 
        userId,
        status: 'enabled', // 只返回已启用的设置
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    res.json(settings.length ? settings[0] : null);
  } catch (err) {
    next(err);
  }
});

// 获取用户的做单设置历史（全部）
router.get('/settings/:userId/history', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const settings = await prisma.orderSetting.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// 创建做单设置
router.post('/settings', async (req, res, next) => {
  try {
    const data = createOrderSettingSchema.parse(req.body);
    
    const setting = await prisma.orderSetting.create({
      data: {
        userId: data.userId,
        maxOrders: data.maxOrders,
        commissionRate: data.commissionRate,
        orderType: data.orderType || 'pre-order',
        amount: data.amount ?? 0,
        description: data.description,
        status: 'enabled',
      },
    });

    res.status(201).json(setting);
  } catch (err) {
    next(err);
  }
});

// 更新做单设置
router.put('/settings/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid setting ID' });
    }

    const data = createOrderSettingSchema.partial().parse(req.body);
    
    const setting = await prisma.orderSetting.update({
      where: { id },
      data: {
        ...(data.maxOrders !== undefined && { maxOrders: data.maxOrders }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    res.json(setting);
  } catch (err) {
    next(err);
  }
});

// 删除做单设置
router.delete('/settings/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid setting ID' });
    }

    await prisma.orderSetting.delete({
      where: { id },
    });

    res.json({ message: '设置已删除' });
  } catch (err) {
    next(err);
  }
});

// 获取用户的做单记录列表
router.get('/records/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const records = await prisma.orderRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// 创建做单记录
router.post('/records', async (req, res, next) => {
  try {
    const data = createOrderRecordSchema.parse(req.body);

    // 计算佣金：优先使用请求中的 commission，否则按比例计算
    let commissionAmount = data.commission ?? 0;
    if (commissionAmount === 0) {
      // 获取全局佣金比例
      const activeCommissionRate = await prisma.commissionRate.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
      const globalRate = activeCommissionRate ? Number(activeCommissionRate.rate) : 0;

      // 获取用户个人佣金比例（最新 OrderSetting）
      const latestSetting = await prisma.orderSetting.findFirst({
        where: { userId: data.userId },
        orderBy: { createdAt: 'desc' },
        select: { commissionRate: true },
      });
      const userRate = latestSetting ? Number(latestSetting.commissionRate) : 0;

      const finalRate = globalRate + userRate;
      commissionAmount = Number(data.amount) * finalRate;
    }

    // 使用事务：创建订单记录，若已完成则把佣金返还到余额
    const [record] = await prisma.$transaction([
      prisma.orderRecord.create({
        data: {
          userId: data.userId,
          orderType: data.orderType,
          amount: data.amount,
          status: data.status,
          description: data.description,
        },
      }),
      ...(data.status === 'completed' && commissionAmount > 0
        ? [
            prisma.user.update({
              where: { id: data.userId },
              data: {
                balance: {
                  increment: commissionAmount,
                },
              },
            }),
          ]
        : []),
    ]);

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export default router;

