"use client";

import { useCallback, useEffect, useState } from "react";
import { FormAksi, TombolSimpan } from "@/components/admin/form";
import { buatQr, daftarScan, simpanAbsensiJp } from "../../../actions-jp";

export type SiswaJp = { siswa_id: string; nisn: string | null; nama: string; status_harian: string | null; status_jp: string | null; keterangan: string; scan_pada: string | null };

const PILIHAN = [
  { k: "H", l: "Hadir", w: "peer-checked:bg-emerald-600" },
  { k: "T", l: "Telat", w: "peer-checked:bg-amber-500" },
  { k: "S", l: "Sakit", w: "peer-checked:bg-sky-600" },
  { k: "I", l: "Izin", w: "peer-checked:bg-indigo-600" },
  { k: "D", l: "Dispen", w: "peer-checked:bg-slate-600" },
  { k: "A", l: "Alpa", w: "peer-checked:bg-red-600" },
];
const HARIAN: Record<string, string> = { S: "Sakit", I: "Izin", A: "Alpa", T: "Terlambat", PC: "Pulang cepat" };

function PanelQr({ jadwalId, tanggal, onScan }: { jadwalId: string; tanggal: string; onScan: (m: Record<string, string>) => void }) {
  const [qr, setQr] = useState<{ svg: string; url: string } | null>(null);
  const [galat, setGalat] = useState("");
  useEffect(() => {
    let hidup = true;
    const muat = async () => {
      const r = await buatQr(jadwalId);
      if (!hidup) return;
      if (r.ok) { setQr({ svg: r.svg, url: r.url }); setGalat(""); } else setGalat(r.pesan);
    };
    const pindai = async () => { const m = await daftarScan(jadwalId, tanggal); if (hidup) onScan(m); };
    muat(); pindai();
    const a = setInterval(muat, 20000);
    const b = setInterval(pindai, 5000);
    return () => { hidup = false; clearInterval(a); clearInterval(b); };
  }, [jadwalId, tanggal, onScan]);
  return (
    <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-black/10">
      {galat ? <p className="text-sm text-merah">{galat}</p> : qr ? (
        <>
          <div className="mx-auto w-full max-w-sm" aria-label="Kode QR kehadiran" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <p className="mt-2 text-sm text-black/60">Siswa memindai dengan kamera HP (akun siswa). Kode berganti tiap 20 detik — foto QR yang dikirim ke teman tidak berlaku lama.</p>
        </>
      ) : <p className="text-sm text-black/50">Menyiapkan QR…</p>}
    </div>
  );
}

export function FormJp({ jadwalId, tanggal, siswa, materi, catatan, boleh }: { jadwalId: string; tanggal: string; siswa: SiswaJp[]; materi: string; catatan: string; boleh: boolean }) {
  const awal = (s: SiswaJp) => s.status_jp ?? (s.status_harian && ["S", "I"].includes(s.status_harian) ? s.status_harian : s.status_harian === "A" ? "A" : "H");
  const [status, setStatus] = useState<Record<string, string>>(() => Object.fromEntries(siswa.map((s) => [s.siswa_id, awal(s)])));
  const [scan, setScan] = useState<Record<string, string>>(() => Object.fromEntries(siswa.filter((s) => s.scan_pada).map((s) => [s.siswa_id, "✓"])));
  const [qr, setQr] = useState(false);
  const hitung = (k: string) => Object.values(status).filter((v) => v === k).length;
  const terimaScan = useCallback((m: Record<string, string>) => setScan((s) => ({ ...s, ...m })), []);

  return (
    <FormAksi aksi={simpanAbsensiJp} className="space-y-5">
      <input type="hidden" name="jadwal_id" value={jadwalId} />
      <input type="hidden" name="tanggal" value={tanggal} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Hadir {hitung("H") + hitung("T")}</span>
        {["S", "I", "D", "A"].map((k) => hitung(k) > 0 && <span key={k} className="rounded-full bg-black/5 px-3 py-1">{PILIHAN.find((p) => p.k === k)?.l} {hitung(k)}</span>)}
        {boleh && (
          <button type="button" onClick={() => setQr((v) => !v)} className="ml-auto rounded-full px-4 py-2 font-semibold ring-1 ring-black/15 hover:bg-black/5">
            {qr ? "Tutup QR" : "Tampilkan QR kehadiran (opsional)"}
          </button>
        )}
      </div>
      {qr && (
        <div className="space-y-2">
          <PanelQr jadwalId={jadwalId} tanggal={tanggal} onScan={terimaScan} />
          <button
            type="button"
            onClick={() => setStatus((s) => Object.fromEntries(Object.entries(s).map(([id, v]) => [id, !scan[id] && v === "H" ? "A" : v])))}
            className="text-sm font-semibold text-merah underline"
          >
            Tandai yang belum memindai & masih &quot;Hadir&quot; sebagai Alpa
          </button>
        </div>
      )}
      <ol className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {siswa.map((s, i) => (
          <li key={s.siswa_id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className="w-6 text-right text-xs text-black/40">{i + 1}</span>
            <span className="min-w-40 flex-1">
              <span className="font-medium">{s.nama}</span>
              {scan[s.siswa_id] && <span className="ml-2 rounded bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-800">QR ✓</span>}
              {s.status_harian && <span className="block text-xs text-amber-700">Absen harian: {HARIAN[s.status_harian] ?? s.status_harian}</span>}
            </span>
            <fieldset className="flex flex-wrap gap-1" disabled={!boleh} aria-label={`Status ${s.nama}`}>
              {PILIHAN.map((p) => (
                <label key={p.k} className="cursor-pointer">
                  <input type="radio" name={`st_${s.siswa_id}`} value={p.k} checked={status[s.siswa_id] === p.k}
                         onChange={() => setStatus((x) => ({ ...x, [s.siswa_id]: p.k }))} className="peer sr-only" />
                  <span className={`block rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-black/10 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700 ${p.w}`}>{p.l}</span>
                </label>
              ))}
            </fieldset>
            {status[s.siswa_id] !== "H" && (
              <input name={`ket_${s.siswa_id}`} defaultValue={s.keterangan} maxLength={200} placeholder="Keterangan" aria-label={`Keterangan ${s.nama}`} disabled={!boleh}
                     className="w-full rounded-lg border border-black/10 px-2 py-1 text-sm sm:w-48" />
            )}
          </li>
        ))}
      </ol>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Materi / jurnal mengajar
          <textarea name="materi" defaultValue={materi} rows={3} maxLength={1000} disabled={!boleh} placeholder="mis. Bab 2 Litosfer — diskusi kelompok jenis batuan" className="mt-1 block w-full rounded-xl border border-black/15 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold">Catatan kelas (opsional)
          <textarea name="catatan" defaultValue={catatan} rows={3} maxLength={500} disabled={!boleh} className="mt-1 block w-full rounded-xl border border-black/15 px-3 py-2 font-normal" />
        </label>
      </div>
      {boleh ? <TombolSimpan>Simpan absensi & jurnal</TombolSimpan> : <p className="text-sm text-black/50">Hanya baca: Anda bukan pengajar jam ini atau batas pengisian (2 hari) sudah lewat.</p>}
    </FormAksi>
  );
}
