// 执行钱包地址字段迁移脚本
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

    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'User' AND COLUMN_NAME = 'walletAddress'
    `, [config.database]);

    if (columns.length > 0) {
      console.log('字段已存在，跳过迁移');
      return;
    }

    // 添加 walletAddress 字段
    console.log('正在添加 walletAddress 字段...');
    await connection.query(`
      ALTER TABLE \`User\` ADD COLUMN \`walletAddress\` VARCHAR(191) NULL
    `);
    console.log('✓ walletAddress 字段添加成功');

    console.log('\n✅ 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('字段已存在，无需重复添加');
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

