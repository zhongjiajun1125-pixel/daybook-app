import { NextResponse } from "next/server";

import { buildMockInsights } from "@/lib/ai/mock-insights";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Supabase environment is not configured." },
      { status: 503 }
    );
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: entryRows } = await supabase
    .from("entries")
    .select("id, user_id, content, created_at, updated_at, is_archived, input_mode")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  const entries = (entryRows ?? []) as any[];
  const bundle = buildMockInsights(entries);

  const records = [
    { user_id: user.id, title: "Recurring themes", summary: bundle.themes.join(" "), type: "themes" },
    { user_id: user.id, title: "Unresolved tensions", summary: bundle.tensions.join(" "), type: "tensions" },
    { user_id: user.id, title: "Repeated patterns", summary: bundle.repeatedPatterns.join(" "), type: "patterns" }
  ];

  const { data: savedInsights } = await supabase.from("insights").insert(records).select("*");

  if (savedInsights?.length) {
    const sourceRows = savedInsights.flatMap((insight) =>
      entries.slice(0, 4).map((entry) => ({
        insight_id: insight.id,
        entry_id: entry.id
      }))
    );

    if (sourceRows.length) {
      await supabase.from("insight_sources").insert(sourceRows);
    }
  }

  const shapedInsights = (savedInsights ?? []).map((insight) => ({
    id: insight.id,
    user_id: insight.user_id,
    title: insight.title,
    summary: insight.summary,
    type: insight.type,
    created_at: insight.created_at,
    sources: entries.slice(0, 4).map((entry) => entry.id)
  }));

  return NextResponse.json({
    bundle,
    savedInsights: shapedInsights
  });
}
