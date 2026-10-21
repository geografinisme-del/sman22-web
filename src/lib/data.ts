import "server-only";
import { cache } from "react";
import * as statis from "@/content/sekolah";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";
import { bacaTema, TEMA_BAWAAN, type Tema } from "@/lib/tema";
import { bacaKonfigurasi, KONFIGURASI_BAWAAN, type Konfigurasi } from "@/lib/tampilan/konfigurasi";

/**
 * Satu pintu untuk semua konten situs publik.
 * - Jika Supabase sudah tersambung: data diambil dari database (diubah lewat /admin).
 * - Jika belum: memakai isi file src/content/sekolah.ts.
 */

export type Profil = {
  slogan: string;
  pernyataan: string;
  alamat: string;
  telepon: string;
  email: string;
  jamLayanan: string;
  npsn: string;
  akreditasi: string;
  kepalaSekolah: string;
  fotoKepalaSekolah: string;
  sambutanKutipan: string;
  sambutanParagraf: string[];
  visi: string;
  misi: string[];
  sejarah: string[];
  statistik: { label: string; nilai: string }[];
  /** alumni diterima PTN (Fase 20; kosong bila belum diisi/migrasi belum jalan) */
  alumniPtn: { jumlah: string; tahun: string; keterangan: string };
  /** persen lulusan melanjutkan ke perguruan tinggi (CMS, tanpa tanda %) */
  lulusanPtPersen: string;
  /** jabatan untuk kutipan kepala sekolah di bento angka */
  jabatanKepala: string;
};

export type BeritaItem = {
  id: string;
  slug: string;
  judul: string;
  tanggal: string;
  kategori: string;
  ringkasan: string;
  isi: string[];
  gambar?: string;
  /** foto adalah ilustrasi sementara (Fase 20) */
  gambarSementara?: boolean;
};
export type AgendaItem = { id: string; judul: string; tanggal: string; waktu?: string; tempat?: string };
export type PengumumanItem = {
  id: string;
  judul: string;
  tanggal: string;
  isi: string;
  penting: boolean;
  /** ditandai untuk modal prioritas (kolom Fase 19; false bila migrasi belum dijalankan) */
  prioritas: boolean;
  poster?: { url: string; alt: string };
  tautan?: { url: string; label: string };
};
export type FotoItem = { id: string; judul: string; gambar: string; sementara?: boolean };

/** Teks "[ISI ...]" dianggap kosong supaya tidak tampil di situs */
const bersih = (s?: string | null) => {
  const t = (s ?? "").trim();
  return t.startsWith("[ISI") ? "" : t;
};
const paragraf = (s?: string | null) =>
  bersih(s)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
