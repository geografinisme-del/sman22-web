import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormBarang, FormHapusBarang, type DataBarang } from "@/components/sarpras/Form";
import { NavSarpras } from "@/components/sarpras/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { qrBarang } from "@/lib/admin/qr";
import { uuid } from "@/lib/admin/schema";
import { KONDISI, Lencana, rupiah, STATUS_PINJAM, STATUS_RUSAK, waktuWIB } from "@/lib/lms";

export const metadata = { title: "Detail Barang" };

export default async function DetailBarang({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "sarpras.kelola");
  const lihat = kelola || punya(akses, "sarpras.lihat");
  const { data: b } = await supabase.from("barang").select("*, kategori_barang(nama), ruang(nama)").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [{ data: pinjam }, { data: rusak }, { data: kategori }, { data: ruang }, qr] = await Promise.all([
    supabase.from("peminjaman").select("id, mulai, selesai, status, keperluan").eq("barang_id", id).order("mulai", { ascending: false }).limit(10),
    supabase.from("laporan_kerusakan").select("id, judul, status, created_at, penanganan, biaya").eq("barang_id", id).order("created_at", { ascending: false }).limit(10),
    kelola ? supabase.from("kategori_barang").select("id, nama").order("urutan") : Promise.resolve({ data: [] }),
    kelola ? supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama") : Promise.resolve({ data: [] }),
    kelola ? qrBarang(id) : Promise.resolve(""),
  ]);
  const info: [string, string][] = [
    ["Kode", b.kode], ["Kategori", b.kategori_barang?.nama ?? ""], ["Lokasi", b.ruang?.nama ?? "Gudang"], ["Merk / tipe", b.merk || "—"],
    ["Jumlah", `${b.jumlah} ${b.satuan}`], ["Sumber dana", b.sumber_dana || "—"], ["Tahun perolehan", b.tahun_perolehan ? String(b.tahun_perolehan) : "—"],
    ...(lihat ? ([["Harga satuan", rupiah(b.harga)]] as [string, string][]) : []),
  ];

  return (
    <>
      <JudulHalaman judul={b.nama} deskripsi={b.deleted_at ? `DIHAPUS dari aset — ${b.alasan_hapus}` : b.kode} />
      <NavSarpras lihat={lihat} kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Kartu>
            <div className="flex flex-wrap gap-6">
              {b.foto_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/berkas/barang/${b.id}`} alt={b.nama} className="h-40 w-40 rounded-xl object-cover ring-1 ring-black/10" />
              )}
              <dl className="grid flex-1 grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                {info.map(([k, v]) => (<Fragment key={k}><dt className="text-black/50">{k}</dt><dd className="font-medium">{v}</dd></Fragment>))}
                <dt className="text-black/50">Kondisi</dt><dd><Lencana s={b.kondisi} peta={KONDISI} /></dd>
              </dl>
            </div>
            {b.spesifikasi && <p className="mt-4 whitespace-pre-line text-sm text-black/70">{b.spesifikasi}</p>}
            {b.keterangan && <p className="mt-2 text-sm text-black/60">{b.keterangan}</p>}
            {!b.deleted_at && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4 text-sm font-semibold">
                {b.bisa_dipinjam && <Link href={`/admin/sarpras/peminjaman?objek=barang:${b.id}#form`} className="rounded-full bg-brand-900 px-4 py-2 text-white">Pinjam</Link>}
                <Link href={`/admin/sarpras/kerusakan?objek=barang:${b.id}#form`} className="rounded-full px-4 py-2 ring-1 ring-black/15">Laporkan kerusakan</Link>
              </div>
            )}
          </Kartu>
          <Kartu>
            <h2 className="mb-2 font-serif text-xl">Riwayat kerusakan & perbaikan</h2>
            {(rusak ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="divide-y divide-black/5 text-sm">{(rusak ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap gap-2 py-2"><Lencana s={r.status} peta={STATUS_RUSAK} /><span className="flex-1">{r.judul}{r.penanganan && <span className="block text-black/60">{r.penanganan}</span>}</span>
                  <span className="text-black/50">{waktuWIB(r.created_at)}{r.biaya != null && ` · ${rupiah(r.biaya)}`}</span></li>))}</ul>
            )}
            <h2 className="mb-2 mt-6 font-serif text-xl">Riwayat peminjaman</h2>
            {(pinjam ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
              <ul className="divide-y divide-black/5 text-sm">{(pinjam ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap gap-2 py-2"><Lencana s={r.status} peta={STATUS_PINJAM} /><span className="flex-1">{r.keperluan}</span><span className="text-black/50">{waktuWIB(r.mulai)}</span></li>))}</ul>
            )}
          </Kartu>
        </div>
        {kelola && (
          <div className="space-y-6">
            <Kartu className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR ${b.kode}`} className="mx-auto h-44 w-44" />
              <p className="mt-2 font-mono text-xs">{b.kode}</p>
              <Link href={`/admin/sarpras/label?id=${b.id}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">Cetak label</Link>
            </Kartu>
            {!b.deleted_at && (
              <>
                <Kartu><h2 className="mb-4 font-serif text-2xl">Ubah data</h2>
                  <FormBarang data={b as unknown as DataBarang} kategori={(kategori ?? []) as { id: string; nama: string }[]} ruang={(ruang ?? []) as { id: string; nama: string }[]} /></Kartu>
                <Kartu><h2 className="mb-3 font-serif text-xl">Penghapusan aset</h2><FormHapusBarang id={b.id} /></Kartu>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
