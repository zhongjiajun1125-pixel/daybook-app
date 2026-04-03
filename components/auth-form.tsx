"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const title = useMemo(() => (mode === "sign-in" ? "回到这里" : "从这里进去"), [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();

    const action =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/capture");
    router.refresh();
  };

  return (
    <div className="trace-shell flex items-center justify-center">
      <div className="w-full max-w-[440px] rounded-shell border border-white/50 bg-trace-panel p-10 shadow-shell backdrop-blur-2xl dark:border-white/5">
        <div className="mb-12">
          <div className="text-xs font-semibold tracking-[0.2em] text-trace-ghost">TRACE</div>
          <h1 className="mt-5 text-[32px] font-semibold tracking-[-0.04em] text-trace-text">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-trace-sub">
            {mode === "sign-in" ? "安静回来，继续留下。" : "先进去，再慢慢写。"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-trace-ghost">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="quiet-focus w-full rounded-2xl bg-black/[0.03] px-4 py-3 text-[15px] text-trace-text placeholder:text-trace-ghost dark:bg-white/[0.05]"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-trace-ghost">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="quiet-focus w-full rounded-2xl bg-black/[0.03] px-4 py-3 text-[15px] text-trace-text placeholder:text-trace-ghost dark:bg-white/[0.05]"
              placeholder="至少 6 位"
              required
            />
          </label>

          {message ? <p className="text-sm text-amber-600 dark:text-amber-400">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-dock bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {loading ? "等一下…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-sm text-trace-sub">
          {mode === "sign-in" ? "还没有账号？" : "已经有账号了？"}
          <button
            type="button"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="ml-2 text-trace-text transition hover:opacity-70"
          >
            {mode === "sign-in" ? "Create one" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
