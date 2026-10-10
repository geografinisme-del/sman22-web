"use server";

import { revalidatePath } from "next/cache";
import { kirimSegera } from "@/lib/notif/kirim";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, berperan } from "@/lib/admin/auth";
import { geserTanggal, hariIniWIB, tanggalSchema } from "@/lib/admin/absensi";
import { pesanError } from "@/lib/admin/schema";
import { cekBukti, unggahPrivat } from "@/lib/admin/berkas";
import { emailPortal, sandiAcak } from "@/lib/portal";
import { kunciAdminTersedia, supabaseAdminAuth } from "@/lib/supabase/admin";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const uuid = z.string().uuid();

function pesanDb(e: { code?: string; message: string }) {
  console.error("[portal]", e.code, e.message);
  if (e.code === "42501") return "Akses ditolak.";
  if (["22023", "P0002", "23514", "23505"].includes(e.code ?? "")) return e.message;
  if (e.code === "23P01" || e.code === "23502") return "Isian belum lengkap.";
  return "Gagal menyimpan. Coba lagi.";
}

/* ======================= PORTAL ORANG TUA ======================= */

const izinSchema = z
  .object({
    siswa_id: uuid,
    jenis: z.enum(["S", "I"], { message: "Pilih sakit atau izin" }),
    tanggal_mulai: tanggalSchema,
    tanggal_selesai: tanggalSchema,
    alasan: z.string().trim().min(5, "Tulis keterangan minimal 5 karakter").max(500, "Maksimal 500 karakter"),
  })
  .refine((d) => d.tanggal_selesai >= d.tanggal_mulai, { path: ["tanggal_selesai"], message: "Tanggal selesai sebelum tanggal mulai" })
  .refine((d) => d.tanggal_selesai <= geserTanggal(d.tanggal_mulai, 13), { path: ["tanggal_selesai"], message: "Paling lama 14 hari per pengajuan" })
  .refine((d) => d.tanggal_mulai >= geserTanggal(hariIniWIB(), -3), { path: ["tanggal_mulai"], message: "Paling lambat 3 hari setelah tanggalnya" })
  .refine((d) => d.tanggal_mulai <= geserTanggal(hariIniWIB(), 30), { path: ["tanggal_mulai"], message: "Paling lama 30 hari sebelumnya" });

export async function ajukanIzin(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx || !berperan(ctx.akses, "orang_tua")) return TANPA_AKSES;
  const parsed = izinSchema.safeParse({
    siswa_id: String(form.get("siswa_id") ?? ""),
    jenis: String(form.get("jenis") ?? ""),
    tanggal_mulai: String(form.get("tanggal_mulai") ?? ""),
    tanggal_selesai: String(form.get("tanggal_selesai") || form.get("tanggal_mulai") || ""),
    alasan: String(form.get("alasan") ?? ""),
  });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian pemberitahuan.", errors: pesanError(parsed.error) };
  const d = parsed.data;
  const { count } = await ctx.supabase
    .from("izin_ortu")
    .select("id", { count: "exact", head: true })
    .eq("siswa_id", d.siswa_id)
    .eq("status", "menunggu")
    .lte("tanggal_mulai", d.tanggal_selesai)
    .gte("tanggal_selesai", d.tanggal_mulai);
  if (count) return { ok: false, pesan: "Sudah ada pemberitahuan yang menunggu untuk tanggal tersebut." };
  const bukti = form.get("bukti") as File | null;
  const salahBukti = cekBukti(bukti);
  if (salahBukti) return { ok: false, pesan: salahBukti, errors: { bukti: salahBukti } };
  let bukti_path = "";
  try {
    if (bukti && bukti.size > 0) bukti_path = await unggahPrivat(ctx.supabase, ctx.akses.userId, "bukti", "izin-ortu", bukti);
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  const { error } = await ctx.supabase.from("izin_ortu").insert({ ...d, bukti_path });
  if (error) return { ok: false, pesan: error.code === "42501" ? "Anda hanya dapat mengirim izin untuk anak Anda sendiri." : pesanDb(error) };
  kirimSegera();
  revalidatePath("/portal", "layout");
  revalidatePath("/admin/izin-ortu");
  return { ok: true, pesan: "Terkirim. Wali kelas akan memeriksa dan Anda bisa melihat statusnya di bawah." };
}

