"use server";

import { alamatMasuk, areaRute, cocokHalaman, JENIS_LOGIN, LABEL_PERAN_MASUK, lanjutAman, PERAN_MASUK, peranAkun, type PeranMasuk } from "@/lib/masuk";
import { revalidatePath } from "next/cache";
import { kirimSegera } from "@/lib/notif/kirim";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import {
  agendaSchema,
  beritaSchema,
  buatSlug,
  cekGambar,
  fotoSchema,
  pengumumanSchema,
  pesanError,
  profilSchema,
  uuid,
} from "@/lib/admin/schema";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { emailPortal } from "@/lib/portal";
import { unggahGambar } from "@/lib/admin/unggah";
import { kunciAdminTersedia, supabaseLayanan } from "@/lib/supabase/admin";

export type HasilAksi = { ok: boolean; pesan: string; errors?: Record<string, string>; tautan?: { href: string; label: string } };

const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };

/** Semua aksi konten wajib lolos pemeriksaan ini (di server, bukan di browser). */
async function wajibAdmin() {
  return aksesAksi("konten.kelola");
}

function segarkanSitus() {
  // Perbarui seluruh halaman publik segera setelah konten berubah
  revalidatePath("/", "layout");
}

function ambil(form: FormData, ...kunci: string[]) {
  return Object.fromEntries(kunci.map((k) => [k, String(form.get(k) ?? "")]));
}

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database:", error.code, error.message);
  if (error.code === "23505") return "Data dengan alamat/judul yang sama sudah ada.";
  if (error.code === "42501") return /disetujui|penyetuju|persetujuan/.test(error.message) ? error.message : "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

/* ------------------------------------------------------------------ */
/* Login / logout                                                     */
/* ------------------------------------------------------------------ */

const loginSchema = z.discriminatedUnion("jenis", [
  z.object({
    jenis: z.literal("staf"),
    email: z.string().trim().email("Format email tidak valid"),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  }),
  z.object({
    jenis: z.enum(["siswa", "orang_tua"]),
    nisn: z.string().trim().regex(/^\d{10}$/, "NISN harus 10 digit angka"),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  }),
]);

export async function masuk(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Database belum disambungkan. Isi kunci Supabase di Vercel terlebih dahulu." };
  // peran ditentukan oleh HALAMAN masuk (gtk | siswa | orang-tua); cara login per peran tidak berubah
  const halaman = (PERAN_MASUK as string[]).includes(String(form.get("halaman"))) ? (String(form.get("halaman")) as PeranMasuk) : null;
  const jenis = halaman ? JENIS_LOGIN[halaman] : String(form.get("jenis") || "staf");
  const parsed = loginSchema.safeParse({ ...ambil(form, "email", "password", "nisn"), jenis });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian Anda.", errors: pesanError(parsed.error) };
  const d = parsed.data;
  const email = d.jenis === "staf" ? d.email : emailPortal(d.nisn, d.jenis);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password: d.password });
  if (error) {
    await catatLoginGagal(d.jenis === "staf" ? d.email : d.nisn, d.jenis, error.status);
    const pesan =
      error.status === 429
        ? "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi."
        : d.jenis === "staf"
          ? "Email atau kata sandi salah."
          : "NISN atau kata sandi salah. Akun portal dibuat oleh sekolah; hubungi wali kelas bila belum menerima.";
    return { ok: false, pesan };
  }
  const [{ data: akses }] = await Promise.all([
    supabase.rpc("akses_saya"),
    supabase.rpc("catat_aktivitas", { nama_tabel: "auth", aksi: "LOGIN", keterangan: { jenis: d.jenis } }),
  ]);
  const a = (akses ?? {}) as { peran?: string[]; peran_tertunda?: string[] };
  const peran = [...(a.peran ?? []), ...(a.peran_tertunda ?? [])];
  // akun tidak cocok dengan halaman ini → keluar lagi & arahkan ke halaman masuk yang benar
  if (halaman && !cocokHalaman(halaman, peran)) {
    await supabase.auth.signOut({ scope: "local" });
    const benar = peranAkun(peran);
    return {
      ok: false,
      pesan: `Akun ini terdaftar sebagai ${LABEL_PERAN_MASUK[benar].pendek}, bukan ${LABEL_PERAN_MASUK[halaman].pendek}. Silakan masuk lewat halaman ${LABEL_PERAN_MASUK[benar].pendek}.`,
      tautan: { href: alamatMasuk(benar), label: `Masuk sebagai ${LABEL_PERAN_MASUK[benar].pendek}` },
    };
  }
  // akun GTK tanpa peran: dasbor dasar + notifikasi ke admin pengguna (maks. 1×/24 jam, di database)
  if (peran.length === 0) await supabase.rpc("lapor_akun_tanpa_peran");
  // tujuan kembali — hanya jalur internal yang aman (lib/masuk.ts)
  const lanjut = lanjutAman(form.get("lanjut"));
  // tujuan milik peran lain (mis. siswa membuka /admin) → penjelasan + tautan ke halaman masuk yang benar
  const areaTujuan = lanjut ? areaRute(lanjut) : null;
  if (lanjut && areaTujuan && areaTujuan !== peranAkun(peran)) redirect(`/portal-digital/akses-lain?untuk=${areaTujuan}&lanjut=${encodeURIComponent(lanjut)}`);
  // peran yang wajib verifikasi dua langkah → minta kode autentikator dulu
  if ((a.peran_tertunda ?? []).length > 0) redirect(lanjut ? `/admin/mfa?lanjut=${encodeURIComponent(lanjut)}` : "/admin/mfa");
  const hanyaPortal = peran.length > 0 && peran.every((p) => p === "siswa" || p === "orang_tua");
  redirect(lanjut ?? (hanyaPortal ? "/portal" : "/admin/mulai"));
}

