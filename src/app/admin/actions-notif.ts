"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aksesAksi } from "@/lib/admin/auth";
import { kirimSegera, prosesAntrian } from "@/lib/notif/kirim";
import { KATEGORI_NOTIF } from "@/lib/notif/kategori";
import type { HasilAksi } from "./actions";

export async function tandaiSemuaDibaca(form: FormData) {
  const ctx = await aksesAksi();
  if (!ctx) redirect("/admin/login");
  await ctx.supabase.rpc("tandai_dibaca", { p_id: null });
  const kembali = String(form.get("kembali") ?? "") === "/portal/notifikasi" ? "/portal/notifikasi" : "/admin/notifikasi";
  revalidatePath(kembali);
  redirect(kembali);
}

export async function simpanPreferensi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return { ok: false, pesan: "Sesi berakhir. Silakan masuk ulang." };
  const mentah = String(form.get("nomor_wa") ?? "").replace(/\D/g, "");
  const nomor = mentah.startsWith("0") ? "62" + mentah.slice(1) : mentah.startsWith("8") ? "62" + mentah : mentah;
  if (nomor && !/^62\d{8,13}$/.test(nomor)) return { ok: false, pesan: "Nomor WhatsApp tidak valid.", errors: { nomor_wa: "Contoh: 0812xxxxxxx" } };
  const mati = form.getAll("mati").map(String).filter((k) => k in KATEGORI_NOTIF);
  const isi = { user_id: ctx.akses.userId, email: form.get("email") === "on", whatsapp: form.get("whatsapp") === "on", nomor_wa: nomor, kategori_mati: mati, updated_at: new Date().toISOString() };
  const { error } = await ctx.supabase.from("preferensi_notifikasi").upsert(isi);
  if (error) return { ok: false, pesan: "Gagal menyimpan pengaturan." };
  return { ok: true, pesan: "Pengaturan notifikasi tersimpan." };
}

export async function kirimTes(_p: HasilAksi): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return { ok: false, pesan: "Sesi berakhir." };
  const { error } = await ctx.supabase.rpc("notif_tes");
  if (error) return { ok: false, pesan: "Gagal membuat notifikasi tes." };
  kirimSegera();
  return { ok: true, pesan: "Notifikasi tes dibuat. Periksa lonceng, WhatsApp, dan email Anda dalam 1 menit." };
}

export async function prosesSekarang(_p: HasilAksi): Promise<HasilAksi> {
  const ctx = await aksesAksi("pengguna.kelola");
  if (!ctx) return { ok: false, pesan: "Tidak berhak." };
  const h = await prosesAntrian(50);
  revalidatePath("/admin/notifikasi/kanal");
  return { ok: true, pesan: `Terkirim ${h.terkirim}, gagal ${h.gagal}, dilewati ${h.dilewati}.` };
}

