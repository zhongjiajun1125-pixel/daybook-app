const REQUIRED_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export function hasSupabaseEnv() {
  return REQUIRED_SUPABASE_ENV.every((key) => Boolean(process.env[key]));
}

export function getMissingSupabaseEnv() {
  return REQUIRED_SUPABASE_ENV.filter((key) => !process.env[key]);
}
