"use client";

import { ajukanKonseling, buatKasus, simpanKasus, simpanPengaturanBk, simpanRujukanLuar, simpanSesi, simpanTindakLanjut } from "@/app/admin/actions-bk";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { PilihSiswa } from "@/components/kesiswaan/Form";
import { JENIS_RUJUKAN_LUAR, JENIS_SESI, MODE_SESI, PRIORITAS_BK, RISIKO, STATUS_KASUS, STATUS_SESI, STATUS_TL } from "@/lib/bk";

type Opsi = { id: string; nama: string };
const opsi = (m: Record<string, string | { label: string }>) => Object.entries(m).map(([k, v]) => ({ nilai: k, label: typeof v === "string" ? v : v.label }));

/** Teks rahasia: dikirim beserta sidik jari teks awal, agar hanya dienkripsi ulang bila berubah */
function Rahasia({ label, nama, nilai, sidik, baris = 5, maks, placeholder }: { label: string; nama: string; nilai: string; sidik: string; baris?: number; maks: number; placeholder?: string }) {
  return (
    <div>
      <input type="hidden" name={`${nama}_sidik`} value={sidik} />
      <TextArea label={`🔒 ${label}`} nama={nama} nilai={nilai} baris={baris} maks={maks} placeholder={placeholder} bantuan="Dienkripsi; hanya guru BK yang dapat membuka, dan setiap pembukaan tercatat." />
    </div>
  );
}

export function FormAjukan({ anak, kategori, ortu }: { anak: Opsi[]; kategori: Opsi[]; ortu: boolean }) {
  return (
    <FormAksi aksi={ajukanKonseling} className="space-y-4">
      {anak.length === 1 ? <input type="hidden" name="siswa_id" value={anak[0].id} /> : (
        <Pilihan label="Untuk anak" nama="siswa_id" opsi={anak.map((a) => ({ nilai: a.id, label: a.nama }))} />
      )}
      <Pilihan label="Jenis layanan" nama="kategori" nilai={kategori[0]?.id} opsi={kategori.map((k) => ({ nilai: k.id, label: k.nama }))} />
      <Input label="Topik singkat" nama="topik" wajib maks={150} placeholder={ortu ? "mis. Konsultasi pilihan jurusan anak" : "mis. Ingin cerita soal belajar"} bantuan="Cukup garis besarnya." />
      <TextArea label="Cerita (opsional, dirahasiakan)" nama="pesan" baris={4} maks={3000} placeholder="Hanya dibaca guru BK." />
      <Input label="Waktu yang memungkinkan" nama="waktu" maks={150} placeholder="mis. Selasa/Kamis saat istirahat" />
      <Centang label="Mendesak — perlu segera ditemui" nama="mendesak" />
      <TombolSimpan>Kirim permintaan</TombolSimpan>
    </FormAksi>
  );
}

export function FormKasusBaru({ kategori, siswa, rujukan_id, asal }: { kategori: Opsi[]; siswa?: { id: string; nama: string; kelas: string | null }; rujukan_id?: string; asal: string }) {
  return (
    <FormAksi aksi={buatKasus} className="space-y-4">
      <input type="hidden" name="rujukan_id" value={rujukan_id ?? ""} />
      <input type="hidden" name="asesmen_sidik" value="" />
      <PilihSiswa awal={siswa} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Kategori" nama="kategori" opsi={kategori.map((k) => ({ nilai: k.id, label: k.nama }))} />
        <Pilihan label="Asal" nama="asal" nilai={asal} opsi={[{ nilai: "inisiatif_bk", label: "Inisiatif BK" }, { nilai: "rujukan_guru", label: "Rujukan guru/wali" }, { nilai: "pengaduan", label: "Pengaduan" }, { nilai: "permintaan", label: "Permintaan siswa/ortu" }]} />
        <Pilihan label="Prioritas" nama="prioritas" nilai="sedang" opsi={opsi(PRIORITAS_BK)} />
        <Pilihan label="Tingkat risiko (asesmen awal)" nama="risiko" nilai="rendah" opsi={opsi(RISIKO)} />
      </div>
      <TextArea label="🔒 Asesmen awal" nama="asesmen" baris={5} maks={5000} placeholder="Keluhan, latar belakang, faktor risiko & pelindung…" bantuan="Dienkripsi; hanya guru BK." />
      <TombolSimpan>Buka kasus</TombolSimpan>
    </FormAksi>
  );
}

