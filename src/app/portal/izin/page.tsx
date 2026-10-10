import { redirect } from "next/navigation";
import { Notifikasi } from "@/components/admin/ui";
import { hariIniWIB } from "@/lib/admin/absensi";
import { formatTanggal } from "@/lib/format";
import { batalkanIzin } from "../../admin/actions-portal";
import { konteksPortal } from "../data";
import { FormIzin } from "./FormIzin";

export const metadata = { title: "Izin / Sakit" };

const STATUS: Record<string, string> = {
  menunggu: "bg-amber-100 text-amber-900",
  diterima: "bg-emerald-100 text-emerald-900",
  ditolak: "bg-red-100 text-red-800",
  dibatalkan: "bg-black/5 text-black/50",
};

export default async function IzinPortal({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, anak, ortu } = await konteksPortal();
  if (!ortu) redirect("/portal");
  const { data } = await supabase
    .from("izin_ortu")
    .select("id, siswa_id, jenis, tanggal_mulai, tanggal_selesai, alasan, status, catatan, diajukan_pada")
    .order("diajukan_pada", { ascending: false })
    .limit(30);
  const namaAnak = new Map(anak.map((a) => [a.id, a.nama]));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <h1 className="font-serif text-3xl">Kirim pemberitahuan sakit / izin</h1>
        <p className="mt-1 text-sm text-black/60">
          Wali kelas akan memeriksa. Setelah diterima, absensi anak otomatis tercatat Sakit/Izin — tidak perlu surat kertas.
          Bisa dikirim paling lambat 3 hari setelah tanggalnya.
        </p>
        {anak.length === 0 ? (
          <p className="mt-4 text-sm text-black/60">Akun belum terhubung dengan data siswa.</p>
        ) : (
          <FormIzin anak={anak.map((a) => ({ id: a.id, nama: a.nama }))} hariIni={hariIniWIB()} />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl">Riwayat</h2>
        <Notifikasi kode={sp.pesan} />
        {!data?.length ? (
          <p className="text-sm text-black/50">Belum ada pemberitahuan.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((z) => (
              <li key={z.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {z.jenis === "S" ? "Sakit" : "Izin"} · {formatTanggal(z.tanggal_mulai, { weekday: "short" })}
                      {z.tanggal_selesai !== z.tanggal_mulai && <> – {formatTanggal(z.tanggal_selesai, { weekday: "short" })}</>}
                    </p>
                    {anak.length > 1 && <p className="text-sm text-black/60">{namaAnak.get(z.siswa_id)}</p>}
                    <p className="mt-1 text-sm text-black/70">{z.alasan}</p>
                    {z.catatan && <p className="mt-1 text-sm text-black/60">Catatan sekolah: {z.catatan}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS[z.status] ?? ""}`}>{z.status}</span>
                </div>
                {z.status === "menunggu" && (
                  <form action={batalkanIzin} className="mt-3">
                    <input type="hidden" name="id" value={z.id} />
                    <button className="text-sm text-merah underline">Batalkan</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
