"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Package,
  LogOut,
  Settings,
  List,
  Users,
  Ticket,
} from "lucide-react";

const iconMap: Record<string, any> = {
  LayoutDashboard,
  FileText,
  Package,
  Settings,
  List,
  Users,
  Ticket,
};

interface NavItem {
  href: string;
  icon: string;
  label: string;
  labelZh: string;
}

export default function SidebarNav({
  items,
  userName,
}: {
  items: NavItem[];
  userName: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/sales") return pathname === "/sales";
    return pathname.startsWith(href);
  };

  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        const Icon = iconMap[item.icon] || LayoutDashboard;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${active ? "active" : ""}`}
          >
            <span className="sidebar-nav-icon">
              <Icon size={20} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User Info */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          background: "rgba(51,102,255,0.06)",
          border: "1px solid rgba(51,102,255,0.1)",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "4px",
          }}
        >
          当前登录
        </div>
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "#f1f5f9",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userName}
        </div>
      </div>

      {/* Logout */}
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="sidebar-nav-item"
          style={{ color: "#f87171" }}
        >
          <span className="sidebar-nav-icon">
            <LogOut size={20} />
          </span>
          <span>退出登录</span>
        </button>
      </form>
    </nav>
  );
}
