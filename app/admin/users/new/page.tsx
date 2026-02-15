import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import CreateUserForm from "@/app/admin/users/new/user-create-form";

export default async function AdminCreateUserPage() {
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
      <Link href="/admin" className="text-cyan-300 hover:underline">
        返回管理后台
      </Link>

      <section className="rounded border border-zinc-800 p-4">
        <h2 className="text-lg font-semibold">添加账户</h2>
        <p className="mt-2 text-sm text-zinc-400">请输入邮箱和密码创建新用户（角色固定为 user）。</p>
        <div className="mt-4">
          <CreateUserForm />
        </div>
      </section>
    </main>
  );
}
