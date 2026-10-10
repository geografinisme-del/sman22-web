"use client";

import { useEffect, useState } from "react";
import { FormAksi, Input, InputBukti, Pilihan, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { ajukanPrestasi, cariSiswa, laporPelanggaran, rujukBk, simpanPembinaan } from "@/app/admin/actions-kesiswaan";
import { BIDANG, JENIS_BINA, KATEGORI_PEL, PERINGKAT, TINGKAT } from "@/lib/kesiswaan/label";

type S = { id: string; nama: string; kelas: string | null };

/** Cari siswa (nama atau NISN, min. 3 huruf) — hasil dari server sesuai hak akses */
export function PilihSiswa({ awal }: { awal?: S }) {
  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<S[]>([]);
  const [pilih, setPilih] = useState<S | null>(awal ?? null);
  const err = useErrorKolom("siswa_id");
  useEffect(() => {
    if (pilih || q.trim().length < 3) return;
    const t = setTimeout(() => cariSiswa(q).then(setHasil), 250);
    return () => clearTimeout(t);
  }, [q, pilih]);
  const tampil = pilih || q.trim().length < 3 ? [] : hasil;
  return (
    <div className="relative">
      <input type="hidden" name="siswa_id" value={pilih?.id ?? ""} />
      <label htmlFor="cari-siswa" className="mb-1.5 block text-sm font-semibold">Siswa</label>
      <input
        id="cari-siswa" value={pilih ? `${pilih.nama} — ${pilih.kelas ?? "tanpa kelas"}` : q} autoComplete="off" role="combobox"
        aria-expanded={tampil.length > 0} aria-controls="hasil-siswa" aria-invalid={Boolean(err)} readOnly={Boolean(awal)}
        onChange={(e) => { setPilih(null); setQ(e.target.value); }} placeholder="Ketik nama siswa (min. 3 huruf)…"
        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 aria-[invalid=true]:border-merah"
      />
      {err && <p className="mt-1 text-sm text-merah">{err}</p>}
      {tampil.length > 0 && (
        <ul id="hasil-siswa" role="listbox" className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10">
          {tampil.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <button type="button" onClick={() => setPilih(s)} className="block w-full px-4 py-2 text-left hover:bg-black/5">
                {s.nama} <span className="text-sm text-black/50">· {s.kelas ?? "tanpa kelas"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FormPelanggaran({ jenis, hariIni }: { jenis: { id: string; nama: string; kategori: string; poin: number }[]; hariIni: string }) {
  const err = useErrorKolom("jenis_id");
  return (
    <FormAksi aksi={laporPelanggaran} className="space-y-4">
      <PilihSiswa />
      <label className="block text-sm font-semibold">Jenis pelanggaran
        <select name="jenis_id" defaultValue="" aria-invalid={Boolean(err)} className="mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-normal">
          <option value="">— pilih —</option>
          {(["ringan", "sedang", "berat"] as const).map((k) => (
            <optgroup key={k} label={KATEGORI_PEL[k]}>
              {jenis.filter((j) => j.kategori === k).map((j) => <option key={j.id} value={j.id}>{j.nama} ({j.poin} poin)</option>)}
            </optgroup>
          ))}
        </select>
        {err && <span className="block text-sm font-normal text-merah">{err}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tanggal kejadian" nama="tanggal" tipe="date" nilai={hariIni} wajib />
        <Input label="Tempat" nama="tempat" maks={120} placeholder="mis. belakang kantin" />
      </div>
      <TextArea label="Kronologi singkat" nama="kronologi" baris={3} maks={2000} wajib placeholder="Apa yang terjadi, kapan, bagaimana diketahui" />
      <Input label="Saksi (opsional)" nama="saksi" maks={300} bantuan="Hanya terlihat oleh kesiswaan & wali kelas, tidak oleh orang tua." />
      <InputBukti />
      <TombolSimpan>Kirim laporan</TombolSimpan>
    </FormAksi>
  );
}

export function FormPrestasi({ siswa, hariIni }: { siswa?: S; hariIni: string }) {
  return (
    <FormAksi aksi={ajukanPrestasi} className="space-y-4">
      {siswa ? <input type="hidden" name="siswa_id" value={siswa.id} /> : <PilihSiswa />}
      <Input label="Nama lomba / kegiatan" nama="nama_kegiatan" maks={200} wajib placeholder="mis. Olimpiade Geografi Kota Bandung 2026" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Pilihan label="Bidang" nama="bidang" nilai="akademik" opsi={Object.entries(BIDANG).map(([nilai, label]) => ({ nilai, label }))} />
        <Pilihan label="Tingkat" nama="tingkat" nilai="kota" opsi={Object.entries(TINGKAT).map(([nilai, label]) => ({ nilai, label }))} />
        <Pilihan label="Peringkat" nama="peringkat" nilai="juara1" opsi={Object.entries(PERINGKAT).map(([nilai, label]) => ({ nilai, label }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Pilihan label="Peserta" nama="peserta" nilai="individu" opsi={[{ nilai: "individu", label: "Individu" }, { nilai: "tim", label: "Tim" }]} />
        <Input label="Penyelenggara" nama="penyelenggara" maks={150} />
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hariIni} wajib />
      </div>
      <Input label="Guru pembina (opsional)" nama="pembina" maks={150} />
      <InputBukti label="Foto piagam / sertifikat" bantuan="Dibutuhkan kesiswaan untuk verifikasi. Foto atau PDF, maks. 4 MB." />
      <TombolSimpan>Kirim prestasi</TombolSimpan>
    </FormAksi>
  );
}

export function FormPembinaan({ siswaId, hariIni }: { siswaId: string; hariIni: string }) {
  return (
    <FormAksi aksi={simpanPembinaan} className="space-y-3">
      <input type="hidden" name="siswa_id" value={siswaId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Pilihan label="Jenis" nama="jenis" nilai="bimbingan_wali" opsi={Object.entries(JENIS_BINA).map(([nilai, label]) => ({ nilai, label }))} />
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hariIni} wajib />
        <Pilihan label="Status" nama="status" nilai="selesai" opsi={[{ nilai: "direncanakan", label: "Direncanakan" }, { nilai: "selesai", label: "Selesai" }]} />
      </div>
      <TextArea label="Uraian" nama="uraian" baris={2} maks={2000} wajib placeholder="Apa yang dibahas / dilakukan" />
      <TextArea label="Tindak lanjut / kesepakatan" nama="tindak_lanjut" baris={2} maks={1000} />
      <TombolSimpan>Simpan pembinaan</TombolSimpan>
    </FormAksi>
  );
}

export function FormRujuk({ siswaId }: { siswaId: string }) {
  return (
    <FormAksi aksi={rujukBk} className="space-y-3">
      <input type="hidden" name="siswa_id" value={siswaId} />
      <TextArea label="Alasan rujukan (singkat)" nama="alasan" baris={2} maks={500} wajib bantuan="Tulis secukupnya. Isi konseling hanya diketahui guru BK." />
      <TombolSimpan>Rujuk ke BK</TombolSimpan>
    </FormAksi>
  );
}
