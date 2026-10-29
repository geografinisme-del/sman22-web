import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKontakMedia, type DataMedia } from "@/components/humas/Form";
import { arsipKontakMedia } from "@/app/admin/actions-humas";
import { punya, wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { JENIS_MEDIA } from "@/lib/humas";

export const metadata = { title: "Kontak Media" };

export default async function KontakMedia({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibBoleh(BOLEH.dataHumas);
  // kepala sekolah (humas.lihat): hanya melihat, tanpa formulir ubah/arsip
  const kelola = punya(akses, "humas.kelola");
  const { data } = await supabase.from("kontak_media").select("id, nama, media, jenis, telepon, email, catatan").is("deleted_at", null).order("media").order("nama");
  const list = (data ?? []) as DataMedia[];
  const ubah = kelola ? list.find((m) => m.id === sp.ubah) : undefined;
  return (
    <>
      <JudulHalaman judul="Kontak Media" deskripsi="Daftar wartawan & media untuk rilis berita sekolah. Data internal humas — tidak ditampilkan di website." />
      <Notifikasi kode={sp.pesan} />
      <div className={kelola ? "grid gap-6 xl:grid-cols-[1fr_420px]" : "grid gap-6"}>
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Media</th><th className="px-4 py-2">Kontak</th><th /></tr></thead>
            <tbody>
              {list.length === 0 ? <tr><td colSpan={4} className="px-4 py-4 text-center text-black/50">Belum ada kontak.</td></tr> : list.map((m) => (
                <tr key={m.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-2 font-medium">{m.nama}{m.catatan && <p className="text-xs font-normal text-black/50">{m.catatan}</p>}</td>
                  <td className="px-4 py-2">{m.media}<p className="text-xs text-black/50">{JENIS_MEDIA[m.jenis as keyof typeof JENIS_MEDIA]}</p></td>
                  <td className="px-4 py-2">{m.telepon}{m.email && <p><a href={`mailto:${m.email}`} className="text-blue-teks underline">{m.email}</a></p>}</td>
                  <td className="px-4 py-2 text-right">{kelola && (<><a href={`?ubah=${m.id}`} className="text-xs font-semibold underline">Ubah</a>
                    <form action={arsipKontakMedia} className="inline"><input type="hidden" name="id" value={m.id} /><button className="ml-3 text-xs font-semibold text-blue-teks underline">Arsipkan</button></form></>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {kelola && <Kartu className="self-start"><h2 className="mb-4 text-2xl">{ubah ? "Ubah kontak" : "Tambah kontak"}</h2><FormKontakMedia key={ubah?.id ?? "baru"} d={ubah} />{ubah && <a href="?" className="mt-3 inline-block text-sm underline">Batal</a>}</Kartu>}
      </div>
    </>
  );
}
