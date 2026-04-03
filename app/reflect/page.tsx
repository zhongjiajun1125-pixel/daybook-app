import { ReflectWorkspace } from "@/components/reflect-workspace";
import { getEntries, getProfile, getTags } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ReflectPage() {
  const [profile, entries, tags] = await Promise.all([getProfile(), getEntries(), getTags()]);
  return <ReflectWorkspace profile={profile} entries={entries} tags={tags} />;
}
