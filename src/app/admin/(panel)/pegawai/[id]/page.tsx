import { notFound } from "next/navigation";
import Link from "next/link";
import { RiwayatPerubahan } from "@/components/admin/Riwayat";
import { JudulHalaman, Kartu, Notifikasi, TombolLink } from "@/components/admin/ui";
import { punya, wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { FormPegawai } from "../FormPegawai";

export const metadata = { title: "Detail pegawai" };

export default async function DetailPegawai({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, { pesan }] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibIzin("data_induk.baca");
  const { data: p } = await supabase.from("pegawai").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!p) notFound();
  const { data: perwalian } = await supabase.from("kelas_ringkasan").select("id, nama, tahun_ajaran, tahun_aktif").eq("wali_kelas_id", id).is("deleted_at", null);
  const data = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v == null ? "" : String(v)]));

  return (
    <>
      <JudulHalaman judul={p.nama} deskripsi={[p.jabatan, p.nip ? `NIP ${p.nip}` : null].filter(Boolean).join(" · ")} aksi={<TombolLink href="/admin/pegawai" sekunder>← Daftar</TombolLink>} />
      <Notifikasi kode={pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <FormPegawai data={data} bisaUbah={punya(akses, "data_induk.kelola")} />
        <div className="space-y-6">
          <Kartu>
            <h2 className="mb-3 font-serif text-2xl">Akun login</h2>
            {p.user_id ? (
              <p className="text-sm text-black/70">Sudah memiliki akun.</p>
            ) : (
              <p className="text-sm text-black/50">
                Belum memiliki akun.
                {punya(akses, "pengguna.kelola") && (
                  <>
                    {" "}
                    <Link href={`/admin/pengguna?pegawai=${id}`} className="font-semibold text-brand-700 underline">Buatkan akun</Link>
                  </>
                )}
              </p>
            )}
          </Kartu>
          <Kartu>
            <h2 className="mb-3 font-serif text-2xl">Wali kelas</h2>
            {!perwalian?.length ? (
              <p className="text-sm text-black/50">Bukan wali kelas.</p>
            ) : (
              <ul className="text-sm">
                {perwalian.map((k) => (
                  <li key={k.id}>
                    <Link href={`/admin/kelas/${k.id}`} className="font-semibold hover:underline">{k.nama}</Link>{" "}
                    <span className="text-black/50">({k.tahun_ajaran}{k.tahun_aktif ? ", aktif" : ""})</span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
          {punya(akses, "audit.baca") && <RiwayatPerubahan tabel="pegawai" id={id} />}
        </div>
      </div>
    </>
  );
}
