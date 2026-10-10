import { JudulHalaman, KosongAdmin } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { kunciAdminTersedia } from "@/lib/supabase/admin";
import { DaftarAkun, type BarisAkun } from "./DaftarAkun";

export const metadata = { title: "Akun Portal" };

export default async function AkunPortal({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("akun_portal.kelola");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const { data: kelas } = ta
    ? await supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("nama")
    : { data: [] as { id: string; nama: string }[] };
  const pilih = (kelas ?? []).find((k) => k.id === sp.kelas) ?? kelas?.[0];
  const { data } = pilih ? await supabase.rpc("status_akun_portal", { p_kelas: pilih.id }) : { data: [] };
  const baris = (data ?? []) as BarisAkun[];

  return (
    <>
      <JudulHalaman
        judul="Akun Portal Siswa & Orang Tua"
        deskripsi="Buat akun login per kelas. Siswa dan orang tua masuk di /masuk memakai NISN siswa dan kata sandi yang dicetak di kartu akun."
      />
      {!kunciAdminTersedia && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Pembuatan akun membutuhkan <code>SUPABASE_SERVICE_ROLE_KEY</code> di Vercel (lihat PANDUAN-CMS.md, Langkah 5).
        </p>
      )}
      {!kelas?.length ? (
        <KosongAdmin teks="Belum ada kelas di tahun ajaran aktif." />
      ) : (
        <>
          <form className="mb-6 flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold">
              Kelas
              <select name="kelas" defaultValue={pilih?.id} className="mt-1 block w-56 rounded-xl border border-black/15 bg-white px-3 py-2 font-normal">
                {kelas.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </label>
            <button className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">Tampilkan</button>
          </form>
          {pilih && <DaftarAkun key={pilih.id} kelasId={pilih.id} kelasNama={pilih.nama} baris={baris} />}
        </>
      )}
    </>
  );
}
