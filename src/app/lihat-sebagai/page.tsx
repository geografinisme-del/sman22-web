import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { aksesAsli, NAMA_PERAN } from "@/lib/admin/auth";
import { bacaPratinjau, fiturPratinjauAktif } from "@/lib/pratinjau";
import { JALUR_KENDALI_PRATINJAU, TANPA_PERAN } from "@/lib/pratinjau-umum";
import { ruangKerjaUntuk } from "@/lib/ruang-kerja";
import { urlMasuk } from "@/lib/masuk";

export const metadata: Metadata = { title: "Lihat sebagai…", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Kelompok tampilan pemilih. Daftar perannya sendiri diambil dari tabel `peran` (peran baru otomatis muncul). */
const PORTAL = ["siswa", "orang_tua", "alumni"];
const GTK_DASAR = ["guru", "wali_kelas", "piket", "pegawai", "laboran"];

type Pilihan = { kode: string; nama: string; keterangan: string; ruang: string[] };

/**
 * "Lihat sebagai…" — hanya super admin yang sesinya sudah lolos verifikasi dua langkah (AAL2).
 * Identitas dibaca TANPA header pratinjau (aksesAsli), sehingga "Ganti peran" tetap bisa dibuka dari mode pratinjau.
 */
export default async function LihatSebagai({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase, user, superAdmin } = await aksesAsli();
  if (!user || !supabase) redirect(urlMasuk(JALUR_KENDALI_PRATINJAU, "gtk"));
  const aktif = fiturPratinjauAktif();

  if (!superAdmin || !aktif) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-md text-center">
          <h1 className="text-3xl">Lihat sebagai…</h1>
          <p className="mt-3 text-[var(--muted)]">
            {aktif
              ? "Fitur ini hanya untuk super admin yang sudah memasukkan kode verifikasi dua langkah pada sesi ini."
              : "Fitur pratinjau peran sedang dimatikan oleh pengelola sistem."}
          </p>
          <Link href="/admin" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-6 font-semibold text-white">
            Kembali ke dasbor
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: peran }, { data: izin }] = await Promise.all([
    supabase.from("peran").select("kode, nama, keterangan, urutan").neq("kode", "super_admin").order("urutan"),
    supabase.from("peran_izin").select("peran, izin"),
  ]);
  const izinPeran = (kode: string) => (izin ?? []).filter((x) => x.peran === kode).map((x) => x.izin as string);
  const pilihan: Pilihan[] = (peran ?? []).map((p) => ({
    kode: p.kode,
    nama: NAMA_PERAN[p.kode] ?? p.nama ?? p.kode,
    keterangan: p.keterangan ?? "",
    ruang: ruangKerjaUntuk({ peran: [p.kode], izin: izinPeran(p.kode) }).map((r) => r.label),
  }));
  const kelompok: { judul: string; isi: Pilihan[] }[] = [
    { judul: "Portal siswa, orang tua & alumni", isi: pilihan.filter((p) => PORTAL.includes(p.kode)) },
    {
      judul: "Guru & tenaga kependidikan",
      isi: [
        ...pilihan.filter((p) => GTK_DASAR.includes(p.kode)),
        { kode: TANPA_PERAN, nama: NAMA_PERAN[TANPA_PERAN], keterangan: "Akun GTK yang belum diberi peran oleh admin.", ruang: [] },
      ],
    },
    { judul: "Pimpinan & ruang kerja", isi: pilihan.filter((p) => !PORTAL.includes(p.kode) && !GTK_DASAR.includes(p.kode)) },
  ];
  const sekarang = await bacaPratinjau();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm text-[var(--muted)]">
        <Link href="/admin" className="underline">
          Dasbor
        </Link>{" "}
        / Lihat sebagai…
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Lihat sebagai…</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        Tampilkan website dan portal persis seperti peran lain. Mode ini <strong className="text-[var(--ink)]">hanya baca</strong>: semua
        penyimpanan, pengiriman, unggahan, dan ekspor ditolak di server. Berakhir otomatis setelah 30 menit atau saat Anda keluar akun.
        Siswa & orang tua memakai <strong className="text-[var(--ink)]">data contoh</strong> fiktif.
      </p>
      {pesan === "ditolak" && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Peran tidak dikenal atau sesi tidak memenuhi syarat.</p>}
      {sekarang && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-sm">
          <span>
            Sedang melihat sebagai <strong>{NAMA_PERAN[sekarang.peran] ?? sekarang.peran}</strong>.
          </span>
          <form method="post" action={`${JALUR_KENDALI_PRATINJAU}/selesai`} data-pratinjau-izinkan="">
            <button type="submit" className="font-semibold underline">
              Keluar dari pratinjau
            </button>
          </form>
        </div>
      )}
      {kelompok.map((k) => (
        <section key={k.judul} className="mt-8" aria-labelledby={`kel-${k.judul}`}>
          <h2 id={`kel-${k.judul}`} className="text-xl">
            {k.judul}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {k.isi.map((p) => (
              <li key={p.kode}>
                <form method="post" action={`${JALUR_KENDALI_PRATINJAU}/mulai`} data-pratinjau-izinkan="" className="h-full">
                  <input type="hidden" name="peran" value={p.kode} />
                  <button
                    type="submit"
                    className="flex h-full min-h-24 w-full flex-col items-start gap-1 rounded-xl border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--ink)] hover:shadow-sm"
                    data-peran={p.kode}
                  >
                    <span className="font-semibold text-[var(--ink)]">{p.nama}</span>
                    {p.ruang.length > 0 ? (
                      <span className="text-sm text-[var(--muted)]">Ruang kerja: {p.ruang.join(", ")}</span>
                    ) : (
                      p.keterangan && <span className="text-sm text-[var(--muted)]">{p.keterangan}</span>
                    )}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