export type DataKasus = { id: string; kategori: string; prioritas: string; risiko: string; status: string; konselor_id: string | null; saran_wali: string; asesmen: string; ringkasan: string; sidik_asesmen: string; sidik_ringkasan: string };
export function FormKasus({ d, kategori, konselor, terkunci }: { d: DataKasus; kategori: Opsi[]; konselor: Opsi[]; terkunci: boolean }) {
  return (
    <FormAksi aksi={simpanKasus} className="space-y-4">
      <input type="hidden" name="id" value={d.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Status" nama="status" nilai={d.status} opsi={opsi(STATUS_KASUS)} />
        <Pilihan label="Kategori" nama="kategori" nilai={d.kategori} opsi={kategori.map((k) => ({ nilai: k.id, label: k.nama }))} />
        <Pilihan label="Prioritas" nama="prioritas" nilai={d.prioritas} opsi={opsi(PRIORITAS_BK)} />
        <Pilihan label="Risiko" nama="risiko" nilai={d.risiko} opsi={opsi(RISIKO)} />
        <Pilihan label="Konselor" nama="konselor_id" nilai={d.konselor_id ?? ""} opsi={[{ nilai: "", label: "—" }, ...konselor.map((k) => ({ nilai: k.id, label: k.nama }))]} />
      </div>
      {!terkunci && <Rahasia label="Asesmen awal" nama="asesmen" nilai={d.asesmen} sidik={d.sidik_asesmen} maks={5000} />}
      {!terkunci && <Rahasia label="Ringkasan penutupan" nama="ringkasan" nilai={d.ringkasan} sidik={d.sidik_ringkasan} baris={3} maks={3000} placeholder="Wajib diisi saat kasus ditutup" />}
      <TextArea label="Saran untuk wali kelas (dibagikan)" nama="saran_wali" nilai={d.saran_wali} baris={2} maks={1000}
        bantuan="Terlihat oleh wali kelas siswa ini. Tulis hanya langkah pendampingan yang perlu ia lakukan — JANGAN isi konseling." />
      <TombolSimpan>Simpan kasus</TombolSimpan>
    </FormAksi>
  );
}

export type DataSesi = { id?: string; mulai: string; durasi_menit: number; jenis: string; mode: string; tempat: string; status: string; catatan: string; sidik: string };
export function FormSesi({ kasus_id, d }: { kasus_id: string; d?: DataSesi }) {
  return (
    <FormAksi aksi={simpanSesi} className="space-y-3">
      <input type="hidden" name="kasus_id" value={kasus_id} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Tanggal & jam (WIB)" nama="mulai" tipe="datetime-local" nilai={d?.mulai} />
        <Input label="Durasi (menit)" nama="durasi_menit" tipe="number" nilai={d?.durasi_menit ?? 45} />
        <Pilihan label="Status" nama="status" nilai={d?.status ?? "terjadwal"} opsi={opsi(STATUS_SESI)} />
        <Pilihan label="Jenis" nama="jenis" nilai={d?.jenis ?? "individu"} opsi={opsi(JENIS_SESI)} />
        <Pilihan label="Cara" nama="mode" nilai={d?.mode ?? "tatap_muka"} opsi={opsi(MODE_SESI)} />
        <Input label="Tempat" nama="tempat" nilai={d?.tempat ?? "Ruang BK"} maks={100} />
      </div>
      <Rahasia label="Catatan sesi" nama="catatan" nilai={d?.catatan ?? ""} sidik={d?.sidik ?? ""} baris={4} maks={5000} />
      <TombolSimpan>{d?.id ? "Simpan sesi" : "Jadwalkan sesi"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataTL = { id?: string; rencana: string; pihak: string; tenggat: string | null; status: string; hasil: string };
export function FormTindakLanjut({ kasus_id, d }: { kasus_id: string; d?: DataTL }) {
  return (
    <FormAksi aksi={simpanTindakLanjut} className="space-y-3">
      <input type="hidden" name="kasus_id" value={kasus_id} />
      {d?.id && <input type="hidden" name="id" value={d.id} />}
      <Input label="Rencana" nama="rencana" nilai={d?.rencana} maks={500} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Pihak" nama="pihak" nilai={d?.pihak ?? "BK"} maks={100} placeholder="BK / wali / ortu" />
        <Input label="Tenggat" nama="tenggat" tipe="date" nilai={d?.tenggat ?? ""} />
        <Pilihan label="Status" nama="status" nilai={d?.status ?? "rencana"} opsi={opsi(STATUS_TL)} />
      </div>
      {d?.id && <TextArea label="Hasil" nama="hasil" nilai={d.hasil} baris={2} maks={1000} />}
      <TombolSimpan>{d?.id ? "Simpan" : "Tambah tindak lanjut"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormRujukanLuar({ kasus_id, hari }: { kasus_id: string; hari: string }) {
  return (
    <FormAksi aksi={simpanRujukanLuar} className="space-y-3">
      <input type="hidden" name="kasus_id" value={kasus_id} />
      <input type="hidden" name="status" value="diajukan" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Lembaga" nama="lembaga" maks={150} placeholder="mis. Psikolog Puskesmas Cibiru" />
        <Pilihan label="Jenis" nama="jenis" opsi={opsi(JENIS_RUJUKAN_LUAR)} />
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hari} />
      </div>
      <TextArea label="Alasan rujukan" nama="alasan" baris={2} maks={500} />
      <TombolSimpan>Catat rujukan</TombolSimpan>
    </FormAksi>
  );
}

export function FormRetensi({ tahun }: { tahun: number }) {
  return (
    <FormAksi aksi={simpanPengaturanBk} className="flex flex-wrap items-end gap-3">
      <Input label="Masa simpan isi kasus setelah ditutup (tahun)" nama="retensi_tahun" tipe="number" nilai={tahun} />
      <TombolSimpan>Simpan</TombolSimpan>
    </FormAksi>
  );
}
