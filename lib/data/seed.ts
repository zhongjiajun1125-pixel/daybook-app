import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureSeedEntries(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  await supabase.from("entries").insert([
    {
      user_id: userId,
      content: "今天先留一句，别急着把一切说完。",
      input_mode: "text"
    },
    {
      user_id: userId,
      content: "有些东西只是先放在这里，过几天再看。",
      input_mode: "text"
    }
  ]);
}
