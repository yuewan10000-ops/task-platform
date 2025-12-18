# Git 设置步骤（方法一）

## 第一步：安装 Git

### 1. 下载 Git for Windows
访问：https://git-scm.com/download/win
点击下载按钮（会自动下载最新版本）

### 2. 安装 Git
1. 运行下载的安装程序（例如：`Git-2.xx.x-64-bit.exe`）
2. 点击 "Next" 直到看到 "Select Components"
3. **重要：** 勾选 "Git from the command line and also from 3rd-party software"
4. 其他选项保持默认，继续点击 "Next"
5. 选择默认编辑器（推荐：Use Visual Studio Code 或 Use Notepad++）
6. 其他选项保持默认
7. 点击 "Install" 开始安装
8. 安装完成后，**重启 PowerShell 或 CMD**

### 3. 验证安装
打开新的 PowerShell 窗口，执行：
```bash
git --version
```
如果显示版本号（如 `git version 2.xx.x`），说明安装成功。

---

## 第二步：初始化本地 Git 仓库

在项目根目录打开 PowerShell，执行以下命令：

```bash
# 1. 进入项目目录（如果不在的话）
cd C:\Users\admin\Desktop\task-platform

# 2. 初始化 Git 仓库
git init

# 3. 配置用户信息（首次使用需要，替换为你的信息）
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 4. 查看状态
git status

# 5. 添加所有文件
git add .

# 6. 创建首次提交
git commit -m "Initial commit: Task platform project"
```

---

## 第三步：创建 GitHub 仓库

### 1. 登录 GitHub
访问：https://github.com/login
如果没有账号，先注册：https://github.com/signup

### 2. 创建新仓库
1. 点击右上角的 "+" 号，选择 "New repository"
2. **Repository name:** 输入 `task-platform`
3. **Description:** （可选）输入项目描述
4. **Visibility:** 选择 Public（公开）或 Private（私有）
5. **重要：** 不要勾选以下选项：
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
6. 点击 "Create repository" 按钮

### 3. 复制仓库 URL
创建成功后，GitHub 会显示仓库页面
复制 HTTPS URL（例如：`https://github.com/yourusername/task-platform.git`）

---

## 第四步：连接远程仓库并推送

在项目目录的 PowerShell 中执行：

```bash
# 1. 添加远程仓库（替换为你的实际 URL）
git remote add origin https://github.com/你的用户名/task-platform.git

# 2. 查看远程仓库配置
git remote -v

# 3. 重命名分支为 main（如果当前是 master）
git branch -M main

# 4. 推送代码到远程仓库
git push -u origin main
```

### 如果提示输入用户名和密码：

**GitHub 现在不支持密码登录，需要使用 Personal Access Token：**

1. **生成 Token：**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - **Note:** 输入描述（如：task-platform）
   - **Expiration:** 选择过期时间（建议：90 days 或 No expiration）
   - **Select scopes:** 勾选 `repo`（完整仓库权限）
   - 点击 "Generate token"
   - **重要：** 复制生成的 token（只显示一次！）

2. **推送时使用 Token：**
   - Username: 输入你的 GitHub 用户名
   - Password: 输入刚才复制的 token（不是密码！）

---

## 第五步：在服务器上克隆仓库

### 1. SSH 登录服务器
```bash
ssh root@64.176.83.204
```

### 2. 克隆仓库
```bash
# 进入 /opt 目录
cd /opt

# 克隆仓库（替换为你的实际 URL）
git clone https://github.com/你的用户名/task-platform.git

# 如果仓库是私有的，需要配置认证：
# 方法1：使用 Personal Access Token（在 URL 中）
git clone https://你的用户名:你的token@github.com/你的用户名/task-platform.git

# 方法2：配置 SSH key（推荐，更安全）
# 参考：https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

### 3. 进入项目目录
```bash
cd task-platform
```

---

## 后续更新代码流程

### 本地修改代码后：
```bash
# 1. 查看更改
git status

# 2. 添加更改的文件
git add .

# 3. 提交更改
git commit -m "描述你的更改内容"

# 4. 推送到远程仓库
git push origin main
```

### 服务器上更新代码：
```bash
# SSH 登录服务器
ssh root@64.176.83.204

# 进入项目目录
cd /opt/task-platform

# 拉取最新代码
git pull origin main

# 如果有新的依赖，重新安装
cd backend && npm install
cd ../frontend/a-portal && npm install
cd ../b-portal && npm install

# 重新构建
cd backend && npm run build
cd ../frontend/a-portal && npm run build
cd ../b-portal && npm run build

# 重启服务
pm2 restart task-platform-api
```

---

## 常见问题解决

### 1. 提示 "git: command not found"
- 说明 Git 未安装或未添加到 PATH
- 重新安装 Git，确保勾选 "Git from the command line"
- 重启 PowerShell/CMD

### 2. 推送时提示 "Authentication failed"
- GitHub 需要使用 Personal Access Token，不是密码
- 按照上面的步骤生成 Token 并使用

### 3. 推送时提示 "Repository not found"
- 检查仓库 URL 是否正确
- 检查仓库是否为私有（私有仓库需要认证）
- 确认你有该仓库的访问权限

### 4. 服务器上克隆失败
- 检查网络连接
- 如果是私有仓库，需要配置认证
- 可以使用 Personal Access Token 或 SSH key

---

## 下一步

完成 Git 设置后，继续：
1. 在服务器上克隆仓库
2. 配置环境变量（.env 文件）
3. 安装依赖并构建项目
4. 配置数据库
5. 启动服务

