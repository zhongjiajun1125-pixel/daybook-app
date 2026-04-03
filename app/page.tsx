import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    redirect("/capture");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  redirect(user ? "/capture" : "/auth");
}
