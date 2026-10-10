import { JudulHalaman, Kartu, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { kanalAktif } from "@/lib/notif/kirim";
import { formatWaktu } from "@/lib/format";
import { TombolProses } from "./Tombol";

export const metadata = { title: "WhatsApp & Email" };

export default async function StatusKanal() {
  const { supabase } = await wajibIzin("pengguna.kelola");
  const k = kanalAktif();
  const statusList = ["menunggu", "terkirim", "gagal", "dilewati"] as const;
  const [hitung, { data: terakhir }] = await Promise.all([
    Promise.all(statusList.map((s) => supabase.from("antrian_kirim").select("id", { count: "exact", head: true }).eq("status", s))),
    supabase.from("antrian_kirim").select("id, kanal, tujuan, judul, status, galat, dibuat_pada, dikirim_pada").order("dibuat_pada", { ascending: false }).limit(25),
  ]);
  const sensor = (t: string) => (t.includes("@") ? t.replace(/^(.).*(@.*)$/, "$1•••$2") : t.replace(/^(\d{4})\d+(\d{3})$/, "$1•••$2"));
  return (
    <>
      <JudulHalaman judul="WhatsApp & Email" deskripsi="Notifikasi selalu tampil di lonceng aplikasi. WhatsApp dan email dikirim bila kuncinya dipasang di Vercel (lihat panduan)." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Kartu>
          <p className="text-sm uppercase tracking-widest text-black/50">WhatsApp (Fonnte)</p>
          <p className={`mt-2 font-serif text-3xl ${k.whatsapp ? "text-emerald-700" : "text-black/40"}`}>{k.whatsapp ? "Aktif" : "Belum diatur"}</p>
          {!k.whatsapp && <p className="mt-1 text-sm text-black/60">Isi <code>FONNTE_TOKEN</code> di Vercel.</p>}
        </Kartu>
        <Kartu>
          <p className="text-sm uppercase tracking-widest text-black/50">Email (Resend)</p>
          <p className={`mt-2 font-serif text-3xl ${k.email ? "text-emerald-700" : "text-black/40"}`}>{k.email ? "Aktif" : "Belum diatur"}</p>
          {!k.email && <p className="mt-1 text-sm text-black/60">Isi <code>RESEND_API_KEY</code> dan <code>EMAIL_PENGIRIM</code>.</p>}
        </Kartu>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {statusList.map((s, i) => <span key={s} className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-black/10">{s}: <strong>{hitung[i].count ?? 0}</strong></span>)}
        <TombolProses />
      </div>
      <h2 className="mb-3 mt-8 font-serif text-2xl">Pengiriman terakhir</h2>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead><tr><th className={kelasTh}>Waktu</th><th className={kelasTh}>Kanal</th><th className={kelasTh}>Tujuan</th><th className={kelasTh}>Judul</th><th className={kelasTh}>Status</th></tr></thead>
          <tbody>
            {!terakhir?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-black/50">Belum ada.</td></tr>}
            {terakhir?.map((a) => (
              <tr key={a.id}>
                <td className={kelasTd}>{formatWaktu(a.dibuat_pada)}</td>
                <td className={kelasTd}>{a.kanal}</td>
                <td className={`${kelasTd} font-mono text-xs`}>{sensor(a.tujuan)}</td>
                <td className={kelasTd}>{a.judul}</td>
                <td className={kelasTd}>{a.status}{a.galat && <span className="block text-xs text-black/50">{a.galat}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
