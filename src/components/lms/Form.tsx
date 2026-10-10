"use client";

import { useState, useTransition } from "react";
import { aiSoalKuis, kumpulTugas, nilaiTugas, simpanKuis, simpanSoal, simpanSoalBanyak, simpanTugas, type DrafSoal } from "@/app/admin/actions-lms";
import { Centang, FormAksi, Input, Pilihan, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";

type Kelas = { id: string; nama: string };

function PilihKelas({ kelas, terpilih }: { kelas: Kelas[]; terpilih: string[] }) {
  const err = useErrorKolom("kelas");
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Kelas</legend>
      <div className="flex flex-wrap gap-2">
        {kelas.map((k) => (
          <label key={k.id} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10 has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-600">
            <input type="checkbox" name="kelas" value={k.id} defaultChecked={terpilih.includes(k.id)} /> {k.nama}
          </label>
        ))}
      </div>
      {err && <p className="mt-1 text-sm text-merah">{err}</p>}
    </fieldset>
  );
}

export type DataTugas = { id: string; judul: string; instruksi: string; tautan: string; tenggat: string; nilai_maks: number; terima_terlambat: boolean; terbit: boolean; kelas: string[] };

export function FormTugas({ mapel_id, kelas, data, tenggatAwal, kelasAwal }: { mapel_id: string; kelas: Kelas[]; data?: DataTugas; tenggatAwal: string; kelasAwal?: string }) {
  return (
    <FormAksi aksi={simpanTugas} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="mapel_id" value={mapel_id} />
      <Input label="Judul tugas" nama="judul" nilai={data?.judul} wajib maks={150} placeholder="mis. Peta sebaran gunung api Jawa Barat" />
      <TextArea label="Instruksi" nama="instruksi" nilai={data?.instruksi} baris={5} maks={5000} />
      <Input label="Tautan pendukung (opsional)" nama="tautan" nilai={data?.tautan} placeholder="https://" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tenggat (WIB)" nama="tenggat" tipe="datetime-local" nilai={data?.tenggat ?? tenggatAwal} wajib />
        <Input label="Nilai maksimal" nama="nilai_maks" tipe="number" nilai={data?.nilai_maks ?? 100} />
      </div>
      <PilihKelas kelas={kelas} terpilih={data?.kelas ?? (kelasAwal ? [kelasAwal] : kelas.length === 1 ? [kelas[0].id] : [])} />
      <Centang label="Terima pengumpulan terlambat" nama="terima_terlambat" nilai={data?.terima_terlambat ?? true} bantuan="Ditandai “terlambat” untuk guru." />
      <Centang label="Terbitkan ke siswa" nama="terbit" nilai={data?.terbit ?? false} bantuan="Siswa kelas terpilih diberi tahu di lonceng portal." />
      <TombolSimpan>{data ? "Simpan tugas" : "Buat tugas"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataKuis = { id: string; judul: string; petunjuk: string; mulai: string; selesai: string; durasi_menit: number; acak: boolean; tampil_hasil: string; terbit: boolean; kelas: string[] };

export function FormKuis({ mapel_id, kelas, data, mulaiAwal, selesaiAwal, kelasAwal }: { mapel_id: string; kelas: Kelas[]; data?: DataKuis; mulaiAwal: string; selesaiAwal: string; kelasAwal?: string }) {
  return (
    <FormAksi aksi={simpanKuis} className="space-y-4">
      {data && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="mapel_id" value={mapel_id} />
      <Input label="Judul kuis" nama="judul" nilai={data?.judul} wajib maks={150} placeholder="mis. Kuis Dinamika Litosfer" />
      <TextArea label="Petunjuk" nama="petunjuk" nilai={data?.petunjuk} baris={2} maks={2000} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Dibuka (WIB)" nama="mulai" tipe="datetime-local" nilai={data?.mulai ?? mulaiAwal} wajib />
        <Input label="Ditutup (WIB)" nama="selesai" tipe="datetime-local" nilai={data?.selesai ?? selesaiAwal} wajib />
        <Input label="Durasi (menit)" nama="durasi_menit" tipe="number" nilai={data?.durasi_menit ?? 30} />
      </div>
      <Pilihan label="Nilai & pembahasan tampil" nama="tampil_hasil" nilai={data?.tampil_hasil ?? "setelah_tutup"}
        opsi={[{ nilai: "setelah_tutup", label: "Setelah kuis ditutup (mencegah contek)" }, { nilai: "langsung", label: "Langsung setelah siswa selesai" }]} />
      <PilihKelas kelas={kelas} terpilih={data?.kelas ?? (kelasAwal ? [kelasAwal] : kelas.length === 1 ? [kelas[0].id] : [])} />
      <Centang label="Acak urutan soal per siswa" nama="acak" nilai={data?.acak ?? true} />
      {data && <Centang label="Terbitkan ke siswa" nama="terbit" nilai={data.terbit} bantuan="Butuh minimal 1 soal. Siswa diberi tahu." />}
      <TombolSimpan>{data ? "Simpan pengaturan" : "Buat kuis & lanjut isi soal"}</TombolSimpan>
    </FormAksi>
  );
}

export type DataSoal = { id: string; pertanyaan: string; pilihan: string[]; kunci: number; pembahasan: string; bobot: number; urutan: number };

export function FormSoal({ kuis_id, data, urutan }: { kuis_id: string; data?: DataSoal; urutan: number }) {
  const [kunci, setKunci] = useState(data?.kunci ?? 0);
  return (
    <FormAksi aksi={simpanSoal} className="space-y-3">
      <input type="hidden" name="kuis_id" value={kuis_id} />
      {data && <input type="hidden" name="id" value={data.id} />}
      <input type="hidden" name="urutan" value={data?.urutan ?? urutan} />
      <input type="hidden" name="kunci" value={kunci} />
      <TextArea label="Pertanyaan" nama="pertanyaan" nilai={data?.pertanyaan} baris={3} wajib maks={2000} />
      <fieldset className="space-y-1.5 text-sm">
        <legend className="mb-1 font-semibold">Pilihan jawaban (pilih kunci)</legend>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="kunci_radio" checked={kunci === i} onChange={() => setKunci(i)} aria-label={`Kunci ${String.fromCharCode(65 + i)}`} />
            <span className="w-5 font-bold">{String.fromCharCode(65 + i)}</span>
            <input name={`pilihan_${i}`} defaultValue={data?.pilihan[i] ?? ""} maxLength={300} placeholder={i >= 4 ? "(opsional)" : ""} className="w-full rounded-xl border border-black/15 bg-white px-3 py-2" />
          </div>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
        <TextArea label="Pembahasan (opsional)" nama="pembahasan" nilai={data?.pembahasan} baris={2} maks={1000} />
        <Input label="Bobot" nama="bobot" tipe="number" nilai={data?.bobot ?? 1} />
      </div>
      <TombolSimpan>{data ? "Simpan soal" : "Tambah soal"}</TombolSimpan>
    </FormAksi>
  );
}

/** Draf soal dari AI → pilih → simpan */
export function AiSoal({ kuis_id }: { kuis_id: string }) {
  const [topik, setTopik] = useState("");
  const [jumlah, setJumlah] = useState(5);
  const [tingkat, setTingkat] = useState<"mudah" | "sedang" | "HOTS">("sedang");
  const [hasil, setHasil] = useState<DrafSoal[] | null>(null);
  const [pilih, setPilih] = useState<Set<number>>(new Set());
  const [pesan, setPesan] = useState("");
  const [proses, mulai] = useTransition();
  const kelas = "rounded-xl border border-black/15 bg-white px-3 py-2";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="min-w-64 flex-1">Topik / TP<textarea value={topik} onChange={(e) => setTopik(e.target.value)} rows={2} maxLength={1000} className={`${kelas} mt-1 w-full`} placeholder="mis. Tenaga endogen dan bentuk muka bumi" /></label>
        <label>Jumlah<br /><input type="number" min={1} max={20} value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} className={`${kelas} w-20`} /></label>
        <label>Tingkat<br /><select value={tingkat} onChange={(e) => setTingkat(e.target.value as typeof tingkat)} className={kelas}><option>mudah</option><option>sedang</option><option>HOTS</option></select></label>
        <button type="button" disabled={proses} onClick={() => mulai(async () => {
          setPesan("");
          const r = await aiSoalKuis({ kuis_id, topik, jumlah, tingkat });
          if (!r.ok) return setPesan(r.pesan);
          setHasil(r.data); setPilih(new Set(r.data.map((_, i) => i))); setPesan(`Sisa kuota AI hari ini: ${r.sisa}.`);
        })} className="rounded-full bg-violet-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{proses ? "AI sedang membuat…" : "Buat soal dengan AI"}</button>
      </div>
      {pesan && <p role="status" className="text-sm">{pesan}</p>}
      <p className="text-xs text-black/50">Periksa kebenaran kunci & pembahasan sebelum menerbitkan. Tidak ada data siswa yang dikirim ke AI.</p>
      {hasil && (
        <FormAksi aksi={simpanSoalBanyak} className="space-y-3">
          <input type="hidden" name="kuis_id" value={kuis_id} />
          <input type="hidden" name="data" value={JSON.stringify(hasil.filter((_, i) => pilih.has(i)).map((s) => ({ ...s, bobot: 1 })))} />
          <ol className="space-y-2 text-sm">
            {hasil.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-black/10">
                <input type="checkbox" checked={pilih.has(i)} onChange={() => setPilih((x) => { const n = new Set(x); if (n.has(i)) n.delete(i); else n.add(i); return n; })} aria-label={`Pilih soal ${i + 1}`} className="mt-1" />
                <span>
                  <span className="block font-medium">{i + 1}. {s.pertanyaan}</span>
                  {s.pilihan.map((p, j) => <span key={j} className={`block ${j === s.kunci ? "font-semibold text-emerald-800" : "text-black/70"}`}>{String.fromCharCode(65 + j)}. {p}{j === s.kunci && " ✓"}</span>)}
                  {s.pembahasan && <span className="block text-xs text-black/50">Pembahasan: {s.pembahasan}</span>}
                </span>
              </li>
            ))}
          </ol>
          <TombolSimpan>Tambahkan {pilih.size} soal</TombolSimpan>
        </FormAksi>
      )}
    </div>
  );
}

