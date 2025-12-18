#!/bin/bash

# 任务平台部署脚本
# 使用方法: bash deploy.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署任务平台..."
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录执行此脚本${NC}"
    exit 1
fi

# 1. 检查 Node.js 版本
echo -e "${YELLOW}[1/10] 检查 Node.js 版本...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: Node.js 版本需要 18 或更高，当前版本: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

# 2. 检查 npm
echo -e "${YELLOW}[2/10] 检查 npm...${NC}"
echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"

# 3. 安装后端依赖
echo -e "${YELLOW}[3/10] 安装后端依赖...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ 后端依赖已存在，跳过安装${NC}"
fi
cd ..

# 4. 安装前端 A-portal 依赖
echo -e "${YELLOW}[4/10] 安装前端 A-portal 依赖...${NC}"
cd frontend/a-portal
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ A-portal 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ A-portal 依赖已存在，跳过安装${NC}"
fi
cd ../..

# 5. 安装前端 B-portal 依赖
echo -e "${YELLOW}[5/10] 安装前端 B-portal 依赖...${NC}"
cd frontend/b-portal
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ B-portal 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ B-portal 依赖已存在，跳过安装${NC}"
fi
cd ../..

# 6. 检查环境变量文件
echo -e "${YELLOW}[6/10] 检查环境变量配置...${NC}"
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠ 未找到 .env 文件，从模板创建...${NC}"
    if [ -f "backend/env.example" ]; then
        cp backend/env.example backend/.env
        echo -e "${YELLOW}⚠ 请编辑 backend/.env 文件配置数据库和其他设置${NC}"
        echo -e "${YELLOW}⚠ 按任意键继续（编辑完成后）...${NC}"
        read -n 1 -s
    else
        echo -e "${RED}错误: 未找到 env.example 文件${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ 环境变量文件已存在${NC}"
fi

# 7. 生成 Prisma Client
echo -e "${YELLOW}[7/10] 生成 Prisma Client...${NC}"
cd backend
npx prisma generate
echo -e "${GREEN}✓ Prisma Client 生成完成${NC}"
cd ..

# 8. 运行数据库迁移
echo -e "${YELLOW}[8/10] 运行数据库迁移...${NC}"
cd backend
npx prisma migrate deploy || {
    echo -e "${YELLOW}⚠ 数据库迁移失败，尝试使用 db push...${NC}"
    npx prisma db push
}
echo -e "${GREEN}✓ 数据库迁移完成${NC}"
cd ..

# 9. 构建后端
echo -e "${YELLOW}[9/10] 构建后端...${NC}"
cd backend
npm run build
echo -e "${GREEN}✓ 后端构建完成${NC}"
cd ..

# 10. 构建前端 A-portal
echo -e "${YELLOW}[10/11] 构建前端 A-portal...${NC}"
cd frontend/a-portal
npm run build
echo -e "${GREEN}✓ A-portal 构建完成${NC}"
cd ../..

# 11. 构建前端 B-portal
echo -e "${YELLOW}[11/11] 构建前端 B-portal...${NC}"
cd frontend/b-portal
npm run build
echo -e "${GREEN}✓ B-portal 构建完成${NC}"
cd ../..

echo ""
echo -e "${GREEN}=========================================="
echo "部署完成！"
echo "==========================================${NC}"
echo ""
echo "下一步操作："
echo "1. 检查 backend/.env 文件配置是否正确"
echo "2. 启动后端服务："
echo "   cd backend"
echo "   pm2 start dist/server.js --name task-platform-api"
echo "   pm2 save"
echo "3. 配置 Nginx 指向前端 dist 目录"
echo "4. 重启 Nginx: sudo systemctl reload nginx"
echo ""

