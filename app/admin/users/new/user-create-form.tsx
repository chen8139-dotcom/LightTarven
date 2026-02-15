"use client";

import { FormEvent, useState } from "react";

export default function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    } catch {
      setStatus("创建失败：网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-3 md:max-w-xl" onSubmit={onSubmit}>
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
        className="w-fit rounded border border-zinc-700 bg-zinc-900 px-3 py-2 hover:bg-zinc-800 disabled:opacity-60"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "创建中..." : "确认创建"}
      </button>
      {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
    </form>
  );
}
