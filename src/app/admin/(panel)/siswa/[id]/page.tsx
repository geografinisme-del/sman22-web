import { notFound } from "next/navigation";
import { FormOrtu } from "../FormOrtu";
import { FormSiswa } from "../FormSiswa";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { RiwayatPerubahan } from "@/components/admin/Riwayat";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { lepasOrangTua } from "../../../actions-induk";

export const metadata = { title: "Detail siswa" };

export default async function DetailSiswa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, { pesan }] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibIzin("data_induk.baca");
  const bisaUbah = punya(akses, "data_induk.kelola");

  const { data: s } = await supabase.from("siswa").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!s) notFound();
  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle();
  const [{ data: kelas }, { data: riwayat }, { data: ortu }] = await Promise.all([
    ta ? supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("nama") : Promise.resolve({ data: [] }),
    supabase.from("anggota_kelas").select("tahun_ajaran_id, kelas_id, kelas:kelas_id(nama), ta:tahun_ajaran_id(nama)").eq("siswa_id", id),
    supabase.from("siswa_orang_tua").select("hubungan, orang_tua:orang_tua_id(id, nama, telepon, pekerjaan)").eq("siswa_id", id),
  ]);
  const kelasAktif = riwayat?.find((r) => r.tahun_ajaran_id === ta?.id);
  const data = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v == null ? "" : String(v)]));
  data.kelas_id = kelasAktif?.kelas_id ?? "";

  return (
    <>
      <JudulHalaman
        judul={s.nama}
        deskripsi={[s.nisn ? `NISN ${s.nisn}` : "NISN belum ada", kelasAktif ? `Kelas ${(kelasAktif.kelas as unknown as { nama: string }).nama}` : null, s.status]
          .filter(Boolean)
          .join(" · ")}
        aksi={<TombolLink href="/admin/siswa" sekunder>← Daftar siswa</TombolLink>}
      />
      <Notifikasi kode={pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <FormSiswa data={data} kelas={kelas ?? []} bisaUbah={bisaUbah} namaTa={ta?.nama ?? null} />
        <div className="space-y-6">
          <Kartu>
            <h2 id="orang-tua" className="mb-4 text-2xl">Orang tua / wali</h2>
            {!ortu?.length ? (
              <p className="text-sm text-black/50">Belum ada data orang tua.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {ortu.map((o) => {
                  const d = o.orang_tua as unknown as { id: string; nama: string; telepon: string; pekerjaan: string };
                  return (
                    <li key={d.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-semibold">{d.nama}</p>
                        <p className="text-black/50">
                          {o.hubungan[0].toUpperCase() + o.hubungan.slice(1)}
                          {d.telepon && ` · ${d.telepon}`}
                          {d.pekerjaan && ` · ${d.pekerjaan}`}
                        </p>
                      </div>
                      {bisaUbah && (
                        <form action={lepasOrangTua}>
                          <input type="hidden" name="siswa_id" value={id} />
                          <input type="hidden" name="orang_tua_id" value={d.id} />
                          <button type="submit" className="text-xs text-blue-teks hover:underline">Lepas</button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {bisaUbah && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-blue-teks">+ Tambah orang tua/wali</summary>
                <div className="mt-4">
                  <FormOrtu siswaId={id} />
                </div>
              </details>
            )}
          </Kartu>
          <Kartu>
            <h2 className="mb-4 text-2xl">Riwayat kelas</h2>
            {!riwayat?.length ? (
              <p className="text-sm text-black/50">Belum pernah ditempatkan di kelas.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {riwayat
                  .map((r) => ({ ta: (r.ta as unknown as { nama: string }).nama, kelas: (r.kelas as unknown as { nama: string }).nama }))
                  .sort((a, b) => b.ta.localeCompare(a.ta))
                  .map((r) => (
                    <li key={r.ta} className="flex justify-between">
                      <span className="text-black/60">{r.ta}</span>
                      <strong>{r.kelas}</strong>
                    </li>
                  ))}
              </ul>
            )}
          </Kartu>
          {punya(akses, "audit.baca") && <RiwayatPerubahan tabel="siswa" id={id} />}
        </div>
      </div>
    </>
  );
}
