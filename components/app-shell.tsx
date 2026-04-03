import type { ReactNode } from "react";

import type { Profile } from "@/types";
import { Sidebar } from "@/components/sidebar";
import { TopWindowBar } from "@/components/top-window-bar";

interface AppShellProps {
  profile: Profile | null;
  title: string;
  children: ReactNode;
  contextPanel?: ReactNode;
}

export function AppShell({ profile, title, children, contextPanel }: AppShellProps) {
  return (
    <div className="trace-shell">
      <div className="trace-window trace-noise">
        <Sidebar profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopWindowBar title={title} />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1">{children}</main>
            {contextPanel ? (
              <aside className="w-[352px] shrink-0 border-l border-trace-line bg-white/20 px-6 py-6 dark:bg-white/[0.02]">
                {contextPanel}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
