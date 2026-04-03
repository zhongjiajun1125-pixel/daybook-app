import { SettingsWorkspace } from "@/components/settings-workspace";
import { getProfile } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getProfile();
  return <SettingsWorkspace profile={profile} />;
}
