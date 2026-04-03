export default function Loading() {
  return (
    <div className="trace-shell flex items-center justify-center">
      <div className="rounded-shell border border-white/50 bg-trace-panel px-8 py-6 shadow-shell backdrop-blur-2xl dark:border-white/5">
        <p className="text-xs font-semibold tracking-[0.2em] text-trace-ghost">TRACE</p>
        <p className="mt-4 text-sm text-trace-sub">等一下…</p>
      </div>
    </div>
  );
}
