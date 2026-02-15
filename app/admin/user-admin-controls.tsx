"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  disabled_at: string | null;
  deleted_at: string | null;
};

type Props = {
  users: UserRow[];
  currentAdminId: string;
};

export default function UserAdminControls({ users, currentAdminId }: Props) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const onCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(`创建失败：${payload.error ?? "unknown error"}`);
        return;
      }
      setStatus("创建成功");
      setEmail("");
      setPassword("");
      setShowCreateForm(false);
      router.refresh();
    } catch {
      setStatus("创建失败：网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleStatus = async (user: UserRow) => {
    if (user.id === currentAdminId) {
      setStatus("不能禁用当前管理员账号");
      return;
    }
    setBusyUserId(user.id);
    setStatus("");
    const action = user.disabled_at ? "enable" : "disable";
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(`操作失败：${payload.error ?? "unknown error"}`);
        return;
      }
      setStatus(action === "disable" ? "已禁用用户" : "已启用用户");
      router.refresh();
    } catch {
      setStatus("操作失败：网络错误");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 hover:bg-zinc-800 disabled:opacity-60"
          type="button"
          onClick={() => {
            setStatus("");
            setShowCreateForm((prev) => !prev);
          }}
          disabled={submitting}
        >
          {showCreateForm ? "取消" : "添加用户"}
        </button>
      </div>

      {showCreateForm ? (
        <form className="grid gap-2 md:grid-cols-3" onSubmit={onCreateUser}>
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="邮箱"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="密码（至少 8 位）"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 hover:bg-zinc-800 disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "创建中..." : "确认添加"}
          </button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <button
            key={user.id}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60"
            onClick={() => onToggleStatus(user)}
            disabled={busyUserId === user.id || user.deleted_at !== null || user.id === currentAdminId}
            type="button"
          >
            {(user.email ?? user.id) + " · " + (user.disabled_at ? "启用" : "禁用")}
          </button>
        ))}
      </div>

      {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
    </div>
  );
}
