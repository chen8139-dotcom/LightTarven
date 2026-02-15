import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import UserAdminControls from "@/app/admin/user-admin-controls";

type UserRow = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  disabled_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
};

export default async function AdminPage() {
  const { profile } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    redirect("/");
    return null;
  }
  if (!profile) {
    redirect("/");
    return null;
  }
  if (profile.role !== "admin") {
    redirect("/dashboard");
    return null;
  }

  const adminClient = getSupabaseAdminClient();
  const { data: users } = await adminClient
    .from("profiles")
    .select("id,email,role,disabled_at,deleted_at,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="space-y-4">
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">管理后台</h2>
        <p className="mb-3 text-sm text-zinc-400">支持创建用户，以及查看用户数据详情。</p>
        <UserAdminControls />
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h3 className="mb-3 text-base font-semibold">用户列表</h3>
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
              {(users as UserRow[] | null)?.map((user) => {
                const status = user.deleted_at
                  ? "已软删除"
                  : user.disabled_at
                    ? "已禁用"
                    : "正常";
                return (
                  <tr key={user.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">{user.email ?? "-"}</td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">{status}</td>
                    <td className="px-3 py-2">
                      {user.created_at ? new Date(user.created_at).toLocaleString("zh-CN") : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${user.id}`} className="text-cyan-300 hover:underline">
                        详情
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!users?.length ? (
                <tr>
                  <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                    暂无用户数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
