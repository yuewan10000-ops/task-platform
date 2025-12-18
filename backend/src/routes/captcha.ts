import { Router } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../prisma';

const router = Router();

// 生成4位随机验证码
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// 清理过期验证码（后台任务）
const cleanupExpiredCaptchas = async () => {
  try {
    await prisma.captcha.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (err) {
    console.error('清理过期验证码失败:', err);
  }
};

// 生成验证码并存储到数据库
router.get('/captcha', async (req, res, next) => {
  try {
    // 清理过期验证码
    await cleanupExpiredCaptchas();

    const sessionId = req.headers['x-session-id'] as string || randomBytes(16).toString('hex');
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 如果sessionId已存在，先删除旧的
    await prisma.captcha.deleteMany({
      where: { sessionId },
    });

    // 创建新的验证码记录
    await prisma.captcha.create({
      data: {
        sessionId,
        code,
        expiresAt,
      },
    });

    res.json({ sessionId, code });
  } catch (err) {
    next(err);
  }
});

// 验证验证码（从数据库查询）
export const verifyCaptcha = async (sessionId: string, code: string): Promise<boolean> => {
  try {
    // 先清理过期验证码
    await cleanupExpiredCaptchas();

    const captcha = await prisma.captcha.findUnique({
      where: { sessionId },
    });

    if (!captcha) {
      return false;
    }

    // 检查是否过期
    if (new Date() > captcha.expiresAt) {
      await prisma.captcha.delete({ where: { id: captcha.id } });
      return false;
    }

    // 验证码匹配（不区分大小写）
    const isValid = captcha.code.toLowerCase() === code.toLowerCase();

    // 无论验证成功与否，都删除验证码（一次性使用）
    await prisma.captcha.delete({ where: { id: captcha.id } });

    return isValid;
  } catch (err) {
    console.error('验证验证码失败:', err);
    return false;
  }
};

export default router;

