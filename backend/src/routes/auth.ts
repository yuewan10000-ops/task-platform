import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { verifyCaptcha } from './captcha';
import { generateUniqueInviteCode } from '../utils/generateInviteCode';
import { generateUniqueRandomName } from '../utils/generateRandomName';

const router = Router();

const registerSchema = z.object({
  account: z.string().min(4, '账号至少 4 位'),
  loginPassword: z.string().min(6, '登录密码至少 6 位'),
  payPassword: z.string().min(6, '支付密码至少 6 位'),
  inviteCode: z.string().min(1, '邀请码必填'),
});

const loginSchema = z.object({
  account: z.string().min(1, '账号必填'),
  password: z.string().min(1, '密码必填'),
  captcha: z.string().min(1, '验证码必填').optional(),
  sessionId: z.string().optional(),
});

// 仅用于后台管理的固定账号登录
const adminLoginSchema = z.object({
  account: z.string().min(1, '账号必填'),
  password: z.string().min(1, '密码必填'),
});

const HASH_ROUNDS = 10;

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // 检查账号是否已存在
    const existed = await prisma.user.findUnique({ where: { account: data.account } });
    if (existed) {
      return res.status(400).json({ message: '账号已存在' });
    }
    
    // 验证邀请码：查找使用该邀请码的用户（上级）
    const parent = await prisma.user.findUnique({ 
      where: { myInviteCode: data.inviteCode },
      select: {
        id: true,
        isSubUser: true, // 检查是否是子用户
      },
    });
    
    if (!parent) {
      return res.status(400).json({ message: '邀请码不正确或不存在' });
    }
    
    // 生成用户自己的唯一邀请码
    const myInviteCode = await generateUniqueInviteCode(async (code) => {
      const exists = await prisma.user.findUnique({ where: { myInviteCode: code } });
      return !!exists;
    });
    
    // 生成随机英文名字
    const randomName = await generateUniqueRandomName(async (name) => {
      const exists = await prisma.user.findFirst({ where: { name } });
      return !!exists;
    });
    
    // 加密密码
    const loginPasswordHash = await bcrypt.hash(data.loginPassword, HASH_ROUNDS);
    const payPasswordHash = await bcrypt.hash(data.payPassword, HASH_ROUNDS);
    
    // 准备创建用户的数据
    const userData: any = {
      account: data.account,
      name: randomName,             // 随机生成的英文名字
      loginPasswordHash,
      payPasswordHash,
      inviteCode: data.inviteCode, // 注册时使用的邀请码（上级的邀请码）
      myInviteCode: myInviteCode,   // 用户自己的邀请码
      parentId: parent.id,          // 上级用户ID
    };
    
    // 如果使用的是子用户的邀请码，自动分配给该子用户管理
    if (parent.isSubUser) {
      userData.managedBySubUserId = parent.id;
    }
    
    // 创建用户，保存所有信息
    const user = await prisma.user.create({
      data: userData,
      select: { 
        id: true, 
        account: true, 
        myInviteCode: true,
        createdAt: true 
      },
    });
    
    res.status(201).json({ 
      message: '注册成功', 
      user: {
        id: user.id,
        account: user.account,
        myInviteCode: user.myInviteCode,
        createdAt: user.createdAt,
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    console.log('收到登录请求:', req.body);
    const data = loginSchema.parse(req.body);
    console.log('验证后的数据:', { account: data.account, hasPassword: !!data.password });
    
    // 如果提供了验证码，则验证
    if (data.captcha && data.sessionId) {
      const isValid = await verifyCaptcha(data.sessionId, data.captcha);
      if (!isValid) {
        return res.status(400).json({ message: '验证码错误或已过期' });
      }
    }
    
    const user = await prisma.user.findUnique({ where: { account: data.account } });
    if (!user) {
      console.log('用户不存在:', data.account);
      return res.status(400).json({ message: '账号或密码错误' });
    }
    
    console.log('找到用户:', user.id, user.account);
    const ok = await bcrypt.compare(data.password, user.loginPasswordHash);
    if (!ok) {
      console.log('密码验证失败');
      return res.status(400).json({ message: '账号或密码错误' });
    }
    
    console.log('登录成功，用户ID:', user.id);
    
    // 更新用户在线状态和最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastLoginAt: new Date(),
      },
    });
    
    // 这里返回一个简单 token 占位，后续可换成 JWT/Session
    const token = `mock-token-${user.id}`;
    res.json({ message: '登录成功', token, user: { id: user.id, account: user.account } });
  } catch (err: any) {
    console.error('登录错误:', err);
    next(err);
  }
});

// 退出登录
router.post('/logout', async (req, res, next) => {
  try {
    // 从请求体或查询参数获取用户ID（实际应该从token解析）
    const userId = parseInt(req.body.userId || req.query.userId as string);
    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    // 更新用户在线状态为离线
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
      },
    });

    res.json({ message: '退出登录成功' });
  } catch (err: any) {
    console.error('退出登录错误:', err);
    next(err);
  }
});

// 后台管理专用登录（与业务用户隔离）
// 支持admin和子用户登录
router.post('/admin-login', async (req, res, next) => {
  try {
    const data = adminLoginSchema.parse(req.body);
    const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Yc189189@';

    // 先检查是否是admin账号
    if (data.account === adminAccount && data.password === adminPassword) {
      // 返回独立的 token，不依赖用户表
      const token = `admin-token-${Date.now()}`;
      return res.json({
        message: '登录成功',
        token,
        user: { id: 0, account: adminAccount, isSubUser: false },
      });
    }

    // 检查是否是子用户
    const subUser = await prisma.user.findUnique({
      where: { account: data.account },
      select: {
        id: true,
        account: true,
        loginPasswordHash: true,
        isSubUser: true,
        parentAdminId: true,
        myInviteCode: true, // 子用户的邀请码
      },
    });

    if (subUser && subUser.isSubUser) {
      const ok = await bcrypt.compare(data.password, subUser.loginPasswordHash);
      if (!ok) {
        return res.status(400).json({ message: '账号或密码错误' });
      }

      // 更新子用户在线状态和最后登录时间
      await prisma.user.update({
        where: { id: subUser.id },
        data: {
          isOnline: true,
          lastLoginAt: new Date(),
        },
      });

      const token = `sub-user-token-${subUser.id}`;
      return res.json({
        message: '登录成功',
        token,
        user: {
          id: subUser.id,
          account: subUser.account,
          isSubUser: true,
          parentAdminId: subUser.parentAdminId,
          myInviteCode: subUser.myInviteCode, // 返回子用户的邀请码
        },
      });
    }

    return res.status(400).json({ message: '账号或密码错误' });
  } catch (err) {
    next(err);
  }
});

export default router;