const baris = (s?: string | null) =>
  bersih(s)
    .split("\n")
    .map((p) => p.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
const daftarBersih = (l: string[]) => l.map(bersih).filter(Boolean);

function logGagal(bagian: string, error: unknown) {
  console.error(`[data] gagal memuat ${bagian}:`, error);
}

export const getProfil = cache(async (): Promise<Profil> => {
  const s = statis.sekolah;
  const fallback: Profil = {
    slogan: bersih(s.slogan),
    pernyataan: bersih(statis.pernyataan),
    alamat: bersih(s.alamat),
    telepon: bersih(s.telepon),
    email: bersih(s.email),
    jamLayanan: bersih(s.jamLayanan),
    npsn: bersih(s.npsn),
    akreditasi: bersih(s.akreditasi),
    kepalaSekolah: bersih(s.kepalaSekolah),
    fotoKepalaSekolah: s.fotoKepalaSekolah,
    sambutanKutipan: bersih(statis.sambutan.kutipan),
    sambutanParagraf: daftarBersih(statis.sambutan.paragraf),
    visi: bersih(statis.visi),
    misi: daftarBersih(statis.misi),
    sejarah: daftarBersih(statis.sejarah),
    alumniPtn: { jumlah: "", tahun: "", keterangan: "" },
    lulusanPtPersen: "",
    jabatanKepala: "",
    statistik: statis.statistik.map((x) => ({ label: x.label, nilai: bersih(x.nilai) })),
  };
  if (!supabaseAktif) return fallback;

  const { data, error } = await supabasePublik().from("profil_sekolah").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) logGagal("profil", error);
    return fallback;
  }
  return {
    slogan: bersih(data.slogan),
    pernyataan: bersih(data.pernyataan),
    alamat: bersih(data.alamat),
    telepon: bersih(data.telepon),
    email: bersih(data.email),
    jamLayanan: bersih(data.jam_layanan),
    npsn: bersih(data.npsn),
    akreditasi: bersih(data.akreditasi),
    kepalaSekolah: bersih(data.kepala_sekolah),
    fotoKepalaSekolah: bersih(data.foto_kepala_sekolah) || s.fotoKepalaSekolah,
    sambutanKutipan: bersih(data.sambutan_kutipan),
    sambutanParagraf: paragraf(data.sambutan_isi),
    visi: bersih(data.visi),
    misi: baris(data.misi),
    sejarah: paragraf(data.sejarah),
    statistik: [
      { label: "Tahun berdiri", nilai: String(s.tahunBerdiri) },
      { label: "Peserta didik", nilai: bersih(data.jumlah_siswa) },
      { label: "Guru & tendik", nilai: bersih(data.jumlah_guru) },
      { label: "Ekstrakurikuler", nilai: bersih(data.jumlah_ekskul) },
    ],
    // kolom migrasi 20261221 (kosong bila belum dijalankan)
    lulusanPtPersen: bersih((data as Record<string, string>).lulusan_pt_persen),
    jabatanKepala: bersih((data as Record<string, string>).kepala_sekolah_jabatan),
    alumniPtn: {
      jumlah: bersih((data as Record<string, string>).alumni_ptn),
      tahun: bersih((data as Record<string, string>).alumni_ptn_tahun),
      keterangan: bersih((data as Record<string, string>).alumni_ptn_keterangan),
    },
  };
});

type BarisBerita = {
  id: string;
  slug: string;
  judul: string;
  tanggal: string;
  kategori: string;
  ringkasan: string;
  isi: string;
  gambar_url: string;
  is_placeholder?: boolean;
};
const keBerita = (b: BarisBerita): BeritaItem => ({
  id: b.id,
  slug: b.slug,
  judul: b.judul,
  tanggal: b.tanggal,
  kategori: b.kategori,
  ringkasan: b.ringkasan,
  isi: paragraf(b.isi),
  gambar: b.gambar_url || undefined,
  gambarSementara: b.is_placeholder === true,
});
// "*" agar tetap berjalan sebelum migrasi Fase 20 (kolom is_placeholder)
const KOLOM_BERITA = "*";

export const getBerita = cache(async (limit?: number): Promise<BeritaItem[]> => {
  if (!supabaseAktif) {
    const list = [...statis.berita].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return list.slice(0, limit ?? list.length).map((b) => ({ ...b, id: b.slug }));
  }
  let q = supabasePublik()
    .from("berita")
    .select(KOLOM_BERITA)
    .eq("status", "terbit")
    .is("deleted_at", null)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    logGagal("berita", error);
    return [];
  }
  return (data as BarisBerita[]).map(keBerita);
});

export const getBeritaBySlug = cache(async (slug: string): Promise<BeritaItem | null> => {
  if (!supabaseAktif) {
    const b = statis.berita.find((x) => x.slug === slug);
    return b ? { ...b, id: b.slug } : null;
  }
  const { data, error } = await supabasePublik()
    .from("berita")
    .select(KOLOM_BERITA)
    .eq("slug", slug)
    .eq("status", "terbit")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) logGagal("detail berita", error);
  return data ? keBerita(data as BarisBerita) : null;
});

