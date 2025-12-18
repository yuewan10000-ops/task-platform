#!/bin/bash

# ============================================
# 任务平台服务器部署命令脚本
# 使用方法：复制以下命令到服务器执行，或保存为 .sh 文件执行
# ============================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署任务平台..."
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 步骤 1: 检查环境
# ============================================
echo -e "${BLUE}[步骤 1/11] 检查环境...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js 未安装${NC}"
    echo "请先安装 Node.js 18+: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: Node.js 版本需要 18 或更高，当前版本: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL 未安装，请先安装 MySQL${NC}"
fi

# ============================================
# 步骤 2: 克隆仓库
# ============================================
echo -e "${BLUE}[步骤 2/11] 克隆仓库...${NC}"

if [ -d "/opt/task-platform" ]; then
    echo -e "${YELLOW}⚠ 项目目录已存在，是否删除并重新克隆？(y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf /opt/task-platform
        echo -e "${GREEN}✓ 已删除旧目录${NC}"
    else
        echo -e "${YELLOW}⚠ 使用现有目录，跳过克隆${NC}"
        cd /opt/task-platform
        git pull origin main
        echo -e "${GREEN}✓ 已更新代码${NC}"
    fi
fi

if [ ! -d "/opt/task-platform" ]; then
    cd /opt
    git clone https://github.com/yuewan10000-ops/task-platform.git
    echo -e "${GREEN}✓ 仓库克隆完成${NC}"
fi

cd /opt/task-platform

# ============================================
# 步骤 3: 安装后端依赖
# ============================================
echo -e "${BLUE}[步骤 3/11] 安装后端依赖...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ 后端依赖已存在${NC}"
fi
cd ..

# ============================================
# 步骤 4: 安装前端 A-portal 依赖
# ============================================
echo -e "${BLUE}[步骤 4/11] 安装前端 A-portal 依赖...${NC}"
cd frontend/a-portal
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ A-portal 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ A-portal 依赖已存在${NC}"
fi
cd ../..

# ============================================
# 步骤 5: 安装前端 B-portal 依赖
# ============================================
echo -e "${BLUE}[步骤 5/11] 安装前端 B-portal 依赖...${NC}"
cd frontend/b-portal
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ B-portal 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ B-portal 依赖已存在${NC}"
fi
cd ../..

# ============================================
# 步骤 6: 配置环境变量
# ============================================
echo -e "${BLUE}[步骤 6/11] 配置环境变量...${NC}"
cd backend

if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${YELLOW}⚠ 已创建 .env 文件，请编辑配置：${NC}"
        echo -e "${YELLOW}   nano /opt/task-platform/backend/.env${NC}"
        echo ""
        echo -e "${YELLOW}必须配置以下内容：${NC}"
        echo "  - DATABASE_URL (数据库连接)"
        echo "  - JWT_SECRET (JWT密钥，使用随机字符串)"
        echo "  - ADMIN_LOGIN_PASSWORD (管理员登录密码)"
        echo "  - ADMIN_PAY_PASSWORD (管理员支付密码)"
        echo ""
        echo -e "${YELLOW}按 Enter 继续（配置完成后）...${NC}"
        read -r
    else
        echo -e "${RED}错误: 未找到 env.example 文件${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ 环境变量文件已存在${NC}"
fi
cd ..

# ============================================
# 步骤 7: 生成 Prisma Client
# ============================================
echo -e "${BLUE}[步骤 7/11] 生成 Prisma Client...${NC}"
cd backend
npx prisma generate
echo -e "${GREEN}✓ Prisma Client 生成完成${NC}"
cd ..

# ============================================
# 步骤 8: 运行数据库迁移
# ============================================
echo -e "${BLUE}[步骤 8/11] 运行数据库迁移...${NC}"
cd backend
if npx prisma migrate deploy; then
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}⚠ migrate deploy 失败，尝试 db push...${NC}"
    npx prisma db push
    echo -e "${GREEN}✓ 数据库同步完成${NC}"
fi
cd ..

# ============================================
# 步骤 9: 构建后端
# ============================================
echo -e "${BLUE}[步骤 9/11] 构建后端...${NC}"
cd backend
npm run build
echo -e "${GREEN}✓ 后端构建完成${NC}"
cd ..

# ============================================
# 步骤 10: 构建前端 A-portal
# ============================================
echo -e "${BLUE}[步骤 10/11] 构建前端 A-portal...${NC}"
cd frontend/a-portal
npm run build
echo -e "${GREEN}✓ A-portal 构建完成${NC}"
cd ../..

# ============================================
# 步骤 11: 构建前端 B-portal
# ============================================
echo -e "${BLUE}[步骤 11/11] 构建前端 B-portal...${NC}"
cd frontend/b-portal
npm run build
echo -e "${GREEN}✓ B-portal 构建完成${NC}"
cd ../..

# ============================================
# 完成
# ============================================
echo ""
echo -e "${GREEN}=========================================="
echo "✅ 部署完成！"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1. 检查并配置环境变量："
echo "   nano /opt/task-platform/backend/.env"
echo ""
echo "2. 安装 PM2（如果还没安装）："
echo "   npm install -g pm2"
echo ""
echo "3. 启动后端服务："
echo "   cd /opt/task-platform/backend"
echo "   pm2 start dist/server.js --name task-platform-api"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. 配置 Nginx（参考部署指南）"
echo ""
echo "5. 访问测试："
echo "   - A-portal: http://你的服务器IP"
echo "   - B-portal: http://你的服务器IP:8080"
echo ""

