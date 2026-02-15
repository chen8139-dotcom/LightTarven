"use client";

import { FormEvent, useState } from "react";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      if (!result.ok) {
        const payload = (await result.json().catch(() => ({ error: "登录失败，请重试。" }))) as {
          error?: string;
        };
        setError(payload.error ?? "登录失败，请重试。");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md rounded border border-zinc-800 p-6">
      <h2 className="mb-4 text-xl font-semibold">账号登录</h2>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="输入邮箱"
          autoComplete="username"
          className="w-full"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="输入密码"
          autoComplete="current-password"
          className="w-full"
        />
        <button disabled={loading} type="submit" className="w-full">
          {loading ? "登录中..." : "进入系统"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </main>
  );
}
