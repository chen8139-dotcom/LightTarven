import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type CharacterRow = {
  id: string;
  name: string;
  updated_at: string;
};

type ConversationRow = {
  id: string;
  character_id: string;
  title: string | null;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  disabled_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
};

export default async function AdminUserDetailPage({ params }: RouteParams) {
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

  const { id: userId } = await params;
  const adminClient = getSupabaseAdminClient();

  const { data: user } = await adminClient
    .from("profiles")
    .select("id,email,role,disabled_at,deleted_at,created_at")
    .eq("id", userId)
    .single<UserRow>();

  if (!user) {
    return (
      <main className="space-y-3">
        <Link href="/admin" className="text-cyan-300 hover:underline">
          返回用户列表
        </Link>
        <p className="text-red-400">用户不存在</p>
      </main>
    );
  }

  const { data: charactersResp } = await adminClient
    .from("characters")
    .select("id,name,updated_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: chatsResp } = await adminClient
    .from("conversations")
    .select("id,character_id,title,updated_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: messagesResp } = await adminClient
    .from("messages")
    .select("id,conversation_id,role,content,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="space-y-4">
      <Link href="/admin" className="text-cyan-300 hover:underline">
        返回用户列表
      </Link>

      <section className="rounded border border-zinc-800 p-4">
        <h2 className="text-lg font-semibold">用户详情</h2>
        <p className="mt-2 text-sm text-zinc-300">邮箱：{user.email ?? "-"}</p>
        <p className="text-sm text-zinc-300">角色：{user.role}</p>
        <p className="text-sm text-zinc-300">
          状态：{user.deleted_at ? "已软删除" : user.disabled_at ? "已禁用" : "正常"}
        </p>
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h3 className="mb-2 font-semibold">角色列表</h3>
        <ul className="space-y-2 text-sm">
          {(charactersResp as CharacterRow[] | null)?.map((character) => (
            <li key={character.id} className="rounded border border-zinc-800 p-2">
              <p className="font-medium">{character.name}</p>
              <p className="text-zinc-400">{new Date(character.updated_at).toLocaleString("zh-CN")}</p>
            </li>
          ))}
          {!charactersResp?.length ? <li className="text-zinc-500">暂无角色</li> : null}
        </ul>
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h3 className="mb-2 font-semibold">会话列表</h3>
        <ul className="space-y-2 text-sm">
          {(chatsResp as ConversationRow[] | null)?.map((chat) => (
            <li key={chat.id} className="rounded border border-zinc-800 p-2">
              <p className="font-medium">{chat.title ?? "未命名会话"}</p>
              <p className="text-zinc-400">character_id: {chat.character_id}</p>
              <p className="text-zinc-400">{new Date(chat.updated_at).toLocaleString("zh-CN")}</p>
            </li>
          ))}
          {!chatsResp?.length ? <li className="text-zinc-500">暂无会话</li> : null}
        </ul>
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h3 className="mb-2 font-semibold">最近消息</h3>
        <ul className="space-y-2 text-sm">
          {(messagesResp as MessageRow[] | null)?.map((message) => (
            <li key={message.id} className="rounded border border-zinc-800 p-2">
              <p className="text-xs text-zinc-400">
                {message.role} · {new Date(message.created_at).toLocaleString("zh-CN")}
              </p>
              <p className="line-clamp-2">{message.content}</p>
            </li>
          ))}
          {!messagesResp?.length ? <li className="text-zinc-500">暂无消息</li> : null}
        </ul>
      </section>
    </main>
  );
}
