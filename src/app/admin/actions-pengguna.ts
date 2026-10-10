"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { pesanError } from "@/lib/admin/schema";
import { kunciAdminTersedia, supabaseAdminAuth } from "@/lib/supabase/admin";
import { kirimSegera } from "@/lib/notif/kirim";
import { DOMAIN_PORTAL } from "@/lib/portal";
import { supabaseServer } from "@/lib/supabase/server";
import { kirimTautanSandi } from "@/lib/admin/reset-sandi";
import type { HasilAksi } from "./actions";

// kode peran dicek oleh database (foreign key ke tabel peran) — daftar di layar diambil dari tabel tsb
const kodePeran = z.string().regex(/^[a-z_]{2,30}$/);
const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak mengelola pengguna." };

const sandi = z
  .string()
  .min(10, "Kata sandi minimal 10 karakter")
  .max(72)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Kata sandi harus berisi huruf dan angka");

const buatSchema = z.object({
  nama: z.string().trim().min(2, "Nama wajib diisi").max(120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string(),
  peran: z.array(kodePeran).min(1, "Pilih minimal satu peran"),
  pegawai_id: z.union([z.literal(""), z.string().uuid()]),
});

export async function buatAkun(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("pengguna.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = buatSchema.safeParse({
    nama: String(form.get("nama") ?? ""),
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    peran: form.getAll("peran").map(String),
    pegawai_id: String(form.get("pegawai_id") ?? ""),
  });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const d = parsed.data;
  if (d.peran.includes("super_admin") && !ctx.akses.peran.includes("super_admin")) {
    return { ok: false, pesan: "Hanya super admin yang dapat memberi peran super admin.", errors: { peran: "Tidak diizinkan" } };
  }

  let userId: string | null = null;
  let dibuatDiSini = false;
  if (kunciAdminTersedia) {
    const cek = sandi.safeParse(d.password);
    if (!cek.success) return { ok: false, pesan: "Kata sandi belum memenuhi syarat.", errors: { password: cek.error.issues[0].message } };
    const { data, error } = await supabaseAdminAuth().createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { nama: d.nama },
    });
    if (error) {
      console.error("[pengguna] gagal membuat akun:", error.message);
      const ada = /already|exists|registered/i.test(error.message);
      return { ok: false, pesan: ada ? "Email ini sudah punya akun. Gunakan email lain." : "Akun gagal dibuat.", errors: ada ? { email: "Sudah terdaftar" } : undefined };
    }
    userId = data.user.id;
    dibuatDiSini = true;
  } else {
    const { data, error } = await ctx.supabase.rpc("cari_akun", { email_dicari: d.email });
    if (error || !data) {
      return {
        ok: false,
        pesan: "Akun dengan email ini belum ada. Buat dulu di Supabase → Authentication → Users → Add user, lalu ulangi.",
        errors: { email: "Belum ada di Supabase" },
      };
    }
    userId = data as string;
  }

  const batal = async (pesan: string): Promise<HasilAksi> => {
    if (dibuatDiSini && userId) await supabaseAdminAuth().deleteUser(userId).catch(() => {});
    return { ok: false, pesan };
  };

  const p = await ctx.supabase.from("pengguna").upsert({ user_id: userId, nama: d.nama, email: d.email, aktif: true }, { onConflict: "user_id" });
  if (p.error) return batal("Gagal menyimpan pengguna: " + p.error.message);
  const r = await ctx.supabase
    .from("pengguna_peran")
    .upsert(d.peran.map((peran) => ({ user_id: userId, peran, diberikan_oleh: ctx.akses.userId })), { onConflict: "user_id,peran", ignoreDuplicates: true });
  if (r.error) return batal("Gagal menyimpan peran: " + r.error.message);

  let catatan = "";
  if (d.pegawai_id) {
    const t = await ctx.supabase.from("pegawai").update({ user_id: userId }, { count: "exact" }).eq("id", d.pegawai_id).is("user_id", null);
    if (t.error || !t.count) catatan = " (Akun dibuat, tetapi belum tertaut ke data guru — tautkan lewat operator.)";
  }
  revalidatePath("/admin/pengguna");
  redirect(`/admin/pengguna/${userId}?pesan=tersimpan${catatan ? "&tautan=gagal" : ""}`);
}