export const getAgenda = cache(async (limit?: number): Promise<AgendaItem[]> => {
  if (!supabaseAktif) {
    const list = [...statis.agenda].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    return list.slice(0, limit ?? list.length).map((a, i) => ({ ...a, id: String(i) }));
  }
  // tampilkan agenda mulai 7 hari lalu ke depan (+ kegiatan "Umum" dari kalender sekolah)
  const batas = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const db = supabasePublik();
  const [agenda, kalender] = await Promise.all([
    db.from("agenda").select("id, judul, tanggal, waktu, tempat").is("deleted_at", null).gte("tanggal", batas).order("tanggal", { ascending: true }).limit(limit ?? 200),
    db.from("kegiatan_kalender").select("id, judul, mulai, selesai, jam_mulai, jam_selesai, lokasi").is("deleted_at", null).eq("sasaran", "umum").gte("selesai", batas).order("mulai", { ascending: true }).limit(limit ?? 200),
  ]);
  if (agenda.error) logGagal("agenda", agenda.error);
  if (kalender.error) logGagal("kalender", kalender.error);
  const tgl = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" });
  const list: AgendaItem[] = [
    ...(agenda.data ?? []).map((a) => ({ ...a, waktu: a.waktu || undefined, tempat: a.tempat || undefined })),
    ...(kalender.data ?? []).map((k) => ({
      id: `k-${k.id}`,
      judul: k.judul,
      tanggal: k.mulai,
      waktu: [k.selesai > k.mulai ? `s.d. ${tgl(k.selesai)}` : "", k.jam_mulai ? `${String(k.jam_mulai).slice(0, 5)}${k.jam_selesai ? `–${String(k.jam_selesai).slice(0, 5)}` : ""}` : ""].filter(Boolean).join(", ") || undefined,
      tempat: k.lokasi || undefined,
    })),
  ].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return limit ? list.slice(0, limit) : list;
});

export const getPengumuman = cache(async (limit?: number): Promise<PengumumanItem[]> => {
  if (!supabaseAktif) {
    return statis.pengumuman.slice(0, limit).map((p, i) => ({ ...p, id: String(i), penting: Boolean(p.penting), prioritas: false }));
  }
  let q = supabasePublik()
    .from("pengumuman")
    // "*" agar tetap berjalan sebelum migrasi Fase 19 (kolom prioritas/poster) diterapkan
    .select("*")
    .is("deleted_at", null)
    .eq("aktif", true)
    .order("penting", { ascending: false })
    .order("tanggal", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    logGagal("pengumuman", error);
    return [];
  }
  return (data as Record<string, unknown>[]).map((p) => {
    const teks = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    return {
      id: String(p.id),
      judul: teks("judul"),
      tanggal: teks("tanggal"),
      isi: teks("isi"),
      penting: p.penting === true,
      prioritas: p.prioritas === true,
      poster: teks("poster_url") ? { url: teks("poster_url"), alt: teks("poster_alt") } : undefined,
      tautan: teks("tautan_url") ? { url: teks("tautan_url"), label: teks("tautan_label") || "Selengkapnya" } : undefined,
    };
  });
});

export const getGaleri = cache(async (): Promise<FotoItem[]> => {
  if (!supabaseAktif) {
    return statis.galeri.filter((g) => g.gambar).map((g, i) => ({ id: String(i), judul: g.judul, gambar: g.gambar! }));
  }
  const { data, error } = await supabasePublik()
    .from("galeri")
    .select("*")
    .is("deleted_at", null)
    .order("urutan", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    logGagal("galeri", error);
    return [];
  }
  return data.map((g) => ({ id: g.id, judul: g.judul, gambar: g.gambar_url, sementara: g.is_placeholder === true }));
});

/* ------------------------------------------------------------------ */
/* Pengaturan situs: hero, layanan, footer, SEO                        */
/* ------------------------------------------------------------------ */

