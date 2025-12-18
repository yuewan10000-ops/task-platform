import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

export interface AuthRequest extends Request {
  currentUser?: {
    id: number;
    account: string;
    isSubUser: boolean;
    parentAdminId?: number | null;
  };
}

// 从token或请求头中获取当前用户信息
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  (req.query.token as string) || 
                  (req.body.token as string);

    if (!token) {
      return next(); // 没有token，继续执行（可能是公开接口）
    }

    // 解析token
    if (token.startsWith('admin-token-')) {
      // Admin用户
      const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
      req.currentUser = {
        id: 0,
        account: adminAccount,
        isSubUser: false,
      };
    } else if (token.startsWith('sub-user-token-')) {
      // 子用户
      const userId = parseInt(token.replace('sub-user-token-', ''));
      if (!isNaN(userId)) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            account: true,
            isSubUser: true,
            parentAdminId: true,
          },
        });

        if (user && user.isSubUser) {
          req.currentUser = {
            id: user.id,
            account: user.account,
            isSubUser: true,
            parentAdminId: user.parentAdminId,
          };
        }
      }
    }

    next();
  } catch (err) {
    console.error('Get current user error:', err);
    next(); // 出错也继续执行
  }
};

