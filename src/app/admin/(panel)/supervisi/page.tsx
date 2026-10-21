import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { FormJadwalSupervisi } from "@/components/kurikulum/Form";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { daftarGuru, petaNamaPegawai } from "@/lib/admin/nama";
import { formatTanggal } from "@/lib/format";
import { predikatSupervisi, semesterSekarang } from "@/lib/kurikulum";
import { batalSupervisi } from "../../actions-kurikulum";

export const metadata = { title: "Supervisi Akademik" };

type S = { id: string; pegawai_id: string; supervisor_id: string; tanggal: string; status: string; nilai: number | null; semester: number };
const STATUS: Record<string, string> = { terjadwal: "bg-amber-50 text-amber-900 ring-amber-200", selesai: "bg-emerald-50 text-emerald-800 ring-emerald-200", batal: "bg-black/5 text-black/50 ring-black/10" };

export default async function Supervisi({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "supervisi.kelola");
  const { data: saya } = await supabase.rpc("pegawai_saya");
  const hari = hariIniWIB();
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const [{ data }, guru] = await Promise.all([
    ta ? supabase.from("supervisi_akademik").select("id, pegawai_id, supervisor_id, tanggal, status, nilai, semester").eq("tahun_ajaran_id", ta.id).order("tanggal") : Promise.resolve({ data: [] }),
    kelola ? daftarGuru(supabase) : Promise.resolve([]),
  ]);
  const list = (data ?? []) as S[];
  const nama = await petaNamaPegawai(supabase, list.flatMap((s) => [s.pegawai_id, s.supervisor_id]));
  const tugas = list.filter((s) => s.supervisor_id === saya && s.status === "terjadwal");
  const milik = list.filter((s) => s.pegawai_id === saya);
  const semua = kelola ? list : [];
  const selesai = semua.filter((s) => s.status === "selesai");
  const rata = selesai.length ? selesai.reduce((a, s) => a + Number(s.nilai ?? 0), 0) / selesai.length : null;

  const Baris = ({ s, aksi }: { s: S; aksi?: boolean }) => (
    <li className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS[s.status]}`}>{s.status}</span>
      <Link href={`/admin/supervisi/${s.id}`} className="flex-1 font-medium hover:underline">
        {nama.get(s.pegawai_id)} <span className="font-normal text-black/50">· supervisor {nama.get(s.supervisor_id)} · {formatTanggal(s.tanggal, { weekday: "short" })}</span>
      </Link>
      {s.nilai != null && <span className="tabular-nums">{Number(s.nilai).toFixed(0)} · {predikatSupervisi(Number(s.nilai))}</span>}
      {aksi && s.status === "terjadwal" && (
        <form action={batalSupervisi}><input type="hidden" name="id" value={s.id} /><button className="text-xs font-semibold text-blue-teks underline">Batalkan</button></form>
      )}
    </li>
  );

  return (
    <>
      <JudulHalaman judul="Supervisi Akademik" deskripsi="Jadwal kunjungan kelas, instrumen penilaian, hasil & tanggapan guru. Hanya terlihat oleh guru ybs, supervisor, dan pimpinan." />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      {tugas.length > 0 && (
        <Kartu className="mb-6 ring-2 ring-lime">
          <h2 className="text-2xl">Tugas Anda sebagai supervisor</h2>
          <ul className="divide-y divide-black/5">{tugas.map((s) => <Baris key={s.id} s={s} />)}</ul>
        </Kartu>
      )}
      <div className={`grid gap-6 ${kelola ? "xl:grid-cols-[1fr_360px]" : ""}`}>
        <div className="space-y-6">
          {saya && (
            <Kartu>
              <h2 className="text-2xl">Supervisi saya</h2>
              {milik.length === 0 ? <p className="mt-2 text-sm text-black/50">Belum dijadwalkan.</p> : <ul className="divide-y divide-black/5">{milik.map((s) => <Baris key={s.id} s={s} />)}</ul>}
            </Kartu>
          )}
          {kelola && (
            <Kartu>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="flex-1 text-2xl">Semua supervisi tahun ini</h2>
                <span className="text-sm text-black/60">{selesai.length}/{semua.filter((s) => s.status !== "batal").length} selesai{rata != null && ` · rata-rata ${rata.toFixed(1)}`}</span>
              </div>
              {semua.length === 0 ? <KosongAdmin teks="Belum ada jadwal supervisi." /> : <ul className="divide-y divide-black/5">{semua.map((s) => <Baris key={s.id} s={s} aksi />)}</ul>}
            </Kartu>
          )}
        </div>
        {kelola && (
          <Kartu className="self-start">
            <h2 className="mb-4 text-2xl">Jadwalkan supervisi</h2>
            <FormJadwalSupervisi guru={guru} semester={semesterSekarang(hari)} hariIni={hari} />
            <p className="mt-3 text-xs text-black/50">Supervisor bisa kepala sekolah, wakasek, atau guru senior. Keduanya diberi tahu otomatis.</p>
          </Kartu>
        )}
      </div>
    </>
  );
}
