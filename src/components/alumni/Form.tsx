"use client";

import { useActionState } from "react";
import { ajukanMentoring, daftarAlumni, imporLulusan, simpanAcaraAlumni, simpanAngkatan, simpanPeluang, simpanProfilAlumni, tawarkanKontribusi, tawarkanMentor, tulisCerita } from "@/app/admin/actions-alumni";
import type { HasilAksi } from "@/app/admin/actions";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan, useKirim } from "@/components/admin/form";
import { FIELD_DIREKTORI, JENIS_KONTRIBUSI, JENIS_PELUANG, KEBIJAKAN_PRIVASI, SASARAN_PELUANG, STATUS_KEGIATAN } from "@/lib/alumni";

const opsi = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => ({ nilai: k, label: v }));
const inp = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-muted focus:ring-4 focus:ring-muted/10";

export function FormDaftarAlumni() {
  const [hasil, aksi, proses] = useActionState<HasilAksi, FormData>(daftarAlumni, { ok: false, pesan: "" });
  const kirim = useKirim(aksi);
  const e = hasil.errors ?? {};
  if (hasil.ok) return <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200"><p className="text-2xl">Pendaftaran terkirim</p><p className="mt-2">{hasil.pesan}</p></div>;
  const f = (nama: string, label: string, props: Record<string, unknown> = {}) => (
    <label className="block text-sm font-semibold">{label}<input name={nama} className={`${inp} mt-1.5 font-normal`} aria-invalid={Boolean(e[nama])} {...props} />{e[nama] && <span className="mt-1 block text-blue-teks">{e[nama]}</span>}</label>
  );
  return (
    <form onSubmit={kirim} className="space-y-4" noValidate>
      {hasil.pesan && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{hasil.pesan}</p>}
      <div className="hidden" aria-hidden><label>Situs web<input name="situs_web" tabIndex={-1} autoComplete="off" /></label></div>
      {f("nama", "Nama lengkap (sesuai ijazah)", { maxLength: 120 })}
      <div className="grid gap-4 sm:grid-cols-2">
        {f("tahun_lulus", "Tahun lulus", { type: "number", min: 1980, max: 2100 })}
        {f("jurusan", "Jurusan / peminatan", { maxLength: 40, placeholder: "mis. IPA, IPS" })}
        {f("nisn", "NISN (bila ingat)", { inputMode: "numeric", maxLength: 10 })}
        {f("tanggal_lahir", "Tanggal lahir", { type: "date" })}
        {f("kelas_terakhir", "Kelas terakhir", { maxLength: 20, placeholder: "mis. XII-3" })}
        {f("telepon", "No. HP (opsional)", { maxLength: 30 })}
      </div>
      {f("email", "Email (untuk masuk)", { type: "email", maxLength: 150 })}
      <div className="rounded-xl bg-soft p-4 text-sm">
        <p className="font-semibold">Kebijakan privasi alumni</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-black/70">{KEBIJAKAN_PRIVASI.map((k) => <li key={k}>{k}</li>)}</ul>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="setuju" className="mt-1 h-5 w-5" /> <span>Saya menyetujui kebijakan privasi di atas dan menyatakan data yang saya isi benar.{e.setuju && <span className="block text-blue-teks">{e.setuju}</span>}</span></label>
      <button disabled={proses} className="rounded-full bg-ink px-6 py-3 font-semibold text-white disabled:opacity-60">{proses ? "Mengirim…" : "Daftar sebagai alumni"}</button>
    </form>
  );
}

export type DataProfil = { id: string; jurusan: string; telepon: string; kota: string; status_kegiatan: string; institusi: string; bidang: string; jabatan: string; tautan_profesional: string; bio: string; tampil_direktori: boolean; field_direktori: string[] };
export function FormProfilAlumni({ d }: { d: DataProfil }) {
  return (
    <FormAksi aksi={simpanProfilAlumni} className="space-y-4">
      <input type="hidden" name="id" value={d.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Kegiatan saat ini" nama="status_kegiatan" nilai={d.status_kegiatan} opsi={opsi(STATUS_KEGIATAN)} />
        <Input label="Kampus / tempat kerja" nama="institusi" nilai={d.institusi} maks={150} />
        <Input label="Prodi / bidang" nama="bidang" nilai={d.bidang} maks={120} />
        <Input label="Jabatan" nama="jabatan" nilai={d.jabatan} maks={120} />
        <Input label="Kota domisili" nama="kota" nilai={d.kota} maks={80} />
        <Input label="Jurusan SMA" nama="jurusan" nilai={d.jurusan} maks={40} />
        <Input label="No. HP" nama="telepon" nilai={d.telepon} maks={30} />
        <Input label="Tautan profesional" nama="tautan_profesional" nilai={d.tautan_profesional} placeholder="https://linkedin.com/in/…" />
      </div>
      <TextArea label="Bio singkat" nama="bio" nilai={d.bio} baris={3} maks={1000} />
      <fieldset className="rounded-xl p-4 ring-1 ring-black/10">
        <legend className="px-1 text-sm font-semibold">Privasi direktori alumni</legend>
        <Centang label="Tampilkan saya di direktori (hanya dilihat alumni terverifikasi & pengelola alumni)" nama="tampil_direktori" nilai={d.tampil_direktori} />
        <p className="mt-3 text-sm text-black/60">Nama & tahun lulus selalu tampil bila Anda ikut direktori. Pilih kolom lain yang boleh dilihat:</p>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(FIELD_DIREKTORI).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="field_direktori" value={k} defaultChecked={d.field_direktori.includes(k)} className="h-4 w-4" /> {v}</label>
        ))}</div>
      </fieldset>
      <TombolSimpan>Simpan profil</TombolSimpan>
    </FormAksi>
  );
}

