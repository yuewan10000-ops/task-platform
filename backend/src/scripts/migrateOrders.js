// 执行订单相关表迁移脚本
require('dotenv/config');
const mysql = require('mysql2/promise');

function parseDatabaseUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  const config = parseDatabaseUrl(dbUrl);
  let connection;

  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    console.log('数据库连接成功！');

    // 检查 OrderSetting 表是否存在（不区分大小写）
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND LOWER(TABLE_NAME) IN ('ordersetting', 'orderrecord')
    `, [config.database]);

    const existingTables = tables.map(t => t.TABLE_NAME.toLowerCase());

    // 创建 OrderSetting 表
    if (!existingTables.includes('ordersetting')) {
      console.log('正在创建 OrderSetting 表...');
      await connection.query(`
        CREATE TABLE \`OrderSetting\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`userId\` INT NOT NULL,
          \`maxOrders\` INT NOT NULL DEFAULT 0,
          \`commissionRate\` DECIMAL(65,30) NOT NULL DEFAULT 0,
          \`status\` VARCHAR(191) NOT NULL DEFAULT 'enabled',
          \`description\` VARCHAR(191) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`OrderSetting_userId_idx\`(\`userId\`),
          CONSTRAINT \`OrderSetting_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ OrderSetting 表创建成功');
    } else {
      // 表已存在，检查并添加缺失的字段
      console.log('检测并添加 OrderSetting 新字段...');
      
      // 检查现有列（不区分大小写）
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND LOWER(TABLE_NAME) = 'ordersetting' 
        AND LOWER(COLUMN_NAME) IN ('maxorders', 'commissionrate')
      `, [config.database]);
      
      const existingColumns = columns.map(col => col.COLUMN_NAME.toLowerCase());
      
      // 添加 maxOrders 字段（如果不存在）
      if (!existingColumns.includes('maxorders')) {
        console.log('正在添加 maxOrders 字段...');
        await connection.query(`
          ALTER TABLE \`OrderSetting\` ADD COLUMN \`maxOrders\` INT NOT NULL DEFAULT 0
        `);
        console.log('✓ maxOrders 字段添加成功');
      }
      
      // 添加 commissionRate 字段（如果不存在）
      if (!existingColumns.includes('commissionrate')) {
        console.log('正在添加 commissionRate 字段...');
        await connection.query(`
          ALTER TABLE \`OrderSetting\` ADD COLUMN \`commissionRate\` DECIMAL(65,30) NOT NULL DEFAULT 0
        `);
        console.log('✓ commissionRate 字段添加成功');
      }
      
      if (existingColumns.includes('maxorders') && existingColumns.includes('commissionrate')) {
        console.log('所有字段已存在，无需添加');
      }
    }

    // 创建 OrderRecord 表
    if (!existingTables.includes('orderrecord')) {
      console.log('正在创建 OrderRecord 表...');
      await connection.query(`
        CREATE TABLE \`OrderRecord\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`userId\` INT NOT NULL,
          \`orderType\` VARCHAR(191) NOT NULL,
          \`amount\` DECIMAL(65,30) NOT NULL DEFAULT 0,
          \`status\` VARCHAR(191) NOT NULL,
          \`description\` VARCHAR(191) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`OrderRecord_userId_idx\`(\`userId\`),
          CONSTRAINT \`OrderRecord_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✓ OrderRecord 表创建成功');
    }

    console.log('\n✅ 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('表已存在，跳过创建');
    } else {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

migrate();

