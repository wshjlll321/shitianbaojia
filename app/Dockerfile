# 使用官方的 Node.js 轻量级镜像 (使用 slim 避免 better-sqlite3 在 alpine 下的编译报错)
FROM node:22-slim AS base

# 阶段一：安装依赖
FROM base AS deps
WORKDIR /app

# 安装 prisma 依赖包（如 openssl，部分基于 debian 的环境需要）
RUN apt-get update -y && apt-get install -y openssl

# 复制 package.json 和锁文件
COPY package.json package-lock.json ./
# 安装依赖
RUN npm install

# 阶段二：构建阶段
FROM base AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 Next.js 项目 (注意：Next.js 打包时需要能读到正确的 NEXT_PUBLIC_ 环境变量，
# 所以如果在打包时环境还没准备好，可以允许部分缺失，或者用一个占位 .env 构建)
# 这里关闭 next 的 telemetry
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 阶段三：运行阶段 (最终产物镜像)
FROM base AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建数据存储目录，用于存放 SQLite 文件
RUN mkdir -p /app/data

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# 如果你有单独的脚本或配置需要保留，也可以 COPY 过来

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动命令：在启动前自动执行 prisma db push 以确保数据库结构是最新的
# (注意：因为我们使用的是 standalone 模式，入口是 server.js)
CMD ["sh", "-c", "npx prisma db push && node server.js"]
