import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit2, Package, Cpu } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProductsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const drones = await prisma.product.findMany({
    where: { category: "drone" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="page-header-info">
          <h1>无人机管理</h1>
          <p>管理无人机及 MSRP 价格</p>
        </div>
        <div className="page-header-actions">
          <Link href="/sales/products/new" className="btn btn-primary">
            <Package size={16} />
            新增无人机
          </Link>
        </div>
      </div>

      {/* Stats */}
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Cpu size={24} /></div>
          <div className="stat-content">
            <h3>无人机总数</h3>
            <div className="stat-value">{drones.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={24} /></div>
          <div className="stat-content">
            <h3>在售中</h3>
            <div className="stat-value">{drones.filter(d => d.isActive).length}</div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="card-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="card-title">全部无人机</div>
        </div>

        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}></th>
                <th>型号</th>
                <th>名称</th>
                <th>类别</th>
                <th>MSRP</th>
                <th>FOB 价格</th>
                <th>状态</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {drones.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: product.imageUrl ? "#0f172a" : "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.model}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Package size={18} style={{ color: "var(--color-text-tertiary)" }} />
                      )}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--color-primary-400)",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {product.model}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{product.nameZh}</div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {product.nameEn}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${product.category === "drone" ? "badge-primary" : "badge-neutral"}`}
                    >
                      <Package size={12} />
                      {product.category === "drone" ? "无人机" : "配件"}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      ¥{new Intl.NumberFormat("zh-CN").format(product.msrp)}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      ¥{new Intl.NumberFormat("zh-CN").format(product.fobPrice)}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${product.isActive ? "badge-success" : "badge-danger"}`}
                    >
                      {product.isActive ? "在售" : "停售"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/sales/products/${product.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit2 size={14} />
                      编辑
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