export function FormNilai({ id, nilai, komentar, maks }: { id: string; nilai: number | null; komentar: string; maks: number }) {
  return (
    <FormAksi aksi={nilaiTugas} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs font-semibold">Nilai /{maks}<input name="nilai" defaultValue={nilai ?? ""} inputMode="decimal" className="mt-1 block w-20 rounded-lg border border-black/15 px-2 py-1.5 text-sm" /></label>
      <label className="min-w-48 flex-1 text-xs font-semibold">Komentar<input name="komentar" defaultValue={komentar} maxLength={2000} className="mt-1 block w-full rounded-lg border border-black/15 px-2 py-1.5 text-sm font-normal" /></label>
      <button name="aksi" value="nilai" className="rounded-full bg-brand-900 px-4 py-2 text-xs font-semibold text-white">Simpan nilai</button>
      <button name="aksi" value="kembalikan" className="rounded-full px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-300">Kembalikan</button>
    </FormAksi>
  );
}

export function FormKumpul({ tugas_id, jawaban, tautan }: { tugas_id: string; jawaban: string; tautan: string }) {
  const err = useErrorKolom("berkas");
  return (
    <FormAksi aksi={kumpulTugas} className="space-y-4">
      <input type="hidden" name="tugas_id" value={tugas_id} />
      <TextArea label="Jawaban" nama="jawaban" nilai={jawaban} baris={6} maks={5000} />
      <Input label="Tautan (opsional)" nama="tautan" nilai={tautan} placeholder="https://drive.google.com/…" />
      <div>
        <label htmlFor="berkas" className="mb-1.5 block text-sm font-semibold">Unggah berkas (opsional)</label>
        <input id="berkas" name="berkas" type="file" accept=".pdf,.docx,.pptx,.xlsx,image/*" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:py-2 file:text-white" />
        <p className={`mt-1 text-xs ${err ? "text-merah" : "text-black/50"}`}>{err ?? "PDF, Word, PowerPoint, Excel, atau foto — maks. 4 MB."}</p>
      </div>
      <TombolSimpan>Kumpulkan</TombolSimpan>
    </FormAksi>
  );
}