export type SlideHero = { id: string; gambar: string; gambarHp?: string; video?: string; alt: string; fokus: string; skala: number; tautan?: string; sementara?: boolean };
export type TautanLayanan = { nama: string; keterangan: string; url: string };
export type SosialMedia = { nama: string; akun: string; url: string };
export type Situs = {
  hero: {
    label: string;
    judulAwal: string;
    judulMiring: string;
    judulAkhir: string;
    teks: string;
    tombolUtama: { label: string; href: string };
    tombolKedua: { label: string; href: string };
    detik: number;
    slide: SlideHero[];
  };
  layanan: TautanLayanan[];
  sosialMedia: SosialMedia[];
  footerTeks: string;
  /** konfigurasi tampilan publik yang SUDAH TERBIT (tema, susunan widget, popup, pemandu) */
  tampilan: Konfigurasi;
  seo: { judul: string; deskripsi: string; gambar: string };
  tema: Tema;
};

const situsStatis = (): Situs => ({
  hero: {
    label: statis.hero.label,
    judulAwal: statis.hero.judulAwal,
    judulMiring: statis.hero.judulMiring,
    judulAkhir: statis.hero.judulAkhir,
    teks: statis.hero.teks,
    tombolUtama: statis.hero.tombolUtama,
    tombolKedua: statis.hero.tombolKedua,
    detik: 7,
    slide: statis.hero.foto.map((f, i) => ({ id: `${f.src}#${i}`, gambar: f.src, alt: f.alt, fokus: f.posisi, skala: 100, tautan: f.tautan })),
  },
  layanan: statis.layanan,
  sosialMedia: statis.sekolah.sosialMedia.filter((s) => s.url),
  footerTeks: "",
  seo: { judul: "", deskripsi: statis.sekolah.deskripsi, gambar: "" },
  tema: TEMA_BAWAAN,
  tampilan: KONFIGURASI_BAWAAN,
});

const daftarJson = <T,>(v: unknown, kunci: (keyof T)[]): T[] =>
  Array.isArray(v)
    ? (v.filter((x) => x && typeof x === "object" && kunci.every((k) => typeof (x as Record<string, unknown>)[k as string] === "string")) as T[])
    : [];

export const getSitus = cache(async (): Promise<Situs> => {
  const dasar = situsStatis();
  if (!supabaseAktif) return dasar;
  const db = supabasePublik();
  const [{ data: s, error }, { data: slide }] = await Promise.all([
    db.from("pengaturan_situs").select("*").eq("id", 1).maybeSingle(),
    // "*" agar tetap jalan sebelum migrasi video (Fase 14) dijalankan
    db.from("hero_slide").select("*").order("urutan").order("created_at"),
  ]);
  if (error) logGagal("pengaturan situs", error);
  if (!s) return dasar;
  const slides: SlideHero[] = (slide ?? []).map((x) => ({
    id: x.id,
    gambar: x.gambar_url,
    sementara: (x as { is_placeholder?: boolean }).is_placeholder === true,
    gambarHp: x.gambar_hp_url || undefined,
    video: (x as { video_url?: string }).video_url || undefined,
    alt: x.alt,
    fokus: `${x.fokus_x}% ${x.fokus_y}%`,
    skala: x.skala,
    tautan: x.tautan || undefined,
  }));
  return {
    hero: {
      label: s.hero_label,
      judulAwal: s.hero_judul_awal,
      judulMiring: s.hero_judul_miring,
      judulAkhir: s.hero_judul_akhir,
      teks: s.hero_teks,
      tombolUtama: { label: s.tombol1_label, href: s.tombol1_url || "/profil" },
      tombolKedua: { label: s.tombol2_label, href: s.tombol2_url || "/spmb" },
      detik: s.hero_detik,
      slide: slides.length ? slides : dasar.hero.slide, // belum ada foto di CMS → pakai foto bawaan
    },
    layanan: daftarJson<TautanLayanan>(s.layanan, ["nama", "keterangan", "url"]),
    sosialMedia: daftarJson<SosialMedia>(s.sosial_media, ["nama", "akun", "url"]).filter((x) => x.url),
    footerTeks: s.footer_teks,
    seo: { judul: s.seo_judul, deskripsi: s.seo_deskripsi || dasar.seo.deskripsi, gambar: s.seo_gambar_url },
    // kolom tema belum ada (migrasi 20261124000000_tema_tampilan.sql) → tema bawaan
    tema: bacaTema((s as { tema?: unknown }).tema),
    // hanya konfigurasi terbit (draf ada di tabel tampilan_draf yang tidak bisa dibaca publik)
    tampilan: bacaKonfigurasi(((s as { tema?: { tampilan?: unknown } }).tema ?? {}).tampilan),
  };
});

