// 确保在导入 PrismaClient 之前加载环境变量
import 'dotenv/config';

// 验证环境变量
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.');
}

// 导入 Prisma 客户端和适配器
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// 创建适配器（PrismaMariaDb 可以直接接受连接字符串）
const adapter = new PrismaMariaDb(databaseUrl);

// 创建 PrismaClient 实例
// Prisma 7 要求使用 adapter 或 accelerateUrl
export const prisma = new PrismaClient({ adapter });

// Graceful shutdown helper
export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

