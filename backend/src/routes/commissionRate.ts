import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const updateSchema = z.object({
  rate: z.number().nonnegative(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

// 获取当前启用的佣金比例
router.get('/active', async (_req, res, next) => {
  try {
    const rate = await prisma.commissionRate.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    
    res.json(rate || { rate: 0.1, isActive: true }); // 默认10%
  } catch (err) {
    next(err);
  }
});

// 获取所有佣金比例记录
router.get('/', async (_req, res, next) => {
  try {
    const rates = await prisma.commissionRate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// 创建或更新佣金比例
router.post('/', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    
    // 如果设置为启用，先禁用其他记录
    if (data.isActive !== false) {
      await prisma.commissionRate.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    
    const rate = await prisma.commissionRate.create({
      data: {
        rate: data.rate,
        isActive: data.isActive !== false,
        description: data.description,
      },
    });
    
    res.status(201).json(rate);
  } catch (err) {
    next(err);
  }
});

// 更新佣金比例
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    
    const data = updateSchema.parse(req.body);
    
    // 如果设置为启用，先禁用其他记录
    if (data.isActive !== false) {
      await prisma.commissionRate.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }
    
    const rate = await prisma.commissionRate.update({
      where: { id },
      data: {
        rate: data.rate,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        description: data.description,
      },
    });
    
    res.json(rate);
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Commission rate not found' });
    }
    next(err);
  }
});

// 删除佣金比例
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    
    await prisma.commissionRate.delete({
      where: { id },
    });
    
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Commission rate not found' });
    }
    next(err);
  }
});

export default router;