/* ------------------------------------------------------------------ */
/* Visual panel halaman masuk/portal (dikelola di Tampilan Website)    */
/* ------------------------------------------------------------------ */

export type VisualAkunItem = {
  id: string;
  jenis: "gambar" | "video";
  berkas: string;
  poster?: string;
  keterangan: string;
  judulTautan?: string;
  tautan?: string;
};

export const getVisualAkun = cache(async (lokasi: "akun" | "beranda" = "akun"): Promise<VisualAkunItem[]> => {
  if (!supabaseAktif) return [];
  const kolom = "id, jenis, berkas_url, poster_url, keterangan, judul_tautan, tautan";
  const db = supabasePublik();
  let { data, error } = await db.from("visual_akun").select(kolom).eq("lokasi", lokasi).order("urutan").order("created_at");
  if (error && lokasi === "akun") {
    // kolom lokasi belum ada (migrasi 20261122000000_visual_beranda.sql belum dijalankan) → semua visual milik halaman masuk
    ({ data, error } = await db.from("visual_akun").select(kolom).order("urutan").order("created_at"));
  }
  if (error) {
    // tabel belum ada (migrasi 20261120000000_visual_akun.sql belum dijalankan) → pakai visual bawaan
    logGagal(`visual ${lokasi}`, error);
    return [];
  }
  return (data ?? []).map((v) => ({
    id: v.id,
    jenis: v.jenis === "video" ? "video" : "gambar",
    berkas: v.berkas_url,
    poster: v.poster_url || undefined,
    keterangan: v.keterangan,
    judulTautan: v.judul_tautan || undefined,
    tautan: v.tautan || undefined,
  }));
});

export type EkskulRingkas = { nama: string; slug: string; bidang: string };

/** Daftar ekskul & organisasi yang tampil publik (untuk pita bergerak di beranda). */
export const getEkskulRingkas = cache(async (): Promise<EkskulRingkas[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik().rpc("organisasi_publik");
  if (error) {
    logGagal("ekskul", error);
    return [];
  }
  return ((data ?? []) as { nama: string; slug: string; bidang: string | null }[]).map((o) => ({ nama: o.nama, slug: o.slug, bidang: o.bidang ?? "" }));
});

/* ------------------------------------------------------------------ */
/* E-Library publik (RPC katalog; hak akses koleksi digital di database) */
/* ------------------------------------------------------------------ */

export type BukuRingkas = { id: string; judul: string; pengarang: string; kategori: string; sampul: string; tersedia: number; total: number };

/** Buku rekomendasi pustakawan untuk widget beranda (kosong bila modul/katalog belum ada). */
export const getRekomendasiBuku = cache(async (n: number): Promise<BukuRingkas[]> => {
  if (!supabaseAktif || n <= 0) return [];
  const { data, error } = await supabasePublik().rpc("katalog_publik", { p_cari: "rekomendasi", p_batas: 24, p_lewati: 0 });
  if (error) {
    logGagal("rekomendasi buku", error);
    return [];
  }
  return ((data ?? []) as { id: string; judul: string; pengarang: string; kategori: string; sampul_url: string; tersedia: number; total: number; rekomendasi: boolean }[])
    .filter((b) => b.rekomendasi)
    .slice(0, n)
    .map((b) => ({ id: b.id, judul: b.judul, pengarang: b.pengarang, kategori: b.kategori, sampul: b.sampul_url, tersedia: b.tersedia, total: b.total }));
});

