import "server-only";
import { redirect } from "next/navigation";
import { getAkses } from "@/lib/admin/auth";

/** Guru yang login + kelas yang ia ajar/walikan beserta nama panggilan siswanya (untuk "pilih siswa acak") */
export async function konteksPapan(hanyaKelas?: string[]) {
  const { supabase, user, akses } = await getAkses();
  if (!supabase || !user) redirect("/admin/login");
  if (!akses || akses.peran.every((p) => p === "siswa" || p === "orang_tua")) redirect("/portal");
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  let kelas: { id: string; nama: string }[] = [];
  if (saya && ta) {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("penugasan_mengajar").select("kelas_id, kelas(nama)").eq("pegawai_id", saya).eq("tahun_ajaran_id", ta.id).is("deleted_at", null),
      supabase.from("kelas").select("id, nama").eq("wali_kelas_id", saya).eq("tahun_ajaran_id", ta.id).is("deleted_at", null),
    ]);
    const peta = new Map<string, string>();
    for (const x of (a ?? []) as unknown as { kelas_id: string; kelas: { nama: string } | null }[]) peta.set(x.kelas_id, x.kelas?.nama ?? "");
    for (const x of b ?? []) peta.set(x.id, x.nama);
    kelas = [...peta].map(([id, nama]) => ({ id, nama })).filter((k) => !hanyaKelas?.length || hanyaKelas.includes(k.id)).sort((x, y) => x.nama.localeCompare(y.nama));
  }
  const dengan = await Promise.all(
    kelas.map(async (k) => ({ ...k, siswa: (((await supabase.rpc("nama_siswa_kelas", { p_kelas: k.id })).data ?? []) as { nama: string }[]).map((s) => s.nama) })),
  );
  return { supabase, kelas: dengan.filter((k) => k.siswa.length) };
}
