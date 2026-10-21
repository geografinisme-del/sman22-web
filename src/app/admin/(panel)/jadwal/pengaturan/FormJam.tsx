"use client";

import { useMemo, useState } from "react";
import { FormAksi, TombolSimpan, useErrorKolom } from "@/components/admin/form";
import { buatJam, HARI, JENIS_JAM, jamPendek, type JenisJam } from "@/lib/admin/jadwal";
import { aturJamPelajaran } from "../../../actions-jadwal";

const kotak = "rounded-xl border border-black/15 bg-white px-3 py-2";

function Galat({ nama }: { nama: string }) {
  const e = useErrorKolom(nama);
  return e ? <p className="mt-1 text-sm text-blue-teks">{e}</p> : null;
}

type Jeda = { setelah: string; menit: string; jenis: "istirahat" | "ibadah" | "kegiatan"; label: string };

export function FormJam() {
  const [masuk, setMasuk] = useState("07:00");
  const [durasi, setDurasi] = useState("40");
  const [jumlah, setJumlah] = useState("10");
  const [awalJenis, setAwalJenis] = useState<"" | "upacara" | "kegiatan">("kegiatan");
  const [awalMenit, setAwalMenit] = useState("15");
  const [awalLabel, setAwalLabel] = useState("Literasi / tadarus");
  const [jeda, setJeda] = useState<Jeda[]>([
    { setelah: "4", menit: "15", jenis: "istirahat", label: "Istirahat" },
    { setelah: "7", menit: "30", jenis: "ibadah", label: "Ishoma" },
    { setelah: "", menit: "", jenis: "istirahat", label: "" },
  ]);
  const ubahJeda = (i: number, k: keyof Jeda, v: string) => setJeda((j) => j.map((x, n) => (n === i ? { ...x, [k]: v } : x)));

  const pratinjau = useMemo(() => {
    try {
      return buatJam({
        masuk: /^\d\d:\d\d$/.test(masuk) ? masuk : "07:00",
        durasi: Number(durasi) || 40,
        jumlah: Math.min(15, Number(jumlah) || 1),
        awal_jenis: awalJenis,
        awal_menit: Number(awalMenit) || 0,
        awal_label: awalLabel,
        jeda: jeda.filter((j) => j.setelah !== "" && j.menit !== "").map((j) => ({ ...j, setelah: Number(j.setelah), menit: Number(j.menit) })),
      });
    } catch {
      return [];
    }
  }, [masuk, durasi, jumlah, awalJenis, awalMenit, awalLabel, jeda]);

  return (
    <FormAksi aksi={aturJamPelajaran} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Berlaku untuk hari</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((h) => (
            <label key={h} className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-black/15 has-[:checked]:bg-ink has-[:checked]:text-white">
              <input type="checkbox" name="hari" value={h} defaultChecked={h >= 2 && h <= 4} className="sr-only" /> {HARI[h]}
            </label>
          ))}
        </div>
        <Galat nama="hari" />
        <p className="mt-1 text-xs text-black/50">Hari dengan susunan berbeda (Senin upacara, Jumat lebih pendek) disimpan terpisah: ubah isian lalu simpan lagi.</p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Jam masuk
          <input name="masuk" type="time" value={masuk} onChange={(e) => setMasuk(e.target.value)} className={`mt-1 block w-full font-normal ${kotak}`} />
        </label>
        <label className="text-sm font-semibold">Durasi 1 JP (menit)
          <input name="durasi" type="number" min={20} max={90} value={durasi} onChange={(e) => setDurasi(e.target.value)} className={`mt-1 block w-full font-normal ${kotak}`} />
        </label>
        <label className="text-sm font-semibold">Jumlah JP
          <input name="jumlah" type="number" min={1} max={15} value={jumlah} onChange={(e) => setJumlah(e.target.value)} className={`mt-1 block w-full font-normal ${kotak}`} />
          <Galat nama="jumlah" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Kegiatan awal
          <select name="awal_jenis" value={awalJenis} onChange={(e) => setAwalJenis(e.target.value as typeof awalJenis)} className={`mt-1 block w-full font-normal ${kotak}`}>
            <option value="">Tidak ada</option>
            <option value="upacara">Upacara</option>
            <option value="kegiatan">Kegiatan (literasi, tadarus, apel)</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Lama (menit)
          <input name="awal_menit" type="number" min={0} max={120} value={awalMenit} onChange={(e) => setAwalMenit(e.target.value)} className={`mt-1 block w-full font-normal ${kotak}`} />
        </label>
        <label className="text-sm font-semibold">Nama kegiatan
          <input name="awal_label" value={awalLabel} maxLength={60} onChange={(e) => setAwalLabel(e.target.value)} className={`mt-1 block w-full font-normal ${kotak}`} />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Istirahat & ibadah</legend>
        <div className="space-y-2">
          {jeda.map((j, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span>Setelah JP ke-</span>
              <input name={`jeda_setelah_${i}`} type="number" min={0} max={15} value={j.setelah} onChange={(e) => ubahJeda(i, "setelah", e.target.value)} aria-label={`Jeda ${i + 1} setelah JP ke`} className={`w-16 ${kotak}`} />
              <select name={`jeda_jenis_${i}`} value={j.jenis} onChange={(e) => ubahJeda(i, "jenis", e.target.value)} aria-label={`Jenis jeda ${i + 1}`} className={kotak}>
                <option value="istirahat">Istirahat</option>
                <option value="ibadah">Ibadah / Ishoma</option>
                <option value="kegiatan">Kegiatan</option>
              </select>
              <input name={`jeda_menit_${i}`} type="number" min={5} max={120} value={j.menit} onChange={(e) => ubahJeda(i, "menit", e.target.value)} aria-label={`Lama jeda ${i + 1}`} className={`w-20 ${kotak}`} />
              <span>menit</span>
              <input name={`jeda_label_${i}`} value={j.label} maxLength={60} placeholder="Nama (opsional)" onChange={(e) => ubahJeda(i, "label", e.target.value)} aria-label={`Nama jeda ${i + 1}`} className={`w-40 ${kotak}`} />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl bg-soft p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-black/50">Pratinjau</p>
        <ol className="grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
          {(() => {
            let jp = 0;
            return pratinjau.map((b, i) => (
              <li key={i} className={b.jenis === "pelajaran" ? "" : "text-black/50"}>
                <span className="inline-block w-28 tabular-nums">{jamPendek(b.jam_mulai)}–{jamPendek(b.jam_selesai)}</span>
                {b.jenis === "pelajaran" ? `JP ${++jp}` : b.label || JENIS_JAM[b.jenis as JenisJam]}
              </li>
            ));
          })()}
        </ol>
        {pratinjau.length > 0 && <p className="mt-2 text-sm">Pulang pukul <strong>{pratinjau.at(-1)!.jam_selesai}</strong></p>}
      </div>
      <TombolSimpan>Simpan jam pelajaran</TombolSimpan>
    </FormAksi>
  );
}