const ubahSchema = z.object({
  user_id: z.string().uuid(),
  nama: z.string().trim().min(2, "Nama wajib diisi").max(120),
  aktif: z.boolean(),
  peran: z.array(kodePeran),
  pegawai_id: z.union([z.literal(""), z.string().uuid()]),
});

export async function ubahPengguna(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("pengguna.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = ubahSchema.safeParse({
    user_id: String(form.get("user_id") ?? ""),
    nama: String(form.get("nama") ?? ""),
    aktif: form.get("aktif") === "on",
    peran: form.getAll("peran").map(String),
    pegawai_id: String(form.get("pegawai_id") ?? ""),
  });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian.", errors: pesanError(parsed.error) };
  const d = parsed.data;
  if (d.user_id === ctx.akses.userId && !d.aktif) return { ok: false, pesan: "Anda tidak bisa menonaktifkan akun Anda sendiri." };

  const { data: lama } = await ctx.supabase.from("pengguna_peran").select("peran").eq("user_id", d.user_id);
  const sebelum = new Set((lama ?? []).map((x) => x.peran as string));
  const sesudah = new Set<string>(d.peran);
  const tambah = [...sesudah].filter((x) => !sebelum.has(x));
  const hapus = [...sebelum].filter((x) => !sesudah.has(x));

  const u = await ctx.supabase.from("pengguna").update({ nama: d.nama, aktif: d.aktif }).eq("user_id", d.user_id);
  if (u.error) return { ok: false, pesan: u.error.message.includes("super admin") ? u.error.message : "Gagal menyimpan pengguna." };
  if (tambah.length) {
    const t = await ctx.supabase.from("pengguna_peran").insert(tambah.map((peran) => ({ user_id: d.user_id, peran, diberikan_oleh: ctx.akses.userId })));
    if (t.error) return { ok: false, pesan: t.error.code === "42501" ? "Hanya super admin yang dapat memberi peran super admin." : "Gagal menambah peran." };
  }
  if (hapus.length) {
    const h = await ctx.supabase.from("pengguna_peran").delete().eq("user_id", d.user_id).in("peran", hapus);
    if (h.error) return { ok: false, pesan: /super admin/.test(h.error.message) ? h.error.message : "Gagal mencabut peran." };
  }

  // tautan ke data guru/pegawai
  const { data: kini } = await ctx.supabase.from("pegawai").select("id").eq("user_id", d.user_id).maybeSingle();
  if ((kini?.id ?? "") !== d.pegawai_id) {
    if (kini) await ctx.supabase.from("pegawai").update({ user_id: null }).eq("id", kini.id);
    if (d.pegawai_id) {
      const t = await ctx.supabase.from("pegawai").update({ user_id: d.user_id }, { count: "exact" }).eq("id", d.pegawai_id);
      if (t.error || !t.count) return { ok: false, pesan: "Peran tersimpan, tetapi tautan ke data guru gagal (butuh izin kelola data induk, atau guru sudah punya akun lain)." };
    }
  }

  if (kunciAdminTersedia) {
    // akun nonaktif juga diblokir dari login
    await supabaseAdminAuth().updateUserById(d.user_id, { ban_duration: d.aktif ? "none" : "876000h" }).catch(() => {});
  }
  if (!d.aktif) {
    // nonaktif = semua sesi login diakhiri (database juga langsung menahan semua izinnya)
    await ctx.supabase.rpc("cabut_sesi_pengguna", { p_user: d.user_id });
  }
  revalidatePath("/admin/pengguna");
  return { ok: true, pesan: "Perubahan pengguna tersimpan." };
}

