"use client";

import { useState } from "react";
import { salinKerangka, simpanEvaluasi, simpanIndikator, simpanKerangka, simpanRencana, simpanStandar, simpanTemuan, tambahBukti } from "@/app/admin/actions-mutu";
import { FormAksi, Input, Pilihan, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { JENIS_TEMUAN, SKOR, STATUS_CAPAIAN, STATUS_RENCANA, SUMBER_MODUL, SUMBER_TEMUAN } from "@/lib/mutu";

type Opsi = { id: string; nama: string };
const peta = (m: Record<string, string | { label: string }>) => Object.entries(m).map(([k, v]) => ({ nilai: k, label: typeof v === "string" ? v : v.label }));
const orang = (o: Opsi[], kosong = "—") => [{ nilai: "", label: kosong }, ...o.map((x) => ({ nilai: x.id, label: x.nama }))];

export type DataKerangka = { id: string; kode: string; nama: string; versi: string; sumber_regulasi: string; periode_mulai: string | null; periode_selesai: string | null; status: string; periode_aktif: string };
export function FormKerangka({ d }: { d?: DataKerangka }) {
  return (
    <FormAksi aksi={simpanKerangka} className="space-y-3">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Kode" nama="kode" nilai={d?.kode} maks={40} placeholder="mis. IASP, SPM, RAPOR" />
        <Input label="Versi" nama="versi" nilai={d?.versi ?? "1"} maks={20} placeholder="mis. 2024" />
        <Pilihan label="Status" nama="status" nilai={d?.status ?? "draf"} opsi={[{ nilai: "draf", label: "Draf" }, { nilai: "aktif", label: "Aktif" }, { nilai: "arsip", label: "Arsip" }]} />
      </div>
      <Input label="Nama kerangka" nama="nama" nilai={d?.nama} maks={200} placeholder="mis. Instrumen Akreditasi Satuan Pendidikan (IASP) 2024" />
      <Input label="Dasar regulasi" nama="sumber_regulasi" nilai={d?.sumber_regulasi} maks={300} placeholder="mis. Peraturan BAN-PDM No. … Tahun …" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Berlaku mulai" nama="periode_mulai" tipe="date" nilai={d?.periode_mulai ?? ""} />
        <Input label="Berlaku sampai" nama="periode_selesai" tipe="date" nilai={d?.periode_selesai ?? ""} />
        <Input label="Periode evaluasi aktif" nama="periode_aktif" nilai={d?.periode_aktif ?? ""} placeholder="2026/2027" />
      </div>
      <TombolSimpan>{d ? "Simpan" : "Buat kerangka"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormSalin({ id }: { id: string }) {
  return (
    <FormAksi aksi={salinKerangka} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <Input label="Versi baru" nama="versi" maks={20} placeholder="mis. 2027" />
      <TombolSimpan>Salin sebagai versi baru</TombolSimpan>
    </FormAksi>
  );
}

export type DataStandar = { id?: string; kode: string; nama: string; deskripsi: string; koordinator_id: string | null; urutan: number };
export function FormStandar({ kerangka, d, staf }: { kerangka: string; d?: DataStandar; staf: Opsi[] }) {
  return (
    <FormAksi aksi={simpanStandar} className="space-y-3">
      <input type="hidden" name="kerangka_id" value={kerangka} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-3 sm:grid-cols-[100px_1fr_90px]">
        <Input label="Kode" nama="kode" nilai={d?.kode} maks={20} />
        <Input label="Nama standar / komponen" nama="nama" nilai={d?.nama} maks={200} />
        <Input label="Urutan" nama="urutan" tipe="number" nilai={d?.urutan ?? 0} />
      </div>
      <Pilihan label="Koordinator standar" nama="koordinator_id" nilai={d?.koordinator_id ?? ""} opsi={orang(staf)} />
      <TextArea label="Deskripsi" nama="deskripsi" nilai={d?.deskripsi} baris={2} maks={2000} />
      <TombolSimpan>{d?.id ? "Simpan" : "Tambah standar"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataIndikator = { id?: string; kode: string; nama: string; deskripsi: string; jenis: string; satuan: string; cara_ukur: string; sumber_data: string; bobot: number; pemilik_id: string | null; urutan: number };
export function FormIndikator({ standar, d, staf }: { standar: string; d?: DataIndikator; staf: Opsi[] }) {
  return (
    <FormAksi aksi={simpanIndikator} className="space-y-3">
      <input type="hidden" name="standar_id" value={standar} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
        <Input label="Kode" nama="kode" nilai={d?.kode} maks={30} />
        <Input label="Indikator / butir" nama="nama" nilai={d?.nama} maks={500} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Pilihan label="Jenis" nama="jenis" nilai={d?.jenis ?? "kualitatif"} opsi={[{ nilai: "kualitatif", label: "Kualitatif" }, { nilai: "kuantitatif", label: "Kuantitatif" }]} />
        <Input label="Satuan" nama="satuan" nilai={d?.satuan} maks={30} placeholder="%, orang…" />
        <Input label="Bobot" nama="bobot" tipe="number" nilai={d?.bobot ?? 1} />
        <Input label="Urutan" nama="urutan" tipe="number" nilai={d?.urutan ?? 0} />
      </div>
      <Pilihan label="Pemilik indikator (penanggung jawab)" nama="pemilik_id" nilai={d?.pemilik_id ?? ""} opsi={orang(staf, "— belum —")} />
      <TextArea label="Cara ukur / rubrik" nama="cara_ukur" nilai={d?.cara_ukur} baris={2} maks={1000} />
      <Input label="Sumber data yang disarankan" nama="sumber_data" nilai={d?.sumber_data} maks={200} placeholder="mis. Perangkat ajar, supervisi akademik" />
      <TextArea label="Deskripsi" nama="deskripsi" nilai={d?.deskripsi} baris={2} maks={3000} />
      <TombolSimpan>{d?.id ? "Simpan" : "Tambah indikator"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataEvaluasi = { id?: string; target: string; capaian: string; nilai_target: number | null; nilai_capaian: number | null; skor: number | null; status: string; evaluasi_diri: string; catatan: string };
export function FormEvaluasi({ indikator, periode, d, kuantitatif, terkunci }: { indikator: string; periode: string; d?: DataEvaluasi; kuantitatif: boolean; terkunci: boolean }) {
  return (
    <FormAksi aksi={simpanEvaluasi} className="space-y-3">
      <input type="hidden" name="indikator_id" value={indikator} /><input type="hidden" name="periode" value={periode} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <fieldset disabled={terkunci} className="space-y-3 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Target" nama="target" nilai={d?.target} maks={300} />
          <Input label="Capaian" nama="capaian" nilai={d?.capaian} maks={300} />
          {kuantitatif && <><Input label="Nilai target (angka)" nama="nilai_target" tipe="number" nilai={d?.nilai_target ?? ""} /><Input label="Nilai capaian (angka)" nama="nilai_capaian" tipe="number" nilai={d?.nilai_capaian ?? ""} /></>}
          <Pilihan label="Status" nama="status" nilai={d?.status ?? "belum"} opsi={peta(STATUS_CAPAIAN)} />
          <Pilihan label="Skor evaluasi diri" nama="skor" nilai={d?.skor ? String(d.skor) : ""} opsi={[{ nilai: "", label: "—" }, ...peta(SKOR)]} />
        </div>
        <TextArea label="Evaluasi diri (analisis, kekuatan, kelemahan)" nama="evaluasi_diri" nilai={d?.evaluasi_diri} baris={5} maks={5000} />
        <TextArea label="Catatan" nama="catatan" nilai={d?.catatan} baris={2} maks={1000} />
        <TombolSimpan>Simpan evaluasi</TombolSimpan>
      </fieldset>
    </FormAksi>
  );
}

function PilihBerkas() {
  const err = useErrorKolom("berkas");
  return (
    <div>
      <label htmlFor="berkas" className="mb-1.5 block text-sm font-semibold">Berkas (PDF, Word, Excel, PowerPoint, foto — maks. 4 MB)</label>
      <input id="berkas" name="berkas" type="file" accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp" className="block w-full text-sm" />
      {err && <p className="mt-1 text-sm text-blue-teks">{err}</p>}
      <p className="mt-1 text-xs text-black/50">Sidik jari SHA-256 dicatat saat diunggah untuk memeriksa keutuhan berkas.</p>
    </div>
  );
}

export function FormBukti({ indikator, periode, versiDari, judulAwal }: { indikator?: string; periode?: string; versiDari?: string; judulAwal?: string }) {
  const [jenis, setJenis] = useState(versiDari ? "berkas" : "tautan");
  return (
    <FormAksi aksi={tambahBukti} className="space-y-3">
      {indikator && <input type="hidden" name="indikator_id" value={indikator} />}
      {periode && <input type="hidden" name="periode" value={periode} />}
      {versiDari && <input type="hidden" name="versi_dari" value={versiDari} />}
      <div className="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="Jenis bukti">
        {[["tautan", "Tautan (Drive)"], ["berkas", "Unggah berkas"], ["modul", "Dari modul lain"]].map(([k, l]) => (
          <label key={k} className={`cursor-pointer rounded-full px-3 py-1.5 font-semibold ring-1 ${jenis === k ? "bg-ink text-white ring-ink" : "ring-black/15"}`}>
            <input type="radio" name="jenis" value={k} checked={jenis === k} onChange={() => setJenis(k)} className="sr-only" />{l}</label>
        ))}
      </div>
      <Input label="Judul bukti" nama="judul" nilai={judulAwal} maks={200} placeholder="mis. SK pembagian tugas mengajar 2026/2027" />
      {jenis === "tautan" && <Input label="Tautan" nama="tautan" placeholder="https://drive.google.com/…" />}
      {jenis === "berkas" && <PilihBerkas />}
      {jenis === "modul" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Pilihan label="Modul sumber" nama="sumber_modul" opsi={[{ nilai: "", label: "— pilih —" }, ...Object.entries(SUMBER_MODUL).map(([k, v]) => ({ nilai: k, label: v.label }))]} />
          <Input label="Rujukan (ID/keterangan, opsional)" nama="sumber_ref" maks={100} placeholder="mis. ID data atau 'rekap semester 1'" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Tanggal dokumen" nama="tanggal_dokumen" tipe="date" />
      </div>
      <TextArea label="Keterangan" nama="deskripsi" baris={2} maks={1000} />
      <TombolSimpan>{versiDari ? "Unggah versi baru" : "Tambah bukti"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormTemuan({ kerangka, periode, indikator, staf, indikatorOpsi }: { kerangka: string; periode: string; indikator?: string; staf: Opsi[]; indikatorOpsi?: Opsi[] }) {
  return (
    <FormAksi aksi={simpanTemuan} className="space-y-3">
      <input type="hidden" name="kerangka_id" value={kerangka} /><input type="hidden" name="periode" value={periode} /><input type="hidden" name="status" value="terbuka" />
      {indikator ? <input type="hidden" name="indikator_id" value={indikator} /> : indikatorOpsi && <Pilihan label="Indikator" nama="indikator_id" opsi={orang(indikatorOpsi, "— umum —")} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Pilihan label="Jenis" nama="jenis" nilai="minor" opsi={peta(JENIS_TEMUAN)} />
        <Pilihan label="Sumber" nama="sumber" opsi={peta(SUMBER_TEMUAN)} />
        <Pilihan label="Penanggung jawab" nama="pj_id" opsi={orang(staf)} />
        <Input label="Tenggat" nama="tenggat" tipe="date" />
      </div>
      <TextArea label="Uraian temuan" nama="uraian" baris={3} maks={2000} />
      <TombolSimpan>Catat temuan</TombolSimpan>
    </FormAksi>
  );
}

export type DataRencana = { id?: string; kegiatan: string; pj_id: string | null; tenggat: string | null; status: string; hasil: string };
export function FormRencana({ temuan, indikator, d, staf }: { temuan?: string; indikator?: string; d?: DataRencana; staf: Opsi[] }) {
  return (
    <FormAksi aksi={simpanRencana} className="space-y-3">
      <input type="hidden" name="temuan_id" value={temuan ?? ""} /><input type="hidden" name="indikator_id" value={indikator ?? ""} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <Input label="Kegiatan perbaikan" nama="kegiatan" nilai={d?.kegiatan} maks={500} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Pilihan label="PJ" nama="pj_id" nilai={d?.pj_id ?? ""} opsi={orang(staf)} />
        <Input label="Tenggat" nama="tenggat" tipe="date" nilai={d?.tenggat ?? ""} />
        <Pilihan label="Status" nama="status" nilai={d?.status ?? "rencana"} opsi={peta(STATUS_RENCANA)} />
      </div>
      {d?.id && <TextArea label="Hasil" nama="hasil" nilai={d.hasil} baris={2} maks={2000} />}
      <TombolSimpan>{d?.id ? "Simpan" : "Tambah rencana"}</TombolSimpan>
    </FormAksi>
  );
}
