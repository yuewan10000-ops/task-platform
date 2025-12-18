# 后端服务启动指南

## 启动步骤

1. **确保环境变量已配置**
   - 检查 `.env` 文件是否存在
   - 确保包含以下内容：
     ```
     DATABASE_URL="mysql://root:123456@localhost:3306/task_db"
     INVITE_CODE="INVITE123"
     ```

2. **确保数据库服务运行**
   - MySQL 服务必须运行
   - 数据库 `task_db` 必须存在

3. **生成 Prisma 客户端**
   ```bash
   npm run prisma generate
   ```

4. **启动后端服务**
   ```bash
   npm run dev
   ```

5. **验证服务运行**
   - 打开浏览器访问: http://localhost:3000/healthz
   - 应该看到: `{"status":"ok"}`

## 常见问题

### 端口被占用
如果端口 3000 被占用，可以：
- 修改 `.env` 文件添加 `PORT=3001`
- 或者关闭占用端口的程序

### 数据库连接失败
- 检查 MySQL 服务是否运行
- 检查数据库用户名和密码是否正确
- 检查数据库 `task_db` 是否存在

### Prisma 客户端未生成
运行: `npx prisma generate`

