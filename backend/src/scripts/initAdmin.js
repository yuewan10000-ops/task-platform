const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const ADMIN_ACCOUNT = 'admin';
const ADMIN_PASSWORD = 'Yc189189@';
const HASH_ROUNDS = 10;

// 从环境变量读取数据库连接
const DB_URL = process.env.DATABASE_URL || 'mysql://root:123456@localhost:3306/task_db';

// 解析数据库URL
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

async function initAdmin() {
  let connection;
  try {
    console.log('正在初始化管理员账号...');
    
    const dbConfig = parseDatabaseUrl(DB_URL);
    connection = await mysql.createConnection(dbConfig);
    
    // 检查管理员是否已存在
    const [existing] = await connection.execute(
      'SELECT id FROM User WHERE account = ?',
      [ADMIN_ACCOUNT]
    );
    
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, HASH_ROUNDS);
    
    // 生成管理员邀请码（6位字母）
    const generateInviteCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // 仅使用大写字母
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    let adminInviteCode = null;
    // 检查是否存在 myInviteCode 字段
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'User' AND COLUMN_NAME = 'myInviteCode'
    `, [dbConfig.database]);
    
    if (columns.length > 0) {
      // 字段存在，生成唯一邀请码（循环尝试直到找到唯一的）
      let attempts = 0;
      const maxAttempts = 100; // 最多尝试100次
      while (!adminInviteCode && attempts < maxAttempts) {
        const code = generateInviteCode();
        const [exists] = await connection.execute(
          'SELECT id FROM User WHERE myInviteCode = ?',
          [code]
        );
        if (exists.length === 0) {
          adminInviteCode = code;
        }
        attempts++;
      }
      
      if (!adminInviteCode) {
        throw new Error('无法生成唯一的管理员邀请码，请重试');
      }
    }
    
    if (existing.length > 0) {
      console.log('管理员账号已存在，更新密码和邀请码...');
      if (columns.length > 0 && adminInviteCode) {
        await connection.execute(
          'UPDATE User SET loginPasswordHash = ?, payPasswordHash = ?, inviteCode = ?, myInviteCode = ? WHERE account = ?',
          [passwordHash, passwordHash, 'ADMIN', adminInviteCode, ADMIN_ACCOUNT]
        );
        console.log(`管理员邀请码已更新: ${adminInviteCode}`);
      } else if (columns.length > 0) {
        // 如果字段存在但没有生成邀请码，需要生成
        let attempts = 0;
        const maxAttempts = 100;
        while (!adminInviteCode && attempts < maxAttempts) {
          const code = generateInviteCode();
          const [exists] = await connection.execute(
            'SELECT id FROM User WHERE myInviteCode = ?',
            [code]
          );
          if (exists.length === 0) {
            adminInviteCode = code;
          }
          attempts++;
        }
        if (adminInviteCode) {
          await connection.execute(
            'UPDATE User SET loginPasswordHash = ?, payPasswordHash = ?, inviteCode = ?, myInviteCode = ? WHERE account = ?',
            [passwordHash, passwordHash, 'ADMIN', adminInviteCode, ADMIN_ACCOUNT]
          );
          console.log(`管理员邀请码已更新: ${adminInviteCode}`);
        } else {
          await connection.execute(
            'UPDATE User SET loginPasswordHash = ?, payPasswordHash = ?, inviteCode = ? WHERE account = ?',
            [passwordHash, passwordHash, 'ADMIN', ADMIN_ACCOUNT]
          );
        }
      } else {
        await connection.execute(
          'UPDATE User SET loginPasswordHash = ?, payPasswordHash = ?, inviteCode = ? WHERE account = ?',
          [passwordHash, passwordHash, 'ADMIN', ADMIN_ACCOUNT]
        );
      }
      console.log('管理员密码已更新');
      if (adminInviteCode) {
        console.log(`管理员邀请码: ${adminInviteCode}`);
      }
    } else {
      console.log('创建管理员账号...');
      if (columns.length > 0 && adminInviteCode) {
        await connection.execute(
          'INSERT INTO User (account, loginPasswordHash, payPasswordHash, inviteCode, myInviteCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [ADMIN_ACCOUNT, passwordHash, passwordHash, 'ADMIN', adminInviteCode]
        );
        console.log('管理员账号创建成功');
        console.log(`管理员邀请码: ${adminInviteCode}`);
      } else if (columns.length > 0) {
        // 如果字段存在但没有生成邀请码，需要生成
        let attempts = 0;
        const maxAttempts = 100;
        while (!adminInviteCode && attempts < maxAttempts) {
          const code = generateInviteCode();
          const [exists] = await connection.execute(
            'SELECT id FROM User WHERE myInviteCode = ?',
            [code]
          );
          if (exists.length === 0) {
            adminInviteCode = code;
          }
          attempts++;
        }
        if (adminInviteCode) {
          await connection.execute(
            'INSERT INTO User (account, loginPasswordHash, payPasswordHash, inviteCode, myInviteCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [ADMIN_ACCOUNT, passwordHash, passwordHash, 'ADMIN', adminInviteCode]
          );
          console.log('管理员账号创建成功');
          console.log(`管理员邀请码: ${adminInviteCode}`);
        } else {
          await connection.execute(
            'INSERT INTO User (account, loginPasswordHash, payPasswordHash, inviteCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [ADMIN_ACCOUNT, passwordHash, passwordHash, 'ADMIN']
          );
          console.log('管理员账号创建成功（未生成邀请码）');
        }
      } else {
        await connection.execute(
          'INSERT INTO User (account, loginPasswordHash, payPasswordHash, inviteCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [ADMIN_ACCOUNT, passwordHash, passwordHash, 'ADMIN']
        );
        console.log('管理员账号创建成功');
      }
    }
    
    console.log('初始化完成');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

initAdmin();
