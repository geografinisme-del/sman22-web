import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, KosongAdmin } from "@/components/admin/ui";
import { hariIniWIB, tanggalValid } from "@/lib/admin/absensi";
import { wajibLogin } from "@/lib/admin/auth";
import { jamPendek } from "@/lib/admin/jadwal";
import { uuid } from "@/lib/admin/schema";
import { formatTanggal } from "@/lib/format";
import { FormJp, type SiswaJp } from "./FormJp";

export const metadata = { title: "Absensi Jam Pelajaran" };

export default async function AbsenJp({ params, searchParams }: { params: Promise<{ jadwal: string }>; searchParams: Promise<{ tanggal?: string }> }) {
  const [{ jadwal }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(jadwal).success) notFound();
  const tanggal = tanggalValid(sp.tanggal) ? sp.tanggal : hariIniWIB();
  const { supabase } = await wajibLogin();
  const [{ data: j }, { data: siswa, error }, { data: boleh }, { data: jurnal }] = await Promise.all([
    supabase.from("jadwal_lengkap").select("id, kelas, mapel, guru, jp_ke, hari, jam_mulai, jam_selesai").eq("id", jadwal).maybeSingle(),
    supabase.rpc("siswa_jp", { p_jadwal: jadwal, p_tgl: tanggal }),
    supabase.rpc("bisa_absen_jp", { p_jadwal: jadwal, p_tgl: tanggal }),
    supabase.from("jurnal_jp").select("materi, catatan, dicatat_pada").eq("jadwal_id", jadwal).eq("tanggal", tanggal).maybeSingle(),
  ]);
  if (!j) notFound();
  return (
    <>
      <JudulHalaman
        judul={`${j.mapel} · ${j.kelas}`}
        deskripsi={`${formatTanggal(tanggal, { weekday: "long" })} · JP ${j.jp_ke}${j.jam_mulai ? ` (${jamPendek(j.jam_mulai)}–${jamPendek(j.jam_selesai)})` : ""}${jurnal ? " · sudah diisi" : ""}`}
        aksi={<Link href="/admin/jadwal-saya" className="text-sm text-brand-700 underline">← Jadwal Saya</Link>}
      />
      {error ? (
        <KosongAdmin teks="Anda tidak berhak membuka absensi jam pelajaran ini." />
      ) : (
        <FormJp jadwalId={jadwal} tanggal={tanggal} siswa={(siswa ?? []) as SiswaJp[]} materi={jurnal?.materi ?? ""} catatan={jurnal?.catatan ?? ""} boleh={Boolean(boleh)} />
      )}
    </>
  );
}
