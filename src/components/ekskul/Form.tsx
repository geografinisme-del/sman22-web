"use client";

import { useState } from "react";
import { daftarEkskul, simpanKegiatanOrg, simpanLpj, simpanOrganisasi, simpanPengajuan, simpanPengaturanEkskul, simpanPresensiOrg, simpanProker, terbitkanSertifikat } from "@/app/admin/actions-ekskul";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { BIDANG_ORG, JABATAN, JENIS_KEGIATAN, JENIS_ORG, JENIS_SERTIF, STATUS_PROKER, totalAnggaran, tulisAnggaran, tulisIsian, uraiAnggaran, type IsianTambahan, type ItemAnggaran } from "@/lib/ekskul";

const opsi = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => ({ nilai: k, label: v }));
const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

export type DataOrg = {
  id: string; jenis: string; nama: string; slug: string; singkatan: string; bidang: string; deskripsi: string; logo_url: string; warna: string; jadwal_rutin: string;
  tempat: string; kuota: number; syarat: string; tingkat_boleh: string[]; daftar_mulai: string | null; daftar_selesai: string | null;
  field_tambahan: IsianTambahan[]; galeri: string[]; tampil_publik: boolean; aktif: boolean;
};

export function FormOrganisasi({ d, kelola }: { d?: DataOrg; kelola: boolean }) {
  const [warna, setWarna] = useState(d?.warna ?? "#1e3a8a");
  const [nama, setNama] = useState(d?.nama ?? "");
  const slugAwal = d?.slug ?? nama.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <FormAksi aksi={simpanOrganisasi} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      {kelola && <input type="hidden" name="aktif_ada" value="1" />}
      {kelola || !d ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Nama<input name="nama" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={100} required className="mt-1.5 w-full rounded-xl border border-black/15 px-4 py-3 font-normal" /></label>
          <Input label="Alamat halaman (slug)" nama="slug" nilai={slugAwal} maks={60} bantuan="Untuk tautan /ekskul/…" />
          <Pilihan label="Jenis" nama="jenis" nilai={d?.jenis ?? "ekskul"} opsi={opsi(JENIS_ORG)} />
          <Input label="Singkatan" nama="singkatan" nilai={d?.singkatan} maks={20} placeholder="mis. KOMPFI" />
        </div>
      ) : (<><input type="hidden" name="nama" value={d.nama} /><input type="hidden" name="slug" value={d.slug} /><input type="hidden" name="jenis" value={d.jenis} /><input type="hidden" name="singkatan" value={d.singkatan} /></>)}
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Bidang" nama="bidang" nilai={d?.bidang ?? "lainnya"} opsi={opsi(BIDANG_ORG)} />
        <label className="block text-sm font-semibold">Warna identitas
          <span className="mt-1.5 flex items-center gap-2"><input type="color" value={warna} onChange={(e) => setWarna(e.target.value)} className="h-12 w-16 rounded-lg border border-black/15" aria-label="Pilih warna" />
            <input name="warna" value={warna} onChange={(e) => setWarna(e.target.value)} className="flex-1 rounded-xl border border-black/15 px-4 py-3 font-mono font-normal" /></span></label>
        <Input label="Logo (URL gambar https)" nama="logo_url" nilai={d?.logo_url} placeholder="https://" />
        <Input label="Jadwal rutin" nama="jadwal_rutin" nilai={d?.jadwal_rutin} maks={200} placeholder="mis. Jumat 14.00–16.00" />
        <Input label="Tempat" nama="tempat" nilai={d?.tempat} maks={100} />
        <Input label="Kuota anggota (0 = tanpa batas)" nama="kuota" tipe="number" nilai={d?.kuota ?? 0} />
      </div>
      <TextArea label="Deskripsi (tampil di website)" nama="deskripsi" nilai={d?.deskripsi} baris={4} maks={3000} />
      <fieldset className="rounded-xl p-4 ring-1 ring-black/10">
        <legend className="px-1 text-sm font-semibold">Pendaftaran</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Dibuka" nama="daftar_mulai" tipe="date" nilai={d?.daftar_mulai ?? ""} />
          <Input label="Ditutup" nama="daftar_selesai" tipe="date" nilai={d?.daftar_selesai ?? ""} />
        </div>
        <p className="mt-3 text-sm font-semibold">Untuk kelas</p>
        <div className="mt-1 flex gap-4">{["X", "XI", "XII"].map((t) => (
          <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" name="tingkat_boleh" value={t} defaultChecked={(d?.tingkat_boleh ?? ["X", "XI", "XII"]).includes(t)} className="h-4 w-4" /> {t}</label>
        ))}</div>
        <div className="mt-3"><TextArea label="Syarat" nama="syarat" nilai={d?.syarat} baris={2} maks={1000} /></div>
        <div className="mt-3"><TextArea label="Isian tambahan formulir (opsional)" nama="field_tambahan" nilai={tulisIsian(d?.field_tambahan ?? [])} baris={3}
          placeholder={"P*: Punya kamera/HP berkamera? | Ya | Tidak\nT: Pengalaman lomba"} bantuan="Satu per baris. T: isian teks · P: pilihan (pisahkan |) · tambahkan * setelah huruf bila wajib. Maks. 10." /></div>
      </fieldset>
      <TextArea label="Galeri (tautan foto https, pisahkan dengan baris baru)" nama="galeri" nilai={(d?.galeri ?? []).join("\n")} baris={3} bantuan="Maks. 12 foto. Hindari foto yang menampilkan wajah siswa tanpa izin." />
      <Centang label="Tampilkan di website" nama="tampil_publik" nilai={d?.tampil_publik ?? true} />
      {kelola && <Centang label="Aktif" nama="aktif" nilai={d?.aktif ?? true} />}
      <TombolSimpan>{d ? "Simpan profil" : "Tambah organisasi"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormPengaturanEkskul({ maks }: { maks: number }) {
  return (
    <FormAksi aksi={simpanPengaturanEkskul} className="flex flex-wrap items-end gap-3">
      <Input label="Maks. ekskul per siswa per tahun" nama="maks_pilihan" tipe="number" nilai={maks} />
      <TombolSimpan>Simpan</TombolSimpan>
    </FormAksi>
  );
}

export function FormDaftar({ org, isian, maks }: { org: string; isian: IsianTambahan[]; maks: number }) {
  return (
    <FormAksi aksi={daftarEkskul} className="space-y-3">
      <input type="hidden" name="organisasi_id" value={org} />
      {isian.map((f) => f.jenis === "pilihan"
        ? <Pilihan key={f.id} label={`${f.label}${f.wajib ? " *" : ""}`} nama={f.id} opsi={[{ nilai: "", label: "— pilih —" }, ...(f.pilihan ?? []).map((p) => ({ nilai: p, label: p }))]} />
        : <Input key={f.id} label={`${f.label}${f.wajib ? " *" : ""}`} nama={f.id} maks={500} />)}
      <TextArea label="Alasan bergabung" nama="alasan" baris={2} maks={500} />
      {maks > 1 && <Pilihan label="Prioritas pilihan" nama="pilihan" opsi={Array.from({ length: maks }, (_, i) => ({ nilai: String(i + 1), label: `Pilihan ke-${i + 1}` }))} />}
      <TombolSimpan>Daftar</TombolSimpan>
    </FormAksi>
  );
}

export type DataKegiatan = { id?: string; judul: string; jenis: string; mulai: string; selesai: string; tempat: string; deskripsi: string; publik: boolean };
export function FormKegiatanOrg({ org, d }: { org: string; d?: DataKegiatan }) {
  return (
    <FormAksi aksi={simpanKegiatanOrg} className="space-y-3">
      <input type="hidden" name="organisasi_id" value={org} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Input label="Kegiatan" nama="judul" nilai={d?.judul} maks={150} placeholder="mis. Latihan rutin, Rapat pleno, Lomba" />
        <Pilihan label="Jenis" nama="jenis" nilai={d?.jenis ?? "latihan"} opsi={opsi(JENIS_KEGIATAN)} />
        <Input label="Mulai (WIB)" nama="mulai" tipe="datetime-local" nilai={d?.mulai} />
        <Input label="Selesai" nama="selesai" tipe="datetime-local" nilai={d?.selesai} />
      </div>
      <Input label="Tempat" nama="tempat" nilai={d?.tempat} maks={100} />
      <TextArea label="Keterangan" nama="deskripsi" nilai={d?.deskripsi} baris={2} maks={1000} />
      <Centang label="Tampilkan di agenda website (untuk acara/lomba)" nama="publik" nilai={d?.publik} />
      <TombolSimpan>{d?.id ? "Simpan" : "Tambah kegiatan"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormPresensiOrg({ org, kegiatan, anggota, awal }: { org: string; kegiatan: string; anggota: { siswa_id: string; nama: string; kelas: string }[]; awal: Record<string, string> }) {
  const [semua, setSemua] = useState<Record<string, string>>(() => Object.fromEntries(anggota.map((a) => [a.siswa_id, awal[a.siswa_id] ?? "hadir"])));
  return (
    <FormAksi aksi={simpanPresensiOrg} className="space-y-3">
      <input type="hidden" name="organisasi_id" value={org} />
      <input type="hidden" name="kegiatan_id" value={kegiatan} />
      <ul className="divide-y divide-black/5 text-sm">{anggota.map((a) => (
        <li key={a.siswa_id} className="flex flex-wrap items-center gap-2 py-1.5">
          <span className="min-w-40 flex-1">{a.nama} <span className="text-black/50">{a.kelas}</span></span>
          {["hadir", "izin", "sakit", "alpa"].map((s) => (
            <label key={s} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ring-1 ${semua[a.siswa_id] === s ? "bg-brand-900 text-white ring-brand-900" : "ring-black/15"}`}>
              <input type="radio" name={`s_${a.siswa_id}`} value={s} checked={semua[a.siswa_id] === s} onChange={() => setSemua({ ...semua, [a.siswa_id]: s })} className="sr-only" />{s}
            </label>
          ))}
        </li>
      ))}</ul>
      <TombolSimpan>Simpan presensi</TombolSimpan>
    </FormAksi>
  );
}

export type DataProker = { id?: string; judul: string; tujuan: string; target_waktu: string; indikator: string; anggaran: number; status: string; evaluasi: string };
export function FormProker({ org, d }: { org: string; d?: DataProker }) {
  return (
    <FormAksi aksi={simpanProker} className="space-y-3">
      <input type="hidden" name="organisasi_id" value={org} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <Input label="Program" nama="judul" nilai={d?.judul} maks={150} />
      <TextArea label="Tujuan" nama="tujuan" nilai={d?.tujuan} baris={2} maks={1000} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Target waktu" nama="target_waktu" nilai={d?.target_waktu} maks={60} placeholder="mis. Oktober 2026" />
        <Input label="Perkiraan anggaran (Rp)" nama="anggaran" tipe="number" nilai={d?.anggaran ?? 0} />
        <Pilihan label="Status" nama="status" nilai={d?.status ?? "rencana"} opsi={opsi(STATUS_PROKER)} />
      </div>
      <Input label="Indikator keberhasilan" nama="indikator" nilai={d?.indikator} maks={300} />
      {d?.id && <TextArea label="Evaluasi" nama="evaluasi" nilai={d.evaluasi} baris={2} maks={1000} />}
      <TombolSimpan>{d?.id ? "Simpan" : "Tambah program"}</TombolSimpan>
    </FormAksi>
  );
}

function RincianAnggaran({ awal }: { awal: ItemAnggaran[] }) {
  const [teks, setTeks] = useState(tulisAnggaran(awal));
  const err = useErrorKolom("anggaran");
  const h = uraiAnggaran(teks);
  return (
    <div>
      <label htmlFor="anggaran" className="mb-1.5 block text-sm font-semibold">Rincian anggaran</label>
      <textarea id="anggaran" name="anggaran" value={teks} onChange={(e) => setTeks(e.target.value)} rows={5} aria-invalid={Boolean(err)}
        placeholder={"Cetak foto A3; 20; lembar; 15000\nKonsumsi panitia; 15; kotak; 20000"} className="w-full rounded-xl border border-black/15 px-4 py-3 font-mono text-sm aria-[invalid=true]:border-merah" />
      <p className="mt-1 text-xs text-black/50">Satu baris per item: uraian; volume; satuan; harga satuan.</p>
      {err && <p className="text-sm text-merah">{err}</p>}
      <p className="mt-1 text-sm font-semibold">{h.ok ? `Total: ${rp(totalAnggaran(h.data))}` : <span className="text-merah">{h.pesan}</span>}</p>
    </div>
  );
}

export type DataPengajuan = { id?: string; judul: string; tujuan: string; mulai: string; selesai: string; tempat: string; sasaran_peserta: number; risiko: string; mitigasi: string; kebutuhan_sarpras: string; anggaran: ItemAnggaran[]; sumber_dana: string };
export function FormPengajuan({ org, d, kembali }: { org: string; d?: DataPengajuan; kembali?: string }) {
  return (
    <FormAksi aksi={simpanPengajuan} className="space-y-4">
      <input type="hidden" name="organisasi_id" value={org} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      {kembali && <input type="hidden" name="kembali" value={kembali} />}
      <Input label="Nama kegiatan" nama="judul" nilai={d?.judul} maks={150} />
      <TextArea label="Latar belakang & tujuan" nama="tujuan" nilai={d?.tujuan} baris={3} maks={2000} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Input label="Mulai" nama="mulai" tipe="date" nilai={d?.mulai} />
        <Input label="Selesai" nama="selesai" tipe="date" nilai={d?.selesai} />
        <Input label="Tempat" nama="tempat" nilai={d?.tempat} maks={150} />
        <Input label="Perkiraan peserta" nama="sasaran_peserta" tipe="number" nilai={d?.sasaran_peserta ?? 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextArea label="Risiko" nama="risiko" nilai={d?.risiko} baris={2} maks={1500} placeholder="mis. cedera, cuaca, keramaian" />
        <TextArea label="Mitigasi" nama="mitigasi" nilai={d?.mitigasi} baris={2} maks={1500} placeholder="mis. P3K & petugas UKS, rencana ruangan cadangan" />
      </div>
      <TextArea label="Kebutuhan sarpras" nama="kebutuhan_sarpras" nilai={d?.kebutuhan_sarpras} baris={2} maks={1000} bantuan="Peminjaman ruang/barang tetap diajukan di menu Sarpras setelah disetujui." />
      <RincianAnggaran awal={d?.anggaran ?? []} />
      <Input label="Sumber dana" nama="sumber_dana" nilai={d?.sumber_dana} maks={100} placeholder="mis. Kas OSIS, BOS, sponsor" />
      <TombolSimpan>{d?.id ? "Simpan draf" : "Buat draf pengajuan"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormLpj({ id, d }: { id: string; d: { lpj_ringkasan: string; lpj_realisasi: number | null; lpj_peserta: number | null; lpj_tautan: string } }) {
  return (
    <FormAksi aksi={simpanLpj} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <TextArea label="Ringkasan pelaksanaan" nama="lpj_ringkasan" nilai={d.lpj_ringkasan} baris={4} maks={3000} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Realisasi anggaran (Rp)" nama="lpj_realisasi" tipe="number" nilai={d.lpj_realisasi ?? 0} />
        <Input label="Jumlah peserta" nama="lpj_peserta" tipe="number" nilai={d.lpj_peserta ?? 0} />
        <Input label="Tautan dokumentasi & bukti" nama="lpj_tautan" nilai={d.lpj_tautan} placeholder="https://" />
      </div>
      <div className="flex flex-wrap gap-2">
        <TombolSimpan>Simpan LPJ</TombolSimpan>
        <button name="kirim" value="1" className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Simpan & kirim LPJ</button>
      </div>
    </FormAksi>
  );
}

export function FormSertifikat({ org, anggota, hari }: { org: string; anggota: { siswa_id: string; nama: string; jabatan: string }[]; hari: string }) {
  const [pilih, setPilih] = useState<string[]>([]);
  const err = useErrorKolom("siswa");
  return (
    <FormAksi aksi={terbitkanSertifikat} className="space-y-3">
      <input type="hidden" name="organisasi_id" value={org} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Pilihan label="Jenis" nama="jenis" opsi={opsi(JENIS_SERTIF)} />
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hari} />
      </div>
      <Input label="Judul" nama="judul" maks={150} placeholder="mis. Anggota Aktif KOMPFI 2026/2027" />
      <Input label="Keterangan" nama="keterangan" maks={300} />
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Penerima <button type="button" onClick={() => setPilih(pilih.length ? [] : anggota.map((a) => a.siswa_id))} className="ml-2 text-xs font-normal underline">{pilih.length ? "kosongkan" : "pilih semua"}</button></legend>
        <div className="max-h-56 space-y-1 overflow-auto rounded-xl p-2 ring-1 ring-black/10">{anggota.map((a) => (
          <label key={a.siswa_id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="siswa" value={a.siswa_id} checked={pilih.includes(a.siswa_id)} onChange={(e) => setPilih(e.target.checked ? [...pilih, a.siswa_id] : pilih.filter((x) => x !== a.siswa_id))} className="h-4 w-4" />
            {a.nama} <span className="text-black/50">{JABATAN[a.jabatan]}</span>
          </label>))}</div>
        {err && <p className="text-sm text-merah">{err}</p>}
      </fieldset>
      <TombolSimpan>Terbitkan</TombolSimpan>
    </FormAksi>
  );
}
