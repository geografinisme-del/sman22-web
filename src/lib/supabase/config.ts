export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true jika kunci Supabase sudah diisi di Vercel / .env.local */
export const supabaseAktif = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const BUCKET_MEDIA = "media";
export const TAG_KONTEN = "konten";
