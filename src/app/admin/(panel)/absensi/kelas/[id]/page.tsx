import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JudulHalaman, Kartu, TombolLink } from "@/components/admin/ui";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { STATUS_SISWA_ABSEN, awalMingguWIB, geserTanggal, hariIniWIB, tanggalValid, type KodeAbsen } from "@/lib/admin/absensi";
import { uuid } from "@/lib/admin/schema";
import { formatTanggal } from "@/lib/format";
import { FormAbsensiKelas } from "./FormAbsensiKelas";
import { FormKoreksi } from "./FormKoreksi";

export const metadata = { title: "Absensi kelas" };

export default async function AbsensiKelas({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tanggal?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const hariIni = hariIniWIB();
  const tgl = tanggalValid(sp.tanggal) && sp.tanggal <= hariIni ? sp.tanggal : hariIni;

  const { data: k } = await supabase.from("kelas_ringkasan").select("id, nama, wali_kelas, wali_kelas_id, tahun_aktif").eq("id", id).maybeSingle();
  if (!k) notFound();
  const { data: pid } = await supabase.rpc("pegawai_saya");
  const waliKelasIni = Boolean(pid && k.wali_kelas_id === pid && berperan(akses, "wali_kelas"));
  if (!punya(akses, "absensi.lihat") && !waliKelasIni) redirect("/admin?pesan=tanpa-akses");

  const bisaUbah = punya(akses, "absensi.kelola") || (waliKelasIni && tgl >= awalMingguWIB());

  const { data: anggota } = await supabase
    .from("anggota_kelas")
    .select("siswa:siswa_id(id, nama, nisn, status, deleted_at)")
    .eq("kelas_id", id)
    .range(0, 999);
  const siswa = (anggota ?? [])
    .map((a) => a.siswa as unknown as { id: string; nama: string; nisn: string | null; status: string; deleted_at: string | null })
    .filter((s) => s && s.status === "aktif" && !s.deleted_at)
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  const { data: catatan } = await supabase
    .from("absensi_siswa")
    .select("siswa_id, status, keterangan, jam")
    .eq("tanggal", tgl)
    .in("siswa_id", siswa.map((s) => s.id).length ? siswa.map((s) => s.id) : ["00000000-0000-0000-0000-000000000000"]);
  const { data: cek } = await supabase.from("absensi_kelas_harian").select("dicek_pada").eq("kelas_id", id).eq("tanggal", tgl).maybeSingle();
  const peta = new Map((catatan ?? []).map((c) => [c.siswa_id, c]));
  const baris = siswa.map((s) => {
    const c = peta.get(s.id);
    return { id: s.id, nama: s.nama, nisn: s.nisn, status: (c?.status ?? "H") as KodeAbsen, keterangan: c?.keterangan ?? "", jam: c?.jam ?? null };
  });

  return (
    <>
      <JudulHalaman
        judul={`Absensi ${k.nama}`}
        deskripsi={`${formatTanggal(tgl, { weekday: "long" })} · Wali kelas: ${k.wali_kelas ?? "—"}${cek ? ` · terakhir disimpan ${new Date(cek.dicek_pada).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}` : " · belum dicek"}`}
        aksi={
          <div className="flex flex-wrap items-center gap-2">
            <TombolLink href={`/admin/absensi/kelas/${id}?tanggal=${geserTanggal(tgl, -1)}`} sekunder>← Kemarin</TombolLink>
            {tgl < hariIni && <TombolLink href={`/admin/absensi/kelas/${id}?tanggal=${geserTanggal(tgl, 1)}`} sekunder>Besok →</TombolLink>}
            {tgl !== hariIni && <TombolLink href={`/admin/absensi/kelas/${id}`} sekunder>Hari ini</TombolLink>}
          </div>
        }
      />
      {siswa.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/20 p-10 text-center text-black/50">Belum ada siswa aktif di kelas ini.</p>
      ) : bisaUbah ? (
        <>
          <p className="mb-4 text-sm text-black/60">
            Pilih status untuk siswa yang <strong>tidak hadir penuh</strong>. Siswa lain otomatis dianggap hadir. Klik <strong>Simpan</strong> walaupun semua hadir,
            supaya kelas tercatat sudah dicek.
          </p>
          <FormAbsensiKelas key={tgl} kelasId={id} tanggal={tgl} siswa={baris} />
        </>
      ) : (
        <>
          <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            {waliKelasIni
              ? "Tanggal ini sudah lewat dari minggu berjalan. Perubahan harus lewat pengajuan koreksi yang disetujui piket/admin."
              : "Anda hanya dapat melihat absensi kelas ini."}
          </p>
          <ol className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {baris.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-3">
                <span>
                  <span className="mr-2 text-sm text-black/40">{i + 1}.</span>
                  {s.nama}
                  {s.keterangan && <span className="ml-2 text-xs text-black/50">({s.keterangan})</span>}
                </span>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold text-white ${STATUS_SISWA_ABSEN[s.status].warna}`}>{STATUS_SISWA_ABSEN[s.status].label}</span>
              </li>
            ))}
          </ol>
          {waliKelasIni && (
            <Kartu className="mt-6">
              <h2 className="mb-4 font-serif text-2xl">Ajukan koreksi</h2>
              <FormKoreksi tanggal={tgl} siswa={baris.map((b) => ({ id: b.id, nama: b.nama, status: STATUS_SISWA_ABSEN[b.status].label }))} />
              <p className="mt-3 text-xs text-black/50">
                Lihat status pengajuan di <Link href="/admin/absensi/pengajuan" className="underline">Pengajuan Koreksi</Link>.
              </p>
            </Kartu>
          )}
        </>
      )}
    </>
  );
}
