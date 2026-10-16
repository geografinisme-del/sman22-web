"use server";

import { lanjutAman } from "@/lib/portal-digital";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { pesanError } from "@/lib/admin/schema";
import { kirimSegera } from "@/lib/notif/kirim";
import { kirimTautanSandi } from "@/lib/admin/reset-sandi";
import { DOMAIN_PORTAL } from "@/lib/portal";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import type { HasilAksi } from "./actions";

/* =====================================================================
   Keamanan akun: verifikasi dua langkah (TOTP), ganti sandi,
   lupa sandi lewat email, keluar dari semua perangkat.
   Semua tindakan dicatat di Log Aktivitas & diberitahukan ke pemilik akun.
   ===================================================================== */

const sandiKuat = z
  .string()
  .min(10, "Minimal 10 karakter")
  .max(72, "Maksimal 72 karakter")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Harus berisi huruf dan angka");
const kodeOtp = z.string().trim().regex(/^\d{6}$/, "Kode 6 angka dari aplikasi autentikator");

async function catat(supabase: Awaited<ReturnType<typeof supabaseServer>>, peristiwa: string, ket: Record<string, unknown> = {}) {
  const { error } = await supabase.rpc("catat_keamanan", { p_peristiwa: peristiwa, p_keterangan: ket });
  if (error) console.error("[keamanan] catat:", error.message);
  kirimSegera();
}

/** Alamat situs untuk tautan di email (SITUS_URL di Vercel; jatuh ke host permintaan) */
async function alamatSitus() {
  const env = process.env.SITUS_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/* ---------------------------- MFA (TOTP) ---------------------------- */

export type HasilDaftarMfa = { ok: boolean; pesan: string; factorId?: string; qr?: string; rahasia?: string };

/** Mulai pendaftaran aplikasi autentikator: buat faktor baru, kembalikan QR & kunci rahasia */
export async function mulaiDaftarMfa(): Promise<HasilDaftarMfa> {
  if (!supabaseAktif) return { ok: false, pesan: "Database belum disambungkan." };
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, pesan: "Sesi berakhir. Silakan masuk ulang." };
  // bersihkan pendaftaran lama yang tidak diselesaikan
  const { data: f } = await supabase.auth.mfa.listFactors();
  for (const x of f?.all ?? []) if (x.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: x.id });
  const jumlah = f?.totp.length ?? 0;
  if (jumlah >= 5) return { ok: false, pesan: "Maksimal 5 aplikasi autentikator. Hapus salah satu dulu." };
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Autentikator ${jumlah + 1} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    issuer: "SMAN 22 Bandung",
  });
  if (error || !data) {
    console.error("[mfa] enroll:", error?.message);
    return { ok: false, pesan: "Gagal memulai pendaftaran. Coba lagi." };
  }
  const qr = data.totp.qr_code.startsWith("data:") ? data.totp.qr_code : `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`;
  return { ok: true, pesan: "", factorId: data.id, qr, rahasia: data.totp.secret };
}

/** Verifikasi kode 6 angka. Dipakai saat mendaftar (baru=1) maupun saat masuk. */
export async function verifikasiMfa(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Database belum disambungkan." };
  const factorId = z.string().uuid().safeParse(String(form.get("factor_id") ?? ""));
  const kode = kodeOtp.safeParse(String(form.get("kode") ?? "").replace(/\s/g, ""));
  if (!factorId.success) return { ok: false, pesan: "Aplikasi autentikator tidak dikenali. Muat ulang halaman." };
  if (!kode.success) return { ok: false, pesan: kode.error.issues[0].message, errors: { kode: kode.error.issues[0].message } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: kode.data });
  if (error) {
    console.error("[mfa] verify:", error.status, error.message);
    const pesan = error.status === 429 ? "Terlalu banyak percobaan. Tunggu sebentar." : "Kode salah atau sudah kedaluwarsa. Periksa jam di HP Anda lalu coba kode terbaru.";
    return { ok: false, pesan, errors: { kode: "Kode tidak cocok" } };
  }
  if (form.get("baru") === "1") await catat(supabase, "mfa_aktif");
  redirect(lanjutAman(form.get("lanjut")) ?? "/admin/mulai");
}

