import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import UserAdminControls from "@/app/admin/user-admin-controls";
import UsersTable from "@/app/admin/users-table";

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

  return (
    <main className="space-y-4">
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">管理后台</h2>
        <p className="mb-3 text-sm text-zinc-400">支持创建用户，以及查看用户数据详情。</p>
        <UserAdminControls />
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h3 className="mb-3 text-base font-semibold">用户列表</h3>
        <UsersTable />
      </section>
    </main>
  );
}
