import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { SetupScreen } from "@/components/setup-screen";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  if (!hasSupabaseEnv()) {
    return <SetupScreen title="TRACE 还没接上登录与数据" />;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/capture");
  }

  return <AuthForm />;
}
