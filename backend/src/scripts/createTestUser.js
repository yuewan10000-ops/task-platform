const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const account = 'test001';
  const loginPassword = '123456';
  const payPassword = '123456';

  console.log('Creating test user with direct MySQL...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'task_db',
  });

  try {
    // 检查是否已存在
    const [rows] = await connection.execute('SELECT id FROM User WHERE account = ?', [account]);
    if (rows.length > 0) {
      console.log(`User ${account} already exists. Nothing to do.`);
      return;
    }

    const loginPasswordHash = await bcrypt.hash(loginPassword, 10);
    const payPasswordHash = await bcrypt.hash(payPassword, 10);

    const sql = `
      INSERT INTO User (
        email,
        name,
        account,
        inviteCode,
        loginPasswordHash,
        payPasswordHash,
        myInviteCode,
        parentId,
        walletAddress,
        balance,
        remark,
        isActive,
        isOnline,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      null,                 // email
      'Test User',          // name
      account,              // account
      'ROOT',               // inviteCode
      loginPasswordHash,    // loginPasswordHash
      payPasswordHash,      // payPasswordHash
      'ABCDEF',             // myInviteCode (全英文)
      null,                 // parentId
      null,                 // walletAddress
      0,                    // balance
      '测试账号',           // remark
      1,                    // isActive
      0,                    // isOnline
    ];

    const [result] = await connection.execute(sql, params);

    console.log('Test user created, ID:', result.insertId);
  } catch (e) {
    console.error('Create test user failed:', e);
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



