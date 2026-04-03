import { CaptureWorkspace } from "@/components/capture-workspace";
import { SetupScreen } from "@/components/setup-screen";
import { hasSupabaseEnv } from "@/lib/env";
import { getEntries, getProfile, getTags } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  if (!hasSupabaseEnv()) {
    return <SetupScreen title="TRACE 已上线，但还没接上内容存储" />;
  }

  const [profile, entries, tags] = await Promise.all([getProfile(), getEntries(), getTags()]);
  return <CaptureWorkspace profile={profile} initialEntries={entries} initialTags={tags} />;
}
