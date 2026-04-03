import { getMissingSupabaseEnv } from "@/lib/env";

export function SetupScreen({ title = "TRACE 还没接上数据源" }: { title?: string }) {
  const missing = getMissingSupabaseEnv();

  return (
    <div className="trace-shell flex items-center justify-center">
      <div className="w-full max-w-[620px] rounded-shell border border-white/50 bg-trace-panel p-10 shadow-shell backdrop-blur-2xl dark:border-white/5">
        <div className="text-xs font-semibold tracking-[0.2em] text-trace-ghost">TRACE</div>
        <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.04em] text-trace-text">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-trace-sub">
          网页已经可以部署，但当前 Cloudflare Worker 还没有拿到 Supabase 配置，所以登录和数据层暂时还不能工作。
        </p>

        <div className="mt-8 rounded-3xl bg-black/[0.03] p-5 dark:bg-white/[0.05]">
          <div className="text-xs uppercase tracking-[0.16em] text-trace-ghost">缺少的环境变量</div>
          <ul className="mt-4 space-y-2 text-sm text-trace-text">
            {missing.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-sm leading-7 text-trace-sub">
          把这些变量填进 Cloudflare Worker 之后，页面会自动从当前 setup 状态切回完整的 Capture / Reflect / Insights 体验。
        </p>
      </div>
    </div>
  );
}
