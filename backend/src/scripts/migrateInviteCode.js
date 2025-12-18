// 执行邀请码和上级关系迁移脚本
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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'User' 
      AND COLUMN_NAME IN ('myInviteCode', 'parentId')
    `, [config.database]);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // 添加 myInviteCode 字段
    if (!existingColumns.includes('myInviteCode')) {
      console.log('正在添加 myInviteCode 字段...');
      await connection.query(`
        ALTER TABLE \`User\` ADD COLUMN \`myInviteCode\` VARCHAR(191) NULL
      `);
      console.log('✓ myInviteCode 字段添加成功');
      
      // 为现有用户生成邀请码
      console.log('正在为现有用户生成邀请码...');
      const [users] = await connection.query('SELECT id FROM `User` WHERE `myInviteCode` IS NULL');
      
      for (const user of users) {
        // 生成6位随机邀请码（仅字母）
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // 仅使用大写字母
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // 检查是否唯一
        const [exists] = await connection.query(
          'SELECT id FROM `User` WHERE `myInviteCode` = ?',
          [code]
        );
        
        if (exists.length === 0) {
          await connection.query(
            'UPDATE `User` SET `myInviteCode` = ? WHERE id = ?',
            [code, user.id]
          );
        }
      }
      
      // 设置为唯一约束
      await connection.query(`
        ALTER TABLE \`User\` ADD UNIQUE INDEX \`User_myInviteCode_key\`(\`myInviteCode\`)
      `);
      console.log('✓ 已为现有用户生成邀请码并设置唯一约束');
    }

    // 添加 parentId 字段
    if (!existingColumns.includes('parentId')) {
      console.log('正在添加 parentId 字段...');
      await connection.query(`
        ALTER TABLE \`User\` ADD COLUMN \`parentId\` INT NULL
      `);
      console.log('✓ parentId 字段添加成功');
      
      // 添加外键约束（可选，如果数据库支持）
      try {
        await connection.query(`
          ALTER TABLE \`User\` 
          ADD CONSTRAINT \`User_parentId_fkey\` 
          FOREIGN KEY (\`parentId\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log('✓ 外键约束添加成功');
      } catch (error) {
        console.log('⚠ 外键约束添加失败（可能已存在或数据库不支持）:', error.message);
      }
    }

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

