# 世天航空 · 数字化报价系统

> SHYTIAN Aviation Digital Quotation System — 面向全球客户的无人机报价与客户门户平台

## 📦 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 语言 | TypeScript / React 19 |
| 数据库 | SQLite (better-sqlite3 + Prisma ORM) |
| 认证 | NextAuth v5 (Credentials Provider) |
| 国际化 | next-intl（中/英/泰） |
| PDF 生成 | @react-pdf/renderer |
| 文件存储 | 阿里云 OSS + CDN 加速 |
| AI 助手 | 阿里百炼 (DashScope) |

---

## 🚀 快速开始（本地开发）

### 1. 安装依赖

```bash
cd app
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填写以下必要配置：

```bash
cp .env.example .env
```

```env
# ====== 基础配置 ======
DATABASE_URL="file:./dev.db"
AUTH_SECRET="你的随机密钥"                    # 用于 NextAuth 加密

# 访问地址（部署时改为你的域名）
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PUBLIC_APP_URL="http://localhost:3000"

# ====== 阿里云 OSS（图片/文件存储）======
OSS_REGION="oss-ap-southeast-1"              # OSS 区域
OSS_BUCKET="shitian-quete1-assets"           # Bucket 名称
OSS_ACCESS_KEY_ID="你的AccessKeyID"
OSS_ACCESS_KEY_SECRET="你的AccessKeySecret"
OSS_CDN_DOMAIN="cdn-quote.shitianuav.com"    # CDN 加速域名（可选，不填则用 OSS 直连）

# ====== 阿里百炼 AI 助手（可选）======
DASHSCOPE_API_KEY="你的百炼API密钥"
DASHSCOPE_APP_ID="你的百炼应用ID"
```

### 3. 初始化数据库

```bash
# 创建数据库表结构
npm run db:push

# 填充初始数据（产品、用户、演示报价单等）
npm run db:seed
```

> 🔑 初始化完成后默认生成以下账号：
>
> | 角色 | 用户名 | 密码 |
> |---|---|---|
> | 销售员 | `lintao` | `shytian2026` |
> | 管理员 | `admin` | `admin2026` |

### 4. 启动开发服务器

```bash
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可访问。

---

## 🖼️ 静态资源说明（Logo / 公章 / 产品图）

本系统的所有图片资源均存储在**阿里云 OSS** 并通过 CDN 加速分发，不依赖本地文件系统。

### 已内置的资源清单

以下资源已预置在 `prisma/seed.ts` 中，执行 `npm run db:seed` 时会自动写入数据库：

| 资源 | CDN 地址 | 说明 |
|---|---|---|
| 公司 Logo | `https://cdn-quote.shitianuav.com/uploads/logo.png` | PDF 报价单头部、客户门户 |
| 公司公章 | `https://cdn-quote.shitianuav.com/uploads/seal.png` | PDF 报价单签章区域 |
| T280 无人机 | `https://cdn-quote.shitianuav.com/uploads/old-drone-1.png` | 产品主图 |
| H15 无人机 | `https://cdn-quote.shitianuav.com/uploads/old-drone-4.png` | 产品主图 |
| H60 植保机 | `https://cdn-quote.shitianuav.com/uploads/old-drone-3.png` | 产品主图 |
| 光电吊舱 | `https://cdn-quote.shitianuav.com/images/gimbal.svg` | 配件图 |
| 数据链路 | `https://cdn-quote.shitianuav.com/images/datalink.svg` | 配件图 |
| 多光谱相机 | `https://cdn-quote.shitianuav.com/images/multispectral.svg` | 配件图 |
| 降落伞系统 | `https://cdn-quote.shitianuav.com/images/parachute.svg` | 配件图 |

### 更换 Logo / 公章

登录后台 → **系统设置 (Settings)** 页面 → 直接拖拽上传新图片即可。上传后自动存入阿里云 OSS。

- **Logo 推荐尺寸**：400 × 120 px，PNG 透明背景
- **公章推荐尺寸**：300 × 300 px，PNG 透明背景
- **文件大小限制**：≤ 5 MB

---

## 🌐 生产部署

### 方式一：直接部署（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
#    编辑 .env 文件，确保以下关键配置正确：
#    - AUTH_URL / NEXT_PUBLIC_APP_URL / PUBLIC_APP_URL → 改为你的正式域名
#    - AUTH_SECRET → 改为一个强随机字符串
#    - OSS_* → 阿里云 OSS 相关配置

# 3. 初始化数据库
npm run db:push
npm run db:seed

# 4. 构建生产版本
npm run build

# 5. 启动
npm run start
```

### 方式二：使用 PM2 守护进程

```bash
# 安装 PM2
npm install -g pm2

# 构建并启动
npm run build
pm2 start npm --name "shytian-quote" -- start

# 查看状态
pm2 status

