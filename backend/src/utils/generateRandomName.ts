/**
 * 生成随机短英文名字
 * @returns 随机英文名字（3-8个字母）
 */
export function generateRandomName(): string {
  // 常见的短英文名字前缀和后缀组合
  const prefixes = [
    'Alex', 'Ben', 'Chris', 'Dan', 'Ed', 'Finn', 'Gus', 'Hank', 'Ian', 'Jack',
    'Kai', 'Leo', 'Max', 'Nick', 'Owen', 'Paul', 'Quinn', 'Ray', 'Sam', 'Tom',
    'Vic', 'Will', 'Zack', 'Ace', 'Blake', 'Cole', 'Drew', 'Evan', 'Felix', 'Gabe',
    'Hugo', 'Ivan', 'Jake', 'Kyle', 'Luke', 'Miles', 'Noah', 'Oscar', 'Pete', 'Quinn',
    'Ryan', 'Sean', 'Troy', 'Vince', 'Wade', 'Xavi', 'Yuki', 'Zane'
  ];

  const suffixes = [
    'son', 'ton', 'ley', 'man', 'er', 'an', 'in', 'on', 'en', 'ar',
    'or', 'ic', 'al', 'el', 'ie', 'ey', 'ay', 'oy', 'ly', 'ry'
  ];

  // 随机选择：使用完整名字或前缀+后缀组合
  const useFullName = Math.random() > 0.5;
  
  if (useFullName) {
    // 直接使用一个短名字
    return prefixes[Math.floor(Math.random() * prefixes.length)];
  } else {
    // 组合前缀和后缀
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    // 确保组合后的名字不会太长（最多8个字母）
    const combined = prefix + suffix;
    return combined.length <= 8 ? combined : prefix;
  }
}

/**
 * 生成唯一的随机名字（检查数据库中是否已存在）
 */
export async function generateUniqueRandomName(
  checkExists: (name: string) => Promise<boolean>,
  maxAttempts: number = 20
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const name = generateRandomName();
    const exists = await checkExists(name);
    if (!exists) {
      return name;
    }
  }
  // 如果都冲突，添加随机数字后缀
  const baseName = generateRandomName();
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${baseName}${randomSuffix}`;
}