export async function batalkanIzin(form: FormData) {
  const ctx = await aksesAksi();
  if (!ctx) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) redirect("/portal/izin?pesan=gagal");
  const { error } = await ctx.supabase.rpc("batalkan_izin_ortu", { p_id: id.data });
  if (error) {
    console.error("[portal] batal:", error.message);
    redirect("/portal/izin?pesan=gagal");
  }
  revalidatePath("/portal", "layout");
  redirect("/portal/izin?pesan=dibatalkan");
}

const sandiPortal = z
  .string()
  .min(8, "Minimal 8 karakter")
  .max(72)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Harus berisi huruf dan angka");

export async function gantiSandiSendiri(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const lama = String(form.get("lama") ?? "");
  const baru = sandiPortal.safeParse(String(form.get("baru") ?? ""));
  const ulang = String(form.get("ulang") ?? "");
  if (!lama) return { ok: false, pesan: "Isi kata sandi lama.", errors: { lama: "Wajib diisi" } };
  if (!baru.success) return { ok: false, pesan: "Kata sandi baru belum memenuhi syarat.", errors: { baru: baru.error.issues[0].message } };
  if (baru.data !== ulang) return { ok: false, pesan: "Ulangi kata sandi baru dengan sama persis.", errors: { ulang: "Tidak sama" } };
  if (baru.data === lama) return { ok: false, pesan: "Kata sandi baru harus berbeda.", errors: { baru: "Sama dengan yang lama" } };

  const { data: u } = await ctx.supabase.auth.getUser();
  const email = u.user?.email;
  if (!email) return TANPA_AKSES;
  const cek = await ctx.supabase.auth.signInWithPassword({ email, password: lama });
  if (cek.error) return { ok: false, pesan: "Kata sandi lama salah.", errors: { lama: "Salah" } };
  const { error } = await ctx.supabase.auth.updateUser({ password: baru.data });
  if (error) {
    console.error("[portal] ganti sandi:", error.message);
    return { ok: false, pesan: "Gagal mengubah kata sandi. Coba lagi." };
  }
  return { ok: true, pesan: "Kata sandi berhasil diganti. Gunakan kata sandi baru saat masuk berikutnya." };
}

/* ======================= ADMIN: IZIN DARI ORANG TUA ======================= */

export async function prosesIzin(form: FormData) {
  const ctx = await aksesAksi();
  if (!ctx) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const terima = String(form.get("keputusan")) === "terima";
  const catatan = String(form.get("catatan") ?? "").slice(0, 300);
  if (!id.success) redirect("/admin/izin-ortu?pesan=gagal");
  const { error } = await ctx.supabase.rpc("proses_izin_ortu", { p_id: id.data, terima, p_catatan: catatan });
  if (error) {
    console.error("[portal] proses izin:", error.code, error.message);
    redirect("/admin/izin-ortu?pesan=gagal");
  }
  kirimSegera();
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
  redirect(`/admin/izin-ortu?pesan=${terima ? "diterima" : "ditolak"}`);
}

/* ======================= ADMIN: AKUN PORTAL ======================= */

export type AkunBaru = { nama: string; nisn: string; jenis: "siswa" | "orang_tua"; sandi: string };
export type HasilAkun = HasilAksi & { akun?: AkunBaru[]; kelas?: string };

const MAKS_SEKALI = 40;

