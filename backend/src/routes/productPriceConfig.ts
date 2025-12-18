import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const updateSchema = z.object({
  minRate: z.number().min(0.01).max(1), // 0.01-1之间，表示1%-100%
  maxRate: z.number().min(0.01).max(1), // 0.01-1之间，表示1%-100%
}).refine((data) => data.minRate <= data.maxRate, {
  message: '最小比例不能大于最大比例',
  path: ['minRate'],
});

// 确保配置存在
const ensureConfig = async () => {
  const existed = await prisma.productPriceConfig.findFirst();
  if (existed) return existed;
  return prisma.productPriceConfig.create({
    data: {
      minRate: 0.29,
      maxRate: 0.60,
    },
  });
};

// 获取价格比例配置（A端使用）
router.get('/', async (_req, res, next) => {
  try {
    const config = await ensureConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// 更新价格比例配置（B端管理）
router.put('/', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const existed = await ensureConfig();
    const updated = await prisma.productPriceConfig.update({
      where: { id: existed.id },
      data: {
        minRate: data.minRate,
        maxRate: data.maxRate,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

