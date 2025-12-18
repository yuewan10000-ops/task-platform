const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_URL = process.env.DATABASE_URL || 'mysql://root:123456@localhost:3306/task_db';

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

async function testLogin() {
  let connection;
  try {
    console.log('正在测试登录功能...');
    
    const dbConfig = parseDatabaseUrl(DB_URL);
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功');
    
    // 检查管理员账号
    const [users] = await connection.execute(
      'SELECT id, account, loginPasswordHash FROM User WHERE account = ?',
      ['admin']
    );
    
    if (users.length === 0) {
      console.log('✗ 管理员账号不存在，正在创建...');
      const passwordHash = await bcrypt.hash('Yc189189@', 10);
      await connection.execute(
        'INSERT INTO User (account, loginPasswordHash, payPasswordHash, inviteCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        ['admin', passwordHash, passwordHash, 'ADMIN']
      );
      console.log('✓ 管理员账号已创建');
    } else {
      console.log('✓ 管理员账号存在');
      const user = users[0];
      
      // 测试密码验证
      const testPassword = 'Yc189189@';
      const isValid = await bcrypt.compare(testPassword, user.loginPasswordHash);
      if (isValid) {
        console.log('✓ 密码验证成功');
      } else {
        console.log('✗ 密码验证失败，正在更新密码...');
        const passwordHash = await bcrypt.hash(testPassword, 10);
        await connection.execute(
          'UPDATE User SET loginPasswordHash = ?, payPasswordHash = ? WHERE account = ?',
          [passwordHash, passwordHash, 'admin']
        );
        console.log('✓ 密码已更新');
      }
    }
    
    console.log('\n测试完成！可以使用以下账号登录：');
    console.log('账号: admin');
    console.log('密码: Yc189189@');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

testLogin();

