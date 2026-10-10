import "server-only";
import { kanalAktif, kirimEmailLangsung, alamatSitus } from "@/lib/notif/kirim";
import { kunciAdminTersedia, supabaseAdminAuth, supabaseLayanan } from "@/lib/supabase/admin";

/**
 * Tautan atur ulang sandi untuk guru/staf, dikirim lewat Resend (kanal email sekolah).
 * Tautan memakai token_hash sehingga bisa dibuka di HP/peramban mana pun dan tidak
 * bergantung pada templat & batas email bawaan Supabase.
 * Hasil "lewat_supabase" = kunci server / Resend belum diatur → pakai pengiriman Supabase.
 */
export async function kirimTautanSandi(email: string): Promise<"ok" | "dibatasi" | "lewat_supabase"> {
  if (!kunciAdminTersedia || !kanalAktif().email) return "lewat_supabase";
  const db = supabaseLayanan();
  // batas: 3 permintaan per email per 15 menit (dicatat di log aktivitas)
  const { count } = await db
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("tabel", "auth")
    .eq("aksi", "RESET_DIMINTA")
    .eq("record_id", email)
    .gte("waktu", new Date(Date.now() - 15 * 60e3).toISOString());
  if ((count ?? 0) >= 3) return "dibatasi";
  await db.from("audit_log").insert({ tabel: "auth", aksi: "RESET_DIMINTA", record_id: email, data_baru: { akun: email } });

  // hanya akun staf aktif (bukan portal siswa/ortu, bukan akun nonaktif)
  const { data: p } = await db.from("pengguna").select("user_id, aktif, pengguna_peran(peran)").eq("email", email).maybeSingle();
  const staf = ((p?.pengguna_peran ?? []) as { peran: string }[]).some((x) => x.peran !== "siswa" && x.peran !== "orang_tua");
  if (!p?.aktif || !staf) return "ok";

  const { data, error } = await supabaseAdminAuth().generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) {
    console.error("[sandi] generateLink:", error?.message);
    return "ok";
  }
  try {
    await kirimEmailLangsung({
      ke: email,
      judul: "Atur ulang kata sandi",
      isi: "Ada permintaan atur ulang kata sandi untuk akun Anda di panel sekolah. Tautan berlaku 1 jam dan hanya bisa dipakai sekali.",
      url: `${alamatSitus()}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`,
      tombol: "Buat kata sandi baru",
      catatan: "Bila Anda tidak memintanya, abaikan email ini — kata sandi Anda tidak berubah.",
    });
  } catch (e) {
    console.error("[sandi] kirim email:", (e as Error).message);
  }
  return "ok";
}
