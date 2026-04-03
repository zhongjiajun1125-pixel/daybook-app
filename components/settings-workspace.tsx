"use client";

import { useState } from "react";

import type { Profile } from "@/types";
import { AppShell } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SettingsWorkspace({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [status, setStatus] = useState("");

  const saveProfile = async () => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.id);
    setStatus(error ? "没有存好" : "已经记下了");
  };

  const contextPanel = (
    <div>
      <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Shortcuts</p>
      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-trace-text">键盘和偏好</h2>
      <dl className="mt-6 space-y-4 text-sm text-trace-sub">
        <div className="flex justify-between gap-4">
          <dt>Save</dt>
          <dd>⌘ / Ctrl + Enter</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Reflect</dt>
          <dd>⌘ / Ctrl + /</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Voice</dt>
          <dd>Shift + Space</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <AppShell profile={profile} title="Settings" contextPanel={contextPanel}>
      <div className="px-8 py-8">
        <div>
          <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Settings</p>
          <h1 className="mt-3 text-[38px] font-semibold tracking-[-0.04em] text-trace-text">保持安静</h1>
        </div>

        <div className="mt-10 space-y-8">
          <section className="rounded-pane bg-white/60 p-6 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Theme</h2>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </section>

          <section className="rounded-pane bg-white/60 p-6 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Profile</h2>
            <div className="mt-4 flex max-w-md items-center gap-3">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Display name"
                className="quiet-focus flex-1 rounded-dock bg-black/[0.03] px-4 py-3 text-sm text-trace-text placeholder:text-trace-ghost dark:bg-white/[0.05]"
              />
              <button
                type="button"
                onClick={saveProfile}
                className="rounded-dock bg-black px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Save
              </button>
            </div>
            {status ? <p className="mt-3 text-sm text-trace-sub">{status}</p> : null}
          </section>

          <section className="rounded-pane bg-white/60 p-6 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Data</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-trace-sub">
              <li>Entries, tags, and insights are stored in Supabase.</li>
              <li>Export can be added in phase 2 without changing the route structure.</li>
              <li>AI generation stays secondary and opt-in.</li>
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
