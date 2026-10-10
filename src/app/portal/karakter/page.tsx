import { FormPrestasi } from "@/components/kesiswaan/Form";
import { hariIniWIB } from "@/lib/admin/absensi";
import { berperan } from "@/lib/admin/auth";
import { BIDANG, JENIS_BINA, PERINGKAT, TINGKAT } from "@/lib/kesiswaan/label";
import { formatTanggal } from "@/lib/format";
import { konteksPortal } from "../data";

export const metadata = { title: "Prestasi & Karakter" };

type Rekap = {
  prestasi: { tanggal: string; nama: string; bidang: string; tingkat: string; peringkat: string; poin: number; status: string }[];
  pelanggaran: { tanggal: string; nama: string; kategori: string; poin: number }[];
  pembinaan: { tanggal: string; jenis: string; status: string }[];
};

export default async function Karakter() {
  const { supabase, anak, akses } = await konteksPortal();
  const siswa = berperan(akses, "siswa");
  const data = await Promise.all(anak.map(async (a) => ({ a, r: (await supabase.rpc("rekap_karakter", { p_siswa: a.id })).data as Rekap | null })));
  return (
    <div className="space-y-8">
      {data.map(({ a, r }) => (
        <section key={a.id} className="space-y-5">
          <h1 className="font-serif text-3xl">Prestasi & catatan karakter{anak.length > 1 ? ` — ${a.nama}` : ""}</h1>
          <div className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="font-serif text-2xl">🏆 Prestasi</h2>
            {!r?.prestasi.length ? <p className="mt-2 text-sm text-black/50">Belum ada prestasi tercatat tahun ini.</p> : (
              <ul className="mt-3 divide-y divide-black/5 text-sm">
                {r.prestasi.map((p, i) => (
                  <li key={i} className="py-2">
                    <p className="font-semibold">{p.nama}</p>
                    <p className="text-black/60">{PERINGKAT[p.peringkat]} · {TINGKAT[p.tingkat]} · {BIDANG[p.bidang]} · {formatTanggal(p.tanggal)}{p.status === "diajukan" && " · menunggu verifikasi"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="font-serif text-2xl">Catatan kedisiplinan</h2>
            {!r?.pelanggaran.length ? <p className="mt-2 text-sm text-black/50">Tidak ada catatan pelanggaran. Pertahankan!</p> : (
              <ul className="mt-3 divide-y divide-black/5 text-sm">
                {r.pelanggaran.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2"><span>{p.nama}<span className="block text-black/50">{formatTanggal(p.tanggal)}</span></span><span className="shrink-0 font-semibold">{p.poin} poin</span></li>
                ))}
              </ul>
            )}
            {!!r?.pembinaan.length && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-black/50">Pembinaan oleh sekolah</p>
                <ul className="mt-1 text-sm">{r.pembinaan.map((b, i) => <li key={i}>{JENIS_BINA[b.jenis]} · {formatTanggal(b.tanggal)} · {b.status}</li>)}</ul>
              </>
            )}
            <p className="mt-4 text-xs text-black/50">Catatan ini bersifat pribadi dan hanya terlihat oleh siswa, orang tua, wali kelas, dan kesiswaan.</p>
          </div>
          {siswa && (
            <div className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="mb-1 font-serif text-2xl">Laporkan prestasimu</h2>
              <p className="mb-4 text-sm text-black/60">Unggah foto piagam/sertifikat. Kesiswaan akan memverifikasi.</p>
              <FormPrestasi siswa={{ id: a.id, nama: a.nama, kelas: a.kelas }} hariIni={hariIniWIB()} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
