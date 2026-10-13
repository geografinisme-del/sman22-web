"use client";

import { useActionState, useState } from "react";
import { useKirim } from "@/components/admin/form";
import { cekPengaduan, isiSurvei, kirimPengaduan, nilaiPengaduan, type HasilAduan, type HasilCek } from "@/app/admin/actions-humas";
import type { HasilAksi } from "@/app/admin/actions";
import { KATEGORI_ADUAN, RAHASIA, STATUS_ADUAN, type Pertanyaan } from "@/lib/humas";

const inp = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";

export function FormPengaduan({ login }: { login: boolean }) {
  const [hasil, aksi, proses] = useActionState<HasilAduan, FormData>(kirimPengaduan, { ok: false, pesan: "" });
  const kirim = useKirim(aksi);
  const [kat, setKat] = useState("layanan");
  const [anonim, setAnonim] = useState(false);
  const e = hasil.errors ?? {};
  if (hasil.ok && hasil.tiket)
    return (
      <div role="status" className="space-y-4 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
        <h2 className="font-serif text-3xl">Pengaduan terkirim</h2>
        <p>Simpan baik-baik dua hal berikut untuk mengecek tanggapan sekolah. <strong>Kode akses hanya ditampilkan sekali.</strong></p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-4"><dt className="text-xs uppercase tracking-widest text-black/50">Nomor tiket</dt><dd className="font-mono text-2xl font-bold">{hasil.tiket}</dd></div>
          <div className="rounded-xl bg-white p-4"><dt className="text-xs uppercase tracking-widest text-black/50">Kode akses</dt><dd className="font-mono text-2xl font-bold tracking-widest">{hasil.kode}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigator.clipboard?.writeText(`Tiket: ${hasil.tiket}\nKode akses: ${hasil.kode}`)} className="rounded-full bg-[var(--tema-utama)] px-5 py-2.5 font-semibold text-white">Salin</button>
          <a href="/pengaduan/cek" className="rounded-full px-5 py-2.5 font-semibold ring-1 ring-black/15">Cek status</a>
        </div>
        {login && <p className="text-sm text-black/60">Karena Anda masuk, perkembangan juga dikirim ke notifikasi akun Anda.</p>}
      </div>
    );
  return (
    <form onSubmit={kirim} className="space-y-5" noValidate>
      {hasil.pesan && !hasil.ok && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{hasil.pesan}</p>}
      <div className="hidden" aria-hidden><label>Situs web<input name="situs_web" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="block text-sm font-semibold">Kategori
        <select name="kategori" value={kat} onChange={(x) => setKat(x.target.value)} className={`${inp} mt-1.5 font-normal`}>
          {Object.entries(KATEGORI_ADUAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {RAHASIA.includes(kat) && (
        <p className="rounded-xl bg-violet-50 p-4 text-sm text-violet-900 ring-1 ring-violet-200">
          Laporan ini <strong>rahasia</strong>: hanya dibaca kepala sekolah, BK, dan kesiswaan, dan ditangani dengan melindungi korban. Dalam keadaan darurat, segera hubungi guru/wali kelas atau layanan SAPA 129.
        </p>
      )}
      <label className="block text-sm font-semibold">Judul singkat<input name="judul" maxLength={150} className={`${inp} mt-1.5 font-normal`} aria-invalid={Boolean(e.judul)} />{e.judul && <span className="mt-1 block text-[var(--tema-utama)]">{e.judul}</span>}</label>
      <label className="block text-sm font-semibold">Uraian<textarea name="isi" rows={6} maxLength={5000} className={`${inp} mt-1.5 font-normal`} aria-invalid={Boolean(e.isi)} placeholder="Apa yang terjadi, kapan, di mana. Hindari menyebar data pribadi orang lain di luar yang diperlukan." />{e.isi && <span className="mt-1 block text-[var(--tema-utama)]">{e.isi}</span>}</label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="anonim" checked={anonim} onChange={(x) => setAnonim(x.target.checked)} className="h-5 w-5" /> Rahasiakan identitas saya</label>
      {!anonim && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Nama<input name="nama" maxLength={120} className={`${inp} mt-1.5 font-normal`} />{e.nama && <span className="mt-1 block text-[var(--tema-utama)]">{e.nama}</span>}</label>
          <label className="block text-sm font-semibold">Email / No. HP (opsional)<input name="kontak" maxLength={120} className={`${inp} mt-1.5 font-normal`} /></label>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="setuju" className="mt-1 h-5 w-5" /> <span>Isi pengaduan ini benar sepanjang pengetahuan saya dan tidak bermaksud memfitnah.{e.setuju && <span className="block text-[var(--tema-utama)]">{e.setuju}</span>}</span></label>
      <button disabled={proses} className="rounded-full bg-[var(--tema-utama)] px-6 py-3 font-semibold text-white disabled:opacity-60">{proses ? "Mengirim…" : "Kirim pengaduan"}</button>
    </form>
  );
}

function PilihBintang({ nama = "rating" }: { nama?: string }) {
  const [n, setN] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Penilaian 1 sampai 5">
      {[1, 2, 3, 4, 5].map((i) => (
        <label key={i} className="cursor-pointer text-3xl leading-none">
          <input type="radio" name={nama} value={i} className="sr-only" checked={n === i} onChange={() => setN(i)} />
          <span aria-hidden className={i <= n ? "text-amber-500" : "text-black/20"}>★</span><span className="sr-only">{i} bintang</span>
        </label>
      ))}
    </div>
  );
}

/** Penilaian layanan setelah pengaduan ditutup (tiket+kode, atau id untuk pelapor yang login) */
export function FormNilai({ tiket, kode, id }: { tiket?: string; kode?: string; id?: string }) {
  const [hasil, aksi, proses] = useActionState<HasilAksi, FormData>(nilaiPengaduan, { ok: false, pesan: "" });
  const kirim = useKirim(aksi);
  if (hasil.ok) return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{hasil.pesan}</p>;
  return (
    <form onSubmit={kirim} className="space-y-3 rounded-xl bg-amber-50/60 p-4 ring-1 ring-amber-200">
      <p className="text-sm font-semibold">Bagaimana penanganan pengaduan ini?</p>
      {id ? <input type="hidden" name="id" value={id} /> : <><input type="hidden" name="tiket" value={tiket} /><input type="hidden" name="kode" value={kode} /></>}
      <PilihBintang />
      <input name="komentar" maxLength={500} placeholder="Komentar (opsional)" aria-label="Komentar" className={inp} />
      {hasil.pesan && <p role="alert" className="text-sm text-[var(--tema-utama)]">{hasil.pesan}</p>}
      <button disabled={proses} className="rounded-full bg-[var(--tema-utama)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Kirim penilaian</button>
    </form>
  );
}

export function FormCek({ tiketAwal = "" }: { tiketAwal?: string }) {
  const [hasil, aksi, proses] = useActionState<HasilCek, FormData>(cekPengaduan, { ok: false, pesan: "" });
  const kirim = useKirim(aksi);
  const [tiket, setTiket] = useState(tiketAwal);
  const [kode, setKode] = useState("");
  return (
    <div className="space-y-6">
      <form onSubmit={kirim} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm font-semibold">Nomor tiket<input name="tiket" value={tiket} onChange={(x) => setTiket(x.target.value)} placeholder="ADU-2610-1A2B3" className={`${inp} mt-1.5 font-mono uppercase`} /></label>
        <label className="block text-sm font-semibold">Kode akses<input name="kode" value={kode} onChange={(x) => setKode(x.target.value)} placeholder="10 karakter" autoComplete="off" className={`${inp} mt-1.5 font-mono uppercase`} /></label>
        <button disabled={proses} className="rounded-full bg-[var(--tema-utama)] px-6 py-3 font-semibold text-white disabled:opacity-60">{proses ? "Memeriksa…" : "Cek"}</button>
      </form>
      {hasil.pesan && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{hasil.pesan}</p>}
      {hasil.data && (
        <div role="status" className="space-y-3 kartu p-6 ">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold">{hasil.data.tiket}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_ADUAN[hasil.data.status]?.warna}`}>{STATUS_ADUAN[hasil.data.status]?.label}</span>
          </div>
          <h2 className="font-serif text-2xl">{hasil.data.judul}</h2>
          <p className="text-sm text-black/50">{KATEGORI_ADUAN[hasil.data.kategori as keyof typeof KATEGORI_ADUAN]} · dikirim {new Date(hasil.data.dibuat).toLocaleDateString("id-ID", { dateStyle: "long" })} · diperbarui {new Date(hasil.data.diperbarui).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
          <div className="rounded-xl bg-[#f6f5fc] p-4"><p className="text-xs uppercase tracking-widest text-black/50">Tanggapan sekolah</p><p className="mt-1 whitespace-pre-line">{hasil.data.tanggapan_publik || "Belum ada tanggapan. Pengaduan Anda sedang ditinjau."}</p></div>
          {["selesai", "ditolak"].includes(hasil.data.status) && (hasil.data.rating
            ? <p className="text-sm text-black/60">Penilaian Anda: <span className="text-amber-500">{"★".repeat(hasil.data.rating)}</span></p>
            : <FormNilai key={hasil.data.tiket} tiket={tiket.trim().toUpperCase()} kode={kode.trim().toUpperCase()} />)}
        </div>
      )}
    </div>
  );
}

export function FormSurvei({ id, pertanyaan }: { id: string; pertanyaan: Pertanyaan[] }) {
  const [hasil, aksi, proses] = useActionState<HasilAksi, FormData>(isiSurvei, { ok: false, pesan: "" });
  const kirim = useKirim(aksi);
  if (hasil.ok) return <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200"><p className="font-serif text-2xl">Terima kasih!</p><p>{hasil.pesan}</p></div>;
  return (
    <form onSubmit={kirim} className="space-y-6">
      <input type="hidden" name="survei_id" value={id} />
      <div className="hidden" aria-hidden><label>Situs web<input name="situs_web" tabIndex={-1} autoComplete="off" /></label></div>
      {pertanyaan.map((q, i) => (
        <fieldset key={q.id} className="kartu p-5 ">
          <legend className="sr-only">Pertanyaan {i + 1}</legend>
          <input type="hidden" name={`t_${q.id}`} value={q.jenis} />
          <p className="mb-3 font-semibold">{i + 1}. {q.teks}{q.wajib !== false && <span className="text-[var(--tema-utama)]" aria-label="wajib"> *</span>}</p>
          {q.jenis === "skala" && (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-3 py-2 ring-1 ring-black/10 has-[:checked]:bg-[var(--tema-utama)] has-[:checked]:text-white">
                  <input type="radio" name={`j_${q.id}`} value={n} className="sr-only" />
                  <span className="text-lg font-semibold">{n}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-70">{n === 1 ? "Sangat kurang" : n === 5 ? "Sangat baik" : "\u00a0"}</span>
                </label>
              ))}
            </div>
          )}
          {q.jenis === "pilihan" && (
            <div className="space-y-2">{q.pilihan?.map((o) => (
              <label key={o} className="flex items-center gap-2"><input type="radio" name={`j_${q.id}`} value={o} className="h-4 w-4" /> {o}</label>
            ))}</div>
          )}
          {q.jenis === "teks" && <textarea name={`j_${q.id}`} rows={3} maxLength={1000} className={inp} aria-label={q.teks} />}
        </fieldset>
      ))}
      {hasil.pesan && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{hasil.pesan}</p>}
      <p className="text-xs text-black/50">Jawaban disimpan tanpa nama dan hanya dilaporkan dalam bentuk rekap.</p>
      <button disabled={proses} className="rounded-full bg-[var(--tema-utama)] px-6 py-3 font-semibold text-white disabled:opacity-60">{proses ? "Mengirim…" : "Kirim jawaban"}</button>
    </form>
  );
}
