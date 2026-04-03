"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, PenSquare, Settings2, Sparkles } from "lucide-react";

import type { Profile } from "@/types";
import { cn } from "@/lib/utils/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/capture", label: "Capture", icon: PenSquare },
  { href: "/reflect", label: "Reflect", icon: History },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  };

  return (
    <aside className="flex w-[232px] shrink-0 flex-col justify-between border-r border-trace-line bg-white/28 px-5 py-5 dark:bg-white/[0.02]">
      <div>
        <div className="mb-10 text-[13px] font-semibold tracking-[0.2em] text-trace-sub">TRACE</div>
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition duration-200 ease-trace",
                  active
                    ? "bg-white/70 text-trace-text shadow-pane dark:bg-white/8"
                    : "text-trace-sub hover:bg-black/4 hover:text-trace-text dark:hover:bg-white/4"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 rounded-pane bg-black/[0.02] p-3 dark:bg-white/[0.03]">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-trace-ghost">Account</p>
          <p className="mt-2 truncate text-sm font-medium text-trace-text">{profile?.display_name || profile?.email || "TRACE"}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-trace-sub transition hover:text-trace-text"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
