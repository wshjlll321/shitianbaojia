# SKU Quote & Accessory + PDF Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add SKU-based product versions, a standalone accessories management UI, accessory-to-product compatibility labeling, and quote preview/PDF templates (H15/T280) with Chinese/English support.

**Architecture:** Use `Product` for drones/accessories, `SKU` for versions/bundles, `ProductAccessory` for compatibility, and extend `QuoteItem` to reference the selected SKU. Render quote preview/PDF via template key inferred from main product model.

**Tech Stack:** Next.js App Router, Prisma (SQLite), next-intl, @react-pdf/renderer, Tailwind/global CSS.

---

### Task 1: Verify current routes and fix missing `/api/sales/products`

**Files:**
- Create: `src/app/api/sales/products/route.ts`
- Read: `src/app/sales/products/[id]/ProductEditorForm.tsx`

**Step 1: Write a minimal API route for create/list**

- Implement `GET` (optional) and **must** implement `POST` to create `Product`.
- Validate required fields: `model`, `category`, `nameZh`.

**Step 2: Run dev server & smoke test**

Run: `npm run dev`

Expected:
- Creating a new drone/accessory in UI succeeds (no 404 on `/api/sales/products`).

**Step 3: (If git exists) Commit**

```bash
git add src/app/api/sales/products/route.ts
git commit -m "feat(api): add sales products create endpoint"
```

---

### Task 2: Add Accessories Management pages

**Files:**
- Create: `src/app/sales/accessories/page.tsx`
- Create: `src/app/sales/accessories/[id]/page.tsx`
- Reuse/Modify: `src/app/sales/products/[id]/ProductEditorForm.tsx`
- Modify (optional): `src/app/sales/layout.tsx` (nav already present)

**Step 1: Implement `/sales/accessories` list page**

- Query `prisma.product.findMany({ where: { category: "accessory" } })`
- UI table similar to `/sales/products` but with "配件管理" title and "新增配件" button.

**Step 2: Implement accessory edit page**

- Fetch accessory by id; reuse `ProductEditorForm` with `product.category = "accessory"`.
- Add a read-only “适配机型” section by querying reverse relations:
  - `prisma.productAccessory.findMany({ where: { accessoryId }, include: { mainProduct: true } })`

**Step 3: Smoke test**

Expected:
- `/sales/accessories` loads
- edit accessory works, save works
- compatibility list shows the drones that reference this accessory

---

### Task 3: SKU data model upgrades (Prisma)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts` (if present and used)

**Step 1: Update schema**

- Add to `SKU`:
  - `labelZh String @default("")`
  - `labelEn String @default("")`
  - `isDefault Boolean @default(false)`
- Add to `QuoteItem`:
  - `skuId String?`
  - `sku SKU? @relation(fields: [skuId], references: [id])`
  - `skuName String @default("")`

**Step 2: Push DB**

Run: `npm run db:push`

Expected:
- Prisma push succeeds
- `dev.db` updated

---

### Task 4: SKU management UI for drones

**Files:**
- Modify: `src/app/sales/products/[id]/ProductEditorForm.tsx`
- Create: `src/app/api/sales/products/[id]/skus/route.ts`
- (Optional) Create: `src/components/SkuEditor.tsx`

**Step 1: Add API for SKUs**

Endpoints:
- `GET /api/sales/products/:id/skus`
- `POST /api/sales/products/:id/skus` (create)
- `PUT /api/sales/products/:id/skus` (bulk update) or `PUT /.../skus/:skuId`
- `DELETE /.../skus/:skuId`

**Step 2: Add UI section “版本（SKU）管理”**

- List SKUs for the product (name zh/en, price, default)
- Add SKU modal/inline form
- Ensure only one `isDefault` per product (enforce in API)

**Step 3: Seed initial SKUs for H15/T280**

- H15: 标准版/专业版
- T280: 标配

---

### Task 5: Quote builder supports selecting SKU

**Files:**
- Modify: `src/app/sales/quote/new/page.tsx` (include SKUs)
- Modify: `src/app/sales/quote/new/QuoteBuilderForm.tsx`
- Modify: `src/app/api/sales/quote/route.ts`

**Step 1: Load SKUs for main products**

- In `NewQuotePage`, include `skus` when fetching `mainProducts`.

**Step 2: Add UI for SKU selection in step 1**

- Add state `selectedSkuId`
- On drone select: auto-select default SKU if present
- Price calculation: main item price should use SKU.price first

**Step 3: Send `mainSkuId` to quote API**

**Step 4: Update quote API**

- Fetch SKU by id and ensure it belongs to main product
- Use SKU.price for unit price of main item
- Write `QuoteItem.skuId` and `QuoteItem.skuName` (locale-independent display name like “标准版/专业版”)

---

### Task 6: Quote preview templates (H15/T280) and locale cleanup (zh/en)

**Files:**
- Modify: `src/app/[locale]/q/[shareToken]/page.tsx`
- Modify: `src/components/pdf/QuoteDocument.tsx`
- Modify: `src/app/api/quote/[shareToken]/pdf/route.tsx`

**Step 1: Introduce template key inference**

- `templateKey = mainProduct.model === "H15" ? "H15" : mainProduct.model === "T280" ? "T280" : "GENERIC"`

**Step 2: H15 template rendering**

- If quote has multiple SKUs: render a 2-column comparison table using SKUs (standard/professional)
- If quote has selected SKU only: render single-column version block

**Step 3: T280 template rendering**

- Render “标配 + 选装配件” section emphasizing optional parts list

**Step 4: Locale cleanup**

- Hide/remove `th` options in UI switcher for share page and PDF route locale parsing (keep backward-compatible parsing but don’t show Thai).

---

### Task 7: SystemConfig fields for company info (optional but recommended for PDF parity)

**Files:**
- Modify: `prisma/schema.prisma` (already has `SystemConfig`)
- Modify: `src/app/sales/settings/page.tsx`
- Modify: `src/app/api/settings/route.ts`
- Modify: `src/components/pdf/QuoteDocument.tsx`
- Modify: `src/app/[locale]/q/[shareToken]/page.tsx`

**Step 1: Add settings keys**

- `company_address`
- `company_phone`
- `company_email`
- `company_website`

**Step 2: Render them in preview/PDF header**

Expected:
- Matches reference PDFs header fields.

---

### Task 8: Verification

**Step 1: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 2: Manual E2E smoke**

- Create/edit accessories
- Link accessories to drones
- Add/edit SKUs and set default
- Create quote selecting SKU and some accessories
- Open share preview in zh/en
- Download PDF in zh/en

---

Plan complete and saved to `docs/plans/2026-04-15-sku-quote-accessory-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration  
**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?

