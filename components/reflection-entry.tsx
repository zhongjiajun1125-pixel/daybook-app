import type { Entry } from "@/types";
import { TagChip } from "@/components/tag-chip";
import { formatEntryDayLabel, formatEntryTime } from "@/lib/utils/entry-time";
import { cn } from "@/lib/utils/cn";

export function ReflectionEntry({
  entry,
  active,
  onSelect
}: {
  entry: Entry;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-pane px-4 py-4 text-left transition duration-200 ease-trace",
        active
          ? "bg-white/72 shadow-pane dark:bg-white/[0.06]"
          : "hover:bg-white/56 dark:hover:bg-white/[0.04]"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-trace-ghost">{formatEntryTime(entry.updated_at)}</span>
        <span className="text-[11px] uppercase tracking-[0.12em] text-trace-ghost">
          {entry.input_mode === "voice" ? "Spoken" : entry.input_mode === "mixed" ? "Refined" : "Written"}
        </span>
      </div>
      <p className="line-clamp-3 text-[15px] leading-8 text-trace-text">{entry.content}</p>
      {entry.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag.id} label={tag.name} />
          ))}
        </div>
      ) : null}
    </button>
  );
}

export function ReflectionDayLabel({ date }: { date: string }) {
  return (
    <div className="sticky top-0 z-[1] mb-3 bg-trace-bg/90 py-2 text-xs font-medium uppercase tracking-[0.16em] text-trace-ghost backdrop-blur">
      {formatEntryDayLabel(date)}
    </div>
  );
}
