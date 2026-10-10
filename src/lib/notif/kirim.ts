import "server-only";
import { after } from "next/server";
import { sekolah } from "@/content/sekolah";
import { kunciAdminTersedia, supabaseLayanan } from "@/lib/supabase/admin";

/**
 * Pekerja pengirim notifikasi WhatsApp (Fonnte) & email (Resend).
 * Antrian dibuat oleh database (lihat migrasi notifikasi); fungsi ini hanya mengirim.
 * Tanpa kunci kanal, pesan ditandai "dilewati" dan tetap tampil di aplikasi.
 */
type Antrian = { id: number; kanal: "email" | "whatsapp"; tujuan: string; judul: string; isi: string; tautan: string; percobaan: number };

const FONNTE_URL = process.env.FONNTE_URL || "https://api.fonnte.com/send";
const RESEND_URL = process.env.RESEND_URL || "https://api.resend.com/emails";
export const kanalAktif = () => ({ whatsapp: Boolean(process.env.FONNTE_TOKEN), email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_PENGIRIM) });

const situs = () => (process.env.SITUS_URL || sekolah.urlSitus).replace(/\/$/, "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function kirimWa(a: Antrian) {
  const tautan = a.tautan ? `\n\n${situs()}${a.tautan}` : "";
  const body = new FormData();
  body.set("target", a.tujuan);
  body.set("message", `*${a.judul}*\n${a.isi}${tautan}\n\n— ${sekolah.namaPendek} (pesan otomatis, mohon tidak dibalas)`);
  body.set("countryCode", "62");
  const r = await fetch(FONNTE_URL, { method: "POST", headers: { Authorization: process.env.FONNTE_TOKEN! }, body, signal: AbortSignal.timeout(10000) });
  const j = (await r.json().catch(() => ({}))) as { status?: boolean; Status?: boolean; reason?: string };
  if (!r.ok || !(j.status ?? j.Status)) throw new Error(j.reason || `HTTP ${r.status}`);
}

async function kirimEmail(a: Antrian) {
  const url = a.tautan ? `${situs()}${a.tautan}` : situs();
  const r = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_PENGIRIM,
      to: [a.tujuan],
      subject: `[${sekolah.namaPendek}] ${a.judul}`,
      text: `${a.judul}\n\n${a.isi}\n\nBuka: ${url}\n\n— ${sekolah.nama} (pesan otomatis)`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><h2 style="margin:0 0 8px">${esc(a.judul)}</h2><p>${esc(a.isi)}</p><p><a href="${esc(url)}" style="display:inline-block;background:#121831;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Buka</a></p><p style="color:#888;font-size:12px">${esc(sekolah.nama)} — pesan otomatis. Atur notifikasi di menu Notifikasi.</p></div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}`);
}

/** Kirim satu email langsung (tidak lewat antrian/DB) — untuk tautan rahasia seperti atur ulang sandi */
export async function kirimEmailLangsung(m: { ke: string; judul: string; isi: string; url: string; tombol: string; catatan: string }) {
  const r = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_PENGIRIM,
      to: [m.ke],
      subject: `[${sekolah.namaPendek}] ${m.judul}`,
      text: `${m.judul}\n\n${m.isi}\n\n${m.tombol}: ${m.url}\n\n${m.catatan}\n\n— ${sekolah.nama}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><h2 style="margin:0 0 8px">${esc(m.judul)}</h2><p>${esc(m.isi)}</p><p><a href="${esc(m.url)}" style="display:inline-block;background:#121831;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${esc(m.tombol)}</a></p><p style="color:#888;font-size:12px">${esc(m.catatan)}<br>${esc(sekolah.nama)}</p></div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export const alamatSitus = situs;

export async function prosesAntrian(jumlah = 20) {
  const hasil = { terkirim: 0, gagal: 0, dilewati: 0 };
  if (!kunciAdminTersedia) return hasil;
  const db = supabaseLayanan();
  const { data, error } = await db.rpc("ambil_antrian", { p_jumlah: jumlah });
  if (error) {
    console.error("[notif] ambil antrian:", error.message);
    return hasil;
  }
  const aktif = kanalAktif();
  for (const a of (data ?? []) as Antrian[]) {
    if (!aktif[a.kanal]) {
      await db.from("antrian_kirim").update({ status: "dilewati", galat: `${a.kanal === "whatsapp" ? "WhatsApp" : "Email"} belum diatur` }).eq("id", a.id);
      hasil.dilewati++;
      continue;
    }
    try {
      if (a.kanal === "whatsapp") await kirimWa(a);
      else await kirimEmail(a);
      await db.from("antrian_kirim").update({ status: "terkirim", dikirim_pada: new Date().toISOString(), galat: "" }).eq("id", a.id);
      hasil.terkirim++;
    } catch (e) {
      const ulang = a.percobaan < 3;
      await db
        .from("antrian_kirim")
        .update({
          status: ulang ? "menunggu" : "gagal",
          galat: String((e as Error).message).slice(0, 300),
          tunda_sampai: new Date(Date.now() + a.percobaan * 5 * 60000).toISOString(),
        })
        .eq("id", a.id);
      hasil.gagal++;
    }
  }
  return hasil;
}

/** Kirim antrian sesaat SETELAH respons dikirim ke pengguna (tidak memperlambat halaman) */
export function kirimSegera() {
  if (!kunciAdminTersedia) return;
  after(async () => {
    try {
      await prosesAntrian(15);
    } catch (e) {
      console.error("[notif]", e);
    }
  });
}
