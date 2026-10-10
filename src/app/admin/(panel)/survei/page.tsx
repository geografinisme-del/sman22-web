import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormSurveiAdmin } from "@/components/humas/Form";
import { wajibIzin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { SASARAN_SURVEI } from "@/lib/humas";
import { tgl } from "@/lib/perpus";

export const metadata = { title: "Survei" };

export default async function Survei({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("humas.kelola");
  const { data } = await supabase.from("survei").select("id, judul, sasaran, mulai, selesai, terbit").is("deleted_at", null).order("created_at", { ascending: false });
  const hari = hariIniWIB();
  return (
    <>
      <JudulHalaman judul="Survei" deskripsi="Survei kepuasan & aspirasi untuk masyarakat, orang tua, siswa, atau guru. Jawaban anonim dan hanya ditampilkan sebagai rekap." />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <div className="space-y-3">
          {(data ?? []).length === 0 && <Kartu><p className="text-black/50">Belum ada survei.</p></Kartu>}
          {(data ?? []).map((s) => {
            const aktif = s.terbit && s.mulai <= hari && s.selesai >= hari;
            return (
              <Kartu key={s.id}>
                <Link href={`/admin/survei/${s.id}`} className="font-semibold hover:underline">{s.judul}</Link>
                <p className="text-sm text-black/60">{SASARAN_SURVEI[s.sasaran as keyof typeof SASARAN_SURVEI]} · {tgl(s.mulai)} – {tgl(s.selesai)} · <span className={aktif ? "font-semibold text-emerald-700" : ""}>{aktif ? "sedang berjalan" : s.terbit ? (s.selesai < hari ? "ditutup" : "terjadwal") : "draf"}</span></p>
              </Kartu>
            );
          })}
        </div>
        <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Survei baru</h2><FormSurveiAdmin hari={hari} /></Kartu>
      </div>
    </>
  );
}
