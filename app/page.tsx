"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { saveAccess } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await fetch("/api/access/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode })
    });
    setLoading(false);
    if (!result.ok) {
      setError("口令错误，请重试。");
      return;
    }
    saveAccess(passcode);
    router.push("/dashboard");
  };

  return (
    <main className="mx-auto max-w-md rounded border border-zinc-800 p-6">
      <h2 className="mb-4 text-xl font-semibold">内测口令验证</h2>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          placeholder="输入内测口令"
          className="w-full"
        />
        <button disabled={loading} type="submit" className="w-full">
          {loading ? "校验中..." : "进入系统"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </main>
  );
}
