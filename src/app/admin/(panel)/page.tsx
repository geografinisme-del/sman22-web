import Link from "next/link";
import { JudulHalaman, Notifikasi } from "@/components/admin/ui";
import { BagianHariIni, Keadaan, Panel } from "@/components/dashboard/HariIni";
import { hariIniWIB } from "@/lib/admin/absensi";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { kalimatAktivitas, waktuWIB } from "@/lib/admin/label-audit";

export const metadata = { title: "Ringkasan" };

/** Isian profil sekolah yang tampil di website publik */
const KOLOM_PROFIL = [
  ["alamat", "Alamat"],
  ["telepon", "Telepon"],
  ["email", "Email"],
  ["npsn", "NPSN"],
  ["visi", "Visi"],
  ["misi", "Misi"],
  ["sambutan_isi", "Sambutan kepala sekolah"],
  ["slogan", "Slogan"],
] as const;

export default async function Ringkasan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!akses) return null;
  const hitung = (tabel: string) => supabase.from(tabel).select("id", { count: "exact", head: true }).is("deleted_at", null);
  const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${hariIniWIB()}T12:00:00+07:00`));

  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).maybeSingle();

  const konten = punya(akses, "konten.kelola")
    ? await Promise.all([
        hitung("berita").eq("status", "terbit"),
        hitung("berita").eq("status", "draft"),
        hitung("pengumuman").eq("aktif", true),
        hitung("agenda").gte("tanggal", new Date().toISOString().slice(0, 10)),
        supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      ])
    : null;

  // media yang masih ilustrasi sementara (kolom is_placeholder dari migrasi 20261210; galat = dianggap 0)
  const mediaSementara = punya(akses, "konten.kelola")
    ? (
        await Promise.all(
          (["berita", "galeri", "prestasi", "hero_slide", "kartu_beranda"] as const).map((t) => {
            const q = supabase.from(t).select("id", { count: "exact", head: true }).eq("is_placeholder", true);
            return t === "hero_slide" || t === "kartu_beranda" ? q : q.is("deleted_at", null);
          }),
        )
      ).reduce((n, r) => n + (r.error ? 0 : (r.count ?? 0)), 0)
    : 0;

  let induk: null | { gagal: boolean; siswa: number; pegawai: number; kelas: number; tingkat: Record<string, number>; tanpaKelas: number } = null;
  if (punya(akses, "data_induk.baca")) {
    const hasil = await Promise.all([
      hitung("siswa").eq("status", "aktif"),
      hitung("pegawai").eq("status", "aktif"),
      ta ? hitung("kelas").eq("tahun_ajaran_id", ta.id) : Promise.resolve({ count: 0, error: null }),
      ...(["X", "XI", "XII"] as const).map((t) =>
        supabase.from("siswa_kelas_aktif").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "aktif").eq("tingkat", t),
      ),
      supabase.from("siswa_kelas_aktif").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "aktif").is("kelas_id", null),
    ]);
    const [s, p, k, X, XI, XII, tk] = hasil;
    induk = {
      gagal: hasil.some((h) => h.error),
      siswa: s.count ?? 0,
      pegawai: p.count ?? 0,
      kelas: k.count ?? 0,
      tingkat: { X: X.count ?? 0, XI: XI.count ?? 0, XII: XII.count ?? 0 },
      tanpaKelas: tk.count ?? 0,
    };
  }

  const bolehAudit = punya(akses, "audit.baca");
  const auditRes = bolehAudit ? await supabase.from("audit_log").select("id, waktu, user_id, tabel, aksi, data_baru").order("waktu", { ascending: false }).limit(5) : null;
  const audit = auditRes?.data ?? null;
  const ids = [...new Set((audit ?? []).map((a) => a.user_id).filter(Boolean))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", ids) : { data: [] };
  const namaPelaku = new Map((orang ?? []).map((o) => [o.user_id, o.nama || o.email]));

  const profil = konten?.[4].data as Record<string, unknown> | null | undefined;
  const profilGagal = Boolean(konten?.[4].error);
  const profilKosong = konten && !profilGagal ? KOLOM_PROFIL.filter(([k]) => !String(profil?.[k] ?? "").trim()) : [];
  const kontenGagal = konten ? konten.slice(0, 4).some((r) => r.error) : false;

  return (
    <>
      <JudulHalaman
        judul="Ringkasan"
        konteks={
          <>
            {tanggal}
            {ta && ` · Tahun ajaran ${ta.nama}, semester ${ta.semester}`}
          </>
        }
        deskripsi={`Halo, ${akses.nama || "Bapak/Ibu"}. Berikut hal yang perlu Anda perhatikan hari ini.`}
        aksi={
          berperan(akses, "wali_kelas") ? (
            <Link href="/admin/kelas-saya" className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-[#d9dce1] bg-white px-4 text-sm font-semibold hover:border-[#9aa1ab]">
              Kelas perwalian saya
            </Link>
          ) : undefined
        }
      />
      {pesan === "tanpa-akses" && (
        <div role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          Anda tidak memiliki akses ke halaman tersebut.
        </div>
      )}
      <Notifikasi kode={pesan === "tanpa-akses" ? undefined : pesan} />
      {mediaSementara > 0 && (
        <div role="status" className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <strong>{mediaSementara} media</strong> di website masih berupa ilustrasi sementara (berlabel &ldquo;Ilustrasi sementara&rdquo;). Ganti dengan foto asli sekolah
          melalui <Link href="/admin/berita" className="font-semibold underline">Berita</Link>, <Link href="/admin/galeri" className="font-semibold underline">Galeri</Link>,{" "}
          <Link href="/admin/prestasi" className="font-semibold underline">Prestasi</Link>, <Link href="/admin/kartu-beranda" className="font-semibold underline">Kartu Beranda</Link>, atau <Link href="/admin/situs" className="font-semibold underline">Tampilan Website</Link>.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <BagianHariIni supabase={supabase} akses={akses} />

        {induk && (
          <Panel
            judul="Data induk"
            aksi={
              <Link href="/admin/siswa" className="text-sm font-semibold underline underline-offset-2">
                Data siswa
              </Link>
            }
          >
            {induk.gagal ? (
              <Keadaan jenis="gagal" aksi={<a href="/admin" className="font-semibold underline underline-offset-2">Coba lagi</a>}>
                Data induk gagal dimuat.
              </Keadaan>
            ) : (
              <>
                {!ta && (
                  <div className="mb-3">
                    <Keadaan jenis="info" aksi={punya(akses, "data_induk.kelola") ? <Link href="/admin/tahun-ajaran" className="font-semibold underline underline-offset-2">Atur</Link> : undefined}>
                      Tahun ajaran aktif belum diatur.
                    </Keadaan>
                  </div>
                )}
                <dl className="grid grid-cols-3 gap-4">
                  {[
                    ["Siswa aktif", induk.siswa],
                    ["Guru & pegawai", induk.pegawai],
                    ["Kelas", induk.kelas],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <dt className="text-sm text-[#5b6270]">{l}</dt>
                      <dd className="text-[1.625rem] font-semibold leading-none tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 border-t border-[#eceef1] pt-3 text-sm text-[#3b414b]">
                  {Object.entries(induk.tingkat)
                    .map(([t, v]) => `Kelas ${t}: ${v}`)
                    .join(" · ")}
                  {induk.tanpaKelas > 0 && <span className="font-semibold text-[#8a4b00]"> · Belum punya kelas: {induk.tanpaKelas}</span>}
                </p>
              </>
            )}
          </Panel>
        )}

        {konten && (
          <Panel
            judul="Kelengkapan website"
            className="lg:col-span-2"
            aksi={
              <Link href="/admin/berita" className="text-sm font-semibold underline underline-offset-2">
                Kelola berita
              </Link>
            }
          >
            {profilGagal ? (
              <Keadaan jenis="gagal" aksi={<a href="/admin" className="font-semibold underline underline-offset-2">Coba lagi</a>}>
                Profil sekolah gagal dimuat.
              </Keadaan>
            ) : profilKosong.length > 0 ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-[#fff8e8] px-4 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-[#5c3d00]">
                    {profilKosong.length} dari {KOLOM_PROFIL.length} isian profil sekolah belum diisi
                  </p>
                  <p className="mt-0.5 text-[#5c3d00]">{profilKosong.map(([, l]) => l).join(", ")}.</p>
                </div>
                <Link href="/admin/profil" className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-brand-900 px-3 text-sm font-semibold text-white hover:bg-brand-700">
                  Lengkapi profil sekolah
                </Link>
              </div>
            ) : (
              <p className="text-sm text-[#3b414b]">Semua isian profil sekolah sudah terisi.</p>
            )}
            {kontenGagal ? (
              <div className="mt-3">
                <Keadaan jenis="gagal">Ringkasan konten gagal dimuat.</Keadaan>
              </div>
            ) : (
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[#eceef1] pt-4 sm:grid-cols-4">
                {[
                  ["Berita terbit", konten[0].count ?? 0, "/admin/berita"],
                  ["Draf berita", konten[1].count ?? 0, "/admin/berita"],
                  ["Pengumuman aktif", konten[2].count ?? 0, "/admin/pengumuman"],
                  ["Agenda mendatang", konten[3].count ?? 0, "/admin/agenda"],
                ].map(([l, v, href]) => (
                  <div key={String(l)}>
                    <dt className="text-sm text-[#5b6270]">
                      <Link href={String(href)} className="hover:underline">
                        {l}
                      </Link>
                    </dt>
                    <dd className="text-[1.625rem] font-semibold leading-none tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>
        )}

        {bolehAudit && (
          <Panel
            judul="Aktivitas terbaru"
            className="lg:col-span-3"
            aksi={
              <Link href="/admin/log" className="text-sm font-semibold underline underline-offset-2">
                Lihat semua aktivitas
              </Link>
            }
          >
            {auditRes?.error ? (
              <Keadaan jenis="gagal" aksi={<a href="/admin" className="font-semibold underline underline-offset-2">Coba lagi</a>}>
                Aktivitas gagal dimuat.
              </Keadaan>
            ) : !audit?.length ? (
              <p className="text-sm text-[#3b414b]">Belum ada aktivitas tercatat.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-[#eceef1] text-[#5b6270]">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">
                        Aktivitas
                      </th>
                      <th scope="col" className="py-2 pr-4 font-semibold">
                        Oleh
                      </th>
                      <th scope="col" className="py-2 font-semibold">
                        Waktu (WIB)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceef1]">
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-4">{kalimatAktivitas(a)}</td>
                        <td className="max-w-[220px] truncate py-2.5 pr-4 text-[#3b414b]">{a.user_id ? (namaPelaku.get(a.user_id) ?? "Pengguna") : "Sistem"}</td>
                        <td className="whitespace-nowrap py-2.5 tabular-nums text-[#3b414b]">
                          <time dateTime={a.waktu}>{waktuWIB(a.waktu)}</time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