export async function hapusFaktorMfa(form: FormData) {
  const ctx = await getAkses();
  if (!ctx.supabase || !ctx.user || !ctx.akses) redirect("/admin/login");
  const id = z.string().uuid().safeParse(String(form.get("factor_id")));
  if (!id.success) redirect("/admin/keamanan?pesan=gagal");
  const { data: f } = await ctx.supabase.auth.mfa.listFactors();
  const terverifikasi = (f?.totp ?? []).filter((x) => x.status === "verified");
  // peran wajib MFA: jangan hapus aplikasi terakhir
  const { data: wajib } = await ctx.supabase.from("peran").select("kode").eq("wajib_mfa", true);
  const butuh = ctx.akses.peran.some((p) => (wajib ?? []).some((w) => w.kode === p));
  if (butuh && terverifikasi.length <= 1) redirect("/admin/keamanan?pesan=mfa-terakhir");
  const { error } = await ctx.supabase.auth.mfa.unenroll({ factorId: id.data });
  if (error) {
    console.error("[mfa] unenroll:", error.message);
    redirect("/admin/keamanan?pesan=gagal");
  }
  await catat(ctx.supabase, "mfa_dihapus");
  revalidatePath("/admin/keamanan");
  redirect("/admin/keamanan?pesan=mfa-dihapus");
}

export async function aturWajibMfa(form: FormData) {
  const ctx = await aksesAksi("pengguna.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const peran = String(form.get("peran") ?? "");
  const { error } = await ctx.supabase.rpc("atur_wajib_mfa", { p_peran: peran, p_wajib: form.get("wajib") === "1" });
  if (error) console.error("[mfa] atur wajib:", error.message);
  revalidatePath("/admin/keamanan");
  redirect(`/admin/keamanan?pesan=${error ? "gagal" : "tersimpan"}#wajib-mfa`);
}

/* ---------------------------- Kata sandi ---------------------------- */

/** Ganti sandi sendiri (wajib isi sandi lama) */
export async function gantiSandiSendiri(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase, user } = await getAkses();
  if (!supabase || !user?.email) return { ok: false, pesan: "Sesi berakhir. Silakan masuk ulang." };
  const p = z
    .object({ lama: z.string().min(1, "Isi kata sandi lama"), baru: sandiKuat, ulang: z.string() })
    .refine((d) => d.baru === d.ulang, { path: ["ulang"], message: "Tidak sama dengan kata sandi baru" })
    .refine((d) => d.baru !== d.lama, { path: ["baru"], message: "Harus berbeda dari kata sandi lama" })
    .safeParse({ lama: String(form.get("lama") ?? ""), baru: String(form.get("baru") ?? ""), ulang: String(form.get("ulang") ?? "") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };

  // periksa sandi lama dengan klien terpisah (tidak mengganggu sesi & cookie yang sedang dipakai)
  const uji = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: salah } = await uji.auth.signInWithPassword({ email: user.email, password: p.data.lama });
  if (salah) return { ok: false, pesan: salah.status === 429 ? "Terlalu banyak percobaan. Tunggu beberapa menit." : "Kata sandi lama salah.", errors: { lama: "Salah" } };
  await uji.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: p.data.baru });
  if (error) {
    console.error("[sandi] ganti:", error.code, error.message);
    if (error.code === "same_password") return { ok: false, pesan: "Harus berbeda dari kata sandi lama.", errors: { baru: "Sama dengan yang lama" } };
    if (error.code === "insufficient_aal") return { ok: false, pesan: "Verifikasi dua langkah dulu (keluar lalu masuk ulang), kemudian ganti sandi." };
    return { ok: false, pesan: "Gagal mengganti kata sandi." };
  }
  await catat(supabase, "sandi_diubah");
  return { ok: true, pesan: "Kata sandi diganti. Gunakan sandi baru saat masuk berikutnya." };
}

