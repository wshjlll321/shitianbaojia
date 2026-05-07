import "../globals.css";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SidebarNav from "../sales/SidebarNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/sales");

  // 与 sales/layout.tsx 保持一致的导航项 —— 让 admin 子路由不要切走整个侧栏
  const navItems = [
    { href: "/sales", icon: "LayoutDashboard", label: "控制台", labelZh: "控制台" },
    { href: "/sales/quotes", icon: "List", label: "报价列表", labelZh: "报价列表" },
    { href: "/sales/quote/new", icon: "FileText", label: "创建报价", labelZh: "创建报价" },
    { href: "/sales/invites", icon: "Ticket", label: "邀请码", labelZh: "邀请码" },
    { href: "/sales/products", icon: "Package", label: "无人机管理", labelZh: "无人机管理" },
    { href: "/sales/accessories", icon: "Package", label: "配件管理", labelZh: "配件管理" },
    { href: "/sales/settings", icon: "Settings", label: "系统设置", labelZh: "系统设置" },
    { href: "/admin/users", icon: "Users", label: "账号管理", labelZh: "账号管理" },
  ];

  return (
    <html lang="zh">
      <body style={{ margin: 0 }}>
        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">ST</div>
              <div className="sidebar-logo-text">
                <h2>世天航空</h2>
                <span>数字化报价系统</span>
              </div>
            </div>

            <SidebarNav items={navItems} userName={session.user.name || ""} />
          </aside>

          <main className="dashboard-main">
            <div className="page-container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