export async function buatAkunPortal(_p: HasilAkun, form: FormData): Promise<HasilAkun> {
  const ctx = await aksesAksi("akun_portal.kelola");
  if (!ctx) return TANPA_AKSES;
  if (!kunciAdminTersedia) return { ok: false, pesan: "Fitur ini butuh kunci rahasia Supabase (SUPABASE_SERVICE_ROLE_KEY) di server. Lihat panduan." };

  const kelas = uuid.safeParse(String(form.get("kelas_id")));
  if (!kelas.success) return { ok: false, pesan: "Pilih kelas." };
  const jenisDipilih = form.getAll("jenis").map(String).filter((j): j is AkunBaru["jenis"] => j === "siswa" || j === "orang_tua");
  if (!jenisDipilih.length) return { ok: false, pesan: "Centang minimal satu: akun siswa atau akun orang tua." };
  const dipilih = new Set(form.getAll("siswa").map(String));
  if (!dipilih.size) return { ok: false, pesan: "Centang siswa yang akan dibuatkan akun." };

  const { data: status, error: eStatus } = await ctx.supabase.rpc("status_akun_portal", { p_kelas: kelas.data });
  if (eStatus) return { ok: false, pesan: pesanDb(eStatus) };
  const { data: k } = await ctx.supabase.from("kelas").select("nama").eq("id", kelas.data).maybeSingle();

  type Baris = { siswa_id: string; nisn: string | null; nama: string; akun_siswa: boolean; akun_ortu: boolean };
  const tugas: { s: Baris; jenis: AkunBaru["jenis"] }[] = [];
  for (const s of (status ?? []) as Baris[]) {
    if (!dipilih.has(s.siswa_id) || !s.nisn || !/^\d{10}$/.test(s.nisn)) continue;
    for (const j of jenisDipilih) {
      if (j === "siswa" ? s.akun_siswa : s.akun_ortu) continue;
      tugas.push({ s, jenis: j });
    }
  }
  if (!tugas.length) return { ok: false, pesan: "Semua siswa yang dipilih sudah punya akun (atau belum punya NISN 10 digit)." };
  const dikerjakan = tugas.slice(0, MAKS_SEKALI);

  const admin = supabaseAdminAuth();
  const akun: AkunBaru[] = [];
  const gagal: string[] = [];
  for (const { s, jenis } of dikerjakan) {
    const email = emailPortal(s.nisn!, jenis);
    const sandi = sandiAcak();
    const { data: dibuat, error: eBuat } = await admin.createUser({
      email,
      password: sandi,
      email_confirm: true,
      user_metadata: { nama: jenis === "siswa" ? s.nama : `Orang tua ${s.nama}`, portal: jenis },
    });
    if (eBuat || !dibuat.user) {
      console.error("[portal] createUser:", eBuat?.message);
      gagal.push(`${s.nama} (${jenis === "siswa" ? "siswa" : "ortu"}): ${/registered|exists/i.test(eBuat?.message ?? "") ? "email login sudah dipakai" : "gagal dibuat"}`);
      continue;
    }
    const { error: eDaftar } = await ctx.supabase.rpc("daftarkan_akun_portal", {
      p_user: dibuat.user.id,
      p_jenis: jenis,
      p_siswa: s.siswa_id,
      p_email: email,
    });
    if (eDaftar) {
      await admin.deleteUser(dibuat.user.id); // jangan tinggalkan akun login tanpa data
      gagal.push(`${s.nama}: ${pesanDb(eDaftar)}`);
      continue;
    }
    akun.push({ nama: s.nama, nisn: s.nisn!, jenis, sandi });
  }

  revalidatePath("/admin/akun-portal");
  const sisa = tugas.length - dikerjakan.length;
  const pesan = [
    `${akun.length} akun dibuat.`,
    gagal.length ? `Gagal: ${gagal.join("; ")}.` : "",
    sisa ? `Masih ada ${sisa} akun lagi — tekan Buat akun sekali lagi.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { ok: akun.length > 0, pesan, akun, kelas: k?.nama ?? "" };
}

export async function aturUlangSandiPortal(_p: HasilAkun, form: FormData): Promise<HasilAkun> {
  const ctx = await aksesAksi("akun_portal.kelola");
  if (!ctx) return TANPA_AKSES;
  if (!kunciAdminTersedia) return { ok: false, pesan: "Fitur ini butuh kunci rahasia Supabase di server." };
  const siswaId = uuid.safeParse(String(form.get("siswa_id")));
  const jenis = String(form.get("jenis")) === "orang_tua" ? "orang_tua" : "siswa";
  if (!siswaId.success) return { ok: false, pesan: "Siswa tidak valid." };

  const { data: s } = await ctx.supabase.from("siswa").select("nama, nisn").eq("id", siswaId.data).maybeSingle();
  if (!s) return { ok: false, pesan: "Siswa tidak ditemukan." };
  const { data: userId, error: eUser } = await ctx.supabase.rpc("akun_portal_siswa", { p_siswa: siswaId.data, p_jenis: jenis });
  if (eUser) return { ok: false, pesan: eUser.code === "42501" ? "Akun ini bukan akun portal. Atur dari menu Pengguna & Peran." : pesanDb(eUser) };
  if (!userId) return { ok: false, pesan: "Akun belum dibuat." };
  const sandi = sandiAcak();
  const { error } = await supabaseAdminAuth().updateUserById(userId as string, { password: sandi });
  if (error) return { ok: false, pesan: "Gagal mengatur ulang kata sandi." };
  return { ok: true, pesan: "Kata sandi baru dibuat.", akun: [{ nama: s.nama, nisn: s.nisn ?? "", jenis, sandi }] };
}
