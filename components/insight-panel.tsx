import type { Insight, InsightBundle } from "@/types";
import { TagChip } from "@/components/tag-chip";

export function InsightPanel({
  bundle,
  insights
}: {
  bundle?: InsightBundle | null;
  insights: Insight[];
}) {
  return (
    <div className="space-y-8 px-8 py-8">
      <div>
        <p className="text-[13px] font-medium tracking-[0.18em] text-trace-ghost">Insights</p>
        <h1 className="mt-3 text-[38px] font-semibold tracking-[-0.04em] text-trace-text">安静地看</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-trace-sub">
          这里不是实时分析台。只有在你主动打开时，系统才会把重复、 tension 和反复出现的方向整理出来。
        </p>
      </div>

      {bundle ? (
        <div className="grid grid-cols-2 gap-4">
          <section className="rounded-pane bg-white/60 p-5 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Themes</h2>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-trace-sub">
              {bundle.themes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-pane bg-white/60 p-5 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Tensions</h2>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-trace-sub">
              {bundle.tensions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-pane bg-white/60 p-5 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Repeated Patterns</h2>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-trace-sub">
              {bundle.repeatedPatterns.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-pane bg-white/60 p-5 dark:bg-white/[0.04]">
            <h2 className="text-sm font-semibold text-trace-text">Suggested Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {bundle.suggestedTags.map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold tracking-[0.08em] text-trace-ghost uppercase">Saved insights</h2>
        <div className="mt-4 space-y-3">
          {insights.map((insight) => (
            <article key={insight.id} className="rounded-pane bg-white/60 p-5 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-trace-text">{insight.title}</h3>
                <span className="text-xs text-trace-ghost">{insight.type}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-trace-sub">{insight.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
