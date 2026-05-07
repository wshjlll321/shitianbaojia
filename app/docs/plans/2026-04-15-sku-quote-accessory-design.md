# 数字化报价系统（SKU版本 + 配件适配 + PDF模板）设计文档

**Goal：**让“产品/配件”可独立维护；配件新增/维护时可标注“适配哪些产品可选配”；创建报价时可选择**机型版本（SKU）**并选配配件；生成的**报价预览页**与**导出 PDF**在中英双语下，完整展示两份参考 PDF（H15、T280）涉及的字段与版式要素。

**Architecture：**以 `Product` 表示机型/配件实体，以 `SKU` 表示“版本/套装”；以 `ProductAccessory` 表示“某机型可选配哪些配件（可推荐）”；报价生成时将选择结果写入 `Quote/QuoteItem`，并按“模板映射层”渲染预览页与 PDF（H15/T280 两种模板）。

**Tech Stack：**Next.js App Router、Prisma + SQLite（`dev.db`）、next-intl（中英）、@react-pdf/renderer（PDF 导出）、Tailwind/全局 CSS（现有 UI 风格延续）。

---

## 1. 业务对象与关系

### 1.1 Product（机型/配件）

- `Product.category`：
  - `drone`：机型
  - `accessory`：配件/挂载
- 多语言字段保留现状（`nameZh/nameEn`、`featuresZh/featuresEn`、`specsZh/specsEn`）。
- 价格字段保留现状（`msrp/exwPrice/fobPrice`），但“版本价格”优先来自 SKU。

### 1.2 SKU（版本/套装）

用于表达同一机型的不同报价版本，典型例子：

- **H15**：
  - SKU-Standard：标准版（包含：机体 + 遥控器 + 电池 + 充电器 + *默认挂载：先飞 D80AI*）
  - SKU-Professional：专业版（包含：机体 + 遥控器 + 电池 + 充电器 + *默认挂载：INYYO Q30Pro*）
- **T280**：
  - 可先只有一个“标配”SKU（机体+遥控器），后续再扩展“大单价/满10架价”等为高级能力。

SKU 在 UI 上体现为：创建报价第 1 步选机型后，必须选一个 SKU（默认 SKU 可自动选中）。

### 1.3 ProductAccessory（适配关系）

保持现有模型：

- `mainProductId`（机型）
- `accessoryId`（配件）
- `isRecommended`（推荐标记）

在“配件管理”页也要能看到“该配件适配哪些机型”（反向查询展示）。

### 1.4 Quote / QuoteItem（报价）

报价记录需要从“机型 + SKU + 配件”生成，要求：

- `QuoteItem` 必须能指向 SKU（用于 PDF 模板渲染与版本信息展示）。
- `QuoteItem` 继续保留快照字段（`nameZh/nameEn/unitPrice/quantity/...`），避免后续产品改名改价影响历史报价。

---

## 2. 数据库变更（Prisma）

### 2.1 QuoteItem 增加 SKU 关联（推荐）

在 `QuoteItem` 增加：

- `skuId String?`
- `sku SKU? @relation(fields: [skuId], references: [id])`
- 可选冗余字段（如果需要更稳定的历史快照）：
  - `skuName String @default("")`（用于显示“标准版/专业版”，避免 SKU 改名影响历史报价）

### 2.2 SKU 增强字段（建议）

`SKU` 增加更清晰的多语言/默认选择能力：

- `labelZh String`、`labelEn String`（版本名称，如“标准版/专业版”）
- `isDefault Boolean @default(false)`（同一 Product 下最多 1 个）
- `kind String @default("bundle")`（预留：bundle / service / discount 等）

价格字段：继续使用 `SKU.price`，且在报价生成时以 SKU 价格作为主项单价来源（优先于 Product 价格）。

---

## 3. 页面与功能设计

### 3.1 产品管理（机型）

沿用现有：

- 列表：`/sales/products`
- 编辑：`/sales/products/[id]`
- 在机型编辑页继续提供“配件关联管理”（已存在），用于声明该机型可选配哪些配件。

新增：

- “版本（SKU）管理”区块：
  - 增删改 SKU（标准版/专业版）
  - 设置默认 SKU

### 3.2 配件管理（新增页面）

新增：

- 列表：`/sales/accessories`（目前导航已有但页面缺失）
- 编辑：`/sales/accessories/[id]`（复用 `ProductEditorForm` 的大部分能力）

配件编辑页展示：

- 价格、图片、多语言、卖点、技术参数（复用）
- “适配机型”只读展示（反向查询 `ProductAccessory`，展示该配件可用于哪些机型，并显示是否推荐）
  - 适配关系的维护入口保持在“机型编辑页”，避免双向编辑带来的冲突（YAGNI，先收敛到单向维护）。

