"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aksesAksi } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import { kegiatanSchema } from "@/lib/kalender";
import { kirimSegera } from "@/lib/notif/kirim";
import type { HasilAksi } from "./actions";

const segarkan = () => {
  revalidatePath("/admin/kalender");
  revalidatePath("/portal/kalender");
  revalidatePath("/agenda");
  revalidatePath("/kalender.ics");
  revalidatePath("/");
};

export async function simpanKegiatan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("kalender.kelola");
  if (!ctx) return { ok: false, pesan: "Anda tidak berhak mengelola kalender." };
  const id = String(form.get("id") ?? "");
  const p = kegiatanSchema.safeParse({
    ...Object.fromEntries(["judul", "jenis", "mulai", "selesai", "jam_mulai", "jam_selesai", "lokasi", "keterangan", "sasaran"].map((k) => [k, String(form.get(k) ?? "")])),
    kbm_libur: form.get("kbm_libur") === "on",
  });
  if (!p.success) return { ok: false, pesan: "Periksa isian yang ditandai.", errors: pesanError(p.error) };
  const baris = { ...p.data, kbm_libur: p.data.kbm_libur || p.data.jenis === "libur" };
  const { error } =
    id && uuid.safeParse(id).success
      ? await ctx.supabase.from("kegiatan_kalender").update(baris).eq("id", id)
      : await ctx.supabase.from("kegiatan_kalender").insert(baris);
  if (error) {
    console.error("[kalender] simpan:", error.code, error.message);
    return { ok: false, pesan: error.code === "23514" ? "Rentang tanggal/jam tidak valid." : "Gagal menyimpan kegiatan." };
  }
  kirimSegera();
  segarkan();
  redirect(`/admin/kalender?bulan=${baris.mulai.slice(0, 7)}&pesan=tersimpan`);
}

export async function hapusKegiatan(form: FormData) {
  const ctx = await aksesAksi("kalender.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const bulan = String(form.get("bulan") ?? "").match(/^\d{4}-\d{2}$/)?.[0] ?? "";
  if (id.success) {
    const { error } = await ctx.supabase.from("kegiatan_kalender").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
    if (error) console.error("[kalender] hapus:", error.message);
  }
  segarkan();
  redirect(`/admin/kalender?${bulan ? `bulan=${bulan}&` : ""}pesan=diarsipkan`);
}
