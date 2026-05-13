# 使用官方的 Node.js 轻量级镜像 (使用 slim 避免 better-sqlite3 在 alpine 下的编译报错)
FROM node:22-slim AS base

# 阶段一：安装依赖
FROM base AS deps
WORKDIR /app

# 替换为阿里云镜像源以解决国内服务器卡死的问题
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || true && \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list || true
# 安装编译依赖包（better-sqlite3 在没有预编译包时需要 python3, make 和 g++ 进行源码编译）
RUN apt-get update -y && apt-get install -y openssl python3 make g++

# 复制 package.json 和锁文件
COPY package.json package-lock.json ./

# 设置 Prisma 镜像源，防止从 GitHub 下载底层引擎卡死
ENV PRISMA_ENGINES_MIRROR=https://npmmirror.com/mirrors/prisma

# 删除 package-lock.json，防止它强制按记录的国外源下载，并设置淘宝源
RUN rm -f package-lock.json && \
    npm config set registry https://registry.npmmirror.com && \
    npm install

# 阶段二：构建阶段
FROM base AS builder
WORKDIR /app
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || true && \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list || true
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

RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || true && \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list || true
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
COPY --from=builder /app/prisma.config.ts ./
# 如果你有单独的脚本或配置需要保留，也可以 COPY 过来

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动命令：在启动前自动执行 prisma db push 以确保数据库结构是最新的
# (注意：因为我们使用的是 standalone 模式，入口是 server.js)
CMD ["sh", "-c", "npx prisma db push && node server.js"]
