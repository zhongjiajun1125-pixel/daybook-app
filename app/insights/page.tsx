import { InsightsWorkspace } from "@/components/insights-workspace";
import { getEntries, getInsights, getProfile } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [profile, entries, insights] = await Promise.all([getProfile(), getEntries(), getInsights()]);
  return <InsightsWorkspace profile={profile} entries={entries} insights={insights} />;
}