/** Lupa sandi: kirim tautan ke email staf. Jawaban selalu sama (tidak membocorkan email terdaftar). */
export async function mintaResetSandi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Database belum disambungkan." };
  const email = z.string().trim().toLowerCase().email("Format email tidak valid").safeParse(String(form.get("email") ?? ""));
  if (!email.success) return { ok: false, pesan: "Periksa email.", errors: { email: email.error.issues[0].message } };
  const umum: HasilAksi = {
    ok: true,
    pesan: "Bila email tersebut terdaftar sebagai akun guru/staf, tautan atur ulang sudah dikirim. Periksa kotak masuk & folder spam (berlaku 1 jam).",
  };
  // akun portal siswa/ortu memakai email buatan — sandinya diatur ulang oleh wali kelas/operator
  if (email.data.endsWith(`@${DOMAIN_PORTAL}`)) return umum;
  const lewat = await kirimTautanSandi(email.data);
  if (lewat === "dibatasi") return { ok: false, pesan: "Terlalu banyak permintaan untuk email ini. Tunggu 15 menit lalu coba lagi." };
  if (lewat === "lewat_supabase") {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${await alamatSitus()}/auth/callback?lanjut=/admin/sandi-baru`,
    });
    if (error) {
      console.error("[sandi] lupa:", error.status, error.message);
      if (error.status === 429) return { ok: false, pesan: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi." };
    }
  }
  return umum;
}

/** Simpan sandi baru setelah membuka tautan dari email (sesi pemulihan) */
export async function simpanSandiBaru(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Database belum disambungkan." };
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, pesan: "Tautan sudah tidak berlaku. Minta tautan baru di halaman Lupa kata sandi." };
  const p = z
    .object({ baru: sandiKuat, ulang: z.string() })
    .refine((d) => d.baru === d.ulang, { path: ["ulang"], message: "Tidak sama dengan kata sandi baru" })
    .safeParse({ baru: String(form.get("baru") ?? ""), ulang: String(form.get("ulang") ?? "") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };

  // akun ber-MFA: Supabase mensyaratkan sesi AAL2 untuk mengganti sandi
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const kode = kodeOtp.safeParse(String(form.get("kode") ?? "").replace(/\s/g, ""));
    if (!kode.success) return { ok: false, pesan: "Masukkan kode dari aplikasi autentikator.", errors: { kode: kode.error.issues[0].message } };
    const { data: f } = await supabase.auth.mfa.listFactors();
    const faktor = (f?.totp ?? []).find((x) => x.status === "verified");
    if (!faktor) return { ok: false, pesan: "Aplikasi autentikator tidak ditemukan. Hubungi super admin." };
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: faktor.id, code: kode.data });
    if (error) return { ok: false, pesan: "Kode autentikator salah.", errors: { kode: "Kode tidak cocok" } };
  }
  const { error } = await supabase.auth.updateUser({ password: p.data.baru });
  if (error) {
    console.error("[sandi] baru:", error.code, error.message);
    if (error.code === "same_password") return { ok: false, pesan: "Harus berbeda dari kata sandi lama.", errors: { baru: "Sama dengan yang lama" } };
    return { ok: false, pesan: "Gagal menyimpan kata sandi. Minta tautan baru." };
  }
  await catat(supabase, "sandi_lupa");
  // akhiri sesi lain (mis. yang mungkin dipakai orang lain), sesi ini tetap
  await supabase.auth.signOut({ scope: "others" });
  redirect("/admin?pesan=sandi-baru");
}

/** Keluar dari semua perangkat (semua sesi, termasuk yang ini) */
export async function keluarSemuaPerangkat() {
  const { supabase, user } = await getAkses();
  if (!supabase || !user) redirect("/admin/login");
  await catat(supabase, "keluar_semua");
  await supabase.auth.signOut({ scope: "global" });
  redirect("/admin/login?pesan=keluar-semua");
}
