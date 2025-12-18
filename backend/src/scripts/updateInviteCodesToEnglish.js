const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

/**
 * 生成随机邀请码（6位大写字母）
 */
function generateInviteCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 检查邀请码是否包含数字
 */
function containsNumber(str) {
  return /\d/.test(str);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // 解析数据库URL
  const url = new URL(dbUrl);
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };

  const connection = await mysql.createConnection(config);

  try {
    console.log('开始更新邀请码为全英文...');

    // 获取所有用户的邀请码
    const [users] = await connection.query(
      'SELECT id, myInviteCode FROM User WHERE myInviteCode IS NOT NULL'
    );

    let updatedCount = 0;
    const usedCodes = new Set();

    for (const user of users) {
      const currentCode = user.myInviteCode;

      // 如果邀请码已经全英文，跳过
      if (!containsNumber(currentCode)) {
        usedCodes.add(currentCode);
        continue;
      }

      // 生成新的全英文邀请码
      let newCode;
      let attempts = 0;
      do {
        newCode = generateInviteCode();
        attempts++;
        if (attempts > 100) {
          console.error(`无法为用户 ${user.id} 生成唯一邀请码`);
          break;
        }
      } while (usedCodes.has(newCode));

      if (newCode) {
        // 检查数据库中是否已存在
        const [exists] = await connection.query(
          'SELECT id FROM User WHERE myInviteCode = ? AND id != ?',
          [newCode, user.id]
        );

        if (exists.length === 0) {
          // 更新邀请码
          await connection.query(
            'UPDATE User SET myInviteCode = ? WHERE id = ?',
            [newCode, user.id]
          );
          usedCodes.add(newCode);
          updatedCount++;
          console.log(`用户 ${user.id}: ${currentCode} -> ${newCode}`);
        } else {
          console.warn(`邀请码 ${newCode} 已存在，跳过用户 ${user.id}`);
        }
      }
    }

    console.log(`\n完成！共更新 ${updatedCount} 个邀请码`);
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

