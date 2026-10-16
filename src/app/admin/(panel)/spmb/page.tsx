import { Centang, FormAksi, Input, TextArea, TombolSimpan } from "@/components/admin/form";
import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { simpanSpmbInfo } from "../../actions-buku";

export const metadata = { title: "SPMB Beranda" };

type Langkah = { langkah: string; tanggal: string };

export default async function AdminSpmb() {
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("spmb_info").select("*").eq("id", 1).maybeSingle();
  const jadwal: Langkah[] = Array.isArray(data?.jadwal) ? (data.jadwal as Langkah[]) : [];

  return (
    <>
      <JudulHalaman
        judul="SPMB di beranda"
        deskripsi="Blok marun SPMB di beranda hanya tampil saat diaktifkan. Halaman /spmb tetap dikelola di Tampilan Website."
      />
      {(error || !data) && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel spmb_info belum tersedia. Jalankan migrasi <code>20261210000000_buku_tahunan.sql</code> terlebih dahulu.
        </p>
      )}
      <Kartu>
        <FormAksi aksi={simpanSpmbInfo} className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Centang label="Tampilkan blok SPMB di beranda" nama="aktif" nilai={data?.aktif ?? false} bantuan="Aktifkan hanya selama masa penerimaan berlangsung." />
          </div>
          <Input label="Tahun ajaran" nama="tahun" nilai={data?.tahun ?? ""} maks={20} placeholder="mis. 2027/2028" />
          <div />
          <div className="sm:col-span-2">
            <Input label="Judul" nama="judul" nilai={data?.judul ?? ""} maks={160} placeholder="mis. Penerimaan murid baru 2027/2028 telah dibuka" />
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Ringkasan" nama="ringkasan" nilai={data?.ringkasan ?? ""} baris={3} maks={400} />
          </div>

          <fieldset className="grid gap-4 rounded-xl border border-[#e3e5e8] p-4 sm:col-span-2 sm:grid-cols-[1fr_200px]">
            <legend className="px-1 font-semibold">Jadwal (maksimal 6 langkah, sesuai juknis resmi)</legend>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="contents">
                <Input label={`Langkah ${i + 1}`} nama={`langkah_${i}`} nilai={jadwal[i]?.langkah ?? ""} maks={80} />
                <Input label="Tanggal" nama={`tanggal_${i}`} tipe="date" nilai={jadwal[i]?.tanggal ?? ""} />
              </div>
            ))}
          </fieldset>

          <Input label="Tautan jalur & syarat" nama="tautan_jalur" nilai={data?.tautan_jalur ?? ""} placeholder="/spmb" bantuan="Diawali / atau https://. Kosong = /spmb." />
          <Input label="Tautan tanya panitia" nama="tautan_tanya" nilai={data?.tautan_tanya ?? ""} placeholder="/kontak" bantuan="Kosong = tombol tidak tampil." />
          <div className="sm:col-span-2">
            <TombolSimpan>Simpan info SPMB</TombolSimpan>
          </div>
        </FormAksi>
      </Kartu>
    </>
  );
}
