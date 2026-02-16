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
    <main className="mx-auto max-w-2xl space-y-4">
      <section className="rounded border border-zinc-800 p-6">
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
      </section>

      <section className="rounded border border-zinc-800 p-5">
        <h3 className="mb-3 text-base font-semibold">合规与内测声明</h3>
        <div className="space-y-2 text-sm text-zinc-300">
          <p>1. 本系统仅用于内测评估，功能和内容可能随时调整。</p>
          <p>2. 请勿公开传播内测页面、截图、角色卡和生成内容。</p>
          <p>3. 模型输出可能存在错误或不当内容，不构成专业建议。</p>
          <p>4. 禁止用于违法违规、侵权、骚扰、欺诈或绕过安全限制的行为。</p>
          <p>5. 请勿输入个人敏感信息或企业机密信息。</p>
          <p>6. 声明更新后你可能需要重新确认，方可继续使用。</p>
        </div>
      </section>
    </main>
  );
}