export async function aturSandi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("pengguna.kelola");
  if (!ctx) return TANPA_AKSES;
  if (!kunciAdminTersedia) return { ok: false, pesan: "Fitur ini butuh kunci rahasia Supabase di server (lihat panduan)." };
  const id = z.string().uuid().safeParse(String(form.get("user_id")));
  const s = sandi.safeParse(String(form.get("password") ?? ""));
  if (!id.success) return { ok: false, pesan: "Pengguna tidak valid." };
  if (!s.success) return { ok: false, pesan: "Kata sandi belum memenuhi syarat.", errors: { password: s.error.issues[0].message } };
  const { data: target } = await ctx.supabase.from("pengguna_peran").select("peran").eq("user_id", id.data);
  if (target?.some((t) => t.peran === "super_admin") && !ctx.akses.peran.includes("super_admin")) {
    return { ok: false, pesan: "Hanya super admin yang dapat mengubah kata sandi super admin." };
  }
  const { error } = await supabaseAdminAuth().updateUserById(id.data, { password: s.data });
  if (error) return { ok: false, pesan: "Gagal mengubah kata sandi." };
  await ctx.supabase.rpc("catat_keamanan_pengguna", { p_user: id.data, p_peristiwa: "sandi_direset" });
  kirimSegera();
  return { ok: true, pesan: "Kata sandi baru tersimpan. Sampaikan ke pemilik akun secara langsung (jangan lewat grup)." };
}

/** Reset verifikasi dua langkah (HP hilang/ganti). Hanya super admin; tidak bisa untuk diri sendiri. */
export async function resetMfaPengguna(form: FormData) {
  const ctx = await aksesAksi("pengguna.kelola");
  const id = z.string().uuid().safeParse(String(form.get("user_id")));
  if (!ctx || !ctx.akses.peran.includes("super_admin") || !kunciAdminTersedia) redirect("/admin?pesan=tanpa-akses");
  if (!id.success || id.data === ctx.akses.userId) redirect("/admin/pengguna?pesan=gagal");
  const admin = supabaseAdminAuth();
  const { data, error } = await admin.mfa.listFactors({ userId: id.data });
  if (error) redirect(`/admin/pengguna/${id.data}?pesan=gagal`);
  for (const f of data?.factors ?? []) await admin.mfa.deleteFactor({ userId: id.data, id: f.id });
  // akhiri sesi lama yang mungkin sudah AAL2 di HP yang hilang
  await ctx.supabase.rpc("cabut_sesi_pengguna", { p_user: id.data });
  await ctx.supabase.rpc("catat_keamanan_pengguna", { p_user: id.data, p_peristiwa: "mfa_direset" });
  kirimSegera();
  revalidatePath(`/admin/pengguna/${id.data}`);
  redirect(`/admin/pengguna/${id.data}?pesan=mfa-direset`);
}

/** Kirim tautan atur ulang sandi ke email staf (tanpa admin mengetahui sandinya) */
export async function kirimTautanReset(form: FormData) {
  const ctx = await aksesAksi("pengguna.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = z.string().uuid().safeParse(String(form.get("user_id")));
  if (!id.success) redirect("/admin/pengguna?pesan=gagal");
  const { data: u } = await ctx.supabase.from("pengguna").select("email, pengguna_peran(peran)").eq("user_id", id.data).maybeSingle();
  const peran = ((u?.pengguna_peran ?? []) as { peran: string }[]).map((p) => p.peran);
  if (!u?.email || u.email.endsWith(`@${DOMAIN_PORTAL}`)) redirect(`/admin/pengguna/${id.data}?pesan=gagal`);
  if (peran.includes("super_admin") && !ctx.akses.peran.includes("super_admin")) redirect(`/admin/pengguna/${id.data}?pesan=gagal`);
  let error: { message: string } | null = null;
  const lewat = await kirimTautanSandi(u.email);
  if (lewat === "dibatasi") redirect(`/admin/pengguna/${id.data}?pesan=gagal`);
  if (lewat === "lewat_supabase") {
    const situs = process.env.SITUS_URL?.replace(/\/$/, "") ?? "";
    const supabase = await supabaseServer();
    ({ error } = await supabase.auth.resetPasswordForEmail(u.email, situs ? { redirectTo: `${situs}/auth/callback?lanjut=/admin/sandi-baru` } : undefined));
  }
  if (error) console.error("[pengguna] tautan reset:", error.message);
  else await ctx.supabase.rpc("catat_keamanan_pengguna", { p_user: id.data, p_peristiwa: "tautan_reset" });
  kirimSegera();
  redirect(`/admin/pengguna/${id.data}?pesan=${error ? "gagal" : "tautan-terkirim"}`);
}
