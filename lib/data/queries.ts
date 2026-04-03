import type { Entry, Insight, Profile, Tag } from "@/types";
import { ensureSeedEntries } from "@/lib/data/seed";
import { requireUser } from "@/lib/data/auth";

interface EntryTagRow {
  tags: Tag | null;
}

interface EntryRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  input_mode?: Entry["input_mode"];
  entry_tags?: EntryTagRow[];
}

interface InsightSourceRow {
  entry_id: string;
}

interface InsightRow {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  type: string;
  created_at: string;
  insight_sources?: InsightSourceRow[];
}

export async function getProfile() {
  const { user, supabase } = await requireUser();
  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? "",
    display_name: user.user_metadata?.display_name ?? null
  });

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile;
}

export async function getEntries() {
  const { user, supabase } = await requireUser();
  await ensureSeedEntries(supabase, user.id);

  const { data } = await supabase
    .from("entries")
    .select("*, entry_tags(tag_id, tags(*))")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return ((data ?? []) as EntryRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_archived: row.is_archived,
    input_mode: row.input_mode ?? "text",
    tags: (row.entry_tags ?? []).map((item) => item.tags).filter(Boolean) as Tag[]
  }));
}

export async function getTags() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? []) as Tag[];
}

export async function getInsights() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("insights")
    .select("*, insight_sources(entry_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return ((data ?? []) as InsightRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    summary: row.summary,
    type: row.type,
    created_at: row.created_at,
    sources: (row.insight_sources ?? []).map((item) => item.entry_id)
  }));
}
