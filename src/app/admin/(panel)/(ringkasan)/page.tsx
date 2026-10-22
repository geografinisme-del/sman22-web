import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JudulHalaman, Notifikasi } from "@/components/admin/ui";
import { BagianHariIni, Keadaan, Panel } from "@/components/dashboard/HariIni";
import { DasborDasar } from "@/components/dashboard/DasborDasar";
import { hariIniWIB } from "@/lib/admin/absensi";
import { berperan, punya, wajibLogin, type Akses } from "@/lib/admin/auth";
import { tahunAjaranAktif, type TahunAjaran } from "@/lib/admin/hitungan";
import { kalimatAktivitas, waktuWIB } from "@/lib/admin/label-audit";
import { statistikSingkat } from "@/lib/admin/statistik-singkat";

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
  const tanggal = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${hariIniWIB()}T12:00:00+07:00`));
  // Halaman hanya menunggu tahun ajaran (judul). Setiap panel memuat datanya sendiri sebagai komponen terpisah,
  // sehingga semua panel berjalan BERSAMAAN (sebelumnya ±10 tahap berurutan). Angka statistik di-cache 60 detik per akun.
  const { data: ta } = await tahunAjaranAktif(supabase);
  const kelolaKonten = punya(akses, "konten.kelola");

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
            <Link href="/admin/kelas-saya" className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:border-[var(--muted)]">
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
      {kelolaKonten && <PengingatMedia supabase={supabase} akses={akses} />}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <DasborDasar supabase={supabase} akses={akses} />
        <BagianHariIni supabase={supabase} akses={akses} />

        {punya(akses, "data_induk.baca") && <PanelDataInduk supabase={supabase} akses={akses} ta={ta} />}
        {kelolaKonten && <PanelKelengkapan supabase={supabase} akses={akses} />}
        {punya(akses, "audit.baca") && <PanelAktivitas supabase={supabase} />}
      </div>
    </>
  );
}

type PropsPanel = { supabase: SupabaseClient; akses: Akses };
const kepala = { count: "exact" as const, head: true };
/** jumlah yang aman disimpan di cache (galat → boolean, bukan objek galat) */
const jumlah = (r: { count: number | null; error: unknown }) => ({ count: r.count ?? 0, gagal: Boolean(r.error) });

/** Pengingat media yang masih ilustrasi sementara (kolom is_placeholder dari migrasi 20261210; galat = dianggap 0) */
async function PengingatMedia({ supabase, akses }: PropsPanel) {
  const mediaSementara = await statistikSingkat(supabase, akses, "media-sementara", async (db) =>
    (
      await Promise.all(
        (["berita", "galeri", "prestasi", "hero_slide", "kartu_beranda", "tur_sekolah", "staf_publik", "fasilitas", "menu_sorotan"] as const).map((t) => {
          const q = db.from(t).select("id", kepala).eq("is_placeholder", true);
          // tabel tanpa kolom deleted_at (nonaktif = aktif false); galat (tabel belum dimigrasi) dihitung 0
          return t === "berita" || t === "galeri" || t === "prestasi" ? q.is("deleted_at", null) : q;
        }),
      )
    ).reduce((n, r) => n + (r.error ? 0 : (r.count ?? 0)), 0),
  );
  if (mediaSementara <= 0) return null;
  return (
    <div role="status" className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <strong>{mediaSementara} media</strong> di website masih berupa ilustrasi sementara (berlabel &ldquo;Ilustrasi sementara&rdquo;). Ganti dengan foto asli sekolah
      melalui <Link href="/admin/berita" className="font-semibold underline">Berita</Link>, <Link href="/admin/galeri" className="font-semibold underline">Galeri</Link>,{" "}
      <Link href="/admin/prestasi" className="font-semibold underline">Prestasi</Link>, <Link href="/admin/kartu-beranda" className="font-semibold underline">Kartu Beranda</Link>, <Link href="/admin/tur-sekolah" className="font-semibold underline">Tur Sekolah</Link>, <Link href="/admin/staf-publik" className="font-semibold underline">Guru &amp; Tendik</Link>, <Link href="/admin/fasilitas" className="font-semibold underline">Fasilitas</Link>, atau <Link href="/admin/situs" className="font-semibold underline">Tampilan Website</Link>.
    </div>
  );
}

async function PanelDataInduk({ supabase, akses, ta }: PropsPanel & { ta: TahunAjaran | null }) {
  const induk = await statistikSingkat(supabase, akses, `data-induk:${ta?.id ?? "-"}`, async (db) => {
    const aktif = () => db.from("siswa_kelas_aktif").select("id", kepala).is("deleted_at", null).eq("status", "aktif");
    const hasil = (
      await Promise.all([
        db.from("siswa").select("id", kepala).is("deleted_at", null).eq("status", "aktif"),
        db.from("pegawai").select("id", kepala).is("deleted_at", null).eq("status", "aktif"),
        ta ? db.from("kelas").select("id", kepala).is("deleted_at", null).eq("tahun_ajaran_id", ta.id) : Promise.resolve({ count: 0, error: null }),
        ...(["X", "XI", "XII"] as const).map((t) => aktif().eq("tingkat", t)),
        aktif().is("kelas_id", null),
      ])
    ).map(jumlah);
    const [s, p, k, X, XI, XII, tk] = hasil;
    return { gagal: hasil.some((h) => h.gagal), siswa: s.count, pegawai: p.count, kelas: k.count, tingkat: { X: X.count, XI: XI.count, XII: XII.count }, tanpaKelas: tk.count };
  });
  return (
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
                <dt className="text-sm text-[var(--muted)]">{l}</dt>
                <dd className="text-[1.625rem] font-semibold leading-none tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
            {Object.entries(induk.tingkat)
              .map(([t, v]) => `Kelas ${t}: ${v}`)
              .join(" · ")}
            {induk.tanpaKelas > 0 && <span className="font-semibold text-[#8a4b00]"> · Belum punya kelas: {induk.tanpaKelas}</span>}
          </p>
        </>
      )}
    </Panel>
  );
}

async function PanelKelengkapan({ supabase, akses }: PropsPanel) {
  const k = await statistikSingkat(supabase, akses, "kelengkapan-website", async (db) => {
    const hitung = (t: string) => db.from(t).select("id", kepala).is("deleted_at", null);
    const [terbit, draf, umum, agenda, profil] = await Promise.all([
      hitung("berita").eq("status", "terbit"),
      hitung("berita").eq("status", "draft"),
      hitung("pengumuman").eq("aktif", true),
      hitung("agenda").gte("tanggal", hariIniWIB()),
      db.from("profil_sekolah").select(KOLOM_PROFIL.map(([kolom]) => kolom).join(", ")).eq("id", 1).maybeSingle(),
    ]);
    const isi = (profil.data ?? null) as Record<string, unknown> | null;
    return {
      angka: [terbit, draf, umum, agenda].map(jumlah),
      profilGagal: Boolean(profil.error),
      profilKosong: profil.error ? [] : KOLOM_PROFIL.filter(([kolom]) => !String(isi?.[kolom] ?? "").trim()).map(([, label]) => label),
    };
  });
  const kontenGagal = k.angka.some((a) => a.gagal);
  return (
    <Panel
      judul="Kelengkapan website"
      className="lg:col-span-2"
      aksi={
        <Link href="/admin/berita" className="text-sm font-semibold underline underline-offset-2">
          Kelola berita
        </Link>
      }
    >
      {k.profilGagal ? (
        <Keadaan jenis="gagal" aksi={<a href="/admin" className="font-semibold underline underline-offset-2">Coba lagi</a>}>
          Profil sekolah gagal dimuat.
        </Keadaan>
      ) : k.profilKosong.length > 0 ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-[#fff8e8] px-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-[#5c3d00]">
              {k.profilKosong.length} dari {KOLOM_PROFIL.length} isian profil sekolah belum diisi
            </p>
            <p className="mt-0.5 text-[#5c3d00]">{k.profilKosong.join(", ")}.</p>
          </div>
          <Link href="/admin/profil" className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-ink px-3 text-sm font-semibold text-white hover:bg-ink/85">
            Lengkapi profil sekolah
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Semua isian profil sekolah sudah terisi.</p>
      )}
      {kontenGagal ? (
        <div className="mt-3">
          <Keadaan jenis="gagal">Ringkasan konten gagal dimuat.</Keadaan>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-4 sm:grid-cols-4">
          {(
            [
              ["Berita terbit", k.angka[0].count, "/admin/berita"],
              ["Draf berita", k.angka[1].count, "/admin/berita"],
              ["Pengumuman aktif", k.angka[2].count, "/admin/pengumuman"],
              ["Agenda mendatang", k.angka[3].count, "/admin/agenda"],
            ] as const
          ).map(([l, v, href]) => (
            <div key={l}>
              <dt className="text-sm text-[var(--muted)]">
                <Link href={href} className="hover:underline">
                  {l}
                </Link>
              </dt>
              <dd className="text-[1.625rem] font-semibold leading-none tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/** Aktivitas terbaru (tidak di-cache: harus selalu terbaru) */
async function PanelAktivitas({ supabase }: { supabase: SupabaseClient }) {
  const auditRes = await supabase.from("audit_log").select("id, waktu, user_id, tabel, aksi, data_baru").order("waktu", { ascending: false }).limit(5);
  const audit = auditRes.data ?? null;
  const ids = [...new Set((audit ?? []).map((a) => a.user_id).filter(Boolean))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", ids) : { data: [] };
  const namaPelaku = new Map((orang ?? []).map((o) => [o.user_id, o.nama || o.email]));
  return (
    <Panel
      judul="Aktivitas terbaru"
      className="lg:col-span-3"
      aksi={
        <Link href="/admin/log" className="text-sm font-semibold underline underline-offset-2">
          Lihat semua aktivitas
        </Link>
      }
    >
      {auditRes.error ? (
        <Keadaan jenis="gagal" aksi={<a href="/admin" className="font-semibold underline underline-offset-2">Coba lagi</a>}>
          Aktivitas gagal dimuat.
        </Keadaan>
      ) : !audit?.length ? (
        <p className="text-sm text-[var(--muted)]">Belum ada aktivitas tercatat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-[var(--muted)]">
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
            <tbody className="divide-y divide-[var(--line)]">
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 pr-4">{kalimatAktivitas(a)}</td>
                  <td className="max-w-[220px] truncate py-2.5 pr-4 text-[var(--muted)]">{a.user_id ? (namaPelaku.get(a.user_id) ?? "Pengguna") : "Sistem"}</td>
                  <td className="whitespace-nowrap py-2.5 tabular-nums text-[var(--muted)]">
                    <time dateTime={a.waktu}>{waktuWIB(a.waktu)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