/* ------------------------------------------------------------------ */
/* Buku tahunan (Fase 20): prestasi, SPMB, penanggung jawab bidang     */
/* Semua toleran bila migrasi belum dijalankan → data kosong, bagian    */
/* terkait disembunyikan (tidak ada data contoh di produksi).          */
/* ------------------------------------------------------------------ */

export const TINGKAT_PRESTASI = ["Sekolah", "Kota", "Provinsi", "Nasional", "Internasional"] as const;
export type Prestasi = { id: string; peringkat: string; namaLomba: string; namaSiswa: string; tingkat: string; tanggal: string; foto?: string; fotoSementara: boolean };

export const getPrestasi = cache(async (batas = 40): Promise<Prestasi[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik().from("prestasi").select("*").is("deleted_at", null).eq("terbit", true).order("tanggal", { ascending: false }).limit(batas);
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") logGagal("prestasi", error);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    peringkat: p.peringkat,
    namaLomba: p.nama_lomba,
    namaSiswa: p.nama_siswa,
    tingkat: p.tingkat,
    tanggal: p.tanggal,
    foto: p.foto_url || undefined,
    fotoSementara: p.is_placeholder === true,
  }));
});

export type LangkahSpmb = { langkah: string; tanggal: string };
export type SpmbInfo = { aktif: boolean; tahun: string; judul: string; ringkasan: string; jadwal: LangkahSpmb[]; tautanJalur: string; tautanTanya: string };

export const getSpmbInfo = cache(async (): Promise<SpmbInfo | null> => {
  if (!supabaseAktif) return null;
  const { data, error } = await supabasePublik().from("spmb_info").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  const jadwal = Array.isArray(data.jadwal)
    ? (data.jadwal as unknown[])
        .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
        .map((x) => ({ langkah: typeof x.langkah === "string" ? x.langkah.trim() : "", tanggal: typeof x.tanggal === "string" ? x.tanggal : "" }))
        .filter((x) => x.langkah)
    : [];
  return { aktif: data.aktif === true, tahun: data.tahun, judul: data.judul, ringkasan: data.ringkasan, jadwal, tautanJalur: data.tautan_jalur, tautanTanya: data.tautan_tanya };
});

export type PenanggungJawab = { penanggungJawab: string; foto?: string; fotoSementara: boolean };
export const getPortalBidang = cache(async (): Promise<Record<string, PenanggungJawab>> => {
  if (!supabaseAktif) return {};
  const { data, error } = await supabasePublik().from("portal_bidang").select("*");
  if (error) return {};
  return Object.fromEntries((data ?? []).map((b) => [b.kunci, { penanggungJawab: b.penanggung_jawab, foto: b.foto_url || undefined, fotoSementara: b.is_placeholder === true }]));
});

/* ------------------------------------------------------------------ */
/* Kartu putar beranda (tema Langit cerah)                             */
/* ------------------------------------------------------------------ */
export { type KartuBeranda } from "@/content/kartu-beranda";
/** Kartu aktif berurutan dari CMS; bila tabel belum ada (migrasi 20261220) atau kosong → kartu bawaan. */
export const getKartuBeranda = cache(async (): Promise<import("@/content/kartu-beranda").KartuBeranda[]> => {
  const { KARTU_BAWAAN } = await import("@/content/kartu-beranda");
  if (!supabaseAktif) return KARTU_BAWAAN;
  const { data, error } = await supabasePublik().from("kartu_beranda").select("*").eq("aktif", true).order("urutan").order("created_at");
  if (error || !data?.length) return KARTU_BAWAAN;
  return data.map((k) => ({ id: k.id, label: k.label, judul: k.judul, deskripsi: k.deskripsi ?? "", foto: k.foto_url || "", sementara: k.is_placeholder === true, url: k.url }));
});

/* ------------------------------------------------------------------ */
/* Tur sekolah (tema Langit cerah)                                     */
/* ------------------------------------------------------------------ */
export { type TitikTur } from "@/content/tur-bawaan";
/**
 * Titik tur aktif berurutan. Tabel belum ada (migrasi 20261221 belum dijalankan) → titik bawaan;
 * tabel ada tetapi tanpa titik aktif → [] (section disembunyikan).
 */
