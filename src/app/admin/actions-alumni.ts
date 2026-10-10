"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import { VERSI_PRIVASI } from "@/lib/alumni";
import { dariLokalWIB } from "@/lib/lms";
import { alamatSitus, kanalAktif, kirimEmailLangsung, kirimSegera } from "@/lib/notif/kirim";
import { kunciAdminTersedia, supabaseAdminAuth } from "@/lib/supabase/admin";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseAnonSegar } from "@/lib/supabase/public";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const https = z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Harus diawali https://").max(500)]);
const tahun = z.coerce.number().int().min(1980, "Tahun tidak valid").max(2100, "Tahun tidak valid");
function pesanDb(e: { code?: string; message: string }) {
  console.error("[alumni]", e.code, e.message);
  if (["22023"].includes(e.code ?? "")) return e.message;
  if (e.code === "42501") return "Akses ditolak.";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  if (e.code === "23505") return "Data sudah ada.";
  return "Gagal menyimpan. Coba lagi.";
}
const segarkan = () => {
  revalidatePath("/admin/alumni", "layout");
  revalidatePath("/alumni", "layout");
  revalidatePath("/portal/alumni");
};
async function sesi() { return (await getAkses()).supabase; }

/* ============================ Registrasi publik ============================ */

export async function daftarAlumni(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Layanan belum aktif." };
  if (String(form.get("situs_web") ?? "") !== "") return { ok: true, pesan: "Terima kasih." };
  const p = z
    .object({
      nama: z.string().trim().min(2, "Isi nama lengkap").max(120),
      tahun_lulus: tahun,
      nisn: z.union([z.literal(""), z.string().regex(/^\d{10}$/, "NISN 10 digit")]),
      tanggal_lahir: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      jurusan: z.string().trim().max(40),
      kelas_terakhir: z.string().trim().max(20),
      email: z.string().trim().toLowerCase().email("Email tidak valid").max(150),
      telepon: z.string().trim().max(30),
      setuju: z.literal(true, { message: "Setujui kebijakan privasi" }),
    })
    .refine((d) => d.nisn !== "" || d.kelas_terakhir.length >= 2, { path: ["kelas_terakhir"], message: "Isi kelas terakhir bila tidak ingat NISN" })
    .safeParse({ ...ambil(form, "nama", "nisn", "tanggal_lahir", "jurusan", "kelas_terakhir", "email", "telepon"), tahun_lulus: String(form.get("tahun_lulus") ?? ""), setuju: form.get("setuju") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian yang ditandai.", errors: pesanError(p.error) };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const ipHash = ip ? createHash("sha256").update(`${ip}|alumni|${process.env.CRON_SECRET ?? "sman22"}`).digest("hex").slice(0, 32) : "";
  const d = p.data;
  const { error } = await supabaseAnonSegar().rpc("daftar_alumni", {
    p_nama: d.nama, p_tahun: d.tahun_lulus, p_nisn: d.nisn, p_tgl_lahir: d.tanggal_lahir || null, p_jurusan: d.jurusan, p_kelas: d.kelas_terakhir,
    p_email: d.email, p_telepon: d.telepon, p_setuju: true, p_versi: VERSI_PRIVASI, p_ip_hash: ipHash,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  return { ok: true, pesan: "Pendaftaran terkirim. Sekolah akan memverifikasi data Anda; tautan aktivasi akun dikirim ke email Anda." };
}

/* ============================ Verifikasi (admin) ============================ */

async function kirimAktivasi(email: string) {
  if (!kanalAktif().email) return false;
  const { data, error } = await supabaseAdminAuth().generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) return false;
  try {
    await kirimEmailLangsung({
      ke: email,
      judul: "Akun alumni SMAN 22 Bandung aktif",
      isi: "Data alumni Anda sudah diverifikasi. Buat kata sandi untuk masuk ke area alumni. Tautan berlaku 1 jam; setelahnya gunakan menu lupa kata sandi.",
      url: `${alamatSitus()}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`,
      tombol: "Buat kata sandi",
      catatan: "Bila Anda tidak mendaftar sebagai alumni, abaikan email ini.",
    });
    return true;
  } catch { return false; }
}

export async function setujuiAlumni(form: FormData) {
  const ctx = await aksesAksi("alumni.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const siswa = uuid.safeParse(String(form.get("siswa_id") ?? ""));
  const balik = (q: string) => redirect(`/admin/alumni/pendaftaran?${q}`);
  if (!id.success) balik("galat=Data%20tidak%20valid");
  if (!kunciAdminTersedia) balik(`galat=${encodeURIComponent("Kunci layanan Supabase (SUPABASE_SERVICE_ROLE_KEY) belum dipasang — akun alumni tidak dapat dibuat.")}`);
  const { data: r } = await ctx.supabase.from("pendaftaran_alumni").select("id, email, nama, status").eq("id", id.data!).maybeSingle();
  if (!r || r.status !== "menunggu") balik("galat=Pendaftaran%20tidak%20ditemukan");
  const { data: u, error } = await supabaseAdminAuth().createUser({ email: r!.email, password: randomBytes(24).toString("base64url"), email_confirm: true, user_metadata: { nama: r!.nama } });
  if (error || !u.user) {
    const ada = /already|exists|registered/i.test(error?.message ?? "");
    balik(`galat=${encodeURIComponent(ada ? "Email ini sudah dipakai akun lain. Hubungi alumni untuk memakai email berbeda." : "Akun gagal dibuat.")}`);
  }
  const { error: e2 } = await ctx.supabase.rpc("setujui_pendaftaran_alumni", { p_id: id.data!, p_user: u!.user!.id, p_siswa: siswa.success ? siswa.data : null });
  if (e2) {
    await supabaseAdminAuth().deleteUser(u!.user!.id);
    balik(`galat=${encodeURIComponent(pesanDb(e2))}`);
  }
  const terkirim = await kirimAktivasi(r!.email);
  segarkan();
  balik(`pesan=${terkirim ? "alumni-aktif" : "alumni-aktif-tanpa-email"}`);
}

export async function tolakAlumni(form: FormData) {
  const ctx = await aksesAksi("alumni.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("pendaftaran_alumni").update({ status: "ditolak", catatan: String(form.get("catatan") ?? "").slice(0, 300) }).eq("id", id.data).eq("status", "menunggu");
  segarkan();
  redirect("/admin/alumni/pendaftaran?pesan=tersimpan");
}

export async function imporLulusan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("alumni.kelola");
  if (!ctx) return TANPA_AKSES;
  const t = tahun.safeParse(form.get("tahun"));
  if (!t.success) return { ok: false, pesan: "Isi tahun lulus.", errors: { tahun: "Tahun tidak valid" } };
  const { data, error } = await ctx.supabase.rpc("impor_lulusan", { p_tahun: t.data });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `${data} profil alumni dibuat dari siswa berstatus lulus (angkatan ${t.data}).` };
}

export async function simpanAngkatan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("alumni.kelola");
  if (!ctx) return TANPA_AKSES;
  const p = z.object({ tahun, nama: z.string().trim().max(80), koordinator: z.string().trim().max(120), catatan: z.string().trim().max(500) })
    .safeParse({ ...ambil(form, "nama", "koordinator", "catatan"), tahun: String(form.get("tahun") ?? "") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await ctx.supabase.from("angkatan_alumni").upsert(p.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Angkatan tersimpan." };
}

/* ============================ Profil (alumni) ============================ */

export async function simpanProfilAlumni(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  const p = z
    .object({
      jurusan: z.string().trim().max(40), telepon: z.string().trim().max(30), kota: z.string().trim().max(80),
      status_kegiatan: z.enum(["belum_diisi", "kuliah", "bekerja", "wirausaha", "kuliah_bekerja", "mencari_kerja", "lainnya"]),
      institusi: z.string().trim().max(150), bidang: z.string().trim().max(120), jabatan: z.string().trim().max(120),
      tautan_profesional: https, bio: z.string().trim().max(1000),
      tampil_direktori: z.boolean(),
      field_direktori: z.array(z.enum(["kota", "status_kegiatan", "institusi", "bidang", "jabatan", "tautan_profesional", "bio", "email", "telepon", "jurusan"])),
    })
    .safeParse({ ...ambil(form, "jurusan", "telepon", "kota", "status_kegiatan", "institusi", "bidang", "jabatan", "tautan_profesional", "bio"),
      tampil_direktori: form.get("tampil_direktori") === "on", field_direktori: form.getAll("field_direktori").map(String) });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error, count } = await supabase.from("profil_alumni").update(p.data, { count: "exact" }).eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return TANPA_AKSES;
  segarkan();
  return { ok: true, pesan: "Profil & pilihan privasi tersimpan." };
}

export async function rsvpAcara(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("acara_id")));
  const r = id.success ? await supabase.rpc("rsvp_acara_alumni_set", { p_acara: id.data, p_hadir: form.get("hadir") === "1" }) : { error: { message: "Data tidak valid" } };
  revalidatePath("/alumni/akun");
  redirect(`/alumni/akun?tab=acara&${r.error ? `galat=${encodeURIComponent(r.error.message.slice(0, 200))}` : "pesan=tersimpan"}`);
}

/* ============================ Peluang ============================ */

export async function simpanPeluang(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const kelola = Boolean(await aksesAksi("alumni.kelola"));
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      judul: z.string().trim().min(3, "Isi judul").max(150),
      jenis: z.enum(["beasiswa", "kuliah", "lowongan", "magang", "lomba", "pelatihan", "lainnya"]),
      penyedia: z.string().trim().max(150), deskripsi: z.string().trim().max(2000), tautan: https,
      tenggat: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      sasaran: z.enum(["siswa", "alumni", "keduanya"]),
    })
    .safeParse(ambil(form, "judul", "jenis", "penyedia", "deskripsi", "tautan", "tenggat", "sasaran"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { data: u } = await supabase.auth.getUser();
  const baris = { ...p.data, tenggat: p.data.tenggat || null, ...(kelola ? { status: "tayang" } : { status: "menunggu", diajukan_oleh: u.user?.id }) };
  const r = kelola && uuid.safeParse(id).success ? await supabase.from("peluang").update(baris).eq("id", id) : await supabase.from("peluang").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  return { ok: true, pesan: kelola ? "Peluang ditayangkan." : "Terima kasih! Peluang tayang setelah ditinjau sekolah." };
}

export async function moderasi(form: FormData) {
  const ctx = await aksesAksi("alumni.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const tabel = z.enum(["peluang", "mentor_alumni", "cerita_alumni", "kontribusi_alumni", "mentoring"]).safeParse(String(form.get("tabel")));
  const id = uuid.safeParse(String(form.get("id")));
  const status = String(form.get("status"));
  const izin: Record<string, string[]> = { peluang: ["tayang", "ditolak", "arsip"], mentor_alumni: ["disetujui", "ditolak"], cerita_alumni: ["tayang", "ditolak"],
    kontribusi_alumni: ["diterima", "selesai", "ditolak"], mentoring: ["disetujui", "ditolak", "selesai"] };
  if (tabel.success && id.success && izin[tabel.data].includes(status)) {
    const ubah: Record<string, unknown> = { status };
    if (tabel.data === "mentoring" || tabel.data === "cerita_alumni") ubah[tabel.data === "mentoring" ? "catatan_sekolah" : "catatan"] = String(form.get("catatan") ?? "").slice(0, 300);
    if (tabel.data === "kontribusi_alumni") ubah.tampil_publik = form.get("tampil_publik") === "on";
    await ctx.supabase.from(tabel.data).update(ubah).eq("id", id.data);
  }
  kirimSegera();
  segarkan();
  redirect(`/admin/alumni/layanan?tab=${String(form.get("tab") ?? "peluang")}&pesan=tersimpan`);
}

export async function putuskanMentoringBk(form: FormData) {
  const supabase = await sesi();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const status = z.enum(["disetujui", "ditolak", "selesai"]).safeParse(String(form.get("status")));
  if (id.success && status.success) await supabase.from("mentoring").update({ status: status.data, catatan_sekolah: String(form.get("catatan") ?? "").slice(0, 500) }).eq("id", id.data);
  kirimSegera();
  segarkan();
  redirect(`${String(form.get("kembali")) === "bk" ? "/admin/alumni/layanan?tab=mentoring" : "/admin/alumni/layanan?tab=mentoring"}&pesan=tersimpan`);
}

/* ============================ Acara (admin) ============================ */

export async function simpanAcaraAlumni(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("alumni.kelola");
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({ judul: z.string().trim().min(3, "Isi judul").max(150), deskripsi: z.string().trim().max(2000), mulai: z.string().min(1, "Isi waktu"),
      tempat: z.string().trim().max(150), kuota: z.coerce.number().int().min(0).max(5000), publik: z.boolean() })
    .safeParse({ ...ambil(form, "judul", "deskripsi", "mulai", "tempat"), kuota: String(form.get("kuota") || "0"), publik: form.get("publik") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const mulai = dariLokalWIB(p.data.mulai);
  if (!mulai) return { ok: false, pesan: "Waktu tidak valid.", errors: { mulai: "Tidak valid" } };
  const angkatan = [...new Set(String(form.get("untuk_angkatan") ?? "").split(/[\s,;]+/).filter(Boolean).map(Number))].filter((x) => x >= 1980 && x <= 2100);
  const { error } = await ctx.supabase.from("acara_alumni").insert({ ...p.data, mulai, untuk_angkatan: angkatan });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Acara tersimpan dan tampil di area alumni." };
}

/* ============================ Berbagi (alumni) ============================ */

export async function tawarkanMentor(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const { data: me } = await supabase.rpc("alumni_saya");
  if (!me) return TANPA_AKSES;
  const p = z.object({ bidang: z.string().trim().min(3, "Isi bidang").max(150), deskripsi: z.string().trim().max(1000), kuota: z.coerce.number().int().min(1).max(50) })
    .safeParse({ ...ambil(form, "bidang", "deskripsi"), kuota: String(form.get("kuota") || "3") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.from("mentor_alumni").insert({ ...p.data, profil_id: me });
  if (error) return { ok: false, pesan: error.code === "23505" ? "Anda sudah terdaftar sebagai mentor." : pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Terima kasih! Tawaran mentoring ditinjau sekolah sebelum ditampilkan kepada siswa." };
}

export async function tawarkanKontribusi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const { data: me } = await supabase.rpc("alumni_saya");
  if (!me) return TANPA_AKSES;
  const p = z.object({ jenis: z.enum(["donasi", "beasiswa", "narasumber", "mentoring", "barang", "lainnya"]), deskripsi: z.string().trim().min(5, "Ceritakan bentuk kontribusi").max(1000),
      nama_tampil: z.string().trim().max(120), tampil_publik: z.boolean() })
    .safeParse({ ...ambil(form, "jenis", "deskripsi", "nama_tampil"), tampil_publik: form.get("tampil_publik") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.from("kontribusi_alumni").insert({ ...p.data, profil_id: me, status: "diajukan" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Terima kasih! Sekolah akan menghubungi Anda." };
}

export async function tulisCerita(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const { data: me } = await supabase.rpc("alumni_saya");
  if (!me) return TANPA_AKSES;
  const p = z.object({ judul: z.string().trim().min(5, "Minimal 5 karakter").max(150), isi: z.string().trim().min(50, "Minimal 50 karakter").max(5000), foto_url: https,
      izin_publik: z.literal(true, { message: "Centang izin publikasi" }) })
    .safeParse({ ...ambil(form, "judul", "isi", "foto_url"), izin_publik: form.get("izin_publik") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.from("cerita_alumni").insert({ ...p.data, profil_id: me });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Cerita terkirim dan akan tayang setelah ditinjau sekolah." };
}

/* ============================ Siswa: mentoring ============================ */

export async function ajukanMentoring(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const supabase = await sesi();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("mentor_id")));
  const topik = z.string().trim().min(5, "Ceritakan yang ingin ditanyakan").max(500).safeParse(form.get("topik"));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  if (!topik.success) return { ok: false, pesan: "Periksa isian.", errors: { topik: topik.error.issues[0].message } };
  const { error } = await supabase.rpc("ajukan_mentoring", { p_mentor: id.data, p_topik: topik.data });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/portal/alumni");
  return { ok: true, pesan: "Permintaan terkirim. Sekolah akan meninjau dan mengatur pertemuan bersama BK." };
}
