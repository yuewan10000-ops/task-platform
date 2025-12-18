import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { generateUniqueInviteCode } from '../utils/generateInviteCode';

const router = Router();

const HASH_ROUNDS = 10;
const HASH_ROUNDS_ADMIN = 10; // For admin user creation

const createSubUserSchema = z.object({
  account: z.string().min(4, '账号至少 4 位'),
  loginPassword: z.string().min(6, '登录密码至少 6 位'),
  payPassword: z.string().min(6, '支付密码至少 6 位'),
});

const updateSubUserSchema = z.object({
  account: z.string().min(4).optional(),
  loginPassword: z.string().min(6).optional(),
  payPassword: z.string().min(6).optional(),
});

// 获取所有子用户列表
router.get('/', async (_req, res, next) => {
  try {
    const subUsers = await prisma.user.findMany({
      where: {
        isSubUser: true,
      },
      select: {
        id: true,
        account: true,
        myInviteCode: true, // 包含邀请码
        parentAdminId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        isOnline: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 获取admin用户信息（如果不存在，返回null）
    const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
    const adminUser = await prisma.user.findUnique({
      where: { account: adminAccount },
      select: { id: true, account: true },
    });

    const subUsersWithAdmin = subUsers.map(subUser => ({
      ...subUser,
      parentAdmin: adminUser || { id: 0, account: adminAccount }, // 如果不存在，使用虚拟的admin信息
    }));

    res.json(subUsersWithAdmin);
  } catch (err) {
    next(err);
  }
});

// 创建子用户
router.post('/', async (req, res, next) => {
  try {
    const data = createSubUserSchema.parse(req.body);

    // 检查账号是否已存在
    const existed = await prisma.user.findUnique({ where: { account: data.account } });
    if (existed) {
      return res.status(400).json({ message: '账号已存在' });
    }

    // 获取admin用户ID
    // Admin用户可能不在数据库中（因为admin-login是硬编码的，id=0）
    // 如果找不到，我们使用一个虚拟的ID或者创建admin用户
    const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
    let adminUser = await prisma.user.findUnique({
      where: { account: adminAccount },
      select: { id: true },
    });

    // 如果admin用户不存在，尝试创建它
    if (!adminUser) {
      try {
        const adminPassword = process.env.ADMIN_PASSWORD || 'Yc189189@';
        const loginPasswordHash = await bcrypt.hash(adminPassword, HASH_ROUNDS_ADMIN);
        const payPasswordHash = await bcrypt.hash(adminPassword, HASH_ROUNDS_ADMIN);
        
        adminUser = await prisma.user.create({
          data: {
            account: adminAccount,
            loginPasswordHash,
            payPasswordHash,
            inviteCode: 'ADMIN',
            isSubUser: false,
            name: 'Admin',
          },
          select: { id: true },
        });
      } catch (createError: any) {
        // 如果创建失败（可能因为并发创建），再次尝试查找
        adminUser = await prisma.user.findUnique({
          where: { account: adminAccount },
          select: { id: true },
        });
        
        if (!adminUser) {
          return res.status(500).json({ message: 'Admin user not found and could not be created' });
        }
      }
    }

    // 加密密码
    const loginPasswordHash = await bcrypt.hash(data.loginPassword, HASH_ROUNDS);
    const payPasswordHash = await bcrypt.hash(data.payPassword, HASH_ROUNDS);

    // 生成唯一的6位英文邀请码
    const myInviteCode = await generateUniqueInviteCode(async (code) => {
      const exists = await prisma.user.findUnique({ where: { myInviteCode: code } });
      return !!exists;
    }, 100); // 最多尝试100次

    // 创建子用户
    const subUser = await prisma.user.create({
      data: {
        account: data.account,
        loginPasswordHash,
        payPasswordHash,
        inviteCode: '', // 子用户不需要邀请码
        myInviteCode: myInviteCode, // 子用户自己的邀请码（6位英文）
        isSubUser: true,
        parentAdminId: adminUser.id,
        name: data.account, // 直接使用账号作为名称
      },
      select: {
        id: true,
        account: true,
        myInviteCode: true, // 返回邀请码
        parentAdminId: true,
        createdAt: true,
      },
    });

    res.status(201).json(subUser);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: '账号已存在' });
    }
    next(err);
  }
});

// 更新子用户
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const data = updateSubUserSchema.parse(req.body);

    // 检查子用户是否存在
    const subUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!subUser || !subUser.isSubUser) {
      return res.status(404).json({ message: 'Sub user not found' });
    }

    // 如果更新账号，检查新账号是否已存在
    if (data.account && data.account !== subUser.account) {
      const existed = await prisma.user.findUnique({ where: { account: data.account } });
      if (existed) {
        return res.status(400).json({ message: '账号已存在' });
      }
    }

    const updateData: any = {};
    if (data.account) {
      updateData.account = data.account;
    }
    if (data.loginPassword) {
      updateData.loginPasswordHash = await bcrypt.hash(data.loginPassword, HASH_ROUNDS);
    }
    if (data.payPassword) {
      updateData.payPasswordHash = await bcrypt.hash(data.payPassword, HASH_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        account: true,
        parentAdminId: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: '账号已存在' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Sub user not found' });
    }
    next(err);
  }
});

// 删除子用户
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // 检查子用户是否存在
    const subUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!subUser || !subUser.isSubUser) {
      return res.status(404).json({ message: 'Sub user not found' });
    }

    // 删除子用户（子用户不应该有业务数据，所以直接删除即可）
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'Sub user deleted successfully' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Sub user not found' });
    }
    next(err);
  }
});

// 为现有子用户生成邀请码（如果还没有）
router.post('/generate-invite-codes', async (_req, res, next) => {
  try {
    // 获取所有没有邀请码的子用户
    const subUsersWithoutCode = await prisma.user.findMany({
      where: {
        isSubUser: true,
        OR: [
          { myInviteCode: null },
          { myInviteCode: '' },
        ],
      },
      select: {
        id: true,
        account: true,
      },
    });

    const results = [];
    for (const subUser of subUsersWithoutCode) {
      try {
        // 生成唯一的邀请码
        const myInviteCode = await generateUniqueInviteCode(async (code) => {
          const exists = await prisma.user.findUnique({ where: { myInviteCode: code } });
          return !!exists;
        }, 100);

        // 更新子用户的邀请码
        await prisma.user.update({
          where: { id: subUser.id },
          data: { myInviteCode },
        });

        results.push({
          id: subUser.id,
          account: subUser.account,
          myInviteCode,
          status: 'success',
        });
      } catch (err: any) {
        results.push({
          id: subUser.id,
          account: subUser.account,
          status: 'failed',
          error: err.message,
        });
      }
    }

    res.json({
      message: `已为 ${results.filter(r => r.status === 'success').length} 个子用户生成邀请码`,
      results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

