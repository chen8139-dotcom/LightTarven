"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  disabled_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
};

type UsersApiResponse = {
  users: UserRow[];
};

function statusText(user: UserRow) {
  if (user.deleted_at) return "已软删除";
  if (user.disabled_at) return "已禁用";
  return "正常";
}

export default function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users?limit=100", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("加载失败");
        }
        const payload = (await response.json()) as UsersApiResponse;
        if (!mounted) return;
        setUsers(payload.users ?? []);
      } catch {
        if (!mounted) return;
        setError("用户列表加载失败，请稍后重试");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="overflow-auto rounded border border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-900 text-zinc-300">
          <tr>
            <th className="px-3 py-2">邮箱</th>
            <th className="px-3 py-2">角色</th>
            <th className="px-3 py-2">状态</th>
            <th className="px-3 py-2">创建时间</th>
            <th className="px-3 py-2">查看</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                正在加载用户列表...
              </td>
            </tr>
          ) : null}
          {error ? (
            <tr>
              <td className="px-3 py-6 text-rose-300" colSpan={5}>
                {error}
              </td>
            </tr>
          ) : null}
          {!loading && !error
            ? users.map((user) => (
                <tr key={user.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2">{user.email ?? "-"}</td>
                  <td className="px-3 py-2">{user.role}</td>
                  <td className="px-3 py-2">{statusText(user)}</td>
                  <td className="px-3 py-2">
                    {user.created_at ? new Date(user.created_at).toLocaleString("zh-CN") : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${user.id}`} className="text-cyan-300 hover:underline">
                      详情
                    </Link>
                  </td>
                </tr>
              ))
            : null}
          {!loading && !error && users.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                暂无用户数据
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
