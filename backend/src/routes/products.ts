import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(), // base64图片
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  image: z.string().optional(), // base64图片
  isActive: z.boolean().optional(),
});

// 获取所有启用的商品（A端使用）
router.get('/active', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// 获取所有商品（B端管理使用）
router.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// 创建商品
router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image || null,
        isActive: data.isActive !== false,
      },
    });
    
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// 更新商品
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    
    const data = updateSchema.parse(req.body);
    
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    
    res.json(product);
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    next(err);
  }
});

// 批量创建商品
const bulkCreateSchema = z.object({
  products: z.array(createSchema).min(1).max(100), // 每次最多100个
});

router.post('/bulk', async (req, res, next) => {
  try {
    const data = bulkCreateSchema.parse(req.body);
    
    // 使用事务批量创建
    const products = await prisma.$transaction(
      data.products.map((productData) =>
        prisma.product.create({
          data: {
            name: productData.name,
            description: productData.description,
            image: productData.image || null,
            isActive: productData.isActive !== false,
          },
        })
      )
    );
    
    res.status(201).json({ 
      message: `Successfully created ${products.length} products`,
      products 
    });
  } catch (err) {
    next(err);
  }
});

// 删除商品
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    
    await prisma.product.delete({
      where: { id },
    });
    
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    next(err);
  }
});

export default router;

