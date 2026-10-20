"use client";

import { useState, useTransition } from "react";
import { aiModulAjar, aiSusunTp, type DrafModul, type DrafTp } from "@/app/admin/actions-ai";
import { simpanBanyakTp } from "@/app/admin/actions-kurikulum";
import { FormAksi, TombolSimpan } from "@/components/admin/form";

const kelasInput = "rounded-xl border border-black/15 bg-white px-3 py-2";

export function LabelAI() {
  return <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-800">AI</span>;
}

function Peringatan() {
  return (
    <p className="text-xs text-black/50">
      Hasil AI adalah <strong>draf</strong>: periksa kebenaran isi & sesuaikan dengan kondisi kelas sebelum dipakai. Tidak ada data siswa yang dikirim ke AI.
    </p>
  );
}

/** Draf TP/ATP dari CP — guru memilih baris yang ingin disimpan */
export function AiTp({ mapel_id, tingkatOpsi, cp, jpAwal }: { mapel_id: string; tingkatOpsi: string[]; cp: string; jpAwal: Record<string, number> }) {
  const [tingkat, setTingkat] = useState(tingkatOpsi[0]);
  const [jumlah, setJumlah] = useState(8);
  const [jp, setJp] = useState(jpAwal[tingkatOpsi[0]] || 2);
  const [hasil, setHasil] = useState<DrafTp[] | null>(null);
  const [pilih, setPilih] = useState<Set<number>>(new Set());
  const [pesan, setPesan] = useState("");
  const [proses, mulai] = useTransition();

  const jalankan = () =>
    mulai(async () => {
      setPesan("");
      const r = await aiSusunTp({ mapel_id, tingkat, cp, jumlah, jp_minggu: jp });
      if (!r.ok) return setPesan(r.pesan);
      setHasil(r.data);
      setPilih(new Set(r.data.map((_, i) => i)));
      setPesan(`Draf siap. Sisa kuota AI hari ini: ${r.sisa}.`);
    });

  const terpilih = (hasil ?? []).filter((_, i) => pilih.has(i)).map((t, i) => ({ ...t, mapel_id, tingkat, urutan: i + 1 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>Kelas<br /><select value={tingkat} onChange={(e) => { setTingkat(e.target.value); setJp(jpAwal[e.target.value] || jp); }} className={kelasInput}>{tingkatOpsi.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Jumlah TP<br /><input type="number" min={3} max={20} value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} className={`${kelasInput} w-24`} /></label>
        <label>JP/minggu<br /><input type="number" min={1} max={12} value={jp} onChange={(e) => setJp(Number(e.target.value))} className={`${kelasInput} w-24`} /></label>
        <button type="button" onClick={jalankan} disabled={proses || cp.length < 20} className="rounded-full bg-violet-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
          {proses ? "AI sedang menyusun… (±20 detik)" : "Susun draf TP dengan AI"}
        </button>
      </div>
      {cp.length < 20 && <p className="text-sm text-amber-800">Isi Capaian Pembelajaran (CP) terlebih dulu — AI menyusun TP berdasarkan CP.</p>}
      {pesan && <p role="status" className="text-sm text-black/70">{pesan}</p>}
      <Peringatan />
      {hasil && (
        <FormAksi aksi={simpanBanyakTp} className="space-y-3">
          <input type="hidden" name="data" value={JSON.stringify(terpilih)} />
          <ul className="divide-y divide-black/5 rounded-xl ring-1 ring-black/10">
            {hasil.map((t, i) => (
              <li key={i} className="flex gap-3 p-3 text-sm">
                <input type="checkbox" checked={pilih.has(i)} onChange={() => setPilih((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className="mt-1 h-4 w-4" aria-label={`Pilih ${t.kode}`} />
                <span className="flex-1">
                  <span className="font-semibold">{t.kode}</span> <span className="text-black/50">· smt {t.semester} · {t.alokasi_jp} JP{t.elemen && ` · ${t.elemen}`}</span>
                  <span className="block">{t.deskripsi}</span>
                  {t.kktp && <span className="block text-black/60">KKTP: {t.kktp}</span>}
                </span>
              </li>
            ))}
          </ul>
          <TombolSimpan>Simpan {terpilih.length} TP terpilih</TombolSimpan>
        </FormAksi>
      )}
    </div>
  );
}

function keHtml(m: DrafModul, info: string) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const isi = (s: string) => {
    const baris = s.split("\n").map((b) => b.trim()).filter(Boolean);
    let html = "", daftar = false;
    for (const b of baris) {
      if (/^[-•*]\s+/.test(b)) { if (!daftar) { html += "<ul>"; daftar = true; } html += `<li>${esc(b.replace(/^[-•*]\s+/, ""))}</li>`; }
      else { if (daftar) { html += "</ul>"; daftar = false; } html += `<p>${esc(b)}</p>`; }
    }
    return html + (daftar ? "</ul>" : "");
  };
  return `<html><head><meta charset="utf-8"><title>${esc(m.judul)}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{font-size:16pt}h2{font-size:13pt;margin-top:14pt}</style></head><body><h1>${esc(m.judul)}</h1><p><i>${esc(info)}</i></p>${m.bagian.map((b) => `<h2>${esc(b.judul)}</h2>${isi(b.isi)}`).join("")}</body></html>`;
}

/** Kerangka modul ajar dari TP terpilih — bisa diunduh sebagai dokumen Word */
export function AiModul({ tp }: { tp: { id: string; label: string }[] }) {
  const [pilih, setPilih] = useState<string[]>([]);
  const [model, setModel] = useState("Problem Based Learning");
  const [jp, setJp] = useState(4);
  const [hasil, setHasil] = useState<DrafModul | null>(null);
  const [pesan, setPesan] = useState("");
  const [proses, mulai] = useTransition();
  const unduh = () => {
    if (!hasil) return;
    const blob = new Blob([keHtml(hasil, "Draf disusun dengan bantuan AI — periksa & sesuaikan sebelum dipakai.")], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${hasil.judul.replace(/[^\w\- ]+/g, "").slice(0, 60) || "modul-ajar"}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-4">
      <fieldset className="max-h-48 space-y-1 overflow-y-auto rounded-xl p-2 text-sm ring-1 ring-black/10">
        <legend className="sr-only">Pilih TP</legend>
        {tp.map((t) => (
          <label key={t.id} className="flex gap-2">
            <input type="checkbox" checked={pilih.includes(t.id)} onChange={(e) => setPilih((p) => (e.target.checked ? [...p, t.id].slice(0, 5) : p.filter((x) => x !== t.id)))} className="mt-1" />
            <span>{t.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>Model pembelajaran<br />
          <select value={model} onChange={(e) => setModel(e.target.value)} className={kelasInput}>
            {["Problem Based Learning", "Project Based Learning", "Discovery Learning", "Inquiry Learning", "Cooperative Learning (Jigsaw)", ""].map((m) => <option key={m} value={m}>{m || "Pilihkan oleh AI"}</option>)}
          </select>
        </label>
        <label>Alokasi JP<br /><input type="number" min={1} max={20} value={jp} onChange={(e) => setJp(Number(e.target.value))} className={`${kelasInput} w-24`} /></label>
        <button type="button" disabled={proses || !pilih.length}
          onClick={() => mulai(async () => { setPesan(""); const r = await aiModulAjar({ tp_ids: pilih, model, jp }); if (!r.ok) return setPesan(r.pesan); setHasil(r.data); setPesan(`Sisa kuota AI hari ini: ${r.sisa}.`); })}
          className="rounded-full bg-violet-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
          {proses ? "AI sedang menyusun… (±30 detik)" : "Buat kerangka modul ajar"}
        </button>
      </div>
      {pesan && <p role="status" className="text-sm text-black/70">{pesan}</p>}
      <Peringatan />
      {hasil && (
        <div className="rounded-xl bg-soft p-4 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="flex-1 text-xl">{hasil.judul}</h3>
            <button type="button" onClick={unduh} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Unduh (Word)</button>
          </div>
          {hasil.bagian.map((b, i) => (
            <details key={i} open={i < 2} className="border-t border-black/10 py-2">
              <summary className="cursor-pointer font-semibold">{b.judul}</summary>
              <p className="mt-1 whitespace-pre-line text-black/70">{b.isi}</p>
            </details>
          ))}
          <p className="mt-3 text-xs text-black/50">Setelah disesuaikan, unggah sebagai perangkat ajar (jenis Modul Ajar) agar diperiksa kurikulum.</p>
        </div>
      )}
    </div>
  );
}
