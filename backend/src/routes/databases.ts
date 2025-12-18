import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const dbNamePattern = /^[a-zA-Z0-9_]+$/;

// 列出当前用户可见的数据库名
router.get('/', async (_req, res, next) => {
  try {
    // MySQL SHOW DATABASES 返回字段名为 "Database"
    const rows = await prisma.$queryRaw<Array<{ Database: string }>>`SHOW DATABASES`;
    res.json(rows.map((r) => r.Database));
  } catch (err) {
    next(err);
  }
});

// 列出指定数据库的表
router.get('/:db/tables', async (req, res, next) => {
  try {
    const { db } = req.params;
    if (!dbNamePattern.test(db)) {
      return res.status(400).json({ message: 'invalid database name' });
    }
    // MySQL SHOW TABLES FROM db; 列名格式为 `Tables_in_<db>`
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`SHOW TABLES FROM \`${db}\``);
    const tables = rows.map((r) => r[Object.keys(r)[0]]);
    res.json(tables);
  } catch (err) {
    next(err);
  }
});

export default router;