export function FormPeluang({ admin }: { admin?: boolean }) {
  return (
    <FormAksi aksi={simpanPeluang} className="space-y-3">
      <Input label="Judul" nama="judul" maks={150} placeholder="mis. Beasiswa KIP Kuliah 2027" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Pilihan label="Jenis" nama="jenis" opsi={opsi(JENIS_PELUANG)} />
        <Pilihan label="Untuk" nama="sasaran" nilai={admin ? "keduanya" : "alumni"} opsi={opsi(SASARAN_PELUANG)} />
        <Input label="Tenggat" nama="tenggat" tipe="date" />
      </div>
      <Input label="Penyedia" nama="penyedia" maks={150} />
      <TextArea label="Keterangan" nama="deskripsi" baris={3} maks={2000} />
      <Input label="Tautan informasi" nama="tautan" placeholder="https://" />
      <TombolSimpan>{admin ? "Tayangkan" : "Kirim untuk ditinjau"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormAcaraAlumni() {
  return (
    <FormAksi aksi={simpanAcaraAlumni} className="space-y-3">
      <Input label="Nama acara" nama="judul" maks={150} placeholder="mis. Reuni Akbar & Temu Alumni" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Waktu (WIB)" nama="mulai" tipe="datetime-local" />
        <Input label="Tempat" nama="tempat" maks={150} />
        <Input label="Kuota (0 = bebas)" nama="kuota" tipe="number" nilai={0} />
      </div>
      <Input label="Untuk angkatan (kosongkan untuk semua)" nama="untuk_angkatan" placeholder="mis. 2016, 2021" />
      <TextArea label="Keterangan" nama="deskripsi" baris={3} maks={2000} />
      <Centang label="Tampilkan di halaman alumni website" nama="publik" />
      <TombolSimpan>Simpan acara</TombolSimpan>
    </FormAksi>
  );
}

export function FormMentor() {
  return (
    <FormAksi aksi={tawarkanMentor} className="space-y-3">
      <Input label="Bidang yang bisa dibagikan" nama="bidang" maks={150} placeholder="mis. Kuliah teknik, dunia startup, SNBT" />
      <TextArea label="Keterangan untuk siswa" nama="deskripsi" baris={3} maks={1000} />
      <Input label="Maks. siswa sekaligus" nama="kuota" tipe="number" nilai={3} />
      <p className="text-xs text-black/50">Pertemuan dengan siswa difasilitasi sekolah (BK). Data kontak Anda tidak diberikan langsung kepada siswa.</p>
      <TombolSimpan>Tawarkan diri menjadi mentor</TombolSimpan>
    </FormAksi>
  );
}

export function FormKontribusi() {
  return (
    <FormAksi aksi={tawarkanKontribusi} className="space-y-3">
      <Pilihan label="Bentuk kontribusi" nama="jenis" opsi={opsi(JENIS_KONTRIBUSI)} />
      <TextArea label="Keterangan" nama="deskripsi" baris={3} maks={1000} />
      <Input label="Nama yang ditampilkan (bila diizinkan tampil)" nama="nama_tampil" maks={120} placeholder="mis. Keluarga Alumni 2010" />
      <Centang label="Boleh ditampilkan di website setelah diterima sekolah" nama="tampil_publik" />
      <TombolSimpan>Kirim</TombolSimpan>
    </FormAksi>
  );
}

export function FormCerita() {
  return (
    <FormAksi aksi={tulisCerita} className="space-y-3">
      <Input label="Judul" nama="judul" maks={150} />
      <TextArea label="Cerita" nama="isi" baris={6} maks={5000} placeholder="Perjalanan setelah lulus, pesan untuk adik kelas…" />
      <Input label="Foto (tautan https, opsional)" nama="foto_url" placeholder="https://" />
      <Centang label="Saya mengizinkan cerita, nama, dan tahun lulus saya ditampilkan di website sekolah" nama="izin_publik" />
      <TombolSimpan>Kirim cerita</TombolSimpan>
    </FormAksi>
  );
}

export function FormAjukanMentoring({ mentor }: { mentor: string }) {
  return (
    <FormAksi aksi={ajukanMentoring} className="space-y-2">
      <input type="hidden" name="mentor_id" value={mentor} />
      <TextArea label="Apa yang ingin kamu tanyakan?" nama="topik" baris={2} maks={500} />
      <TombolSimpan>Ajukan</TombolSimpan>
    </FormAksi>
  );
}

export function FormImporLulusan({ tahun }: { tahun: number }) {
  return (
    <FormAksi aksi={imporLulusan} className="flex flex-wrap items-end gap-3">
      <Input label="Tahun lulus" nama="tahun" tipe="number" nilai={tahun} />
      <TombolSimpan>Buat profil dari data lulusan</TombolSimpan>
    </FormAksi>
  );
}

export function FormAngkatan() {
  return (
    <FormAksi aksi={simpanAngkatan} className="grid gap-3 sm:grid-cols-[120px_1fr_1fr]">
      <Input label="Tahun" nama="tahun" tipe="number" />
      <Input label="Nama angkatan" nama="nama" maks={80} placeholder="mis. Angkatan 2016 — Satyagraha" />
      <Input label="Koordinator" nama="koordinator" maks={120} />
      <div className="sm:col-span-3"><TombolSimpan>Simpan angkatan</TombolSimpan></div>
    </FormAksi>
  );
}
