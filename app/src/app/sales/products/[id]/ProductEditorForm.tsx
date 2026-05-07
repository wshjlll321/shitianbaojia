"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Tag,
  DollarSign,
  Zap,
  BarChart3,
  Link2,
  Star,
  Package,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";

interface ImageDimensions {
  width: number;
  height: number;
}

interface AccLink {
  id: string;
  isRecommended: boolean;
}

function getImageDimensions(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

type LangTab = "zh" | "en";

function safeParseStringArray(v: string, fallback: string[] = []) {
  try {
    const parsed = JSON.parse(v || "[]");
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    return fallback;
  } catch {
    return fallback;
  }
}

function safeParseStringObject(v: string, fallback: Record<string, string> = {}) {
  try {
    const parsed = JSON.parse(v || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      out[String(k)] = val == null ? "" : String(val);
    }
    return out;
  } catch {
    return fallback;
  }
}

type SpecRow = { key: string; value: string };

function objectToRows(obj: Record<string, string>): SpecRow[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

function rowsToObject(rows: SpecRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = (r.key || "").trim();
    if (!k) continue;
    out[k] = r.value ?? "";
  }
  return out;
}

export default function ProductEditorForm({
  product,
  allAccessories = [],
  currentAccessoryIds = [],
  compatibleDrones = [],
  initialSkus = [],
}: {
  product: any;
  allAccessories?: any[];
  currentAccessoryIds?: AccLink[];
  compatibleDrones?: { id: string; model: string; nameZh: string; nameEn: string; isRecommended: boolean }[];
  initialSkus?: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageDims, setImageDims] = useState<ImageDimensions | null>(null);
  const [langTab, setLangTab] = useState<LangTab>("zh");
  const [saved, setSaved] = useState(false);
  const [accLinks, setAccLinks] = useState<AccLink[]>(currentAccessoryIds);
  const [savingAcc, setSavingAcc] = useState(false);
  const [skus, setSkus] = useState<any[]>(initialSkus);
  const [savingSku, setSavingSku] = useState(false);
  const [newSkuIncludesZh, setNewSkuIncludesZh] = useState<string[]>([]);
  const [newSkuIncludesEn, setNewSkuIncludesEn] = useState<string[]>([]);
  const [skuIncludesEditor, setSkuIncludesEditor] = useState<Record<string, { open: boolean; zh: string[]; en: string[]; descZh: string; descEn: string; saving: boolean }>>({});
  const [modelUnlocked, setModelUnlocked] = useState(false);

  const safeParseArray = (s: any) => {
    try {
      const v = JSON.parse(String(s || "[]"));
      return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  };
  const [newSku, setNewSku] = useState({
    sku: "",
    labelZh: "",
    labelEn: "",
    descZh: "",
    descEn: "",
    price: 0,
    isDefault: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDrone = product.category === "drone";
  const isNew = product.id === "new";

  const [formData, setFormData] = useState({
    model: product.model,
    category: product.category,
    nameZh: product.nameZh,
    nameEn: product.nameEn,
    nameTh: product.nameTh || "",
    msrp: product.msrp,
    exwPrice: product.exwPrice || 0,
    fobPrice: product.fobPrice || 0,
    isActive: product.isActive,
    imageUrl: product.imageUrl || "",
    featuresZh: product.featuresZh || "[]",
    featuresEn: product.featuresEn || "[]",
    featuresTh: product.featuresTh || "[]",
    specsZh: product.specsZh || "{}",
    specsEn: product.specsEn || "{}",
    specsTh: product.specsTh || "{}",
  });

  // Visual editors (store structured data; sync back to JSON strings in formData)
  const [featuresByLang, setFeaturesByLang] = useState<Record<LangTab, string[]>>({
    zh: safeParseStringArray(formData.featuresZh),
    en: safeParseStringArray(formData.featuresEn),
  });

  const [specRowsByLang, setSpecRowsByLang] = useState<Record<LangTab, SpecRow[]>>({
    zh: objectToRows(safeParseStringObject(formData.specsZh)),
    en: objectToRows(safeParseStringObject(formData.specsEn)),
  });

  const update = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const syncFeaturesToFormData = (lang: LangTab, list: string[]) => {
    const json = JSON.stringify(list.filter((x) => String(x).trim() !== ""));
    setFormData((prev) => ({
      ...prev,
      [lang === "zh" ? "featuresZh" : "featuresEn"]: json,
    }));
  };

  const syncSpecsToFormData = (lang: LangTab, rows: SpecRow[]) => {
    const obj = rowsToObject(rows);
    const json = JSON.stringify(obj);
    setFormData((prev) => ({
      ...prev,
      [lang === "zh" ? "specsZh" : "specsEn"]: json,
    }));
  };

  // If product prop changes (rare), re-init visual editors
  useEffect(() => {
    setFeaturesByLang({
      zh: safeParseStringArray(product.featuresZh || "[]"),
      en: safeParseStringArray(product.featuresEn || "[]"),
    });
    setSpecRowsByLang({
      zh: objectToRows(safeParseStringObject(product.specsZh || "{}")),
      en: objectToRows(safeParseStringObject(product.specsEn || "{}")),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    if (formData.imageUrl) {
      getImageDimensions(formData.imageUrl)
        .then(setImageDims)
        .catch(() => setImageDims(null));
    } else {
      setImageDims(null);
    }
  }, [formData.imageUrl]);

  const checkDimensions = (dims: ImageDimensions | null) => {
    if (!dims) return null;
    const wOk = dims.width >= 800 && dims.width <= 2400;
    const ratio = dims.width / dims.height;
    const ratioOk = ratio >= 1.2 && ratio <= 2.0;
    return wOk && ratioOk;
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("图片不能超过 10MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) update("imageUrl", json.url);
      else alert("上传失败");
    } catch {
      alert("上传出错");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
    },
    [handleUpload]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isNew ? "/api/sales/products" : `/api/sales/products/${product.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nameTh: "",
          featuresTh: "[]",
          specsTh: "{}",
        }),
      });
      if (res.ok) {
        setSaved(true);
        setModelUnlocked(false);
        if (isNew) {
          router.push(product.category === "drone" ? "/sales/products" : "/sales/accessories");
        } else {
          setTimeout(() => setSaved(false), 2500);
        }
      } else {
        let msg = "保存失败";
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } else {
            const t = await res.text();
            if (t) msg = t;
          }
        } catch {}
        alert(msg);
      }
    } catch {
      alert("保存出错");
    } finally {
      setLoading(false);
    }
  };

  // Accessory association management
  const toggleAccLink = (accId: string) => {
    if (accLinks.find((a) => a.id === accId)) {
      setAccLinks(accLinks.filter((a) => a.id !== accId));
    } else {
      setAccLinks([...accLinks, { id: accId, isRecommended: false }]);
    }
  };

  const toggleRecommended = (accId: string) => {
    setAccLinks(
      accLinks.map((a) =>
        a.id === accId ? { ...a, isRecommended: !a.isRecommended } : a
      )
    );
  };

  const saveAccLinks = async () => {
    setSavingAcc(true);
    try {
      const res = await fetch(`/api/sales/products/${product.id}/accessories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessories: accLinks }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert("保存配件关联失败");
      }
    } catch {
      alert("保存配件关联出错");
    } finally {
      setSavingAcc(false);
    }
  };

  const dimOk = checkDimensions(imageDims);
  const langTabs: { key: LangTab; label: string; flag: string }[] = [
    { key: "zh", label: "中文", flag: "🇨🇳" },
    { key: "en", label: "English", flag: "🇺🇸" },
  ];

  const showCompatibleDrones = !isDrone && !isNew && compatibleDrones.length > 0;
  const showSkuManager = isDrone && !isNew;

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <Tag size={22} style={{ marginRight: "8px", opacity: 0.5 }} />
            {isNew ? (product.category === "drone" ? "新增无人机" : "新增配件") : `${product.model} — 产品编辑`}
          </h1>
          <p>
            {product.category === "drone" ? "无人机" : "配件"} · {isNew ? "添加新的产品并完善信息" : "更新产品信息（中文 / English）"}
          </p>
        </div>
        <div className="page-header-actions">
          {saved && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "10px",
              background: "rgba(34,197,94,0.1)",
              color: "var(--color-success-500)",
              fontSize: "0.85rem", fontWeight: 600,
              animation: "fadeIn 0.3s ease",
            }}>
              <CheckCircle2 size={16} />
              已保存
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      >
        {/* ═══════ 产品图片 ═══════ */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ImageIcon size={18} style={{ opacity: 0.6 }} />
                产品图片
              </div>
              <div className="card-subtitle" style={{ marginTop: "4px" }}>
                推荐 <strong>1200 × 800 px (3:2)</strong>，JPG/PNG/WebP，最大 10MB
              </div>
            </div>
            {imageDims && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600,
                background: dimOk ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                color: dimOk ? "var(--color-success-500)" : "var(--color-warning-500)",
              }}>
                {dimOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {imageDims.width} × {imageDims.height} px
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: formData.imageUrl ? "0 0 180px" : "1",
                minHeight: formData.imageUrl ? "140px" : "180px",
                borderRadius: "16px",
                border: `2px dashed ${dragActive ? "var(--color-primary-400)" : "var(--color-border)"}`,
                background: dragActive ? "rgba(51,102,255,0.04)" : "var(--color-surface-elevated)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: "10px", cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              {uploading ? (
                <>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    border: "3px solid var(--color-border)",
                    borderTopColor: "var(--color-primary-400)",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>上传中...</span>
                </>
              ) : (
                <>
                  <Upload size={26} style={{ color: dragActive ? "var(--color-primary-400)" : "var(--color-text-tertiary)" }} />
                  <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{formData.imageUrl ? "替换图片" : "上传图片"}</span>
                    <br />拖拽或点击
                  </div>
                </>
              )}
              <input
                ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
              />
            </div>

            {/* Preview */}
            {formData.imageUrl && (
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{
                  borderRadius: "16px", overflow: "hidden",
                  border: "1px solid var(--color-border)", background: "#0f172a",
                  position: "relative",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.imageUrl} alt="预览" style={{
                    width: "100%", height: "240px", objectFit: "contain", display: "block",
                  }} />
                  <button type="button"
                    onClick={() => update("imageUrl", "")}
                    style={{
                      position: "absolute", top: "10px", right: "10px",
                      width: "30px", height: "30px", borderRadius: "50%",
                      background: "rgba(239,68,68,0.9)", border: "none",
                      color: "white", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ 基本信息 + 价格 ═══════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* 基本信息 */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Tag size={16} style={{ opacity: 0.6 }} />
                基本信息
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">型号 (唯一标识)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                  <input type="text" value={formData.model}
                    onChange={(e) => update("model", e.target.value)}
                    className="form-input"
                    style={{ fontFamily: "var(--font-mono)", fontWeight: 700, flex: 1 }}
                    disabled={!isNew && !modelUnlocked}
                    required
                  />
                  {!isNew && !modelUnlocked && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="修改型号"
                      onClick={() => {
                        const ok = confirm(
                          "确定要修改型号吗？\n\n" +
                          "· 修改后新生成的报价单会显示新型号\n" +
                          "· 历史报价单已锁定旧型号快照，不受影响\n" +
                          "· 新型号不能与现有产品重名"
                        );
                        if (ok) setModelUnlocked(true);
                      }}
                    >
                      <Edit2 size={14} />
                      修改
                    </button>
                  )}
                  {!isNew && modelUnlocked && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="放弃修改"
                      onClick={() => {
                        update("model", product.model);
                        setModelUnlocked(false);
                      }}
                    >
                      <X size={14} />
                      取消
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">类别</label>
                <input type="text" value={formData.category === "drone" ? "无人机" : "配件"}
                  className="form-input" disabled />
              </div>
              <div className="form-group" style={{ marginTop: "8px" }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                  padding: "10px 14px", borderRadius: "10px",
                  border: `2px solid ${formData.isActive ? "var(--color-success-500)" : "var(--color-border)"}`,
                  background: formData.isActive ? "rgba(34,197,94,0.06)" : "transparent",
                  transition: "all 0.2s",
                }}>
                  <input type="checkbox" checked={formData.isActive}
                    onChange={(e) => update("isActive", e.target.checked)}
                    style={{ display: "none" }} />
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "4px",
                    border: `2px solid ${formData.isActive ? "var(--color-success-500)" : "var(--color-border)"}`,
                    background: formData.isActive ? "var(--color-success-500)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "0.7rem", fontWeight: 700, transition: "all 0.2s",
                  }}>
                    {formData.isActive ? "✓" : ""}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    启用（可用于报价）
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 价格体系 */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <DollarSign size={16} style={{ opacity: 0.6 }} />
                价格体系
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">基础 MSRP</label>
                <input type="number" step="0.01" required value={formData.msrp}
                  onChange={(e) => update("msrp", e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">EXW 价格</label>
                <input type="number" step="0.01" value={formData.exwPrice}
                  onChange={(e) => update("exwPrice", e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">FOB 价格</label>
                <input type="number" step="0.01" value={formData.fobPrice}
                  onChange={(e) => update("fobPrice", e.target.value)} className="form-input" />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ 多语言内容 ═══════ */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Globe size={18} style={{ opacity: 0.6 }} />
              多语言内容
            </div>
            {/* Language Tabs */}
            <div style={{
              display: "inline-flex", padding: "3px", borderRadius: "12px",
              background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)",
              gap: "3px",
            }}>
              {langTabs.map((t) => (
                <button key={t.key} type="button"
                  onClick={() => setLangTab(t.key)}
                  style={{
                    padding: "6px 16px", borderRadius: "9px", border: "none",
                    fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "var(--font-sans)",
                    background: langTab === t.key ? "var(--color-primary-500)" : "transparent",
                    color: langTab === t.key ? "white" : "var(--color-text-secondary)",
                    boxShadow: langTab === t.key ? "0 2px 8px rgba(51,102,255,0.3)" : "none",
                  }}
                >
                  {t.flag} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content for selected language */}
          <div key={langTab} style={{ animation: "fadeIn 0.2s ease" }}>
            {/* Product Name */}
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label">
                产品名称（{langTabs.find(t => t.key === langTab)?.label}）
              </label>
              <input type="text" required={langTab === "zh"}
                value={langTab === "zh" ? formData.nameZh : formData.nameEn}
                onChange={(e) => update(langTab === "zh" ? "nameZh" : "nameEn", e.target.value)}
                className="form-input"
                placeholder={langTab === "zh" ? "中文名称" : "English name"}
              />
            </div>

            {/* Features */}
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Zap size={14} />
                核心卖点（列表维护）
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(featuresByLang[langTab] || []).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      className="form-input"
                      value={item}
                      onChange={(e) => {
                        const next = [...featuresByLang[langTab]];
                        next[idx] = e.target.value;
                        setFeaturesByLang((prev) => ({ ...prev, [langTab]: next }));
                        syncFeaturesToFormData(langTab, next);
                      }}
                      placeholder={langTab === "zh" ? "请输入卖点" : "Enter feature"}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="上移"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...featuresByLang[langTab]];
                        const tmp = next[idx - 1];
                        next[idx - 1] = next[idx];
                        next[idx] = tmp;
                        setFeaturesByLang((prev) => ({ ...prev, [langTab]: next }));
                        syncFeaturesToFormData(langTab, next);
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="下移"
                      disabled={idx === (featuresByLang[langTab]?.length || 0) - 1}
                      onClick={() => {
                        const next = [...featuresByLang[langTab]];
                        const tmp = next[idx + 1];
                        next[idx + 1] = next[idx];
                        next[idx] = tmp;
                        setFeaturesByLang((prev) => ({ ...prev, [langTab]: next }));
                        syncFeaturesToFormData(langTab, next);
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="删除"
                      onClick={() => {
                        const next = featuresByLang[langTab].filter((_, i) => i !== idx);
                        setFeaturesByLang((prev) => ({ ...prev, [langTab]: next }));
                        syncFeaturesToFormData(langTab, next);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const next = [...(featuresByLang[langTab] || []), ""];
                    setFeaturesByLang((prev) => ({ ...prev, [langTab]: next }));
                    syncFeaturesToFormData(langTab, next);
                  }}
                  style={{ width: "fit-content" }}
                >
                  <Plus size={14} />
                  新增卖点
                </button>
              </div>
            </div>

            {/* Specs */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <BarChart3 size={14} />
                技术参数（表格维护）
              </label>
              <div style={{
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                overflow: "hidden",
                background: "var(--color-surface-elevated)",
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 44px",
                  padding: "10px 12px",
                  background: "var(--color-bg-tertiary)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--color-text-tertiary)",
                }}>
                  <div>参数名</div>
                  <div>参数值</div>
                  <div style={{ textAlign: "center" }}> </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {(specRowsByLang[langTab] || []).map((row, idx) => (
                    <div key={idx} style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 44px",
                      gap: "10px",
                      padding: "10px 12px",
                      borderTop: "1px solid var(--color-border)",
                      alignItems: "center",
                    }}>
                      <input
                        className="form-input"
                        value={row.key}
                        onChange={(e) => {
                          const next = [...specRowsByLang[langTab]];
                          next[idx] = { ...next[idx], key: e.target.value };
                          setSpecRowsByLang((prev) => ({ ...prev, [langTab]: next }));
                          syncSpecsToFormData(langTab, next);
                        }}
                        placeholder={langTab === "zh" ? "如：最大起飞重量" : "Key"}
                      />
                      <input
                        className="form-input"
                        value={row.value}
                        onChange={(e) => {
                          const next = [...specRowsByLang[langTab]];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setSpecRowsByLang((prev) => ({ ...prev, [langTab]: next }));
                          syncSpecsToFormData(langTab, next);
                        }}
                        placeholder={langTab === "zh" ? "如：280 kg" : "Value"}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="删除"
                        onClick={() => {
                          const next = specRowsByLang[langTab].filter((_, i) => i !== idx);
                          setSpecRowsByLang((prev) => ({ ...prev, [langTab]: next }));
                          syncSpecsToFormData(langTab, next);
                        }}
                        style={{ justifySelf: "center" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const next = [...(specRowsByLang[langTab] || []), { key: "", value: "" }];
                    setSpecRowsByLang((prev) => ({ ...prev, [langTab]: next }));
                    syncSpecsToFormData(langTab, next);
                  }}
                >
                  <Plus size={14} />
                  新增参数
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ 保存按钮 ═══════ */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button type="button" onClick={() => router.push(product.category === "drone" ? "/sales/products" : "/sales/accessories")} className="btn btn-outline">
            <ArrowLeft size={16} />
            返回列表
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ minWidth: "160px" }}>
            <Save size={16} />
            {loading ? "保存中..." : "保存产品信息"}
          </button>
        </div>
      </form>

      {/* ═══════ SKU 版本管理（仅无人机且为编辑模式） ═══════ */}
      {showSkuManager && (
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Tag size={18} style={{ opacity: 0.6 }} />
                版本（SKU）管理
              </div>
              <div className="card-subtitle" style={{ marginTop: "4px" }}>
                创建报价时会要求先选择机型版本（SKU）。建议至少维护 1 个默认版本。
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingSku}
              onClick={async () => {
                setSavingSku(true);
                try {
                  const res = await fetch(`/api/sales/products/${product.id}/skus`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sku: newSku.sku,
                      labelZh: newSku.labelZh,
                      labelEn: newSku.labelEn,
                      descZh: newSku.descZh,
                      descEn: newSku.descEn,
                      name: newSku.labelZh,
                      nameEn: newSku.labelEn,
                      price: Number(newSku.price) || 0,
                      isDefault: !!newSku.isDefault,
                      includesZh: JSON.stringify(newSkuIncludesZh.filter(Boolean)),
                      includesEn: JSON.stringify(newSkuIncludesEn.filter(Boolean)),
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok || !json?.success) {
                    alert(json?.error || "新增 SKU 失败");
                    return;
                  }
                  setSkus((prev) => [json.sku, ...prev]);
                  setNewSku({ sku: "", labelZh: "", labelEn: "", descZh: "", descEn: "", price: 0, isDefault: false });
                  setNewSkuIncludesZh([]);
                  setNewSkuIncludesEn([]);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                } catch {
                  alert("新增 SKU 出错");
                } finally {
                  setSavingSku(false);
                }
              }}
              style={{ minWidth: "140px" }}
            >
              <Save size={14} />
              {savingSku ? "保存中..." : "新增 SKU"}
            </button>
          </div>

          {/* New SKU form */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 160px 160px",
            gap: "12px",
            alignItems: "end",
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">SKU 编码 *</label>
              <input className="form-input" value={newSku.sku}
                onChange={(e) => setNewSku((p) => ({ ...p, sku: e.target.value }))}
                placeholder="如：H15-STD" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">版本名（中文）*</label>
              <input className="form-input" value={newSku.labelZh}
                onChange={(e) => setNewSku((p) => ({ ...p, labelZh: e.target.value }))}
                placeholder="如：标准版" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">版本名（英文）</label>
              <input className="form-input" value={newSku.labelEn}
                onChange={(e) => setNewSku((p) => ({ ...p, labelEn: e.target.value }))}
                placeholder="Standard Edition" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">价格（FOB）</label>
              <input className="form-input" type="number" step="0.01" value={newSku.price}
                onChange={(e) => setNewSku((p) => ({ ...p, price: Number(e.target.value) }))} />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: "1 / span 3" }}>
              <label className="form-label">版本描述（中文）</label>
              <input className="form-input" value={newSku.descZh}
                onChange={(e) => setNewSku((p) => ({ ...p, descZh: e.target.value }))}
                placeholder="如：含主机、2 块电池、充电器、便携箱" />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: "4 / span 2" }}>
              <label className="form-label">版本描述（英文）</label>
              <input className="form-input" value={newSku.descEn}
                onChange={(e) => setNewSku((p) => ({ ...p, descEn: e.target.value }))}
                placeholder="e.g. Includes airframe, 2 batteries, charger" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">默认</label>
              <label style={{
                display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                padding: "10px 14px", borderRadius: "10px",
                border: `2px solid ${newSku.isDefault ? "var(--color-success-500)" : "var(--color-border)"}`,
                background: newSku.isDefault ? "rgba(34,197,94,0.06)" : "transparent",
                transition: "all 0.2s",
              }}>
                <input type="checkbox" checked={newSku.isDefault}
                  onChange={(e) => setNewSku((p) => ({ ...p, isDefault: e.target.checked }))}
                  style={{ display: "none" }} />
                <div style={{
                  width: "20px", height: "20px", borderRadius: "4px",
                  border: `2px solid ${newSku.isDefault ? "var(--color-success-500)" : "var(--color-border)"}`,
                  background: newSku.isDefault ? "var(--color-success-500)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: "0.7rem", fontWeight: 700, transition: "all 0.2s",
                }}>
                  {newSku.isDefault ? "✓" : ""}
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>设为默认</span>
              </label>
            </div>
          </div>

          {/* New SKU includes editor */}
          <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">版本包含内容（中文，给客户展示）</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {newSkuIncludesZh.length === 0 && (
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>可选填。比如：含电池×2、含地面站、含工具包…</div>
                )}
                {newSkuIncludesZh.map((v, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px" }}>
                    <input
                      className="form-input"
                      value={v}
                      onChange={(e) => setNewSkuIncludesZh((p) => p.map((x, i) => (i === idx ? e.target.value : x)))}
                      placeholder={`第 ${idx + 1} 条`}
                    />
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setNewSkuIncludesZh((p) => p.filter((_, i) => i !== idx))}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setNewSkuIncludesZh((p) => [...p, ""])}>
                  <Plus size={14} />
                  新增一条
                </button>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">版本包含内容（英文）</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {newSkuIncludesEn.length === 0 && (
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>
                    可选填（英文）。例如：Batteries x2、Ground Station、Tool Kit…
                  </div>
                )}
                {newSkuIncludesEn.map((v, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px" }}>
                    <input
                      className="form-input"
                      value={v}
                      onChange={(e) => setNewSkuIncludesEn((p) => p.map((x, i) => (i === idx ? e.target.value : x)))}
                      placeholder={`第 ${idx + 1} 条（英文）`}
                    />
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setNewSkuIncludesEn((p) => p.filter((_, i) => i !== idx))}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setNewSkuIncludesEn((p) => [...p, ""])}>
                  <Plus size={14} />
                  新增一条
                </button>
              </div>
            </div>
          </div>

          {/* SKU list */}
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {skus.length === 0 ? (
              <div style={{ color: "var(--color-text-tertiary)", fontSize: "0.9rem" }}>
                暂无 SKU。建议新增至少 1 个默认版本。
              </div>
            ) : (
              skus.map((s) => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: `2px solid ${s.isDefault ? "var(--color-success-500)" : "var(--color-border)"}`,
                  background: s.isDefault ? "rgba(34,197,94,0.04)" : "var(--color-surface-elevated)",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        color: "var(--color-primary-400)",
                        letterSpacing: "0.5px",
                      }}>
                        {s.sku}
                      </span>
                      {s.isDefault && (
                        <span className="badge badge-success">默认</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {s.labelZh || s.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-tertiary)" }}>
                      {s.labelEn || s.nameEn}
                    </div>
                    {s.descZh && (
                      <div style={{ marginTop: "6px", fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                        {s.descZh}
                      </div>
                    )}
                    {safeParseArray(s.includesZh).length > 0 && (
                      <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>包含内容：</div>
                        <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {safeParseArray(s.includesZh).slice(0, 5).map((it: string, idx: number) => (
                            <li key={idx}>{it}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Includes + 版本描述 editor */}
                    {skuIncludesEditor[s.id]?.open && (
                      <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", border: "1px solid var(--color-border)", background: "var(--color-bg-tertiary)" }}>
                        {/* 版本描述 */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-primary-400)", marginBottom: "6px" }}>版本描述（中文）</div>
                            <input
                              className="form-input"
                              value={skuIncludesEditor[s.id].descZh}
                              onChange={(e) =>
                                setSkuIncludesEditor((p) => ({
                                  ...p,
                                  [s.id]: { ...p[s.id], descZh: e.target.value },
                                }))
                              }
                              placeholder="如：含主机、2 块电池、充电器、便携箱"
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-primary-400)", marginBottom: "6px" }}>版本描述（英文）</div>
                            <input
                              className="form-input"
                              value={skuIncludesEditor[s.id].descEn}
                              onChange={(e) =>
                                setSkuIncludesEditor((p) => ({
                                  ...p,
                                  [s.id]: { ...p[s.id], descEn: e.target.value },
                                }))
                              }
                              placeholder="e.g. Includes airframe, 2 batteries, charger"
                            />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-primary-400)", marginBottom: "6px" }}>中文包含内容</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {skuIncludesEditor[s.id].zh.map((v, idx) => (
                                <div key={idx} style={{ display: "flex", gap: "8px" }}>
                                  <input
                                    className="form-input"
                                    value={v}
                                    onChange={(e) =>
                                      setSkuIncludesEditor((p) => ({
                                        ...p,
                                        [s.id]: { ...p[s.id], zh: p[s.id].zh.map((x, i) => (i === idx ? e.target.value : x)) },
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() =>
                                      setSkuIncludesEditor((p) => ({
                                        ...p,
                                        [s.id]: { ...p[s.id], zh: p[s.id].zh.filter((_, i) => i !== idx) },
                                      }))
                                    }
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  setSkuIncludesEditor((p) => ({ ...p, [s.id]: { ...p[s.id], zh: [...p[s.id].zh, ""] } }))
                                }
                              >
                                <Plus size={14} />
                                新增一条
                              </button>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-primary-400)", marginBottom: "6px" }}>英文包含内容</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {skuIncludesEditor[s.id].en.map((v, idx) => (
                                <div key={idx} style={{ display: "flex", gap: "8px" }}>
                                  <input
                                    className="form-input"
                                    value={v}
                                    onChange={(e) =>
                                      setSkuIncludesEditor((p) => ({
                                        ...p,
                                        [s.id]: { ...p[s.id], en: p[s.id].en.map((x, i) => (i === idx ? e.target.value : x)) },
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() =>
                                      setSkuIncludesEditor((p) => ({
                                        ...p,
                                        [s.id]: { ...p[s.id], en: p[s.id].en.filter((_, i) => i !== idx) },
                                      }))
                                    }
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  setSkuIncludesEditor((p) => ({ ...p, [s.id]: { ...p[s.id], en: [...p[s.id].en, ""] } }))
                                }
                              >
                                <Plus size={14} />
                                新增一条
                              </button>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setSkuIncludesEditor((p) => ({ ...p, [s.id]: { ...p[s.id], open: false } }))}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={skuIncludesEditor[s.id].saving || savingSku}
                            onClick={async () => {
                              setSkuIncludesEditor((p) => ({ ...p, [s.id]: { ...p[s.id], saving: true } }));
                              try {
                                const res = await fetch(`/api/sales/products/${product.id}/skus`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    skuId: s.id,
                                    descZh: skuIncludesEditor[s.id].descZh,
                                    descEn: skuIncludesEditor[s.id].descEn,
                                    includesZh: JSON.stringify(skuIncludesEditor[s.id].zh.filter(Boolean)),
                                    includesEn: JSON.stringify(skuIncludesEditor[s.id].en.filter(Boolean)),
                                  }),
                                });
                                const json = await res.json().catch(() => ({}));
                                if (!res.ok || !json?.success) {
                                  alert(json?.error || "保存包含内容失败");
                                  return;
                                }
                                setSkus((prev) => prev.map((x) => (x.id === s.id ? { ...json.sku } : x)));
                                setSkuIncludesEditor((p) => ({ ...p, [s.id]: { ...p[s.id], open: false, saving: false } }));
                              } catch {
                                alert("保存包含内容出错");
                              } finally {
                                setSkuIncludesEditor((p) => ({ ...p, [s.id]: { ...p[s.id], saving: false } }));
                              }
                            }}
                          >
                            <Save size={14} />
                            保存
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    flexShrink: 0,
                  }}>
                    ¥{new Intl.NumberFormat("zh-CN").format(Number(s.price || 0))}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={savingSku}
                      onClick={() => {
                        setSkuIncludesEditor((p) => {
                          const current = p[s.id];
                          const open = !current?.open;
                          return {
                            ...p,
                            [s.id]: {
                              open,
                              saving: false,
                              zh: open ? safeParseArray(s.includesZh) : (current?.zh || []),
                              en: open ? safeParseArray(s.includesEn) : (current?.en || []),
                              descZh: open ? (s.descZh || "") : (current?.descZh || ""),
                              descEn: open ? (s.descEn || "") : (current?.descEn || ""),
                            },
                          };
                        });
                      }}
                      title="维护该版本描述与包含内容（给客户展示）"
                    >
                      <Edit2 size={14} />
                      版本配置
                    </button>
                    {!s.isDefault && (
                      <button type="button" className="btn btn-outline btn-sm" disabled={savingSku}
                        onClick={async () => {
                          setSavingSku(true);
                          try {
                            const res = await fetch(`/api/sales/products/${product.id}/skus`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ skuId: s.id, isDefault: true }),
                            });
                            const json = await res.json().catch(() => ({}));
                            if (!res.ok || !json?.success) {
                              alert(json?.error || "设置默认失败");
                              return;
                            }
                            setSkus((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...json.sku } : { ...x, isDefault: false }))
                            );
                          } catch {
                            alert("设置默认出错");
                          } finally {
                            setSavingSku(false);
                          }
                        }}>
                        <Star size={14} />
                        设为默认
                      </button>
                    )}
                    <button type="button" className="btn btn-outline btn-sm" disabled={savingSku}
                      onClick={async () => {
                        if (!confirm("确认删除该 SKU？")) return;
                        setSavingSku(true);
                        try {
                          const res = await fetch(`/api/sales/products/${product.id}/skus`, {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ skuId: s.id }),
                          });
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok || !json?.success) {
                            alert(json?.error || "删除失败");
                            return;
                          }
                          setSkus((prev) => prev.filter((x) => x.id !== s.id));
                        } catch {
                          alert("删除出错");
                        } finally {
                          setSavingSku(false);
                        }
                      }}>
                      <X size={14} />
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══════ 配件关联管理（仅无人机且为编辑模式） ═══════ */}
      {isDrone && !isNew && allAccessories.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link2 size={18} style={{ opacity: 0.6 }} />
                配件关联管理
              </div>
              <div className="card-subtitle" style={{ marginTop: "4px" }}>
                选择该机型可搭配的挂载与配件，标记推荐配件会在选配器中显示 ⭐ 标识
              </div>
            </div>
            <button
              type="button"
              onClick={saveAccLinks}
              disabled={savingAcc}
              className="btn btn-primary"
              style={{ minWidth: "140px" }}
            >
              <Save size={14} />
              {savingAcc ? "保存中..." : "保存关联"}
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "12px",
          }}>
            {allAccessories.map((acc) => {
              const linked = accLinks.find((a) => a.id === acc.id);
              const isLinked = !!linked;
              return (
                <div
                  key={acc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: `2px solid ${isLinked ? "var(--color-primary-500)" : "var(--color-border)"}`,
                    background: isLinked ? "rgba(51,102,255,0.04)" : "var(--color-surface-elevated)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => toggleAccLink(acc.id)}
                >
                  {/* Check */}
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "6px", flexShrink: 0,
                    border: `2px solid ${isLinked ? "var(--color-primary-500)" : "var(--color-border)"}`,
                    background: isLinked ? "var(--color-primary-500)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "0.7rem", fontWeight: 700,
                    transition: "all 0.2s",
                  }}>
                    {isLinked ? "✓" : ""}
                  </div>

                  {/* Image */}
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0,
                    background: acc.imageUrl ? "#0f172a" : "var(--color-bg-tertiary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {acc.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.imageUrl} alt={acc.model} style={{
                        width: "100%", height: "100%", objectFit: "contain", padding: "4px",
                      }} />
                    ) : (
                      <Package size={16} style={{ color: "var(--color-text-muted)" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                      fontWeight: 700, color: "var(--color-primary-400)",
                      letterSpacing: "0.5px",
                    }}>
                      {acc.model}
                    </div>
                    <div style={{
                      fontSize: "0.85rem", fontWeight: 600,
                      color: "var(--color-text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {acc.nameZh}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{
                    fontSize: "0.85rem", fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-mono)", flexShrink: 0,
                  }}>
                    ¥{new Intl.NumberFormat().format(acc.msrp)}
                  </div>

                  {/* Recommended toggle */}
                  {isLinked && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleRecommended(acc.id); }}
                      title={linked!.isRecommended ? "取消推荐" : "设为推荐"}
                      style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        border: `1px solid ${linked!.isRecommended ? "var(--color-accent-500)" : "var(--color-border)"}`,
                        background: linked!.isRecommended ? "rgba(232,168,56,0.1)" : "transparent",
                        color: linked!.isRecommended ? "var(--color-accent-500)" : "var(--color-text-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
                      }}
                    >
                      <Star size={14} fill={linked!.isRecommended ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: "flex", gap: "24px", marginTop: "16px", paddingTop: "12px",
            borderTop: "1px solid var(--color-border)",
            fontSize: "0.75rem", color: "var(--color-text-muted)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "14px", height: "14px", borderRadius: "4px",
                background: "var(--color-primary-500)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: "0.5rem",
              }}>✓</div>
              已关联
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Star size={12} style={{ color: "var(--color-accent-500)" }} fill="var(--color-accent-500)" />
              推荐配件（选配器中优先展示）
            </span>
          </div>
        </div>
      )}

      <div style={{ paddingBottom: "40px" }} />

      {/* ═══════ 适配机型（仅配件且为编辑模式） ═══════ */}
      {showCompatibleDrones && (
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link2 size={18} style={{ opacity: 0.6 }} />
                适配机型（只读）
              </div>
              <div className="card-subtitle" style={{ marginTop: "4px" }}>
                这些机型已将当前配件加入“可选配件”列表。维护入口在机型编辑页。
              </div>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "12px",
          }}>
            {compatibleDrones.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-elevated)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--color-primary-400)",
                    letterSpacing: "0.5px",
                  }}>
                    {d.model}
                  </div>
                  <div style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "520px",
                  }}>
                    {d.nameZh}
                  </div>
                  {d.nameEn && (
                    <div style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-tertiary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "520px",
                    }}>
                      {d.nameEn}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {d.isRecommended && (
                    <span className="badge badge-neutral" title="该机型中标记为推荐">
                      <Star size={12} />
                      推荐
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => router.push(`/sales/products/${d.id}`)}
                  >
                    <Edit2 size={14} />
                    去机型编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
