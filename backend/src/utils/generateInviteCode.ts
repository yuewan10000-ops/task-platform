/**
 * 生成随机邀请码（6位字母）
 * @param length 邀请码长度，默认6位
 * @returns 随机邀请码（仅字母）
 */
export function generateInviteCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // 仅使用大写字母
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成唯一的邀请码（检查数据库中是否已存在）
 */
export async function generateUniqueInviteCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateInviteCode();
    const exists = await checkExists(code);
    if (!exists) {
      return code;
    }
  }
  throw new Error('无法生成唯一邀请码，请重试');
}