export const getTur = cache(async (): Promise<import("@/content/tur-bawaan").TitikTur[]> => {
  const { TUR_BAWAAN } = await import("@/content/tur-bawaan");
  if (!supabaseAktif) return TUR_BAWAAN;
  const { data, error } = await supabasePublik().from("tur_sekolah").select("*").eq("aktif", true).order("urutan").order("created_at").limit(8);
  if (error) return error.code === "42P01" || error.code === "PGRST205" ? TUR_BAWAAN : [];
  return (data ?? []).map((t) => ({
    id: t.id,
    label: t.label,
    judul: t.judul,
    deskripsi: t.deskripsi ?? "",
    tombol: t.tombol_url ? { teks: t.tombol_teks || "Selengkapnya", url: t.tombol_url } : undefined,
    media: t.media_url ? { tipe: t.media_tipe === "video" ? "video" : "foto", url: t.media_url, poster: t.poster_url || undefined } : null,
    fokus: { x: t.fokus_x ?? 50, y: t.fokus_y ?? 50 },
    alt: t.alt_text ?? "",
    sementara: t.is_placeholder === true,
  }));
});

/* ------------------------------------------------------------------ */
/* Halaman publik Tahap C: Guru & Tendik, fasilitas, halaman CMS, kalender */
/* Tabel belum ada (migrasi 20261222 belum dijalankan) → data kosong,    */
/* halaman menampilkan keadaan kosong yang jujur (tanpa data contoh).    */
/* ------------------------------------------------------------------ */
const tabelBelumAda = (e: { code?: string }) => e.code === "42P01" || e.code === "PGRST205";

export type StafPublik = { id: string; nama: string; jabatan: string; bidang: string; foto?: string; sementara: boolean };
export const getStafPublik = cache(async (): Promise<StafPublik[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik().from("staf_publik").select("*").eq("aktif", true).order("urutan").order("nama");
  if (error) {
    if (!tabelBelumAda(error)) logGagal("staf publik", error);
    return [];
  }
  return (data ?? []).map((s) => ({ id: s.id, nama: s.nama, jabatan: s.jabatan ?? "", bidang: s.bidang ?? "", foto: s.foto_url || undefined, sementara: s.is_placeholder === true }));
});

export type Fasilitas = { id: string; nama: string; deskripsi: string; foto?: string; sementara: boolean };
export const getFasilitas = cache(async (): Promise<Fasilitas[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik().from("fasilitas").select("*").eq("aktif", true).order("urutan").order("created_at");
  if (error) {
    if (!tabelBelumAda(error)) logGagal("fasilitas", error);
    return [];
  }
  return (data ?? []).map((f) => ({ id: f.id, nama: f.nama, deskripsi: f.deskripsi ?? "", foto: f.foto_url || undefined, sementara: f.is_placeholder === true }));
});

export type HalamanCms = { slug: string; judul: string; ringkasan: string; isi: string; diperbarui: string };
/** Halaman teks terbit berdasarkan slug (mis. "kurikulum"); null bila belum ada/terbit. */
export const getHalamanCms = cache(async (slug: string): Promise<HalamanCms | null> => {
  if (!supabaseAktif) return null;
  const { data, error } = await supabasePublik().from("halaman_cms").select("*").eq("slug", slug).eq("terbit", true).maybeSingle();
  if (error) {
    if (!tabelBelumAda(error)) logGagal("halaman cms", error);
    return null;
  }
  return data ? { slug: data.slug, judul: data.judul, ringkasan: data.ringkasan ?? "", isi: data.isi ?? "", diperbarui: String(data.updated_at ?? "").slice(0, 10) } : null;
});

