"use client";

import { useMemo, useState } from "react";
import { Trash2, Shield, User as UserIcon, KeyRound } from "lucide-react";

type UserRow = {
  id: string;
  username?: string | null;
  email?: string | null;
  nameZh: string;
  nameEn: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersAdminClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"sales" | "admin">("sales");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => [...users].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [users]);

  const api = async (input: RequestInfo, init?: RequestInit) => {
    const res = await fetch(input, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) throw new Error(json?.error || "请求失败");
    return json;
  };

  const refresh = async () => {
    const json = await api("/api/admin/users", { method: "GET" });
    setUsers(json.users);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, nameZh, nameEn, phone, role, password }),
      });
      setUsername("");
      setEmail("");
      setNameZh("");
      setNameEn("");
      setPhone("");
      setPassword("");
      setRole("sales");
      await refresh();
    } catch (e: any) {
      alert(e?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const patchUser = async (id: string, body: any) => {
    setBusyId(id);
    try {
      await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      await refresh();
    } catch (e: any) {
      alert(e?.message || "更新失败");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("确认删除该账号？（若账号仍有关联报价单将无法删除）")) return;
    setBusyId(id);
    try {
      await api(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) {
      alert(e?.message || "删除失败");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-info">
          <h1>账号管理</h1>
          <p>创建业务员/管理员账号，支持禁用与重置密码</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="card-header">
          <div className="card-title">新建账号</div>
        </div>
        <div className="admin-form-grid" style={{ display: "grid", gap: "12px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">账号（登录名）</label>
            <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="例如：sales01 / zhangsan" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">初始密码（≥8位）</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">邮箱（可选，用于联系）</label>
            <input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="可不填" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">姓名（中文）</label>
            <input className="form-input" value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">姓名（英文，可选）</label>
            <input className="form-input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">电话（可选）</label>
            <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">角色</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="sales">业务员</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <button className="btn btn-primary" type="button" onClick={handleCreate} disabled={creating}>
            {creating ? "创建中..." : "创建账号"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header" style={{ padding: "18px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <div className="card-title">账号列表</div>
        </div>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>账号</th>
                <th>姓名</th>
                <th>角色</th>
                <th>状态</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const self = u.id === currentUserId;
                return (
                  <tr key={u.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                      {u.username || "—"}
                      {u.email ? (
                        <div style={{ fontFamily: "inherit", fontSize: "0.72rem", color: "var(--color-text-tertiary)", marginTop: "4px" }}>
                          {u.email}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{u.nameZh}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>{u.nameEn}</div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === "admin" ? "badge-warning" : "badge-neutral"}`} style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {u.role === "admin" ? <Shield size={14} /> : <UserIcon size={14} />}
                        {u.role === "admin" ? "管理员" : "业务员"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "badge-success" : "badge-danger"}`}>{u.isActive ? "启用" : "禁用"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          disabled={busyId === u.id || self}
                          onClick={() => {
                            const pwd = prompt("输入新密码（≥8位）：");
                            if (!pwd) return;
                            patchUser(u.id, { password: pwd });
                          }}
                        >
                          <KeyRound size={14} />
                          重置密码
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          disabled={busyId === u.id || self}
                          onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                        >
                          {u.isActive ? "禁用" : "启用"}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          disabled={busyId === u.id || self}
                          onClick={() => patchUser(u.id, { role: u.role === "admin" ? "sales" : "admin" })}
                        >
                          {u.role === "admin" ? "改为业务员" : "升为管理员"}
                        </button>
                        <button className="btn btn-outline btn-sm" type="button" disabled={busyId === u.id || self} onClick={() => deleteUser(u.id)} style={{ color: "var(--color-danger-400)" }}>
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
