"use client";

import { simpanCp, simpanProjek, simpanStruktur, simpanTp, unggahPerangkatAjar, jadwalkanSupervisi, buatMateri } from "@/app/admin/actions-kurikulum";
import { FormAksi, Input, Pilihan, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { DIMENSI, JENIS_PERANGKAT, KELOMPOK, TEMA_KOKURIKULER } from "@/lib/kurikulum";

type Opsi = { id: string; nama: string };
const opsi = (l: Opsi[], kosong?: string) => [...(kosong ? [{ nilai: "", label: kosong }] : []), ...l.map((x) => ({ nilai: x.id, label: x.nama }))];

export function FormStruktur({ tingkat, mapel }: { tingkat: string; mapel: Opsi[] }) {
  return (
    <FormAksi aksi={simpanStruktur} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_100px] sm:items-end">
      <input type="hidden" name="tingkat" value={tingkat} />
      <Pilihan label="Mata pelajaran" nama="mapel_id" opsi={opsi(mapel)} />
      <Pilihan label="Kelompok" nama="kelompok" opsi={Object.entries(KELOMPOK).map(([k, v]) => ({ nilai: k, label: v }))} />
      <Input label="JP/minggu" nama="jp_minggu" tipe="number" nilai={2} wajib />
      <div className="sm:col-span-2"><Input label="Keterangan (opsional)" nama="keterangan" maks={200} placeholder="mis. dipilih paket MIPA" /></div>
      <TombolSimpan>Simpan</TombolSimpan>
    </FormAksi>
  );
}

