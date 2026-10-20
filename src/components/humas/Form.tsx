"use client";

import { catatKegiatanMitra, catatTamu, prosesPengaduan, simpanKemitraan, simpanKontakMedia, simpanSLA, simpanSurvei } from "@/app/admin/actions-humas";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan } from "@/components/admin/form";
import { JENIS_MEDIA, JENIS_MITRA, KATEGORI_ADUAN, SASARAN_SURVEI, STATUS_ADUAN, tulisPertanyaan, type Pertanyaan } from "@/lib/humas";

type Opsi = { id: string; nama: string };

export function FormProsesAduan({ d, guru }: { d: { id: string; status: string; kategori: string; pic_id: string | null; tenggat: string; tanggapan_publik: string; catatan_internal: string }; guru: Opsi[] }) {
  return (
    <FormAksi aksi={prosesPengaduan} className="space-y-4">
      <input type="hidden" name="id" value={d.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Status" nama="status" nilai={d.status} opsi={Object.entries(STATUS_ADUAN).map(([k, v]) => ({ nilai: k, label: v.label }))} />
        <Pilihan label="Kategori" nama="kategori" nilai={d.kategori} opsi={Object.entries(KATEGORI_ADUAN).map(([k, v]) => ({ nilai: k, label: v }))} />
        <Pilihan label="PIC (penanggung jawab)" nama="pic_id" nilai={d.pic_id ?? ""} opsi={[{ nilai: "", label: "— belum —" }, ...guru.map((g) => ({ nilai: g.id, label: g.nama }))]} />
        <Input label="Tenggat" nama="tenggat" tipe="date" nilai={d.tenggat} />
      </div>
      <TextArea label="Tanggapan untuk pelapor (terlihat lewat cek tiket)" nama="tanggapan_publik" nilai={d.tanggapan_publik} baris={4} maks={3000} />
      <TextArea label="Catatan internal (tidak terlihat pelapor)" nama="catatan_internal" nilai={d.catatan_internal} baris={3} maks={3000} />
      <TombolSimpan>Simpan</TombolSimpan>
    </FormAksi>
  );
}

export type DataMitra = { id: string; mitra: string; jenis: string; ruang_lingkup: string; nomor_dokumen: string; mulai: string | null; berakhir: string | null; pic_id: string | null; kontak_mitra: string; tautan_dokumen: string; tampil_publik: boolean; catatan: string; evaluasi: string };

export function FormMitra({ d, guru }: { d?: DataMitra; guru: Opsi[] }) {
  return (
    <FormAksi aksi={simpanKemitraan} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <Input label="Nama mitra" nama="mitra" nilai={d?.mitra} wajib maks={150} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Jenis" nama="jenis" nilai={d?.jenis ?? "pendidikan"} opsi={Object.entries(JENIS_MITRA).map(([k, v]) => ({ nilai: k, label: v }))} />
        <Input label="Nomor dokumen MoU/PKS" nama="nomor_dokumen" nilai={d?.nomor_dokumen} maks={100} />
        <Input label="Mulai" nama="mulai" tipe="date" nilai={d?.mulai ?? ""} />
        <Input label="Berakhir" nama="berakhir" tipe="date" nilai={d?.berakhir ?? ""} bantuan="Diingatkan 30 hari sebelum berakhir" />
        <Pilihan label="PIC sekolah" nama="pic_id" nilai={d?.pic_id ?? ""} opsi={[{ nilai: "", label: "—" }, ...guru.map((g) => ({ nilai: g.id, label: g.nama }))]} />
        <Input label="Kontak mitra" nama="kontak_mitra" nilai={d?.kontak_mitra} maks={150} />
      </div>
      <TextArea label="Ruang lingkup" nama="ruang_lingkup" nilai={d?.ruang_lingkup} baris={3} maks={1000} placeholder="mis. PKL, guru tamu, beasiswa, penelitian" />
      <Input label="Tautan dokumen (Drive)" nama="tautan_dokumen" nilai={d?.tautan_dokumen} placeholder="https://" />
      <TextArea label="Catatan" nama="catatan" nilai={d?.catatan} baris={2} maks={1000} />
      {d && <TextArea label="Evaluasi kemitraan" nama="evaluasi" nilai={d.evaluasi} baris={3} maks={2000} placeholder="Manfaat, kendala, rekomendasi lanjut/tidak saat MoU berakhir" />}
      <Centang label="Tampilkan nama mitra di website" nama="tampil_publik" nilai={d?.tampil_publik} />
      <TombolSimpan>{d ? "Simpan" : "Tambah kemitraan"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormTamu({ guru }: { guru: Opsi[] }) {
  return (
    <FormAksi aksi={catatTamu} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nama tamu" nama="nama" wajib maks={120} />
        <Input label="Instansi / asal" nama="instansi" maks={150} />
        <Input label="No. HP" nama="telepon" maks={30} />
        <Input label="Jumlah orang" nama="jumlah" tipe="number" nilai={1} />
      </div>
      <Input label="Keperluan" nama="keperluan" wajib maks={300} />
      <Pilihan label="Ingin bertemu" nama="bertemu_id" opsi={[{ nilai: "", label: "— tidak spesifik —" }, ...guru.map((g) => ({ nilai: g.id, label: g.nama }))]} />
      <TombolSimpan>Catat & beri tahu</TombolSimpan>
    </FormAksi>
  );
}

export function FormSLA({ sla }: { sla: Record<string, number> }) {
  return (
    <FormAksi aksi={simpanSLA} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(KATEGORI_ADUAN).map(([k, v]) => <Input key={k} label={v} nama={`sla_${k}`} tipe="number" nilai={sla[k] ?? 7} />)}
      </div>
      <p className="text-xs text-black/50">Dalam hari kalender sejak pengaduan masuk. Permohonan informasi publik: UU KIP memberi 10 hari kerja.</p>
      <TombolSimpan>Simpan SLA</TombolSimpan>
    </FormAksi>
  );
}

export function FormKegiatanMitra({ kemitraan_id, hari }: { kemitraan_id: string; hari: string }) {
  return (
    <FormAksi aksi={catatKegiatanMitra} className="space-y-3">
      <input type="hidden" name="kemitraan_id" value={kemitraan_id} />
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hari} />
        <Input label="Kegiatan" nama="kegiatan" maks={300} placeholder="mis. Kuliah tamu, kunjungan industri, PKL" />
      </div>
      <TextArea label="Hasil / catatan evaluasi" nama="hasil" baris={2} maks={2000} />
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <Pilihan label="Nilai manfaat" nama="nilai" opsi={[{ nilai: "", label: "—" }, ...[5, 4, 3, 2, 1].map((n) => ({ nilai: String(n), label: `${n} ${"★".repeat(n)}` }))]} />
        <Input label="Tautan dokumentasi" nama="tautan_dokumentasi" placeholder="https://" />
      </div>
      <TombolSimpan>Catat kegiatan</TombolSimpan>
    </FormAksi>
  );
}

export type DataMedia = { id: string; nama: string; media: string; jenis: string; telepon: string; email: string; catatan: string };
export function FormKontakMedia({ d }: { d?: DataMedia }) {
  return (
    <FormAksi aksi={simpanKontakMedia} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nama" nama="nama" nilai={d?.nama} wajib maks={120} />
        <Input label="Media / instansi" nama="media" nilai={d?.media} maks={120} />
        <Pilihan label="Jenis" nama="jenis" nilai={d?.jenis ?? "online"} opsi={Object.entries(JENIS_MEDIA).map(([k, v]) => ({ nilai: k, label: v }))} />
        <Input label="No. HP" nama="telepon" nilai={d?.telepon} maks={30} />
        <Input label="Email" nama="email" tipe="email" nilai={d?.email} maks={150} />
      </div>
      <TextArea label="Catatan" nama="catatan" nilai={d?.catatan} baris={2} maks={500} placeholder="mis. desk pendidikan, liputan terakhir" />
      <TombolSimpan>{d ? "Simpan" : "Tambah kontak"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataSurvei = { id: string; judul: string; deskripsi: string; sasaran: string; mulai: string; selesai: string; terbit: boolean; pertanyaan: Pertanyaan[]; angkatan?: number[] };
export function FormSurveiAdmin({ d, terkunci, hari, tracer }: { d?: DataSurvei; terkunci?: boolean; hari: string; tracer?: boolean }) {
  return (
    <FormAksi aksi={simpanSurvei} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <Input label="Judul survei" nama="judul" nilai={d?.judul} wajib maks={150} placeholder="mis. Survei Kepuasan Layanan TU Semester Ganjil" />
      <TextArea label="Pengantar" nama="deskripsi" nilai={d?.deskripsi} baris={2} maks={2000} />
      <div className="grid gap-4 sm:grid-cols-3">
        {tracer ? <input type="hidden" name="sasaran" value="alumni" /> : <Pilihan label="Responden" nama="sasaran" nilai={d?.sasaran ?? "publik"} opsi={Object.entries(SASARAN_SURVEI).map(([k, v]) => ({ nilai: k, label: v }))} />}
        <Input label="Mulai" nama="mulai" tipe="date" nilai={d?.mulai ?? hari} />
        <Input label="Selesai" nama="selesai" tipe="date" nilai={d?.selesai} />
      </div>
      {(tracer || d?.sasaran === "alumni") && <Input label="Untuk angkatan (tahun lulus)" nama="angkatan" nilai={(d?.angkatan ?? []).join(", ")} placeholder="mis. 2023, 2024 — kosongkan untuk semua angkatan" />}
      {terkunci ? (
        <p className="rounded-xl bg-soft p-3 text-sm">Pertanyaan terkunci karena sudah ada jawaban.</p>
      ) : (
        <TextArea label="Pertanyaan (satu per baris)" nama="pertanyaan" nilai={d ? tulisPertanyaan(d.pertanyaan) : ""} baris={8}
          placeholder={"S: Seberapa puas Anda dengan pelayanan TU?\nP: Layanan yang digunakan | Legalisir | Mutasi | Surat keterangan\nT?: Saran perbaikan"}
          bantuan="S: skala 1–5 · P: pilihan (pisahkan dengan |) · T: isian bebas · tambahkan ? setelah huruf (mis. T?:) bila tidak wajib" />
      )}
      <Centang label="Terbitkan (dapat diisi dalam rentang tanggal)" nama="terbit" nilai={d?.terbit} />
      <TombolSimpan>{d ? "Simpan" : "Buat survei"}</TombolSimpan>
    </FormAksi>
  );
}
