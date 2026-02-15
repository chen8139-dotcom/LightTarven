"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  acceptBetaConsent,
  clearBetaConsent,
  hasAcceptedBetaConsent
} from "@/lib/beta-consent";

const protectedPrefixes = ["/dashboard", "/settings", "/character", "/admin"];

export default function BetaConsentGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const needsConsent = useMemo(
    () => protectedPrefixes.some((prefix) => pathname.startsWith(prefix)),
    [pathname]
  );

  useEffect(() => {
    if (!needsConsent) {
      setOpen(false);
      return;
    }
    setOpen(!hasAcceptedBetaConsent());
  }, [needsConsent, pathname]);

  const onAccept = () => {
    acceptBetaConsent();
    setOpen(false);
  };

  const onDecline = async () => {
    setSubmitting(true);
    clearBetaConsent();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors and force return to login page.
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-2xl rounded border border-zinc-700 bg-zinc-950 p-5 text-zinc-100">
        <h2 className="mb-3 text-lg font-semibold">LightTavern 内测声明</h2>
        <div className="max-h-[52vh] space-y-2 overflow-auto text-sm text-zinc-300">
          <p>1. 本系统仅用于内测评估，功能和内容可能随时调整。</p>
          <p>2. 请勿公开传播内测页面、截图、角色卡和生成内容。</p>
          <p>3. 模型输出可能存在错误或不当内容，不构成专业建议。</p>
          <p>4. 禁止用于违法违规、侵权、骚扰、欺诈或绕过安全限制的行为。</p>
          <p>5. 请勿输入个人敏感信息或企业机密信息。</p>
          <p>6. 为排查问题，系统可能记录必要的运行日志和错误信息。</p>
          <p>7. 声明更新后你可能需要重新确认，方可继续使用。</p>
        </div>
        <p className="mt-4 text-xs text-zinc-400">点击“同意并继续”即表示你已阅读并同意上述声明。</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onAccept} className="w-full">
            同意并继续
          </button>
          <button type="button" onClick={onDecline} disabled={submitting} className="w-full">
            不同意并退出
          </button>
        </div>
      </section>
    </div>
  );
}
