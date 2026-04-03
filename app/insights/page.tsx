import { InsightsWorkspace } from "@/components/insights-workspace";
import { SetupScreen } from "@/components/setup-screen";
import { hasSupabaseEnv } from "@/lib/env";
import { getEntries, getInsights, getProfile } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  if (!hasSupabaseEnv()) {
    return <SetupScreen title="洞察层还没接上数据源" />;
  }

  const [profile, entries, insights] = await Promise.all([getProfile(), getEntries(), getInsights()]);
  return <InsightsWorkspace profile={profile} entries={entries} insights={insights} />;
}
