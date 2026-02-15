import Link from "next/link";

export default function UserAdminControls() {
  return (
    <div className="space-y-3">
      <Link
        href="/admin/users/new"
        className="inline-flex items-center rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
      >
        添加账户
      </Link>
    </div>
  );
}