export function FormCp({ mapel_id, fase, data }: { mapel_id: string; fase: string; data?: { id: string; elemen: string; deskripsi: string; urutan: number } }) {
  return (
    <FormAksi aksi={simpanCp} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="mapel_id" value={mapel_id} />
      <input type="hidden" name="fase" value={fase} />
      <div className="grid gap-4 sm:grid-cols-[1fr_90px]">
        <Input label="Elemen" nama="elemen" nilai={data?.elemen} wajib maks={120} placeholder="mis. Keterampilan proses" />
        <Input label="Urutan" nama="urutan" tipe="number" nilai={data?.urutan ?? 0} />
      </div>
      <TextArea label="Capaian pembelajaran" nama="deskripsi" nilai={data?.deskripsi} baris={4} wajib maks={3000} />
      <TombolSimpan>{data ? "Simpan" : "Tambah elemen CP"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataTp = { id: string; kode: string; elemen: string; deskripsi: string; kktp: string; alokasi_jp: number; semester: number; tingkat: string; urutan: number };

export function FormTp({ mapel_id, tingkatOpsi, data }: { mapel_id: string; tingkatOpsi: string[]; data?: DataTp }) {
  return (
    <FormAksi aksi={simpanTp} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="mapel_id" value={mapel_id} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Pilihan label="Kelas" nama="tingkat" nilai={data?.tingkat ?? tingkatOpsi[0]} opsi={tingkatOpsi.map((t) => ({ nilai: t, label: t }))} />
        <Pilihan label="Semester" nama="semester" nilai={String(data?.semester ?? 1)} opsi={[{ nilai: "1", label: "1" }, { nilai: "2", label: "2" }]} />
        <Input label="Kode" nama="kode" nilai={data?.kode} maks={20} placeholder="TP 1" />
        <Input label="Alokasi JP" nama="alokasi_jp" tipe="number" nilai={data?.alokasi_jp ?? 0} />
      </div>
      <Input label="Elemen" nama="elemen" nilai={data?.elemen} maks={120} />
      <TextArea label="Tujuan pembelajaran" nama="deskripsi" nilai={data?.deskripsi} baris={2} wajib maks={500} placeholder="Peserta didik mampu …" />
      <TextArea label="KKTP (kriteria ketercapaian)" nama="kktp" nilai={data?.kktp} baris={2} maks={1000} placeholder="Pisahkan tiap kriteria dengan titik koma" />
      <input type="hidden" name="urutan" value={data?.urutan ?? 0} />
      <TombolSimpan>{data ? "Simpan TP" : "Tambah TP"}</TombolSimpan>
    </FormAksi>
  );
}

function InputBerkas() {
  const error = useErrorKolom("berkas");
  return (
    <div>
      <label htmlFor="berkas" className="mb-1.5 block text-sm font-semibold">Berkas</label>
      <input id="berkas" name="berkas" type="file" accept=".pdf,.docx,.pptx,.xlsx,image/*" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:py-2 file:text-white" />
      <p className={`mt-1.5 text-xs ${error ? "text-merah" : "text-black/50"}`}>{error ?? "PDF, Word, PowerPoint, Excel, atau foto — maksimal 4 MB. Lebih besar? Pakai tautan Google Drive di bawah."}</p>
    </div>
  );
}

export function FormPerangkat({ tugas, semester }: { tugas: { mapel_id: string; mapel: string; tingkat: string }[]; semester: number }) {
  return (
    <FormAksi aksi={unggahPerangkatAjar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan label="Jenis" nama="jenis" nilai="modul_ajar" opsi={Object.entries(JENIS_PERANGKAT).map(([k, v]) => ({ nilai: k, label: v }))} />
        <Pilihan label="Semester" nama="semester" nilai={String(semester)} opsi={[{ nilai: "1", label: "Semester 1" }, { nilai: "2", label: "Semester 2" }]} />
      </div>
      <MapelTingkat tugas={tugas} />
      <Input label="Judul" nama="judul" wajib maks={150} placeholder="mis. Modul Ajar Dinamika Litosfer" />
      <InputBerkas />
      <Input label="Tautan (opsional)" nama="tautan" placeholder="https://drive.google.com/…" bantuan="Pastikan tautan Google Drive bisa dibuka oleh pemeriksa." />
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="ajukan" value="1" className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white">Unggah & ajukan</button>
        <button type="submit" name="ajukan" value="0" className="rounded-full px-6 py-3 font-semibold ring-1 ring-black/15">Simpan draf</button>
      </div>
    </FormAksi>
  );
}

/** pilih pasangan mapel + tingkat dari penugasan guru */
function MapelTingkat({ tugas }: { tugas: { mapel_id: string; mapel: string; tingkat: string }[] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold">Mapel & kelas</span>
      <select
        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3"
        onChange={(e) => {
          const [m, t] = e.target.value.split("|");
          const f = e.target.form!;
          (f.elements.namedItem("mapel_id") as HTMLInputElement).value = m;
          (f.elements.namedItem("tingkat") as HTMLInputElement).value = t;
        }}
        defaultValue={tugas[0] ? `${tugas[0].mapel_id}|${tugas[0].tingkat}` : ""}
      >
        {tugas.map((t) => <option key={`${t.mapel_id}|${t.tingkat}`} value={`${t.mapel_id}|${t.tingkat}`}>{t.mapel} — kelas {t.tingkat}</option>)}
      </select>
      <input type="hidden" name="mapel_id" defaultValue={tugas[0]?.mapel_id} />
      <input type="hidden" name="tingkat" defaultValue={tugas[0]?.tingkat} />
    </label>
  );
}

export type DataProjek = {
  id: string; judul: string; tema: string; dimensi: string[]; deskripsi: string; tingkat: string; semester: number;
  koordinator_id: string | null; mulai: string; selesai: string; alokasi_jp: number; kelas: { kelas_id: string; fasilitator_id: string | null }[];
};

export function FormProjek({ data, guru, kelas, semester }: { data?: DataProjek; guru: Opsi[]; kelas: (Opsi & { tingkat: string })[]; semester: number }) {
  const err = useErrorKolom("dimensi");
  return (
    <FormAksi aksi={simpanProjek} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <Input label="Judul projek" nama="judul" nilai={data?.judul} wajib maks={150} placeholder="mis. Bandung Bebas Sampah Plastik" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Pilihan label="Tema" nama="tema" nilai={data?.tema ?? TEMA_KOKURIKULER[0]} opsi={TEMA_KOKURIKULER.map((t) => ({ nilai: t, label: t }))} />
        <Pilihan label="Kelas" nama="tingkat" nilai={data?.tingkat ?? "X"} opsi={["X", "XI", "XII"].map((t) => ({ nilai: t, label: t }))} />
        <Pilihan label="Semester" nama="semester" nilai={String(data?.semester ?? semester)} opsi={[{ nilai: "1", label: "1" }, { nilai: "2", label: "2" }]} />
        <Input label="Mulai" nama="mulai" tipe="date" nilai={data?.mulai} wajib />
        <Input label="Selesai" nama="selesai" tipe="date" nilai={data?.selesai} wajib />
        <Input label="Alokasi JP" nama="alokasi_jp" tipe="number" nilai={data?.alokasi_jp ?? 0} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Dimensi profil lulusan</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {Object.entries(DIMENSI).map(([k, v]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="dimensi" value={k} defaultChecked={data?.dimensi.includes(k)} className="h-4 w-4 accent-brand-800" /> {v}
            </label>
          ))}
        </div>
        {err && <p className="mt-1 text-sm text-merah">{err}</p>}
      </fieldset>
      <Pilihan label="Koordinator" nama="koordinator_id" nilai={data?.koordinator_id ?? ""} opsi={opsi(guru, "— belum ditentukan —")} />
      <TextArea label="Deskripsi & alur kegiatan" nama="deskripsi" nilai={data?.deskripsi} baris={4} maks={3000} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Kelas peserta & fasilitator</legend>
        <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl p-2 ring-1 ring-black/10">
          {kelas.map((k) => {
            const ada = data?.kelas.find((x) => x.kelas_id === k.id);
            return (
              <li key={k.id} className="grid grid-cols-[110px_1fr] items-center gap-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="kelas" value={k.id} defaultChecked={Boolean(ada)} className="h-4 w-4" /> {k.nama}</label>
                <select name={`fasilitator_${k.id}`} defaultValue={ada?.fasilitator_id ?? ""} aria-label={`Fasilitator ${k.nama}`} className="rounded-lg border border-black/15 bg-white px-2 py-1.5">
                  <option value="">— fasilitator —</option>
                  {guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <TombolSimpan>{data ? "Simpan projek" : "Tambah projek"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormJadwalSupervisi({ guru, semester, hariIni }: { guru: Opsi[]; semester: number; hariIni: string }) {
  return (
    <FormAksi aksi={jadwalkanSupervisi} className="space-y-4">
      <Pilihan label="Guru yang disupervisi" nama="pegawai_id" opsi={opsi(guru, "— pilih —")} />
      <Pilihan label="Supervisor" nama="supervisor_id" opsi={opsi(guru, "— pilih —")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tanggal" nama="tanggal" tipe="date" nilai={hariIni} wajib />
        <Pilihan label="Semester" nama="semester" nilai={String(semester)} opsi={[{ nilai: "1", label: "1" }, { nilai: "2", label: "2" }]} />
      </div>
      <TombolSimpan>Jadwalkan</TombolSimpan>
    </FormAksi>
  );
}

export function FormMateriBaru({ mapel }: { mapel: Opsi[] }) {
  return (
    <FormAksi aksi={buatMateri} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
      <Pilihan label="Mapel" nama="mapel_id" opsi={opsi(mapel)} />
      <Input label="Judul materi" nama="judul" wajib maks={150} placeholder="mis. Dinamika Litosfer" />
      <TombolSimpan>Buat</TombolSimpan>
    </FormAksi>
  );
}
