import { SettingsWorkspace } from "@/components/settings-workspace";
import { SetupScreen } from "@/components/setup-screen";
import { hasSupabaseEnv } from "@/lib/env";
import { getProfile } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasSupabaseEnv()) {
    return <SetupScreen title="设置层还没接上账户配置" />;
  }

  const profile = await getProfile();
  return <SettingsWorkspace profile={profile} />;
}