### 3.3 报价创建（升级：机型 + SKU + 配件）

现有：`/sales/quote/new` 的 4 步配置器（机型 → 配件 → 客户信息 → 确认报价）。

改造：

- **Step 1（选择机型）**：选中机型后，在卡片内/侧边弹出 SKU 选择：
  - 必选：SKU（默认选中 `isDefault` 的 SKU）
  - 展示：SKU 的版本名（中英）+ 价格（FOB 或自定义显示）
  - 若机型没有 SKU：提示去“机型编辑页”新增 SKU（并提供快捷链接）。
- **Step 2（选配配件）**：保持现有逻辑（只展示适配配件；若未配置适配则 fallback 为全量配件）。
- **Step 4（确认报价）**：主项显示“机型型号 + SKU 版本名”，并在 PDF/预览中体现版本信息。

### 3.4 报价预览（分享页）与导出 PDF（模板化）

目标：对齐两份参考 PDF 的字段集合与结构要点，同时保持“现代审美 UI”。

#### 3.4.1 字段集合（来自两份 PDF 的并集）

**头部/公司信息（SystemConfig）**
- 公司名称（现固定在 UI/PDF，可配置化）
- 地址、电话、邮箱、网址（建议进入 SystemConfig，可维护）
- Logo（已有：`company_logo`）
- 公章（已有：`company_seal`）

**客户信息（Quote）**
- To（客户公司名）`clientName`
- 联系人 `clientContact`（可空）
- 邮箱 `clientEmail`（可空）
- 报价日期 `quoteDate`
- 有效期 `validUntil`

**产品内容（Product + SKU）**
- 产品技术特点（features）——按多语言
- 技术参数（specs）——按多语言
- 版本/配置说明（SKU label + SKU 描述，可选）

**报价区（QuoteItem）**
- 主项（机型 + SKU）
- 配件清单（可选配）
- 价格字段：工厂交货价（EXW）、市场指导价（MSRP）、FOB（当前系统以 FOB 为主；其余可按模板选择展示）

**条款（Quote）**
- 质保 warranty
- 培训 training（H15/T280 PDF 有）
- 交付周期 deliveryTime
- 付款方式 paymentTerms
- 制备人 preparedBy（当前写在 PDF 里；建议从 sales 名称映射）

#### 3.4.2 模板策略

引入 `quoteTemplateKey`（推导规则优先）：

- 若主机型 `model` 为 `H15` → `H15_TEMPLATE`
- 若 `model` 为 `T280` → `T280_TEMPLATE`
- 其他 → `GENERIC_TEMPLATE`

渲染差异：

- **H15_TEMPLATE**：报价区展示“标准版/专业版”对比表（来自 SKU 列表）；若用户仅选择一个 SKU，则只展示该列。
- **T280_TEMPLATE**：报价区展示“标配 + 选装配件”列表（类似参考 PDF 的 Optional Parts）。

---

## 4. API 设计（新增/补齐）

当前缺口：`ProductEditorForm` 在新建时调用 `/api/sales/products`，但该 route 不存在，需要补齐。

建议新增：

- `POST /api/sales/products`
  - 创建 `Product`（机型/配件）
  - 允许传 `category`
- `GET /api/sales/products?category=drone|accessory`
  - 列表（后台管理使用）
- `POST /api/sales/products/:id/skus` / `PUT` / `DELETE`
  - SKU 管理（按产品维度）

报价创建改造：

- `POST /api/sales/quote` 增加 `mainSkuId`
  - 主项单价来自 SKU.price（优先）
  - 写入 `QuoteItem.skuId` / `skuName`

---

## 5. 多语言范围（中英）

- 后台维护页面：主要中文即可，但关键按钮/提示可逐步接入 next-intl（YAGNI：先保证分享页与 PDF 中英一致）。
- 分享预览页：`/[locale]/q/[shareToken]` 现已支持 `zh/en/th`，将收敛到 `zh/en`，并隐藏泰文切换。
- PDF：`/api/quote/[shareToken]/pdf?locale=zh|en` 支持中英，字体继续使用 NotoSansSC（英文同样可用）。

---

## 6. 验收标准（Definition of Done）

- **产品与配件**都能在后台独立增删改；配件能看到“适配机型列表”，机型可维护“可选配件 + 推荐”。
- **机型 SKU**可维护（至少支持 H15 标准/专业、T280 标配），创建报价必选 SKU。
- **创建报价**生成的分享预览页 UI 美观（现有分享页风格延续），中英切换正常。
- **导出 PDF**（H15/T280）字段覆盖参考 PDF 的关键信息：To/日期/有效期、技术特点、技术参数、报价明细、条款、制备人/销售联络。

