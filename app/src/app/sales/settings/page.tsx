"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Save, Settings, Building2, Stamp, Info, Image as ImageIcon, CheckCircle2, AlertTriangle } from "lucide-react";

interface ImageDimensions {
  width: number;
  height: number;
}

function getImageDimensions(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const [dragActiveLogo, setDragActiveLogo] = useState(false);
  const [dragActiveSeal, setDragActiveSeal] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [sealUrl, setSealUrl] = useState("");
  const [companyName, setCompanyName] = useState("SHYTIAN");
  const [saved, setSaved] = useState(false);
  const [logoDims, setLogoDims] = useState<ImageDimensions | null>(null);
  const [sealDims, setSealDims] = useState<ImageDimensions | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setLogoUrl(data.company_logo || "");
        setSealUrl(data.company_seal || "");
        setCompanyName(data.company_name || "SHYTIAN");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Detect dimensions when URLs change
  useEffect(() => {
    if (logoUrl) {
      getImageDimensions(logoUrl).then(setLogoDims).catch(() => setLogoDims(null));
    } else {
      setLogoDims(null);
    }
  }, [logoUrl]);

  useEffect(() => {
    if (sealUrl) {
      getImageDimensions(sealUrl).then(setSealDims).catch(() => setSealDims(null));
    } else {
      setSealDims(null);
    }
  }, [sealUrl]);

  const handleUpload = useCallback(async (file: File, type: 'logo' | 'seal') => {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件 (PNG/JPG/WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("文件不能超过 5MB");
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingSeal;
    const setUrl = type === 'logo' ? setLogoUrl : setSealUrl;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        setUrl(json.url);
      }
    } catch (err) {
      console.error(err);
      alert("上传失败");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'logo' | 'seal') => {
      e.preventDefault();
      if (type === 'logo') setDragActiveLogo(false);
      else setDragActiveSeal(false);
      if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0], type);
    },
    [handleUpload]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_logo: logoUrl,
          company_seal: sealUrl,
          company_name: companyName,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const checkDimensions = (dims: ImageDimensions | null, recommended: { w: number; h: number }) => {
    if (!dims) return null;
    const wOk = Math.abs(dims.width - recommended.w) < recommended.w * 0.3;
    const hOk = Math.abs(dims.height - recommended.h) < recommended.h * 0.3;
    return wOk && hOk;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-primary-400)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const logoOk = checkDimensions(logoDims, { w: 400, h: 120 });
  const sealOk = checkDimensions(sealDims, { w: 300, h: 300 });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>
            <Settings size={24} style={{ marginRight: "10px", opacity: 0.5 }} />
            System Settings
          </h1>
          <p>管理公司品牌资产及报价单配置 / Manage company branding for quotation documents</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>

        {/* ═══════════════════════════════════════════════
            Image Specs Summary Panel
            ═══════════════════════════════════════════════ */}
        <div className="card" style={{
          background: "linear-gradient(135deg, rgba(51,102,255,0.06), rgba(139,92,246,0.04))",
          borderColor: "rgba(51,102,255,0.15)",
        }}>
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Info size={18} style={{ color: "var(--color-primary-400)" }} />
              图片规格指南 / Image Specifications Guide
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {/* Logo spec */}
            <div style={{
              padding: "16px",
              borderRadius: "12px",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}>
                <Building2 size={16} style={{ color: "var(--color-primary-400)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>公司 Logo</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
                <div><strong>推荐尺寸:</strong> 400 × 120 px</div>
                <div><strong>格式:</strong> PNG (透明背景)</div>
                <div><strong>最大:</strong> 5 MB</div>
                <div><strong>用途:</strong> PDF报价单头部、客户门户</div>
              </div>
            </div>

            {/* Product image spec */}
            <div style={{
              padding: "16px",
              borderRadius: "12px",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}>
                <ImageIcon size={16} style={{ color: "var(--color-accent-400)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>产品主图</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
                <div><strong>推荐尺寸:</strong> 1200 × 800 px (3:2)</div>
                <div><strong>格式:</strong> JPG / PNG / WebP</div>
                <div><strong>最大:</strong> 10 MB</div>
                <div><strong>用途:</strong> PDF报价单封面、客户门户大图</div>
              </div>
            </div>

            {/* Seal spec */}
            <div style={{
              padding: "16px",
              borderRadius: "12px",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}>
                <Stamp size={16} style={{ color: "#8b5cf6" }} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>公司公章</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
                <div><strong>推荐尺寸:</strong> 300 × 300 px</div>
                <div><strong>格式:</strong> PNG (透明背景)</div>
                <div><strong>最大:</strong> 5 MB</div>
                <div><strong>用途:</strong> PDF报价单签章区域</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Company Logo
            ═══════════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={18} style={{ opacity: 0.6 }} />
                公司 Logo / Company Logo
              </div>
              <div className="card-subtitle" style={{ marginTop: "4px" }}>
                推荐尺寸 <strong>400 × 120 px</strong>，PNG 透明背景，用于 PDF 报价单和客户门户
              </div>
            </div>
            {logoDims && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: logoOk ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                color: logoOk ? "var(--color-success-500)" : "var(--color-warning-500)",
              }}>
                {logoOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {logoDims.width} × {logoDims.height} px
                {!logoOk && <span style={{ fontSize: "0.7rem", opacity: 0.8 }}> (建议 400×120)</span>}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActiveLogo(true); }}
              onDragLeave={() => setDragActiveLogo(false)}
              onDrop={(e) => handleDrop(e, 'logo')}
              onClick={() => logoInputRef.current?.click()}
              style={{
                flex: logoUrl ? "0 0 180px" : "1",
                minHeight: logoUrl ? "120px" : "160px",
                borderRadius: "16px",
                border: `2px dashed ${dragActiveLogo ? "var(--color-primary-400)" : "var(--color-border)"}`,
                background: dragActiveLogo ? "rgba(51,102,255,0.04)" : "var(--color-surface-elevated)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              {uploadingLogo ? (
                <>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    border: "3px solid var(--color-border)",
                    borderTopColor: "var(--color-primary-400)",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={24} style={{
                    color: dragActiveLogo ? "var(--color-primary-400)" : "var(--color-text-tertiary)",
                  }} />
                  <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{logoUrl ? "替换 Logo" : "上传 Logo"}</span>
                    <br />
                    拖拽或点击选择文件
                  </div>
                </>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'logo'); }}
              />
            </div>

            {/* Preview */}
            {logoUrl && (
              <div style={{ flex: 1 }}>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  position: "relative",
                }}>
                  {/* Light preview */}
                  <div style={{
                    padding: "24px 32px",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "80px",
                    borderBottom: "1px solid var(--color-border)",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo Preview" style={{ maxHeight: "50px", maxWidth: "200px", objectFit: "contain" }} />
                  </div>
                  {/* Dark preview */}
                  <div style={{
                    padding: "24px 32px",
                    background: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "80px",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo Dark" style={{ maxHeight: "50px", maxWidth: "200px", objectFit: "contain" }} />
                  </div>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    style={{
                      position: "absolute", top: "8px", right: "8px",
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(239,68,68,0.9)", border: "none",
                      color: "white", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                    }}
                    title="移除 Logo"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{
                  fontSize: "0.7rem", color: "var(--color-text-tertiary)",
                  marginTop: "6px", fontFamily: "var(--font-mono)",
                }}>
                  预览：浅色 / 深色背景效果
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Company Seal (公章)
            ═══════════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Stamp size={18} style={{ opacity: 0.6 }} />
                公司公章 / Company Seal
              </div>
              <div className="card-subtitle" style={{ marginTop: "4px" }}>
                推荐尺寸 <strong>300 × 300 px</strong>，PNG 透明背景，用于 PDF 报价单签章区域
              </div>
            </div>
            {sealDims && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: sealOk ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                color: sealOk ? "var(--color-success-500)" : "var(--color-warning-500)",
              }}>
                {sealOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {sealDims.width} × {sealDims.height} px
                {!sealOk && <span style={{ fontSize: "0.7rem", opacity: 0.8 }}> (建议 300×300)</span>}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActiveSeal(true); }}
              onDragLeave={() => setDragActiveSeal(false)}
              onDrop={(e) => handleDrop(e, 'seal')}
              onClick={() => sealInputRef.current?.click()}
              style={{
                flex: sealUrl ? "0 0 180px" : "1",
                minHeight: sealUrl ? "120px" : "160px",
                borderRadius: "16px",
                border: `2px dashed ${dragActiveSeal ? "#8b5cf6" : "var(--color-border)"}`,
                background: dragActiveSeal ? "rgba(139,92,246,0.04)" : "var(--color-surface-elevated)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              {uploadingSeal ? (
                <>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    border: "3px solid var(--color-border)",
                    borderTopColor: "#8b5cf6",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Uploading...</span>
                </>
              ) : (
                <>
                  <Stamp size={24} style={{
                    color: dragActiveSeal ? "#8b5cf6" : "var(--color-text-tertiary)",
                  }} />
                  <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{sealUrl ? "替换公章" : "上传公章"}</span>
                    <br />
                    拖拽或点击选择文件
                  </div>
                </>
              )}
              <input
                ref={sealInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'seal'); }}
              />
            </div>

            {/* Preview */}
            {sealUrl && (
              <div style={{ flex: 1 }}>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  position: "relative",
                  display: "flex",
                  gap: "1px",
                }}>
                  {/* White bg preview */}
                  <div style={{
                    flex: 1,
                    padding: "24px",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "160px",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sealUrl} alt="Seal Preview" style={{ maxHeight: "120px", maxWidth: "120px", objectFit: "contain" }} />
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "8px" }}>浅色背景</div>
                  </div>
                  {/* PDF preview mockup */}
                  <div style={{
                    flex: 1,
                    padding: "24px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "160px",
                    borderLeft: "1px solid var(--color-border)",
                  }}>
                    <div style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sealUrl} alt="Seal PDF Preview" style={{ maxHeight: "100px", maxWidth: "100px", objectFit: "contain" }} />
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "8px" }}>PDF 报价单效果</div>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => setSealUrl("")}
                    style={{
                      position: "absolute", top: "8px", right: "8px",
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: "rgba(239,68,68,0.9)", border: "none",
                      color: "white", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                    }}
                    title="移除公章"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{
                  fontSize: "0.7rem", color: "var(--color-text-tertiary)",
                  marginTop: "6px", fontFamily: "var(--font-mono)",
                }}>
                  预览：白底 / PDF 签章区域效果
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Company Name
            ═══════════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">公司名称 / Company Name</div>
            <div className="card-subtitle">未上传 Logo 时在 PDF 报价单中显示的文字品牌</div>
          </div>
          <div className="form-group">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="form-input"
              placeholder="公司名称"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Save Button
            ═══════════════════════════════════════════════ */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "40px" }}>
          {saved && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(34,197,94,0.1)",
                color: "var(--color-success-500)",
                fontSize: "0.85rem",
                fontWeight: 600,
                animation: "fadeIn 0.3s ease",
              }}
            >
              <CheckCircle2 size={16} />
              设置已保存
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ minWidth: "160px" }}
          >
            <Save size={16} />
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
