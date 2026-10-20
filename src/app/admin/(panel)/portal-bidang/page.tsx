import { FormAksi, Input, InputGambar, TombolSimpan } from "@/components/admin/form";
import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { BIDANG, type KunciBidang } from "@/lib/bidang";
import { PINTU } from "@/lib/portal-digital";
import { simpanPortalBidang } from "../../actions-buku";

export const metadata = { title: "Penanggung Jawab Portal" };

type Baris = { kunci: string; penanggung_jawab: string; foto_url: string };

export default async function AdminPortalBidang() {
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("portal_bidang").select("*");
  const per = new Map(((data ?? []) as Baris[]).map((b) => [b.kunci, b]));
  const bidang = PINTU.filter((p) => p.grup === "manajemen" || p.grup === "sistem").map((p) => p.bidang as KunciBidang);

  return (
    <>
      <JudulHalaman
        judul="Penanggung jawab Portal Digital 22"
        deskripsi="Nama dan foto (opsional, bulat) tampil di daftar ruang kerja manajemen. Tanpa foto, inisial bidang yang tampil."
      />
      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel portal_bidang belum tersedia. Jalankan migrasi <code>20261210000000_buku_tahunan.sql</code> terlebih dahulu.
        </p>
      )}
      <div className="grid gap-6">
        {bidang.map((k) => {
          const b = per.get(k);
          return (
            <Kartu key={k}>
              <h2 className="text-xl">{BIDANG[k].label}</h2>
              <p className="mb-4 mt-1 text-sm text-black/60">{BIDANG[k].keterangan}</p>
              <FormAksi aksi={simpanPortalBidang} className="grid gap-5 sm:grid-cols-2">
                <input type="hidden" name="kunci" value={k} />
                <Input label="Nama penanggung jawab" nama="penanggung_jawab" nilai={b?.penanggung_jawab ?? ""} maks={120} bantuan="Kosongkan bila belum ditetapkan." />
                <div>
                  <InputGambar label="Foto (opsional)" nama="foto" sekarang={b?.foto_url || undefined} />
                  {b?.foto_url && (
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" name="hapus_foto" className="h-4 w-4" /> Hapus foto saat ini
                    </label>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <TombolSimpan>Simpan</TombolSimpan>
                </div>
              </FormAksi>
            </Kartu>
          );
        })}
      </div>
    </>
  );
}
