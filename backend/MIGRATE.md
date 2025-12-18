# 数据库迁移指南

## 方法一：使用迁移脚本（推荐）

这是最简单的方法，直接运行以下命令：

```bash
cd backend
npm run migrate-online
```

脚本会自动：
- 连接数据库
- 检查字段是否已存在
- 添加 `isOnline` 和 `lastLoginAt` 字段
- 如果字段已存在，会跳过迁移

## 方法二：使用 MySQL 命令行

1. 打开命令提示符或 PowerShell
2. 连接到 MySQL：

```bash
mysql -u root -p
```

输入密码：`123456`

3. 选择数据库：

```sql
USE task_db;
```

4. 执行 SQL 语句：

```sql
ALTER TABLE `User` ADD COLUMN `isOnline` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `lastLoginAt` DATETIME NULL;
```

5. 验证字段是否添加成功：

```sql
DESCRIBE User;
```

应该能看到 `isOnline` 和 `lastLoginAt` 字段。

## 方法三：使用 MySQL Workbench 或其他图形工具

1. 打开 MySQL Workbench
2. 连接到数据库（localhost:3306，用户名：root，密码：123456）
3. 选择 `task_db` 数据库
4. 打开 SQL 编辑器
5. 执行以下 SQL：

```sql
ALTER TABLE `User` ADD COLUMN `isOnline` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `lastLoginAt` DATETIME NULL;
```

6. 点击执行按钮（或按 Ctrl+Enter）

## 方法四：直接执行 SQL 文件

如果 MySQL 在 PATH 中，可以直接执行：

```bash
mysql -u root -p123456 task_db < prisma/migrations/add_online_status.sql
```

## 验证迁移

迁移完成后，可以运行以下命令验证：

```bash
cd backend
npm run dev
```

如果后端服务正常启动，说明迁移成功。

或者使用 MySQL 命令行：

```sql
DESCRIBE User;
```

查看表结构，确认 `isOnline` 和 `lastLoginAt` 字段已添加。

