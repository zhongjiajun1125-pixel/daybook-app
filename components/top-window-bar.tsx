import { MoreHorizontal } from "lucide-react";

export function TopWindowBar({ title }: { title?: string }) {
  return (
    <div className="flex h-11 items-center justify-between border-b border-trace-line px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-xs font-semibold tracking-[0.18em] text-trace-ghost">TRACE</span>
      </div>
      <span className="text-xs font-medium text-trace-sub">{title}</span>
      <button className="rounded-full p-1 text-trace-ghost transition hover:bg-black/5 hover:text-trace-sub dark:hover:bg-white/5">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
