"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="trace-shell flex items-center justify-center">
      <div className="max-w-md rounded-shell border border-white/50 bg-trace-panel px-8 py-6 shadow-shell backdrop-blur-2xl dark:border-white/5">
        <p className="text-xs font-semibold tracking-[0.2em] text-trace-ghost">TRACE</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-trace-text">这里刚刚停住了</h1>
        <p className="mt-3 text-sm leading-7 text-trace-sub">
          {error.message || "先回到安静一点的地方，再试一次。"}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-dock bg-black px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          再来一次
        </button>
      </div>
    </div>
  );
}
