import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const updateSchema = z.object({
  trc20Address: z.string().trim().optional(),
  trxAddress: z.string().trim().optional(),
});

const ensureConfig = async () => {
  const existed = await prisma.rechargeConfig.findFirst();
  if (existed) return existed;
  return prisma.rechargeConfig.create({ data: {} });
};

router.get('/', async (_req, res, next) => {
  try {
    const config = await ensureConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const existed = await ensureConfig();
    const updated = await prisma.rechargeConfig.update({
      where: { id: existed.id },
      data: {
        trc20Address: data.trc20Address ?? existed.trc20Address,
        trxAddress: data.trxAddress ?? existed.trxAddress,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