export type KegiatanKalender = { id: string; judul: string; jenis: string; mulai: string; selesai: string; jamMulai?: string; jamSelesai?: string; lokasi: string; keterangan: string };
/** Kalender akademik umum (sasaran 'umum') dalam rentang tanggal [dari, sampai]. */
export const getKalenderUmum = cache(async (dari: string, sampai: string): Promise<KegiatanKalender[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik()
    .from("kegiatan_kalender")
    .select("id, judul, jenis, mulai, selesai, jam_mulai, jam_selesai, lokasi, keterangan")
    .is("deleted_at", null)
    .eq("sasaran", "umum")
    .lte("mulai", sampai)
    .gte("selesai", dari)
    .order("mulai")
    .limit(400);
  if (error) {
    if (!tabelBelumAda(error)) logGagal("kalender umum", error);
    return [];
  }
  return (data ?? []).map((k) => ({
    id: k.id,
    judul: k.judul,
    jenis: k.jenis,
    mulai: k.mulai,
    selesai: k.selesai,
    jamMulai: k.jam_mulai?.slice(0, 5) || undefined,
    jamSelesai: k.jam_selesai?.slice(0, 5) || undefined,
    lokasi: k.lokasi ?? "",
    keterangan: k.keterangan ?? "",
  }));
});

/* ------------------------------------------------------------------ */
/* Halaman masuk Portal Digital 22: foto per peran (migrasi 20261224)    */
/* ------------------------------------------------------------------ */
export type PeranFoto = "gtk" | "siswa" | "orang_tua";
export type FotoPortal = { src: string; alt: string; caption: string; fokus: { x: number; y: number }; sementara: boolean };
/** Foto awal (foto asli sekolah) — dipakai bila CMS kosong / tabel belum ada. */
export const FOTO_PORTAL_BAWAAN: Record<PeranFoto, FotoPortal> = {
  gtk: { src: "/images/kegiatan-aula.jpg", alt: "Kegiatan guru dan siswa di aula SMA Negeri 22 Bandung", caption: "Aula sekolah", fokus: { x: 50, y: 45 }, sementara: false },
  siswa: { src: "/images/apel-lapangan.jpg", alt: "Siswa mengikuti apel di lapangan sekolah", caption: "Apel di lapangan", fokus: { x: 50, y: 50 }, sementara: false },
  orang_tua: { src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung", caption: "Gedung utama", fokus: { x: 50, y: 50 }, sementara: false },
};

/** Foto halaman masuk & kartu "Pilih pintu Anda." per peran. Foto kosong di CMS → foto awal peran itu (aula / apel / gedung). */
export const getFotoPortal = cache(async (): Promise<Record<PeranFoto, FotoPortal>> => {
  if (!supabaseAktif) return FOTO_PORTAL_BAWAAN;
  const { data, error } = await supabasePublik().from("portal_login").select("*");
  if (error) {
    if (!tabelBelumAda(error)) logGagal("foto portal", error);
    return FOTO_PORTAL_BAWAAN;
  }
  const hasil = { ...FOTO_PORTAL_BAWAAN };
  for (const r of data ?? []) {
    const k = r.peran as PeranFoto;
    if (!(k in hasil)) continue;
    hasil[k] = r.foto_url
      ? { src: r.foto_url, alt: r.alt_text || FOTO_PORTAL_BAWAAN[k].alt, caption: r.caption || "", fokus: { x: r.fokus_x ?? 50, y: r.fokus_y ?? 50 }, sementara: r.is_placeholder === true }
      : { ...FOTO_PORTAL_BAWAAN[k], caption: r.caption || FOTO_PORTAL_BAWAAN[k].caption };
  }
  return hasil;
});

/** Tautan opsional "aplikasi guru lama" (judul + URL https); kosong = tidak tampil. */
export const getTautanGuruLama = cache(async (): Promise<{ judul: string; url: string } | null> => {
  if (!supabaseAktif) return null;
  const { data, error } = await supabasePublik().from("portal_pengaturan").select("guru_lama_judul, guru_lama_url").eq("id", 1).maybeSingle();
  if (error || !data?.guru_lama_url) return null;
  return { judul: data.guru_lama_judul, url: data.guru_lama_url };
});
