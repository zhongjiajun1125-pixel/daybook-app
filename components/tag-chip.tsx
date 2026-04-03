import { cn } from "@/lib/utils/cn";

export function TagChip({
  label,
  active = false,
  muted = false
}: {
  label: string;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.01em]",
        active
          ? "bg-black/6 text-trace-text dark:bg-white/8"
          : muted
            ? "bg-transparent text-trace-ghost"
            : "bg-black/4 text-trace-sub dark:bg-white/6"
      )}
    >
      {label}
    </span>
  );
}
