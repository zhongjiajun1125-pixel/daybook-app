import { ReflectWorkspace } from "@/components/reflect-workspace";
import { SetupScreen } from "@/components/setup-screen";
import { hasSupabaseEnv } from "@/lib/env";
import { getEntries, getProfile, getTags } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ReflectPage() {
  if (!hasSupabaseEnv()) {
    return <SetupScreen title="回看层还没接上时间流" />;
  }

  const [profile, entries, tags] = await Promise.all([getProfile(), getEntries(), getTags()]);
  return <ReflectWorkspace profile={profile} entries={entries} tags={tags} />;
}
