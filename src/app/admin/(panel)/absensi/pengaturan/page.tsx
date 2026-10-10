import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { hariIniWIB } from "@/lib/admin/absensi";
import { formatTanggal } from "@/lib/format";
import { hapusHariLibur } from "../../../actions-absensi";
import { FormLibur, FormPengaturan } from "./FormPengaturan";

export const metadata = { title: "Pengaturan Absensi" };

export default async function PengaturanAbsensi({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("absensi.atur");
  const [{ data: atur }, { data: ta }, { data: libur }] = await Promise.all([
    supabase.from("pengaturan_absensi").select("*").eq("id", 1).single(),
    supabase.from("tahun_ajaran").select("nama, mulai_hitung_absensi").eq("aktif", true).maybeSingle(),
    supabase.from("hari_libur").select("tanggal, keterangan").gte("tanggal", hariIniWIB().slice(0, 4) + "-01-01").order("tanggal"),
  ]);
  const j = (t?: string) => (t ?? "").slice(0, 5);
  return (
    <>
      <JudulHalaman judul="Pengaturan Absensi" />
      <Notifikasi kode={sp.pesan} />
      <Kartu className="mb-6">
        <FormPengaturan
          namaTa={ta?.nama ?? null}
          data={{
            jam_masuk_batas: j(atur?.jam_masuk_batas),
            jam_pulang_mulai: j(atur?.jam_pulang_mulai),
            jam_pulang_selesai: j(atur?.jam_pulang_selesai),
            hari_sekolah: atur?.hari_sekolah ?? [1, 2, 3, 4, 5],
            mulai_hitung: ta?.mulai_hitung_absensi ?? "",
          }}
        />
      </Kartu>
      <Kartu>
        <h2 className="mb-4 font-serif text-2xl">Hari libur</h2>
        <FormLibur />
        <ul className="mt-6 divide-y divide-black/5">
          {!libur?.length && <li className="py-3 text-sm text-black/50">Belum ada hari libur tahun ini.</li>}
          {libur?.map((l) => (
            <li key={l.tanggal} className="flex items-center justify-between py-2 text-sm">
              <span><strong>{formatTanggal(l.tanggal, { weekday: "short" })}</strong> · {l.keterangan}</span>
              <form action={hapusHariLibur}>
                <input type="hidden" name="tanggal" value={l.tanggal} />
                <button className="text-merah hover:underline">Hapus</button>
              </form>
            </li>
          ))}
        </ul>
      </Kartu>
    </>
  );
}
