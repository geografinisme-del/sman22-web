import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormTamu } from "@/components/humas/Form";
import { tamuKeluar } from "@/app/admin/actions-humas";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { daftarStaf } from "@/lib/admin/nama";

export const metadata = { title: "Buku Tamu" };
type T = { id: string; nama: string; instansi: string; telepon: string; keperluan: string; bertemu_id: string | null; jumlah: number; masuk: string; keluar: string | null };
const jam = (s: string) => new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function BukuTamu({ searchParams }: { searchParams: Promise<{ pesan?: string; tgl?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const catat = punya(akses, "tamu.catat");
  const lihatSemua = catat || punya(akses, "humas.kelola");
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!lihatSemua && !saya) redirect("/admin?pesan=tanpa-akses");
  const hari = /^\d{4}-\d{2}-\d{2}$/.test(sp.tgl ?? "") ? sp.tgl! : hariIniWIB();
  const [{ data }, guru] = await Promise.all([
    supabase.from("buku_tamu").select("id, nama, instansi, telepon, keperluan, bertemu_id, jumlah, masuk, keluar")
      .gte("masuk", `${hari}T00:00:00+07:00`).lt("masuk", new Date(Date.parse(`${hari}T00:00:00+07:00`) + 864e5).toISOString()).order("masuk", { ascending: false }),
    daftarStaf(supabase),
  ]);
  const list = (data ?? []) as T[];
  const nama = new Map(guru.map((g) => [g.id, g.nama]));
  return (
    <>
      <JudulHalaman judul="Buku Tamu" deskripsi={lihatSemua ? "Catat tamu di pos/TU. Guru yang dituju langsung mendapat notifikasi." : "Tamu yang ingin bertemu Anda."} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div>
          <form className="mb-4 flex items-end gap-2 text-sm">
            <label className="flex flex-col gap-1"><span className="font-semibold">Tanggal</span><input type="date" name="tgl" defaultValue={hari} className="rounded-xl border border-black/15 px-3 py-2" /></label>
            <button className="rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Tampilkan</button>
          </form>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="bg-krem text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Masuk</th><th className="px-4 py-2">Tamu</th><th className="px-4 py-2">Keperluan</th><th className="px-4 py-2">Bertemu</th><th className="px-4 py-2">Keluar</th></tr></thead>
              <tbody>
                {list.length === 0 ? <tr><td colSpan={5} className="px-4 py-4 text-center text-black/50">Belum ada tamu pada tanggal ini.</td></tr> : list.map((t) => (
                  <tr key={t.id} className="border-t border-black/5">
                    <td className="px-4 py-2">{jam(t.masuk)}</td>
                    <td className="px-4 py-2"><span className="font-medium">{t.nama}</span>{t.jumlah > 1 && ` (+${t.jumlah - 1})`}<br /><span className="text-xs text-black/50">{[t.instansi, t.telepon].filter(Boolean).join(" · ")}</span></td>
                    <td className="px-4 py-2">{t.keperluan}</td>
                    <td className="px-4 py-2">{t.bertemu_id ? nama.get(t.bertemu_id) ?? "—" : "—"}</td>
                    <td className="px-4 py-2">{t.keluar ? jam(t.keluar) : (catat || t.bertemu_id === saya) ? (
                      <form action={tamuKeluar}><input type="hidden" name="id" value={t.id} /><button className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-black/15">Tandai keluar</button></form>
                    ) : <span className="text-amber-700">di sekolah</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {catat && <Kartu className="self-start"><h2 className="mb-4 font-serif text-2xl">Tamu datang</h2><FormTamu guru={guru} /></Kartu>}
      </div>
    </>
  );
}
