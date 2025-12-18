import 'dotenv/config';
import { prisma } from '../prisma';

async function main() {
  // 可以根据需要修改或追加测试账号
  const testAccounts = ['test001'];

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { account: { in: testAccounts } },
        { remark: '测试账号' },
        { name: 'Test User' },
      ],
    },
    select: {
      id: true,
      account: true,
      name: true,
      remark: true,
    },
  });

  if (!users.length) {
    console.log('未找到测试账号（按 account=test001 / remark=测试账号 / name=Test User 搜索）');
    return;
  }

  console.log('找到以下测试账号，将清空其订单记录（用于计算总佣金）:');
  console.log(users);

  for (const u of users) {
    const del = await prisma.orderRecord.deleteMany({
      where: { userId: u.id },
    });
    console.log(`用户 ${u.account} (id=${u.id}) 已删除订单记录条数: ${del.count}`);
  }
}

main()
  .catch((e) => {
    console.error('清空测试账号总佣金时出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


