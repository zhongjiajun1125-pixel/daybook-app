"use client";

import { useState, useTransition } from "react";

import type { Entry, Insight, InsightBundle, Profile } from "@/types";
import { AppShell } from "@/components/app-shell";
import { InsightPanel } from "@/components/insight-panel";
import { TagChip } from "@/components/tag-chip";

export function InsightsWorkspace({
  profile,
  entries,
  insights
}: {
  profile: Profile;
  entries: Entry[];
  insights: Insight[];
}) {
  const [bundle, setBundle] = useState<InsightBundle | null>(null);
  const [savedInsights, setSavedInsights] = useState(insights);
  const [isPending, startTransition] = useTransition();

  const contextPanel = (
    <div>
      <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Analyze</p>
      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-trace-text">只在你打开时出现</h2>
      <p className="mt-3 text-sm leading-7 text-trace-sub">
        不把 AI 推进写作表面。这里只在你主动切进来时，把重复的方向、 tension 和建议标签安静整理出来。
      </p>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            const response = await fetch("/api/insights/analyze", { method: "POST" });
            const json = await response.json();
            setBundle(json.bundle);
            setSavedInsights(json.savedInsights);
          })
        }
        className="mt-6 rounded-dock bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
      >
        {isPending ? "Analyzing…" : "Analyze"}
      </button>

      <div className="mt-8">
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-trace-ghost">Source entries</p>
        <div className="space-y-3">
          {entries.slice(0, 4).map((entry) => (
            <div key={entry.id} className="rounded-pane bg-white/56 p-4 text-sm leading-7 text-trace-sub dark:bg-white/[0.04]">
              {entry.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell profile={profile} title="Insights" contextPanel={contextPanel}>
      <InsightPanel bundle={bundle} insights={savedInsights} />
    </AppShell>
  );
}
