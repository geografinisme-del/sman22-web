"use client";

import Link from "next/link";
import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { jalankanImpor, pratinjauImpor, type HasilPratinjau } from "@/app/admin/actions-induk";
import {
  KOLOM_PEGAWAI,
  KOLOM_SISWA,
  cariBarisHeader,
  normalisasiBaris,
  tebakPemetaan,
  type BarisImpor,
} from "@/lib/admin/induk";

type Tahap = "pilih" | "petakan" | "periksa" | "selesai";

async function bacaFile(file: File): Promise<unknown[][]> {
  const nama = file.name.toLowerCase();
  if (nama.endsWith(".csv") || nama.endsWith(".txt")) {
    const teks = await file.text();
    const hasil = Papa.parse<string[]>(teks.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
    return hasil.data;
  }
  if (nama.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  throw new Error("Format file tidak didukung. Gunakan .xlsx atau .csv (file .xls lama: buka di Excel lalu Simpan Sebagai .xlsx).");
}

export function Impor({ jenis, kembali, templateHref }: { jenis: "siswa" | "pegawai"; kembali: string; templateHref: string }) {
  const kolom = jenis === "siswa" ? KOLOM_SISWA : KOLOM_PEGAWAI;
  const [tahap, setTahap] = useState<Tahap>("pilih");
  const [namaFile, setNamaFile] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [baris, setBaris] = useState<unknown[][]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [peta, setPeta] = useState<Record<string, number>>({});
  const [pratinjau, setPratinjau] = useState<HasilPratinjau | null>(null);
  const [perbarui, setPerbarui] = useState(false);
  const [buatKelas, setBuatKelas] = useState(true);
  const [lewatiGalat, setLewatiGalat] = useState(false);
  const [saring, setSaring] = useState<"semua" | "baru" | "ada" | "galat">("semua");
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string; hasil?: Record<string, number> } | null>(null);
  const [proses, mulai] = useTransition();

  async function pilihFile(f: File | undefined) {
    setGalat(null);
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setGalat("Ukuran file maksimal 10 MB.");
    try {
      const semua = (await bacaFile(f)).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      const iHeader = cariBarisHeader(semua, kolom);
      const h = (semua[iHeader] ?? []).map((c) => String(c ?? "").trim());
      const isi = semua.slice(iHeader + 1);
      if (!isi.length) return setGalat("Tidak ditemukan baris data di bawah judul kolom.");
      setNamaFile(f.name);
      setHeader(h);
      setBaris(isi);
      setPeta(tebakPemetaan(h, kolom));
      setTahap("petakan");
    } catch (e) {
      setGalat((e as Error).message || "File tidak dapat dibaca.");
    }
  }

  const hasilNormal = useMemo(() => baris.map((r) => normalisasiBaris(r, peta, jenis)), [baris, peta, jenis]);

  function periksa() {
    setGalat(null);
    if (peta.nama == null || peta.nama < 0) return setGalat("Kolom Nama wajib dipetakan.");
    mulai(async () => {
      const r = await pratinjauImpor(jenis, hasilNormal.map((h) => h.data), hasilNormal.map((h) => h.galat));
      if (!r.ok) return setGalat(r.pesan ?? "Gagal memeriksa data.");
      setPratinjau(r);
      setLewatiGalat(false);
      setTahap("periksa");
    });
  }

  const akanDiimpor = useMemo(() => {
    if (!pratinjau) return [] as BarisImpor[];
    return pratinjau.baris.filter((b) => b.status === "baru" || (b.status === "ada" && perbarui)).map((b) => b.data);
  }, [pratinjau, perbarui]);

  function impor() {
    setGalat(null);
    mulai(async () => {
      const r = await jalankanImpor(jenis, akanDiimpor, { perbarui, buatKelas });
      setHasil(r);
      if (r.ok) setTahap("selesai");
      else setGalat(r.pesan);
    });
  }

  const adaGalat = (pratinjau?.ringkas.galat ?? 0) > 0;
  const tampil = (pratinjau?.baris ?? []).filter((b) => saring === "semua" || b.status === saring).slice(0, 300);
  const kartu = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8";

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Langkah impor">
        {(["pilih", "petakan", "periksa", "selesai"] as Tahap[]).map((t, i) => (
          <li
            key={t}
            aria-current={tahap === t ? "step" : undefined}
            className={`rounded-full px-4 py-1.5 ${tahap === t ? "bg-brand-900 text-white" : "bg-white text-black/50 ring-1 ring-black/10"}`}
          >
            {i + 1}. {{ pilih: "Pilih file", petakan: "Cocokkan kolom", periksa: "Periksa", selesai: "Selesai" }[t]}
          </li>
        ))}
      </ol>

      {galat && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          {galat}
        </div>
      )}

      {tahap === "pilih" && (
        <div className={kartu}>
          <h2 className="font-serif text-2xl">Pilih file Excel atau CSV</h2>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Belum punya file? Mulai dari template.</p>
              <p className="mt-1 text-sm text-black/60">
                Template berisi judul kolom yang benar dan lembar <strong>Petunjuk</strong> cara mengisinya. File ekspor dari menu ini juga bisa diedit lalu diimpor ulang.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a href={templateHref} download className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Unduh template Excel
              </a>
              <a href={`${templateHref}?format=csv`} download className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-black/15 hover:bg-white">
                Template CSV
              </a>
            </div>
          </div>
          <p className="mt-4 text-black/60">
            Bisa juga memakai file ekspor <strong>Dapodik</strong> langsung — baris judul di atas tabel akan dilewati otomatis.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-black/60">
            <li>Kolom yang dikenali: {kolom.map((k) => k.label).join(", ")}.</li>
            {jenis === "siswa" && <li>Kelas dicocokkan dengan nama kelas di tahun ajaran aktif (X-1, X 1, dan X.1 dianggap sama).</li>}
            <li>NIK dan data sensitif lain tidak diimpor.</li>
          </ul>
          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-krem p-10 text-center hover:border-brand-600">
            <span className="font-semibold">Klik untuk memilih file</span>
            <span className="mt-1 text-sm text-black/50">.xlsx atau .csv, maksimal 10 MB / 3.000 baris</span>
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => pilihFile(e.target.files?.[0])} />
          </label>
        </div>
      )}

      {tahap === "petakan" && (
        <div className={kartu}>
          <h2 className="font-serif text-2xl">Cocokkan kolom</h2>
          <p className="mt-2 text-black/60">
            File <strong>{namaFile}</strong> berisi {baris.length} baris data. Kolom sudah dicocokkan otomatis. Periksa dan ubah bila perlu.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kolom.map((k) => (
              <label key={k.kunci} className="block">
                <span className="mb-1 block text-sm font-semibold">
                  {k.label} {k.wajib && <span className="text-merah">*</span>}
                </span>
                <select
                  value={peta[k.kunci] ?? -1}
                  onChange={(e) => setPeta((p) => ({ ...p, [k.kunci]: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5"
                >
                  <option value={-1}>— Tidak diimpor —</option>
                  {header.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `(kolom ${i + 1})`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <h3 className="mt-8 text-sm font-semibold">Contoh 3 baris pertama setelah dirapikan</h3>
          <div className="mt-2 overflow-x-auto rounded-xl ring-1 ring-black/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-krem">
                <tr>{kolom.filter((k) => (peta[k.kunci] ?? -1) >= 0).map((k) => <th key={k.kunci} className="px-3 py-2">{k.label}</th>)}</tr>
              </thead>
              <tbody>
                {hasilNormal.slice(0, 3).map((h, i) => (
                  <tr key={i} className="border-t border-black/5">
                    {kolom.filter((k) => (peta[k.kunci] ?? -1) >= 0).map((k) => <td key={k.kunci} className="px-3 py-2">{h.data[k.kunci]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={periksa} disabled={proses} className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white disabled:opacity-60">
              {proses ? "Memeriksa…" : "Periksa data"}
            </button>
            <button type="button" onClick={() => setTahap("pilih")} className="rounded-full px-5 py-3 text-sm hover:bg-black/5">
              Ganti file
            </button>
          </div>
        </div>
      )}

      {tahap === "periksa" && pratinjau && (
        <div className={kartu}>
          <h2 className="font-serif text-2xl">Periksa sebelum menyimpan</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <button type="button" onClick={() => setSaring("baru")} className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <p className="font-serif text-4xl text-emerald-800">{pratinjau.ringkas.baru}</p>
              <p className="text-sm text-emerald-800">Data baru</p>
            </button>
            <button type="button" onClick={() => setSaring("ada")} className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="font-serif text-4xl text-amber-800">{pratinjau.ringkas.ada}</p>
              <p className="text-sm text-amber-800">Sudah ada di sistem</p>
            </button>
            <button type="button" onClick={() => setSaring("galat")} className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
              <p className="font-serif text-4xl text-red-800">{pratinjau.ringkas.galat}</p>
              <p className="text-sm text-red-800">Bermasalah</p>
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {pratinjau.ringkas.ada > 0 && (
              <label className="flex items-start gap-3 rounded-xl border border-black/10 p-4">
                <input type="checkbox" checked={perbarui} onChange={(e) => setPerbarui(e.target.checked)} className="mt-1 h-5 w-5" />
                <span>
                  <strong>Perbarui {pratinjau.ringkas.ada} data yang sudah ada</strong>
                  <span className="block text-sm text-black/50">
                    Bila tidak dicentang, data lama dibiarkan apa adanya. Kolom kosong di file tidak akan menghapus data lama.
                  </span>
                </span>
              </label>
            )}
            {jenis === "siswa" && pratinjau.kelasBaru.length > 0 && (
              <label className="flex items-start gap-3 rounded-xl border border-black/10 p-4">
                <input type="checkbox" checked={buatKelas} onChange={(e) => setBuatKelas(e.target.checked)} className="mt-1 h-5 w-5" />
                <span>
                  <strong>Buat {pratinjau.kelasBaru.length} kelas baru otomatis</strong>
                  <span className="block text-sm text-black/50">{pratinjau.kelasBaru.join(", ")}</span>
                </span>
              </label>
            )}
            {adaGalat && (
              <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
                <input type="checkbox" checked={lewatiGalat} onChange={(e) => setLewatiGalat(e.target.checked)} className="mt-1 h-5 w-5" />
                <span>
                  <strong>Lewati {pratinjau.ringkas.galat} baris bermasalah</strong>
                  <span className="block text-sm text-black/50">Atau perbaiki file lalu unggah ulang (disarankan).</span>
                </span>
              </label>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-black/50">Tampilkan:</span>
            {(["semua", "baru", "ada", "galat"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSaring(s)}
                className={`rounded-full px-3 py-1 ${saring === s ? "bg-brand-900 text-white" : "ring-1 ring-black/10"}`}
              >
                {{ semua: "Semua", baru: "Baru", ada: "Sudah ada", galat: "Bermasalah" }[s]}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-[420px] overflow-auto rounded-xl ring-1 ring-black/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-krem">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">{jenis === "siswa" ? "NISN" : "NIP"}</th>
                  {jenis === "siswa" && <th className="px-3 py-2">Kelas</th>}
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((b) => (
                  <tr key={b.baris} className="border-t border-black/5 align-top">
                    <td className="px-3 py-2 tabular-nums text-black/50">{b.baris}</td>
                    <td className="px-3 py-2">{b.data.nama}</td>
                    <td className="px-3 py-2 tabular-nums">{b.data[jenis === "siswa" ? "nisn" : "nip"] || "—"}</td>
                    {jenis === "siswa" && <td className="px-3 py-2">{b.data.kelas || "—"}</td>}
                    <td className="px-3 py-2">
                      {b.status === "baru" && <span className="text-emerald-700">Baru</span>}
                      {b.status === "ada" && <span className="text-amber-700">{perbarui ? "Akan diperbarui" : "Dilewati (sudah ada)"}</span>}
                      {b.status === "galat" && <span className="text-red-700">{b.pesan.join("; ")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(pratinjau.baris.filter((b) => saring === "semua" || b.status === saring).length ?? 0) > 300 && (
            <p className="mt-2 text-xs text-black/50">Menampilkan 300 baris pertama.</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={impor}
              disabled={proses || akanDiimpor.length === 0 || (adaGalat && !lewatiGalat)}
              className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {proses ? "Menyimpan…" : `Impor ${akanDiimpor.length} data`}
            </button>
            <button type="button" onClick={() => setTahap("petakan")} className="rounded-full px-5 py-3 text-sm hover:bg-black/5">
              ← Kembali
            </button>
            {adaGalat && !lewatiGalat && <p className="text-sm text-red-700">Perbaiki baris bermasalah atau centang &quot;Lewati&quot;.</p>}
          </div>
        </div>
      )}

      {tahap === "selesai" && hasil?.ok && (
        <div className={kartu} role="status">
          <h2 className="font-serif text-3xl">Impor berhasil</h2>
          <ul className="mt-4 space-y-1 text-black/70">
            <li>Data baru: <strong>{hasil.hasil?.baru ?? 0}</strong></li>
            <li>Diperbarui: <strong>{hasil.hasil?.diperbarui ?? 0}</strong></li>
            <li>Dilewati: <strong>{hasil.hasil?.dilewati ?? 0}</strong></li>
            {jenis === "siswa" && <li>Kelas baru: <strong>{hasil.hasil?.kelas_baru ?? 0}</strong></li>}
            {jenis === "siswa" && <li>Data orang tua baru: <strong>{hasil.hasil?.orang_tua_baru ?? 0}</strong></li>}
          </ul>
          <div className="mt-6 flex gap-3">
            <Link href={kembali} className="rounded-full bg-brand-900 px-6 py-3 font-semibold text-white">Lihat data</Link>
            <button
              type="button"
              onClick={() => {
                setTahap("pilih");
                setPratinjau(null);
                setHasil(null);
              }}
              className="rounded-full px-5 py-3 text-sm ring-1 ring-black/10"
            >
              Impor file lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
