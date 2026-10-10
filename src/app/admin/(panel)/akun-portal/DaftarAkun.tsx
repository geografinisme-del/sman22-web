"use client";

import { useActionState, useState, useTransition } from "react";
import { keCsv } from "@/lib/admin/induk";
import { aturUlangSandiPortal, buatAkunPortal, type AkunBaru, type HasilAkun } from "../../actions-portal";

export type BarisAkun = { siswa_id: string; nisn: string | null; nama: string; akun_siswa: boolean; akun_ortu: boolean };

const AWAL: HasilAkun = { ok: false, pesan: "" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const label = (j: AkunBaru["jenis"]) => (j === "siswa" ? "Siswa" : "Orang Tua");

function cetakKartu(akun: AkunBaru[], kelas: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return alert("Izinkan pop-up untuk mencetak kartu.");
  const url = `${window.location.origin}/masuk`;
  const kartu = akun
    .map(
      (a) => `<div class="k"><p class="j">Akun Portal ${label(a.jenis)} · SMAN 22 Bandung</p>
<p class="n">${esc(a.nama)}</p><p class="kl">Kelas ${esc(kelas)}</p>
<table><tr><td>Masuk di</td><td><b>${esc(url)}</b></td></tr>
<tr><td>Pilih</td><td><b>${label(a.jenis)}</b></td></tr>
<tr><td>NISN</td><td><b class="m">${esc(a.nisn)}</b></td></tr>
<tr><td>Kata sandi</td><td><b class="m">${esc(a.sandi)}</b></td></tr></table>
<p class="c">Ganti kata sandi setelah masuk pertama kali (menu Akun). Jangan dibagikan.</p></div>`,
    )
    .join("");
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Kartu akun ${esc(kelas)}</title><style>
body{font-family:system-ui,sans-serif;margin:16px}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.k{border:1.5px dashed #555;border-radius:10px;padding:12px 14px;break-inside:avoid;font-size:12px}
.j{margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#555}.n{margin:4px 0 0;font-size:15px;font-weight:700}
.kl{margin:0 0 6px;color:#555}td{padding:1px 8px 1px 0;vertical-align:top}.m{font-family:ui-monospace,monospace;font-size:14px;letter-spacing:.05em}
.c{margin:6px 0 0;font-size:10px;color:#555}@media print{body{margin:0}}</style></head>
<body><div class="g">${kartu}</div><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

function unduhCsv(akun: AkunBaru[], kelas: string) {
  const isi = keCsv(["Nama siswa", "Kelas", "Jenis akun", "NISN (login)", "Kata sandi awal"], akun.map((a) => [a.nama, kelas, label(a.jenis), a.nisn, a.sandi]));
  const url = URL.createObjectURL(new Blob([isi], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `akun-portal-${kelas.replace(/\s+/g, "-")}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

function HasilAkunBaru({ hasil, kelas }: { hasil: HasilAkun; kelas: string }) {
  if (!hasil.pesan) return null;
  return (
    <div role={hasil.ok ? "status" : "alert"} className={`mb-6 rounded-2xl p-5 ring-1 ${hasil.ok ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
      <p className={`text-sm font-medium ${hasil.ok ? "text-emerald-900" : "text-red-800"}`}>{hasil.pesan}</p>
      {!!hasil.akun?.length && (
        <>
          <p className="mt-2 text-sm text-black/70">
            <strong>Kata sandi hanya ditampilkan sekali.</strong> Cetak kartu atau unduh CSV sekarang, lalu bagikan langsung ke siswa/orang tua (jangan lewat grup).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => cetakKartu(hasil.akun!, hasil.kelas || kelas)} className="rounded-full bg-brand-900 px-5 py-2 text-sm font-semibold text-white">
              Cetak kartu akun
            </button>
            <button type="button" onClick={() => unduhCsv(hasil.akun!, hasil.kelas || kelas)} className="rounded-full px-5 py-2 text-sm font-semibold ring-1 ring-black/15">
              Unduh CSV
            </button>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-black/60">Lihat daftar ({hasil.akun.length})</summary>
            <ul className="mt-2 space-y-1 font-mono text-xs" data-testid="akun-baru">
              {hasil.akun.map((a) => (
                <li key={a.nisn + a.jenis}>
                  {a.nama} · {label(a.jenis)} · {a.nisn} · <span data-sandi>{a.sandi}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

export function DaftarAkun({ kelasId, kelasNama, baris }: { kelasId: string; kelasNama: string; baris: BarisAkun[] }) {
  const [hasil, buat, proses] = useActionState(buatAkunPortal, AWAL);
  const [hasilReset, reset, prosesReset] = useActionState(aturUlangSandiPortal, AWAL);
  const [, mulai] = useTransition();
  const bisa = baris.filter((b) => b.nisn && (!b.akun_siswa || !b.akun_ortu));
  const [pilih, setPilih] = useState<Set<string>>(() => new Set(bisa.map((b) => b.siswa_id)));
  const ubah = (id: string) => setPilih((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const jumlah = { siswa: baris.filter((b) => b.akun_siswa).length, ortu: baris.filter((b) => b.akun_ortu).length };

  return (
    <>
      <HasilAkunBaru hasil={hasil} kelas={kelasNama} />
      <HasilAkunBaru hasil={hasilReset} kelas={kelasNama} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (!confirm(`Buat akun untuk ${pilih.size} siswa terpilih?`)) return;
          mulai(() => buat(f));
        }}
      >
        <input type="hidden" name="kelas_id" value={kelasId} />
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-sm text-black/60">
            {baris.length} siswa · akun siswa {jumlah.siswa} · akun orang tua {jumlah.ortu}
          </p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="jenis" value="orang_tua" defaultChecked className="h-4 w-4 accent-brand-800" /> Akun orang tua
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="jenis" value="siswa" defaultChecked className="h-4 w-4 accent-brand-800" /> Akun siswa
          </label>
          <button disabled={proses || pilih.size === 0} className="ml-auto rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {proses ? "Membuat akun…" : `Buat akun (${pilih.size} siswa)`}
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-krem text-xs uppercase tracking-wider text-black/50">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua"
                    checked={pilih.size === bisa.length && bisa.length > 0}
                    onChange={(e) => setPilih(e.target.checked ? new Set(bisa.map((b) => b.siswa_id)) : new Set())}
                    className="h-4 w-4 accent-brand-800"
                  />
                </th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Akun siswa</th>
                <th className="px-4 py-3">Akun ortu</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => {
                const lengkap = b.akun_siswa && b.akun_ortu;
                return (
                  <tr key={b.siswa_id} className="border-b border-black/5">
                    <td className="px-4 py-2.5">
                      {b.nisn && !lengkap && (
                        <input type="checkbox" name="siswa" value={b.siswa_id} checked={pilih.has(b.siswa_id)} onChange={() => ubah(b.siswa_id)} aria-label={`Pilih ${b.nama}`} className="h-4 w-4 accent-brand-800" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{b.nama}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{b.nisn ?? <span className="text-merah">belum ada</span>}</td>
                    {(["siswa", "orang_tua"] as const).map((j) => {
                      const ada = j === "siswa" ? b.akun_siswa : b.akun_ortu;
                      return (
                        <td key={j} className="px-4 py-2.5">
                          {ada ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-emerald-700">✓ aktif</span>
                              <button
                                type="button"
                                disabled={prosesReset}
                                onClick={() => {
                                  if (!confirm(`Buat kata sandi baru untuk akun ${j === "siswa" ? "siswa" : "orang tua"} ${b.nama}?`)) return;
                                  const f = new FormData();
                                  f.set("siswa_id", b.siswa_id);
                                  f.set("jenis", j);
                                  mulai(() => reset(f));
                                }}
                                className="text-xs text-brand-700 underline"
                              >
                                atur ulang sandi
                              </button>
                            </span>
                          ) : (
                            <span className="text-black/40">belum</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>
    </>
  );
}
