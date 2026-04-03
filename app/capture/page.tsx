import { CaptureWorkspace } from "@/components/capture-workspace";
import { getEntries, getProfile, getTags } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const [profile, entries, tags] = await Promise.all([getProfile(), getEntries(), getTags()]);
  return <CaptureWorkspace profile={profile} initialEntries={entries} initialTags={tags} />;
}
