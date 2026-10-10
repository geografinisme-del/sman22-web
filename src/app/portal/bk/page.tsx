import { FormAjukan } from "@/components/bk/Form";
import { STATUS_PERMINTAAN, JENIS_SESI, MODE_SESI } from "@/lib/bk";
import { Lencana, waktuWIB } from "@/lib/lms";
import { konteksPortal } from "../data";

export const metadata = { title: "Layanan BK" };
type P = { id: string; siswa: string; kategori: string; topik: string; status: string; catatan_untuk_pemohon: string; dibuat: string };
type J = { id: string; siswa: string; mulai: string; durasi_menit: number; jenis: string; mode: string; tempat: string; status: string; konselor: string };

export default async function LayananBk() {
  const { supabase, anak, ortu } = await konteksPortal();
  const [{ data: kat }, { data: pm }, { data: jd }] = await Promise.all([
    supabase.from("kategori_konseling").select("kode, nama").eq("aktif", true).order("urutan"),
    supabase.rpc("permintaan_bk_saya"),
    supabase.rpc("jadwal_bk_saya"),
  ]);
  const permintaan = (pm ?? []) as P[];
  const jadwal = (jd ?? []) as J[];
  const akanDatang = jadwal.filter((j) => j.status === "terjadwal" && Date.parse(j.mulai) > new Date().getTime() - 3600e3);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Layanan BK</h1>
        <p className="text-sm text-black/60">{ortu ? "Ajukan konsultasi dengan guru BK tentang anak Anda." : "Butuh teman cerita atau saran? Guru BK siap membantu."} Isi percakapan bersifat rahasia — wali kelas dan guru lain tidak dapat membacanya.</p>
      </div>
      <p className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-900 ring-1 ring-violet-200">Dalam keadaan darurat (misalnya merasa tidak aman), segera temui guru BK, wali kelas, atau guru piket, atau hubungi layanan SAPA 129.</p>
      {akanDatang.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Jadwal</h2>
          {akanDatang.map((j) => (
            <div key={j.id} className="rounded-2xl bg-sky-50 p-4 text-sm ring-1 ring-sky-200">
              <p className="font-semibold">{waktuWIB(j.mulai, true)} · {j.durasi_menit} menit</p>
              <p>{JENIS_SESI[j.jenis]} · {MODE_SESI[j.mode]} · {j.tempat} · {j.konselor}{ortu && ` · untuk ${j.siswa}`}</p>
            </div>
          ))}
        </section>
      )}
      {anak.length > 0 && (
        <details className="rounded-2xl bg-white p-5 ring-1 ring-black/5" open={permintaan.length === 0}>
          <summary className="cursor-pointer font-semibold">+ Ajukan layanan BK</summary>
          <div className="mt-4"><FormAjukan anak={anak.map((a) => ({ id: a.id, nama: a.nama }))} kategori={(kat ?? []).map((k) => ({ id: k.kode, nama: k.nama }))} ortu={ortu} /></div>
        </details>
      )}
      <section className="space-y-2">
        <h2 className="font-serif text-2xl">Permintaan saya</h2>
        {permintaan.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-black/50 ring-1 ring-black/5">Belum ada.</p> : permintaan.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center gap-2"><Lencana s={p.status} peta={STATUS_PERMINTAAN} /><span className="text-black/50">{p.kategori} · {waktuWIB(p.dibuat)}</span></div>
            <p className="mt-1 font-semibold">{p.topik}{ortu && <span className="font-normal text-black/50"> · {p.siswa}</span>}</p>
            {p.catatan_untuk_pemohon && <p className="mt-2 rounded-xl bg-krem p-3"><strong>Guru BK:</strong> {p.catatan_untuk_pemohon}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
