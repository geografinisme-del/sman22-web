"use client";

import { useMemo, useState } from "react";
import { FormAksi, TombolSimpan } from "@/components/admin/form";
import { jamPendek, namaHari, type Jam } from "@/lib/admin/jadwal";
import { simpanJadwalKelas } from "../../../actions-jadwal";

export type OpsiPenugasan = { id: string; mapel: string; kode: string; guru: string | null; pegawai_id: string | null; jp: number };
type Isi = { penugasan_id: string; ruang_id: string | null };

/**
 * Penyusun jadwal satu kelas. Guru yang sudah mengajar di kelas lain pada slot yang sama
 * tidak bisa dipilih (ditandai). Pemeriksaan final tetap dilakukan database saat menyimpan.
 */
export function EditorJadwal({
  kelasId,
  jam,
  penugasan,
  awal,
  sibukGuru,
  sibukRuang,
  ruang,
}: {
  kelasId: string;
  jam: Jam[];
  penugasan: OpsiPenugasan[];
  awal: Record<string, Isi>;
  sibukGuru: Record<string, Record<string, string>>; // slot → pegawai_id → kelas lain
  sibukRuang: Record<string, Record<string, string>>; // slot → ruang_id → kelas lain
  ruang: { id: string; nama: string }[];
}) {
  const [isi, setIsi] = useState<Record<string, Isi>>(awal);
  const [pakaiRuang, setPakaiRuang] = useState(Object.values(awal).some((v) => v.ruang_id));
  const hari = [...new Set(jam.filter((j) => j.jp_ke).map((j) => j.hari))].sort();
  const maksJp = Math.max(0, ...jam.map((j) => j.jp_ke ?? 0));
  const waktu = new Map(jam.filter((j) => j.jp_ke).map((j) => [`${j.hari}-${j.jp_ke}`, jamPendek(j.jam_mulai)]));
  const pPeta = useMemo(() => new Map(penugasan.map((p) => [p.id, p])), [penugasan]);

  const hitung = useMemo(() => {
    const n = new Map<string, number>();
    for (const v of Object.values(isi)) n.set(v.penugasan_id, (n.get(v.penugasan_id) ?? 0) + 1);
    return n;
  }, [isi]);
  const berubah = JSON.stringify(isi) !== JSON.stringify(awal);
  const kirim = Object.entries(isi).map(([slot, v]) => {
    const [h, jp] = slot.split("-").map(Number);
    return { hari: h, jp_ke: jp, penugasan_id: v.penugasan_id, ruang_id: pakaiRuang ? v.ruang_id : null };
  });

  const atur = (slot: string, penugasanId: string) =>
    setIsi((s) => {
      const n = { ...s };
      if (!penugasanId) delete n[slot];
      else n[slot] = { penugasan_id: penugasanId, ruang_id: s[slot]?.ruang_id ?? null };
      return n;
    });
  const aturRuang = (slot: string, r: string) => setIsi((s) => (s[slot] ? { ...s, [slot]: { ...s[slot], ruang_id: r || null } } : s));

  return (
    <FormAksi aksi={simpanJadwalKelas} className="space-y-5">
      <input type="hidden" name="kelas_id" value={kelasId} />
      <input type="hidden" name="isi" value={JSON.stringify(kirim)} />

      <div className="flex flex-wrap gap-2" aria-label="Ringkasan JP per mapel">
        {penugasan.map((p) => {
          const n = hitung.get(p.id) ?? 0;
          const warna = n === p.jp ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : n > p.jp ? "bg-red-50 text-red-800 ring-red-200" : "bg-white ring-black/10";
          return (
            <span key={p.id} className={`rounded-full px-3 py-1 text-xs ring-1 ${warna}`} title={p.guru ?? "Guru belum ditentukan"}>
              {p.kode || p.mapel} <strong>{n}/{p.jp}</strong>
            </span>
          );
        })}
      </div>

      {ruang.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pakaiRuang} onChange={(e) => setPakaiRuang(e.target.checked)} className="h-4 w-4 accent-brand-800" />
          Atur ruang (lab, lapangan) per jam
        </label>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[820px] table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-12 border-b border-black/10 bg-krem px-2 py-2">JP</th>
              {hari.map((h) => <th key={h} className="border-b border-black/10 bg-krem px-2 py-2 text-left text-sm">{namaHari(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maksJp }, (_, i) => i + 1).map((jp) => (
              <tr key={jp}>
                <td className="border-b border-r border-black/5 text-center font-serif text-lg text-black/40">{jp}</td>
                {hari.map((h) => {
                  const slot = `${h}-${jp}`;
                  const w = waktu.get(slot);
                  if (!w) return <td key={h} className="border-b border-r border-black/5 bg-black/[0.03]" />;
                  const v = isi[slot];
                  const p = v ? pPeta.get(v.penugasan_id) : undefined;
                  const bentrok = p?.pegawai_id ? sibukGuru[slot]?.[p.pegawai_id] : undefined;
                  return (
                    <td key={h} className={`border-b border-r border-black/5 p-1 align-top ${bentrok ? "bg-red-50" : v ? "bg-brand-50/60" : ""}`}>
                      <span className="block px-1 text-[10px] text-black/40">{w}</span>
                      <select
                        value={v?.penugasan_id ?? ""}
                        onChange={(e) => atur(slot, e.target.value)}
                        aria-label={`${namaHari(h)} JP ${jp}`}
                        className="w-full rounded-lg border border-black/10 bg-white px-1.5 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {penugasan.map((o) => {
                          const di = o.pegawai_id ? sibukGuru[slot]?.[o.pegawai_id] : undefined;
                          return (
                            <option key={o.id} value={o.id} disabled={Boolean(di) && o.id !== v?.penugasan_id}>
                              {o.kode || o.mapel}{o.guru ? ` – ${o.guru}` : ""}{di ? ` (mengajar di ${di})` : ""}
                            </option>
                          );
                        })}
                      </select>
                      {bentrok && <span className="mt-0.5 block px-1 text-[10px] font-semibold text-red-700">Bentrok: guru di {bentrok}</span>}
                      {pakaiRuang && v && (
                        <select value={v.ruang_id ?? ""} onChange={(e) => aturRuang(slot, e.target.value)} aria-label={`Ruang ${namaHari(h)} JP ${jp}`}
                                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-1.5 py-0.5 text-[11px]">
                          <option value="">Ruang kelas</option>
                          {ruang.map((r) => {
                            const di = sibukRuang[slot]?.[r.id];
                            return <option key={r.id} value={r.id} disabled={Boolean(di) && r.id !== v.ruang_id}>{r.nama}{di ? ` (dipakai ${di})` : ""}</option>;
                          })}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-black/10 backdrop-blur">
        <TombolSimpan>Simpan jadwal</TombolSimpan>
        <button type="button" onClick={() => setIsi(awal)} disabled={!berubah} className="rounded-full px-4 py-2 text-sm ring-1 ring-black/15 disabled:opacity-40">Batalkan perubahan</button>
        <span className="text-sm text-black/60">{kirim.length} JP terisi{berubah && " · belum disimpan"}</span>
      </div>
    </FormAksi>
  );
}
