import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pref } from "@/components/notif/Preferensi";
import type { Akses } from "@/lib/admin/auth";

const tampilWa = (n: string) => (n ? "0" + n.replace(/^62/, "") : null);
const baku = (n?: string | null) => {
  const d = (n ?? "").replace(/\D/g, "");
  return d.startsWith("62") ? d : d.startsWith("0") ? "62" + d.slice(1) : d.startsWith("8") ? "62" + d : d;
};

/** Preferensi + kontak tujuan yang akan dipakai sistem (untuk ditampilkan ke pengguna) */
export async function muatPreferensi(supabase: SupabaseClient, akses: Akses) {
  const [{ data: p }, { data: g }, { data: o }] = await Promise.all([
    supabase.from("preferensi_notifikasi").select("email, whatsapp, nomor_wa, kategori_mati").eq("user_id", akses.userId).maybeSingle(),
    supabase.from("pegawai").select("telepon").eq("user_id", akses.userId).maybeSingle(),
    supabase.from("orang_tua").select("telepon, email").eq("user_id", akses.userId).maybeSingle(),
  ]);
  const pref: Pref = { email: p?.email ?? true, whatsapp: p?.whatsapp ?? true, nomor_wa: p?.nomor_wa ? tampilWa(p.nomor_wa)! : "", kategori_mati: p?.kategori_mati ?? [] };
  const staf = akses.peran.some((x) => x !== "siswa" && x !== "orang_tua");
  const wa = p?.nomor_wa || baku(g?.telepon) || baku(o?.telepon) || "";
  return {
    pref,
    kontak: { email: staf ? akses.email : o?.email || null, wa: /^62\d{8,13}$/.test(wa) ? tampilWa(wa) : null },
  };
}