/** Keluar lalu buka halaman masuk peran lain (dari halaman "akses lain"); tujuan divalidasi. */
export async function keluarDanMasuk(form: FormData) {
  const untuk = (PERAN_MASUK as string[]).includes(String(form.get("untuk"))) ? (String(form.get("untuk")) as PeranMasuk) : "gtk";
  const lanjut = lanjutAman(form.get("lanjut"));
  if (supabaseAktif) {
    const supabase = await supabaseServer();
    await supabase.rpc("catat_aktivitas", { nama_tabel: "auth", aksi: "LOGOUT" });
    // hanya sesi di perangkat ini; "Keluar dari semua perangkat" ada di Profil saya / Keamanan akun
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect(lanjut ? `${alamatMasuk(untuk)}?lanjut=${encodeURIComponent(lanjut)}` : alamatMasuk(untuk));
}

/** Percobaan masuk yang gagal dicatat dengan kunci server (tanpa kata sandi), untuk deteksi tebak-sandi */
async function catatLoginGagal(akun: string, jenis: string, status?: number) {
  if (!kunciAdminTersedia) return;
  try {
    await supabaseLayanan()
      .from("audit_log")
      .insert({ tabel: "auth", aksi: "LOGIN_GAGAL", record_id: "", data_baru: { akun: akun.slice(0, 120), jenis, dibatasi: status === 429 } });
  } catch (e) {
    console.error("[login] catat gagal:", (e as Error).message);
  }
}

export async function keluar() {
  if (supabaseAktif) {
    const supabase = await supabaseServer();
    await supabase.rpc("catat_aktivitas", { nama_tabel: "auth", aksi: "LOGOUT" });
    // hanya sesi di perangkat ini; "Keluar dari semua perangkat" ada di Profil saya / Keamanan akun
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/portal-digital");
}

/* ------------------------------------------------------------------ */
/* Profil sekolah                                                     */
/* ------------------------------------------------------------------ */

export async function simpanProfil(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;

  const parsed = profilSchema.safeParse(ambil(form, ...Object.keys(profilSchema.shape)));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const foto = form.get("foto") as File | null;
  const salahFoto = cekGambar(foto);
  if (salahFoto) return { ok: false, pesan: salahFoto, errors: { foto: salahFoto } };

  const data: Record<string, string> = { ...parsed.data };
  try {
    if (foto && foto.size > 0) data.foto_kepala_sekolah = await unggahGambar(ctx.supabase, foto, "profil");
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }

  const { error, count } = await ctx.supabase
    .from("profil_sekolah")
    .update({ ...data, updated_by: ctx.akses.userId }, { count: "exact" })
    .eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return GAGAL_AKSES;

  segarkanSitus();
  return { ok: true, pesan: "Profil sekolah berhasil disimpan." };
}

/* ------------------------------------------------------------------ */
/* Berita                                                             */
/* ------------------------------------------------------------------ */

export async function simpanBerita(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;

  const mentah = ambil(form, "judul", "slug", "kategori", "tanggal", "ringkasan", "isi", "status", "tayang_mulai");
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = beritaSchema.safeParse({ ...mentah, id });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const gambar = form.get("gambar") as File | null;
  const salah = cekGambar(gambar);
  if (salah) return { ok: false, pesan: salah, errors: { gambar: salah } };

  const { id: _abaikan, ...isian } = parsed.data;
  void _abaikan;
  const dasarSlug = isian.slug || buatSlug(isian.judul) || `berita-${Date.now()}`;
  const baris: Record<string, string | null> = { ...isian, slug: dasarSlug };

  try {
    if (gambar && gambar.size > 0) baris.gambar_url = await unggahGambar(ctx.supabase, gambar, "berita");
    else if (form.get("hapus_gambar") === "on") baris.gambar_url = "";
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }

  if (id) {
    const { error, count } = await ctx.supabase.from("berita").update(baris, { count: "exact" }).eq("id", id);
    if (error) return { ok: false, pesan: pesanDb(error), errors: error.code === "23505" ? { slug: "Alamat ini sudah dipakai berita lain" } : undefined };
    if (!count) return { ok: false, pesan: "Berita tidak ditemukan atau Anda tidak berhak mengubahnya." };
  } else {
    // coba slug, slug-2, slug-3 ... bila sudah dipakai
    let tersimpan = false;
    for (let i = 1; i <= 20 && !tersimpan; i++) {
      const slug = i === 1 ? dasarSlug : `${dasarSlug}-${i}`;
      const { error } = await ctx.supabase.from("berita").insert({ ...baris, slug, created_by: ctx.akses.userId });
      if (!error) tersimpan = true;
      else if (error.code !== "23505" || isian.slug) return { ok: false, pesan: pesanDb(error) };
    }
    if (!tersimpan) return { ok: false, pesan: "Gagal membuat alamat berita yang unik. Isi kolom alamat secara manual." };
  }

  kirimSegera();
  segarkanSitus();
  if (!id) redirect("/admin/berita?pesan=tersimpan");
  return {
    ok: true,
    pesan:
      isian.status === "terbit"
        ? isian.tayang_mulai && new Date(isian.tayang_mulai) > new Date()
          ? "Berita disetujui dan akan tampil otomatis sesuai jadwal tayang."
          : "Berita disimpan dan sudah tampil di situs."
        : isian.status === "diajukan"
          ? "Berita diajukan. Kepala sekolah/penyetuju akan meninjau sebelum tayang."
          : "Berita disimpan sebagai draf.",
  };
}

/* ------------------------------------------------------------------ */
/* Arsipkan (soft delete) — berlaku untuk berita/agenda/pengumuman/galeri */
/* ------------------------------------------------------------------ */

const TABEL_ARSIP = ["berita", "agenda", "pengumuman", "galeri", "prestasi"] as const;

export async function arsipkan(form: FormData) {
  const ctx = await wajibAdmin();
  if (!ctx) redirect("/admin/login");
  const tabel = String(form.get("tabel"));
  const id = uuid.safeParse(String(form.get("id")));
  const minta = String(form.get("kembali") ?? "");
  const kembali = /^\/admin(\/[a-z-]*)?$/.test(minta) ? minta : "/admin";
  if (!(TABEL_ARSIP as readonly string[]).includes(tabel) || !id.success) redirect(`${kembali}?pesan=gagal`);

  const { error } = await ctx.supabase.from(tabel).update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  if (error) {
    console.error("[admin] gagal arsip:", error);
    redirect(`${kembali}?pesan=gagal`);
  }
  segarkanSitus();
  redirect(`${kembali}?pesan=diarsipkan`);
}

/* ------------------------------------------------------------------ */
/* Agenda                                                             */
/* ------------------------------------------------------------------ */

export async function simpanAgenda(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = agendaSchema.safeParse({ ...ambil(form, "judul", "tanggal", "waktu", "tempat"), id });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { id: _i, ...baris } = parsed.data;
  void _i;

  const { error } = id
    ? await ctx.supabase.from("agenda").update(baris).eq("id", id)
    : await ctx.supabase.from("agenda").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };

  segarkanSitus();
  redirect("/admin/agenda?pesan=tersimpan");
}

/* ------------------------------------------------------------------ */
/* Pengumuman                                                         */
/* ------------------------------------------------------------------ */

export async function simpanPengumuman(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = pengumumanSchema.safeParse({
    ...ambil(form, "judul", "isi", "tanggal", "tayang_mulai", "tayang_selesai", "poster_alt", "tautan_url", "tautan_label"),
    penting: form.get("penting") === "on",
    aktif: form.get("aktif") === "on",
    prioritas: form.get("prioritas") === "on",
    id,
  });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { id: _i, prioritas, poster_alt, tautan_url, tautan_label, ...dasar } = parsed.data;
  void _i;
  // kolom popup prioritas hanya dikirim bila dipakai/ada sebelumnya, agar formulir tetap jalan sebelum migrasi Fase 19
  const baris: Record<string, unknown> = { ...dasar };
  // sasaran (migrasi 20261225) hanya dikirim bila dipakai, agar formulir tetap jalan sebelum migrasi
  const internal = form.get("internal") === "on";
  if (internal || form.get("sasaran_lama") === "pegawai") baris.sasaran = internal ? "pegawai" : "umum";
  const poster = form.get("poster") as File | null;
  const salahPoster = cekGambar(poster);
  if (salahPoster) return { ok: false, pesan: salahPoster, errors: { poster: salahPoster } };
  const posterLama = String(form.get("poster_lama") ?? "");
  const hapusPoster = form.get("hapus_poster") === "on";
  const adaPosterBaru = Boolean(poster && poster.size > 0);
  const akanAdaPoster = adaPosterBaru || (Boolean(posterLama) && !hapusPoster);
  if (akanAdaPoster && poster_alt.length < 5)
    return { ok: false, pesan: "Poster wajib disertai teks alternatif.", errors: { poster_alt: "Jelaskan isi poster (minimal 5 karakter)" } };
  if (prioritas || akanAdaPoster || posterLama || tautan_url || form.get("kolom_popup") === "1") {
    Object.assign(baris, { prioritas, poster_alt: akanAdaPoster ? poster_alt : "", tautan_url, tautan_label: tautan_url ? tautan_label : "" });
    if (adaPosterBaru) {
      try {
        baris.poster_url = await unggahGambar(ctx.supabase, poster!, "pengumuman");
      } catch (e) {
        return { ok: false, pesan: (e as Error).message, errors: { poster: (e as Error).message } };
      }
    } else if (hapusPoster) baris.poster_url = "";
  }

  const { error } = id
    ? await ctx.supabase.from("pengumuman").update(baris).eq("id", id)
    : await ctx.supabase.from("pengumuman").insert(baris);
  if (error)
    return {
      ok: false,
      pesan:
        error.code === "PGRST204" || error.code === "42703"
          ? "sasaran" in baris
            ? "Pengumuman internal memerlukan migrasi 20261225000000_gtk_jabatan_peran.sql."
            : "Fitur popup prioritas memerlukan migrasi 20261202000000_tampilan_widget.sql."
          : pesanDb(error),
    };

  segarkanSitus();
  redirect("/admin/pengumuman?pesan=tersimpan");
}

/* ------------------------------------------------------------------ */
/* Galeri                                                             */
/* ------------------------------------------------------------------ */

export async function simpanFoto(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = fotoSchema.safeParse({ ...ambil(form, "judul", "urutan"), id });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const gambar = form.get("gambar") as File | null;
  const salah = cekGambar(gambar);
  if (salah) return { ok: false, pesan: salah, errors: { gambar: salah } };
  if (!id && (!gambar || gambar.size === 0)) return { ok: false, pesan: "Pilih foto yang akan diunggah.", errors: { gambar: "Foto wajib dipilih" } };

  const baris: Record<string, string | number> = { judul: parsed.data.judul, urutan: parsed.data.urutan };
  try {
    if (gambar && gambar.size > 0) baris.gambar_url = await unggahGambar(ctx.supabase, gambar, "galeri");
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }

  const { error } = id
    ? await ctx.supabase.from("galeri").update(baris).eq("id", id)
    : await ctx.supabase.from("galeri").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };

  segarkanSitus();
  redirect("/admin/galeri?pesan=tersimpan");
}