# 设置开机自启
pm2 save
pm2 startup
```

### 方式三：Docker 部署（推荐）

本项目已内置 `docker-compose.yml`，非常适合在服务器上一键部署。

1. **上传代码到服务器**并进入 `app` 目录。
2. **配置环境变量**：修改 `docker-compose.yml` 中的环境变量（数据库路径会自动映射，无需更改）。
3. **启动服务**：
   ```bash
   docker-compose build quote-system
   docker-compose up -d
   ```

---

## 🛡️ 进阶：免备案域名部署方案（国内服务器 + 阿里云海外 CDN）

如果你的服务器在国内，但域名**没有备案**，可以通过阿里云全站加速（DCDN）绕过机房防火墙的 80/443 端口拦截。

### 1. 核心原理
- 防火墙只拦截带有未备案域名的 HTTP/HTTPS 请求。
- 通过配置 CDN 在回源时隐藏域名（将 `Host` 头替换为服务器 IP），使防火墙认为这是一次纯 IP 访问从而放行。

### 2. 详细配置步骤

**第一步：配置阿里云 DCDN**
1. 在阿里云开通**全站加速 (DCDN)**。
2. 添加域名，加速区域必须选择 **“全球（不包含中国内地）”**。
3. 源站信息选择 **“IP”**，填入你的服务器公网 IP，端口填入 `docker-compose` 暴露的端口（如 `18563`）。

**第二步：修改 CDN 回源 HOST**
1. 在 CDN 控制台的“回源配置”中，找到“默认回源HOST”。
2. 修改配置，选择 **“自定义域名”**，并强制填入你服务器的 **公网 IP 地址**。

**第三步：配置 Next.js 和 NextAuth 信任代理**
因为 CDN 修改了 `Host` 头，Next.js 的安全机制会触发 500 错误。必须在代码中做以下修改：
1. **信任 NextAuth Host**：在 `docker-compose.yml` 中必须添加 `AUTH_TRUST_HOST=true`。
2. **允许 Server Actions 跨域**：在 `next.config.ts` 中配置允许的 Origin：
   ```typescript
   experimental: {
     serverActions: {
       allowedOrigins: ['quote.shitianuav.com', '服务器IP', '服务器IP:端口'],
     },
   },
   ```

**第四步：清理缓存**
每次重新打包 (`docker-compose build`) 后，**必须在 CDN 控制台执行“刷新预热”**，清理全站缓存，否则前端会报错 `UnrecognizedActionError`。

---

## ⚠️ 部署注意事项

### 环境变量清单

| 变量名 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite 数据库路径 |
| `AUTH_SECRET` | ✅ | NextAuth 加密密钥，**必须修改为随机值** |
| `AUTH_URL` | ✅ | 系统访问地址（含协议和端口） |
| `NEXT_PUBLIC_APP_URL` | ✅ | 前端可见的访问地址 |
| `PUBLIC_APP_URL` | ✅ | 服务端使用的访问地址 |
| `OSS_REGION` | ✅ | 阿里云 OSS 区域 |
| `OSS_BUCKET` | ✅ | OSS Bucket 名称 |
| `OSS_ACCESS_KEY_ID` | ✅ | 阿里云 AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | ✅ | 阿里云 AccessKey Secret |
| `OSS_CDN_DOMAIN` | ⬚ | CDN 加速域名（不填则用 OSS 默认域名） |
| `DASHSCOPE_API_KEY` | ⬚ | 阿里百炼 API Key（AI 助手功能） |
| `DASHSCOPE_APP_ID` | ⬚ | 阿里百炼应用 ID |

### 阿里云 OSS 配置要求

1. **Bucket 权限**：设置为 `公共读`（Public Read），确保客户能直接访问产品图片和 PDF
2. **跨域设置 (CORS)**：添加允许来源 `*` 或你的正式域名
3. **CDN 域名**（可选）：在阿里云 CDN 控制台绑定你的自定义域名，并在 `.env` 中配置 `OSS_CDN_DOMAIN`

### 数据库备份

SQLite 数据库文件为 `dev.db`，位于项目根目录。建议定期备份：

```bash
# 手动备份
cp dev.db dev.db.backup.$(date +%Y%m%d)

# 定时备份（crontab）
0 2 * * * cp /path/to/app/dev.db /path/to/backup/dev.db.$(date +\%Y\%m\%d)
```

---

## 📂 项目结构

```
app/
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   └── seed.ts            # 初始数据（含产品/用户/OSS图片链接）
├── src/
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── sales/         # 销售后台页面
│   │   ├── admin/         # 管理员后台页面
│   │   ├── [locale]/q/    # 客户报价门户（多语言）
│   │   └── i/             # 邀请码入口
│   ├── components/
│   │   └── pdf/           # PDF 报价单模板
│   ├── lib/
│   │   ├── prisma.ts      # 数据库连接
│   │   └── auth.ts        # 认证配置
│   └── i18n/              # 国际化配置
├── messages/
│   ├── zh.json            # 中文翻译
│   └── en.json            # 英文翻译
├── public/                # 静态资源（本地备份）
├── docs/                  # 项目文档
├── .env                   # 环境变量（不提交到 Git）
└── package.json
```

---

## 📋 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run db:push      # 同步数据库结构
npm run db:seed      # 填充初始数据
npm run db:reset     # 重置数据库（⚠️ 会清空所有数据）
npm run db:studio    # 打开 Prisma Studio（数据库可视化管理）
npm run lint         # ESLint 代码检查
npm run test         # 运行测试
```
