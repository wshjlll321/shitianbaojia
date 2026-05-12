"use client";

import { useMemo, useState } from "react";
import AiChat from "@/components/AiChat";

type Sku = {
  id: string;
  name: string;
  nameEn?: string | null;
  labelZh: string | null;
  labelEn?: string | null;
  descZh?: string | null;
  descEn?: string | null;
  includesZh?: string | null; // JSON Array string
  includesEn?: string | null;
  price: number;
  isDefault: boolean;
};

type Accessory = {
  id: string;
  model: string;
  nameZh: string;
  nameEn?: string | null;
  imageUrl: string;
  msrp: number;
  fobPrice: number;
  isRecommended: boolean;
  skus?: Sku[]; // 该配件可选 SKU 变体
};

type Drone = {
  id: string;
  model: string;
  nameZh: string;
  nameEn: string;
  imageUrl: string;
  msrp: number;
  fobPrice: number;
  skus: Sku[];
  accessories: { accessory: Accessory; isRecommended: boolean }[];
};

type Invite = {
  code: string;
  clientName: string;
  clientContact: string;
  clientEmail: string;
  currency: string;
  deliveryTerms: string;
  discount: number;
  validDays: number;
};


const DICT = {
  zh: {
    langToggle: "EN",
    pageTitlePrefix: "报价 · ",
    eyebrow: "QUOTATION FOR",
    step0: "选择机型",
    step1: "选择配置",
    step2: "选择配件",
    step3: "确认提交",
    step0Title: "选择无人机机型",
    step0Desc: "点击卡片选择您需要的机型",
    step1Title: "选择配置版本",
    step1DescSuffix: " —— 不同版本配置和价格不同",
    step2Title: "选配配件",
    step2Desc: "可多选；如不需要直接点\"{t.btnNext}\"",
    step3Title: "确认报价信息",
    step3Desc: "{t.step3Desc}",
    errNoDrone: "请选择无人机",
    errNoSku: "请选择配置版本",
    errIncomplete: "信息不完整，请返回检查",
    submitFail: "提交失败",
    networkErr: "网络错误",
    defaultTag: "默认",
    recommendedTag: "推荐",
    includesMore: (n: number) => `…等 ${n} 项`,
    btnRemove: "移除",
    btnAdd: "添加",
    accSkuLabel: "配置版本",
    reviewClientTitle: "客户信息",
    reviewClientRef: "客户",
    reviewContact: "联系人",
    reviewEmail: "邮箱",
    reviewTermsTitle: "报价参数",
    reviewCurrency: "币种",
    reviewDelivery: "贸易条款",
    reviewValid: "有效期",
    reviewValidDays: " 天",
    reviewSelectionTitle: "您的选择",
    reviewNoAcc: "未选配件",
    reviewSubtotal: "小计",
    reviewDiscount: (d: number) => `专属折扣 (${d}%)`,
    reviewTotal: "含税总金额",
    btnPrev: "{t.btnPrev}",
    btnNext: "{t.btnNext}",
    btnSubmitLoad: "提交中...",
    btnSubmit: "确认并生成报价单",
    aiGreeting: "您好 {name}！我是您的 AI 选购助手。如对机型、配置或配件不熟悉，可以随时问我，例如使用场景、载重需求、续航要求等，我会帮您挑选最合适的方案。"
  },
  en: {
    langToggle: "中文",
    pageTitlePrefix: "Quote · ",
    eyebrow: "QUOTATION FOR",
    step0: "Select Model",
    step1: "Select Configuration",
    step2: "Select Accessories",
    step3: "Review & Submit",
    step0Title: "Select Drone Model",
    step0Desc: "Click a card to select the model you need",
    step1Title: "Select Configuration Version",
    step1DescSuffix: " — Different versions have different configurations and prices",
    step2Title: "Select Accessories",
    step2Desc: "Multiple selection allowed; click 'Next' if not needed",
    step3Title: "Review Quotation Info",
    step3Desc: "A formal quotation will be generated upon submission. This invite code cannot be reused.",
    errNoDrone: "Please select a drone",
    errNoSku: "Please select a configuration version",
    errIncomplete: "Incomplete information, please go back and check",
    submitFail: "Submission failed",
    networkErr: "Network error",
    defaultTag: "Default",
    recommendedTag: "Recommended",
    includesMore: (n: number) => `...and ${n} more items`,
    btnRemove: "Remove",
    btnAdd: "Add",
    accSkuLabel: "Version",
    reviewClientTitle: "Client Info",
    reviewClientRef: "Client",
    reviewContact: "Contact",
    reviewEmail: "Email",
    reviewTermsTitle: "Quotation Terms",
    reviewCurrency: "Currency",
    reviewDelivery: "Incoterms",
    reviewValid: "Valid Until",
    reviewValidDays: " Days",
    reviewSelectionTitle: "Your Selection",
    reviewNoAcc: "No accessories selected",
    reviewSubtotal: "Subtotal",
    reviewDiscount: (d: number) => `Special Discount (${d}%)`,
    reviewTotal: "GRAND TOTAL (INCL. TAX)",
    btnPrev: "Previous",
    btnNext: "Next",
    btnSubmitLoad: "Submitting...",
    btnSubmit: "Confirm & Generate Quotation",
    aiGreeting: "Hello {name}! I am your AI purchasing assistant. If you are unfamiliar with the models, configurations, or accessories, feel free to ask me about usage scenarios, payload requirements, endurance, etc., and I will help you choose the best solution."
  }
};

function parseStringArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export default function CustomerQuoteBuilder({
  invite,
  drones,
  aiInitialMessages = [],
}: {
  invite: Invite;
  drones: Drone[];
  aiInitialMessages?: { role: "user" | "assistant"; content: string; ts?: number }[];
}) {
  const [step, setStep] = useState(0);
  const [droneId, setDroneId] = useState(drones[0]?.id || "");
  const [skuId, setSkuId] = useState(
    drones[0]?.skus.find((s) => s.isDefault)?.id || drones[0]?.skus[0]?.id || "",
  );
  const [accs, setAccs] = useState<{ id: string; qty: number; skuId?: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [locale, setLocale] = useState<"zh" | "en">("zh");

  const t = DICT[locale];
  const STEP_LABELS = [t.step0, t.step1, t.step2, t.step3];
  const L = (zh: string | null | undefined, en: string | null | undefined) => (locale === 'en' ? en || zh : zh) || '';

  const drone = drones.find((d) => d.id === droneId);
  const sku = drone?.skus.find((s) => s.id === skuId);
  const availableAccessories = useMemo(
    () =>
      drone?.accessories.map((a) => ({ ...a.accessory, isRecommended: a.isRecommended })) || [],
    [drone],
  );
  const hasAccessories = availableAccessories.length > 0;

  const sym = invite.currency === "CNY" ? "¥" : invite.currency === "USD" ? "$" : "฿";
  const fmt = (v: number) =>
    `${sym}${new Intl.NumberFormat("zh-CN").format(Math.round(v))}`;

  const mainPrice = sku ? Number(sku.price) : drone ? Number(drone.fobPrice || drone.msrp) : 0;
  // 配件单价：若选了 SKU 用 SKU 价；否则用 fobPrice/msrp
  const accUnitPrice = (a: Accessory, skuId?: string) => {
    if (skuId && a.skus) {
      const s = a.skus.find((x) => x.id === skuId);
      if (s) return Number(s.price);
    }
    return Number(a.fobPrice || a.msrp);
  };
  const accSum = accs.reduce((s, a) => {
    const p = availableAccessories.find((x) => x.id === a.id);
    return s + (p ? accUnitPrice(p, a.skuId) * a.qty : 0);
  }, 0);
  const subtotal = mainPrice + accSum;
  const total = subtotal * (1 - invite.discount / 100);

  const switchDrone = (id: string) => {
    setDroneId(id);
    const d = drones.find((x) => x.id === id);
    setSkuId(d?.skus.find((s) => s.isDefault)?.id || d?.skus[0]?.id || "");
    setAccs([]);
  };

  const toggleAcc = (id: string) => {
    setAccs((prev) => {
      if (prev.find((a) => a.id === id)) return prev.filter((a) => a.id !== id);
      // 添加时，若该配件有 SKU 变体则默认选第一个（优先 isDefault）
      const acc = availableAccessories.find((x) => x.id === id);
      const defaultSkuId =
        acc?.skus && acc.skus.length > 0
          ? acc.skus.find((s) => s.isDefault)?.id || acc.skus[0].id
          : undefined;
      return [...prev, { id, qty: 1, skuId: defaultSkuId }];
    });
  };
  const updateQty = (id: string, delta: number) => {
    setAccs((prev) =>
      prev.map((a) => (a.id === id ? { ...a, qty: Math.max(1, a.qty + delta) } : a)),
    );
  };
  const setAccSku = (id: string, skuId: string) => {
    setAccs((prev) => prev.map((a) => (a.id === id ? { ...a, skuId } : a)));
  };

  // 步骤跳转：如果该机型无可选配件，自动跳过 step 2
  const goNext = () => {
    setErr(null);
    if (step === 0) {
      if (!droneId) return setErr(t.errNoDrone);
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!skuId) return setErr(t.errNoSku);
      setStep(hasAccessories ? 2 : 3);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
  };
  const goPrev = () => {
    setErr(null);
    if (step === 3 && !hasAccessories) {
      setStep(1);
      return;
    }
    setStep(Math.max(step - 1, 0));
  };

  const submit = async () => {
    if (!droneId || !skuId) {
      setErr(t.errIncomplete);
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/invites/${invite.code}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainProductId: droneId,
          mainSkuId: skuId,
          accessories: accs.map((a) => ({ id: a.id, qty: a.qty, skuId: a.skuId || null })),
        }),
      });
      const data = await res.json();
      if (data.success && data.shareToken) {
        window.location.href = `/${locale}/q/${data.shareToken}`;
      } else {
        setErr(data.error || t.submitFail);
      }
    } catch (e) {
      console.error(e);
      setErr(t.networkErr);
    } finally {
      setLoading(false);
    }
  };

  // 步骤总数（考虑可能跳过配件步骤）
  const visibleSteps = hasAccessories ? STEP_LABELS : STEP_LABELS.filter((_, i) => i !== 2);
  const visibleStepIndex =
    !hasAccessories && step === 3 ? 2 : !hasAccessories && step === 1 ? 1 : step;

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f5f5f2" />
        <title>{t.pageTitlePrefix}{invite.clientName}</title>
        <style>{styles}</style>
      </head>
      <body>
        {/* 顶部 */}
        
        <header className="cq-header">
          <button
            type="button"
            className="lang-switch"
            onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
          >
            {t.langToggle}
          </button>

          <div className="cq-header-inner">
            <div className="cq-brand">
              <div className="cq-brand-eyebrow">{t.eyebrow}</div>
              <div className="cq-brand-name">{invite.clientName}</div>
            </div>
            <div className="cq-step-counter">
              <span className="cq-current">{visibleStepIndex + 1}</span>
              <span className="cq-total">/ {visibleSteps.length}</span>
            </div>
          </div>
          {/* 进度条 */}
          <div className="cq-progress">
            <div
              className="cq-progress-fill"
              style={{ width: `${((visibleStepIndex + 1) / visibleSteps.length) * 100}%` }}
            />
          </div>
        </header>

        {/* 步骤指示器（桌面端展示更详细） */}
        <div className="cq-stepper">
          {visibleSteps.map((label, i) => (
            <div
              key={label}
              className={`cq-step ${i < visibleStepIndex ? "done" : i === visibleStepIndex ? "active" : "pending"}`}
            >
              <div className="cq-step-dot">{i < visibleStepIndex ? "✓" : i + 1}</div>
              <div className="cq-step-label">{label}</div>
            </div>
          ))}
        </div>

        <main className="cq-main">
          {/* ─── Step 0: 选择机型 ─── */}
          {step === 0 && (
            <section className="cq-step-content">
              <h2 className="cq-step-title">{t.step0Title}</h2>
              <p className="cq-step-desc">{t.step0Desc}</p>
              <div className="cq-grid">
                {drones.map((d) => {
                  const active = d.id === droneId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => switchDrone(d.id)}
                      className={`cq-card cq-drone ${active ? "active" : ""}`}
                    >
                      <div className="cq-drone-image">
                        {d.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.imageUrl} alt={L(d.nameZh, d.nameEn)} />
                        ) : (
                          <span className="cq-img-fallback">✈</span>
                        )}
                      </div>
                      <div className="cq-drone-name">{L(d.nameZh, d.nameEn)}</div>
                      <div className="cq-drone-model">{d.model}</div>
                      {active && <div className="cq-card-check">✓</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Step 1: 选择 SKU ─── */}
          {step === 1 && drone && (
            <section className="cq-step-content">
              <h2 className="cq-step-title">{t.step1Title}</h2>
              <p className="cq-step-desc">
                {L(drone.nameZh, drone.nameEn)} ({drone.model}){t.step1DescSuffix}
              </p>
              <div className="cq-list">
                {drone.skus.map((s) => {
                  const active = s.id === skuId;
                  const includes = parseStringArray(locale === "zh" ? s.includesZh : (s as any).includesEn || s.includesZh);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSkuId(s.id)}
                      className={`cq-card cq-sku-card ${active ? "active" : ""}`}
                    >
                      <div className="cq-sku-head">
                        <div className="cq-sku-head-left">
                          <div className="cq-radio">
                            <div className={`cq-radio-dot ${active ? "active" : ""}`} />
                          </div>
                          <div>
                            <div className="cq-sku-name">
                              {L(s.labelZh || s.name, s.labelEn || s.nameEn)}
                              {s.isDefault && <span className="cq-tag">{t.defaultTag}</span>}
                            </div>
                            {s.descZh && <div className="cq-sku-desc">{L(s.descZh, (s as any).descEn)}</div>}
                          </div>
                        </div>
                        <div className="cq-sku-price">{fmt(s.price)}</div>
                      </div>
                      {includes.length > 0 && (
                        <ul className="cq-sku-includes">
                          {includes.slice(0, 6).map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                          {includes.length > 6 && (
                            <li className="cq-sku-more">{t.includesMore(includes.length)}</li>
                          )}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Step 2: 选择配件 ─── */}
          {step === 2 && hasAccessories && (
            <section className="cq-step-content">
              <h2 className="cq-step-title">{t.step2Title}</h2>
              <p className="cq-step-desc">{t.step2Desc}</p>
              <div className="cq-list">
                {availableAccessories.map((a) => {
                  const sel = accs.find((x) => x.id === a.id);
                  const hasVariants = a.skus && a.skus.length > 0;
                  const currentPrice = accUnitPrice(a, sel?.skuId);
                  return (
                    <div key={a.id} className={`cq-card cq-acc ${sel ? "active" : ""}`}>
                      <div className="cq-acc-row">
                        <div className="cq-acc-image">
                          {a.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.imageUrl} alt={L(a.nameZh, (a as any).nameEn)} />
                          ) : (
                            <span className="cq-img-fallback">📦</span>
                          )}
                        </div>
                        <div className="cq-acc-info">
                          <div className="cq-acc-name">
                            {L(a.nameZh, (a as any).nameEn)}
                            {a.isRecommended && <span className="cq-tag-warm">{t.recommendedTag}</span>}
                          </div>
                          <div className="cq-acc-model">{a.model}</div>
                          <div className="cq-acc-price">{fmt(currentPrice)}</div>
                        </div>
                        <div className="cq-acc-action">
                          {sel ? (
                            <div className="cq-qty">
                              <button type="button" onClick={() => updateQty(a.id, -1)} className="cq-qty-btn">−</button>
                              <span className="cq-qty-num">{sel.qty}</span>
                              <button type="button" onClick={() => updateQty(a.id, 1)} className="cq-qty-btn">+</button>
                              <button type="button" onClick={() => toggleAcc(a.id)} className="cq-remove">{t.btnRemove}</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => toggleAcc(a.id)} className="cq-add-btn">{t.btnAdd}</button>
                          )}
                        </div>
                      </div>

                      {/* 已选 + 该配件有 SKU 变体 → 显示版本选择 */}
                      {sel && hasVariants && (
                        <div className="cq-acc-skus">
                          <div className="cq-acc-skus-label">{t.accSkuLabel}</div>
                          <div className="cq-acc-skus-list">
                            {a.skus!.map((s) => {
                              const skuActive = sel.skuId === s.id;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setAccSku(a.id, s.id)}
                                  className={`cq-acc-sku ${skuActive ? "active" : ""}`}
                                >
                                  <div className="cq-acc-sku-name">
                                    {L(s.labelZh || s.name, s.labelEn || s.nameEn)}
                                    {s.isDefault && <span className="cq-tag">{t.defaultTag}</span>}
                                  </div>
                                  {s.descZh && <div className="cq-acc-sku-desc">{L(s.descZh, (s as any).descEn)}</div>}
                                  <div className="cq-acc-sku-price">{fmt(s.price)}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Step 3: 确认提交 ─── */}
          {step === 3 && (
            <section className="cq-step-content">
              <h2 className="cq-step-title">{t.step3Title}</h2>
              <p className="cq-step-desc">{t.step3Desc}</p>

              <div className="cq-review">
                <div className="cq-review-block">
                  <div className="cq-review-label">{t.reviewClientTitle}</div>
                  <div className="cq-review-row"><span>{t.reviewClientRef}</span><span className="cq-strong">{invite.clientName}</span></div>
                  {invite.clientContact && (
                    <div className="cq-review-row"><span>{t.reviewContact}</span><span>{invite.clientContact}</span></div>
                  )}
                  {invite.clientEmail && (
                    <div className="cq-review-row"><span>{t.reviewEmail}</span><span>{invite.clientEmail}</span></div>
                  )}
                </div>

                <div className="cq-review-block">
                  <div className="cq-review-label">{t.reviewTermsTitle}</div>
                  <div className="cq-review-row"><span>{t.reviewCurrency}</span><span>{invite.currency}</span></div>
                  <div className="cq-review-row"><span>{t.reviewDelivery}</span><span>{invite.deliveryTerms}</span></div>
                  <div className="cq-review-row"><span>{t.reviewValid}</span><span>{invite.validDays}{t.reviewValidDays}</span></div>
                </div>

                <div className="cq-review-block">
                  <div className="cq-review-label">{t.reviewSelectionTitle}</div>
                  {drone && (
                    <div className="cq-review-row">
                      <span>{L(drone.nameZh, drone.nameEn)}{sku ? ` · ${L(sku.labelZh || sku.name, sku.labelEn || sku.nameEn)}` : ""}</span>
                      <span className="cq-strong">{fmt(mainPrice)}</span>
                    </div>
                  )}
                  {accs.map((a) => {
                    const p = availableAccessories.find((x) => x.id === a.id);
                    if (!p) return null;
                    const accSku = a.skuId && p.skus ? p.skus.find((s) => s.id === a.skuId) : null;
                    const unit = accUnitPrice(p, a.skuId);
                    return (
                      <div key={a.id} className="cq-review-row">
                        <span>
                          {L(p.nameZh, (p as any).nameEn)}
                          {accSku ? ` · ${L(accSku.labelZh || accSku.name, accSku.labelEn || accSku.nameEn)}` : ""} ×{a.qty}
                        </span>
                        <span>{fmt(unit * a.qty)}</span>
                      </div>
                    );
                  })}
                  {accs.length === 0 && (
                    <div className="cq-review-row" style={{ color: "#9ca3af" }}>
                      <span>{t.reviewNoAcc}</span><span>—</span>
                    </div>
                  )}
                </div>

                <div className="cq-review-totals">
                  <div className="cq-tot-row"><span>{t.reviewSubtotal}</span><span>{fmt(subtotal)}</span></div>
                  {invite.discount > 0 && (
                    <div className="cq-tot-row cq-tot-discount">
                      <span>{t.reviewDiscount(invite.discount)}</span>
                      <span>− {fmt(subtotal * invite.discount / 100)}</span>
                    </div>
                  )}
                  <div className="cq-tot-grand">
                    <span>{t.reviewTotal}</span>
                    <span className="cq-tot-amount">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {err && <div className="cq-error">{err}</div>}
        </main>

        {/* AI 选购助手（持久化历史会话） */}
        <AiChat
          scope="invite"
          scopeKey={invite.code}
          initialMessages={aiInitialMessages}
          greeting={t.aiGreeting.replace("{name}", invite.clientName)}
          fabBottom={88}
        />

        {/* 底部固定操作栏 */}
        <footer className="cq-footer">
          <div className="cq-footer-inner">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="cq-btn cq-btn-prev"
            >
              {t.btnPrev}
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="cq-btn cq-btn-next"
                disabled={(step === 0 && !droneId) || (step === 1 && !skuId)}
              >
                {t.btnNext}
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="cq-btn cq-btn-submit"
              >
                {loading ? t.btnSubmitLoad : t.btnSubmit}
              </button>
            )}
          </div>
        </footer>
      </body>
    </html>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  body {
    font-family: 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    background: #f5f5f2;
    color: #1f2937;
    padding-bottom: 90px; /* 给底部固定 footer 留空间 */
    min-height: 100vh; min-height: 100dvh;
  }
  button { font-family: inherit; }

  /* ── 顶部 ── */

  .lang-switch {
    position: absolute;
    top: 16px;
    right: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #f5f5f2;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 20;
  }
  .lang-switch:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .cq-header {
    background: #1f2937;
    color: #fff;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .cq-header-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cq-brand-eyebrow {
    font-size: 0.65rem;
    letter-spacing: 2px;
    color: #D6B265;
    font-weight: 700;
  }
  .cq-brand-name {
    font-size: 1rem;
    font-weight: 700;
    margin-top: 2px;
    letter-spacing: 0.3px;
  }
  .cq-step-counter {
    font-family: 'Courier New', monospace;
    color: #D6B265;
  }
  .cq-current { font-size: 1.4rem; font-weight: 800; }
  .cq-total { font-size: 0.85rem; opacity: 0.7; margin-left: 4px; }
  .cq-progress {
    height: 3px;
    background: rgba(255,255,255,0.08);
  }
  .cq-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #D6B265, #A07A2C);
    transition: width 0.3s ease;
  }

  /* ── 步骤指示器 ── */
  .cq-stepper {
    max-width: 720px;
    margin: 0 auto;
    padding: 18px 20px 0;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .cq-step {
    flex: 1;
    text-align: center;
    position: relative;
  }
  .cq-step-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    transition: all 0.2s;
  }
  .cq-step.pending .cq-step-dot {
    background: #fff;
    color: #9ca3af;
    border: 2px solid #e5e7eb;
  }
  .cq-step.active .cq-step-dot {
    background: #1f2937;
    color: #D6B265;
    border: 2px solid #1f2937;
    box-shadow: 0 0 0 4px rgba(31,41,55,0.1);
  }
  .cq-step.done .cq-step-dot {
    background: #A07A2C;
    color: #fff;
    border: 2px solid #A07A2C;
  }
  .cq-step-label {
    margin-top: 6px;
    font-size: 0.72rem;
    color: #6b7280;
    font-weight: 600;
  }
  .cq-step.active .cq-step-label { color: #1f2937; font-weight: 700; }

  /* ── 主内容 ── */
  .cq-main {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 20px;
  }
  .cq-step-title {
    margin: 0 0 6px;
    font-size: 1.4rem;
    color: #1f2937;
    font-weight: 700;
  }
  .cq-step-desc {
    margin: 0 0 22px;
    color: #6b7280;
    font-size: 0.9rem;
  }

  /* ── 网格 / 列表 ── */
  .cq-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .cq-list { display: flex; flex-direction: column; gap: 12px; }

  .cq-card {
    background: #fff;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    font-family: inherit;
    color: inherit;
    display: block;
    width: 100%;
  }
  .cq-card.active {
    border-color: #A07A2C;
    background: #fffdf7;
    box-shadow: 0 4px 12px rgba(160,122,44,0.12);
  }
  .cq-card-check {
    position: absolute;
    top: 12px; right: 12px;
    width: 26px; height: 26px;
    border-radius: 50%;
    background: #A07A2C;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 0.85rem;
  }

  .cq-drone-image {
    height: 120px;
    background: #f8f8f2;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px; overflow: hidden;
  }
  .cq-drone-image img { max-width: 92%; max-height: 92%; object-fit: contain; }
  .cq-drone-name { font-weight: 700; font-size: 1rem; }
  .cq-drone-model { font-size: 0.78rem; color: #9ca3af; margin-top: 4px; }

  /* ── SKU 卡片（无人机配置版本） ── */
  .cq-sku-card { padding: 18px 20px; }
  .cq-sku-head {
    display: flex; align-items: flex-start;
    gap: 14px; justify-content: space-between;
  }
  .cq-sku-head-left {
    display: flex; align-items: flex-start; gap: 12px;
    flex: 1; min-width: 0;
  }
  .cq-radio {
    width: 20px; height: 20px;
    border: 2px solid #d1d5db;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 3px;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.15s;
  }
  .cq-card.active .cq-radio { border-color: #A07A2C; }
  .cq-radio-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: transparent;
    transition: background 0.15s;
  }
  .cq-radio-dot.active { background: #A07A2C; }
  .cq-sku-name {
    font-weight: 700; font-size: 1rem;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .cq-sku-desc {
    margin-top: 4px;
    color: #6b7280; font-size: 0.82rem; line-height: 1.5;
  }
  .cq-sku-includes {
    margin: 12px 0 0 32px; padding: 0;
    list-style: none;
    border-left: 1.5px solid #f3e9d3;
    padding-left: 12px;
  }
  .cq-sku-includes li {
    font-size: 0.8rem; color: #4b5563; line-height: 1.7;
    position: relative; padding-left: 14px;
  }
  .cq-sku-includes li::before {
    content: "•";
    color: #A07A2C; position: absolute; left: 0; top: 0;
    font-weight: 800;
  }
  .cq-sku-more { color: #9ca3af !important; font-style: italic; }
  .cq-sku-more::before { content: "" !important; }

  .cq-tag {
    background: rgba(31,41,55,0.08); color: #1f2937;
    font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; font-weight: 700;
  }
  .cq-tag-warm {
    background: rgba(160,122,44,0.15); color: #A07A2C;
    font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; font-weight: 700;
    margin-left: 6px;
  }
  .cq-sku-price {
    font-size: 1.1rem; font-weight: 800; color: #A07A2C;
    flex-shrink: 0; white-space: nowrap;
  }

  /* ── 配件的 SKU 变体选择 ── */
  .cq-acc-skus {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px dashed #e5e7eb;
  }
  .cq-acc-skus-label {
    font-size: 0.7rem; letter-spacing: 1.2px;
    color: #A07A2C; font-weight: 700;
    margin-bottom: 8px;
  }
  .cq-acc-skus-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }
  .cq-acc-sku {
    background: #fafaf7;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .cq-acc-sku.active {
    background: #fffdf7;
    border-color: #A07A2C;
    box-shadow: 0 0 0 3px rgba(160,122,44,0.1);
  }
  .cq-acc-sku-name {
    font-weight: 700; font-size: 0.88rem;
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .cq-acc-sku-desc {
    font-size: 0.74rem; color: #6b7280;
    margin-top: 3px; line-height: 1.4;
  }
  .cq-acc-sku-price {
    font-size: 0.88rem; font-weight: 700; color: #A07A2C;
    margin-top: 6px;
  }

  .cq-acc { padding: 14px; }
  .cq-acc-row {
    display: flex; align-items: center; gap: 14px;
    flex-wrap: wrap;
  }
  .cq-acc-image {
    width: 64px; height: 64px;
    background: #f8f8f2; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    flex-shrink: 0;
  }
  .cq-acc-image img { max-width: 90%; max-height: 90%; object-fit: contain; }
  .cq-acc-info { flex: 1; min-width: 0; }
  .cq-acc-name {
    font-weight: 600; font-size: 0.95rem;
    display: flex; align-items: center; flex-wrap: wrap;
  }
  .cq-acc-model { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }
  .cq-acc-price { font-size: 0.95rem; font-weight: 700; margin-top: 6px; }
  .cq-acc-action { display: flex; align-items: center; }
  .cq-add-btn {
    padding: 9px 18px; border: none; border-radius: 8px;
    background: #1f2937; color: #fff; cursor: pointer; font-weight: 700;
    font-size: 0.85rem; letter-spacing: 0.5px;
  }
  .cq-qty {
    display: flex; align-items: center; gap: 6px;
    flex-wrap: wrap;
  }
  .cq-qty-btn {
    width: 30px; height: 30px;
    border: 1px solid #d1d5db; border-radius: 6px;
    background: #fff; cursor: pointer; font-size: 1.05rem; font-weight: 700;
  }
  .cq-qty-num { width: 28px; text-align: center; font-weight: 700; font-size: 1rem; }
  .cq-remove {
    margin-left: 4px; padding: 6px 10px;
    border: 1px solid #e5e7eb; border-radius: 6px;
    background: #fff; cursor: pointer; font-size: 0.8rem;
  }
  .cq-img-fallback { font-size: 24px; opacity: 0.3; }

  /* ── 复盘步骤 ── */
  .cq-review { display: flex; flex-direction: column; gap: 12px; }
  .cq-review-block {
    background: #fff;
    border-radius: 12px;
    padding: 18px 20px;
    border: 1px solid #e5e7eb;
  }
  .cq-review-label {
    font-size: 0.7rem; letter-spacing: 1.5px;
    color: #A07A2C; font-weight: 700;
    margin-bottom: 12px;
  }
  .cq-review-row {
    display: flex; justify-content: space-between;
    font-size: 0.9rem; padding: 4px 0; gap: 12px;
  }
  .cq-review-row span:first-child { color: #6b7280; }
  .cq-review-row span:last-child { color: #1f2937; text-align: right; }
  .cq-strong { font-weight: 700 !important; }

  .cq-review-totals {
    background: #1f2937; color: #fff;
    border-radius: 12px; padding: 18px 20px;
  }
  .cq-tot-row {
    display: flex; justify-content: space-between;
    font-size: 0.85rem; color: #cbd5e1; padding: 3px 0;
  }
  .cq-tot-discount { color: #D6B265; }
  .cq-tot-grand {
    margin-top: 12px; padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .cq-tot-grand > span:first-child {
    font-size: 0.75rem; letter-spacing: 1.5px; font-weight: 700;
  }
  .cq-tot-amount { font-size: 1.6rem; font-weight: 800; color: #fff; }

  /* ── 错误 ── */
  .cq-error {
    margin-top: 14px;
    padding: 10px 14px;
    background: #fef2f2; color: #dc2626;
    border-left: 3px solid #dc2626; border-radius: 6px;
    font-size: 0.88rem;
  }

  /* ── 底部固定 footer ── */
  .cq-footer {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    z-index: 10;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .cq-footer-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: 12px 20px;
    display: flex; gap: 12px;
  }
  .cq-btn {
    flex: 1;
    padding: 14px;
    border-radius: 10px;
    border: none;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.5px;
    transition: all 0.15s;
  }
  .cq-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cq-btn-prev {
    flex: 0 0 100px;
    background: #f3f4f6; color: #1f2937;
  }
  .cq-btn-next {
    background: #1f2937; color: #fff;
    box-shadow: 0 4px 12px rgba(31,41,55,0.18);
  }
  .cq-btn-submit {
    background: linear-gradient(180deg, #D6B265, #A07A2C);
    color: #1f2937;
    box-shadow: 0 8px 20px rgba(160,122,44,0.3),
                0 1px 0 rgba(255,255,255,0.2) inset;
  }

  /* ── 移动端 ── */
  @media (max-width: 520px) {
    body { padding-bottom: 76px; }
    .cq-header-inner { padding: 12px 16px; }
    .cq-brand-name { font-size: 0.92rem; }
    .cq-current { font-size: 1.2rem; }
    .cq-stepper { padding: 14px 16px 0; gap: 4px; }
    .cq-step-dot { width: 24px; height: 24px; font-size: 0.72rem; }
    .cq-step-label { font-size: 0.65rem; }
    .cq-main { padding: 18px 16px; }
    .cq-step-title { font-size: 1.2rem; }
    .cq-step-desc { font-size: 0.85rem; margin-bottom: 16px; }
    .cq-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .cq-card { padding: 12px; }
    .cq-drone-image { height: 90px; margin-bottom: 8px; }
    .cq-drone-name { font-size: 0.9rem; }
    .cq-drone-model { font-size: 0.72rem; }
    .cq-sku { padding: 14px; }
    .cq-sku-name { font-size: 0.92rem; }
    .cq-sku-price { font-size: 1rem; }
    .cq-acc { padding: 12px; gap: 10px; }
    .cq-acc-image { width: 52px; height: 52px; }
    .cq-acc-name { font-size: 0.9rem; }
    .cq-acc-model { font-size: 0.7rem; }
    .cq-acc-price { font-size: 0.88rem; margin-top: 4px; }
    .cq-acc-action { width: 100%; justify-content: flex-end; margin-top: 4px; }
    .cq-add-btn { padding: 8px 14px; font-size: 0.82rem; }
    .cq-review-block { padding: 14px 16px; }
    .cq-review-label { font-size: 0.65rem; margin-bottom: 8px; }
    .cq-review-row { font-size: 0.85rem; }
    .cq-review-totals { padding: 14px 16px; }
    .cq-tot-amount { font-size: 1.4rem; }
    .cq-footer-inner { padding: 10px 16px; gap: 8px; }
    .cq-btn { padding: 12px; font-size: 0.9rem; }
    .cq-btn-prev { flex: 0 0 84px; }
  }
  @media (max-width: 360px) {
    .cq-grid { grid-template-columns: 1fr; }
    .cq-step-label { font-size: 0.6rem; }
  }
`;
