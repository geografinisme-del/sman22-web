"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ajukanTukar } from "@/app/admin/actions-tukar";
import { FormAksi, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";

type Slot = { id: string; hari: number; jp_ke: number; kelas: string; mapel: string };
const kelas = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-brand-600 aria-[invalid=true]:border-merah";
const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function PilihSlot({ nama, label, slot, tanggal }: { nama: string; label: string; slot: Slot[]; tanggal: Record<number, { nilai: string; label: string }[]> }) {
  const [pilih, setPilih] = useState("");
  const hari = slot.find((s) => s.id === pilih)?.hari;
  const errSlot = useErrorKolom(nama === "jadwal" ? "jadwal" : "jadwal_mitra");
  const errTgl = useErrorKolom(nama === "jadwal" ? "tanggal" : "tanggal_mitra");
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold">{label}</span>
        <select name={nama} value={pilih} onChange={(e) => setPilih(e.target.value)} aria-invalid={Boolean(errSlot)} className={kelas}>
          <option value="">— pilih jam —</option>
          {slot.map((s) => <option key={s.id} value={s.id}>{HARI[s.hari]} · JP {s.jp_ke} · {s.mapel} {s.kelas}</option>)}
        </select>
        {errSlot && <span className="mt-1 block text-merah">{errSlot}</span>}
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold">Tanggal</span>
        <select name={nama === "jadwal" ? "tanggal" : "tanggal_mitra"} disabled={!hari} aria-invalid={Boolean(errTgl)} className={kelas}>
          {(hari ? tanggal[hari] ?? [] : []).map((t) => <option key={t.nilai} value={t.nilai}>{t.label}</option>)}
        </select>
        {hari && !(tanggal[hari] ?? []).length && <span className="mt-1 block text-black/50">Tidak ada tanggal tersedia (libur).</span>}
        {errTgl && <span className="mt-1 block text-merah">{errTgl}</span>}
      </label>
    </div>
  );
}

export function FormTukar({ guru, mitra, slotSaya, slotMitra, tanggal }: {
  guru: { id: string; nama: string }[];
  mitra: string;
  slotSaya: Slot[];
  slotMitra: Slot[];
  tanggal: Record<number, { nilai: string; label: string }[]>;
}) {
  const router = useRouter();
  const [balas, setBalas] = useState<"tidak" | "ya">("ya");
  return (
    <div className="space-y-5">
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold">Guru yang diajak</span>
        <select value={mitra} onChange={(e) => router.replace(`?mitra=${e.target.value}`, { scroll: false })} className={kelas}>
          <option value="">— pilih guru —</option>
          {guru.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
      </label>
      {mitra && (
        <FormAksi aksi={ajukanTukar} className="space-y-5">
          <input type="hidden" name="mitra" value={mitra} />
          <PilihSlot nama="jadwal" label="Jam saya yang dilepas" slot={slotSaya} tanggal={tanggal} />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Bentuk</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["ya", "Tukar jam", "Saya menggantikan salah satu jam guru tsb sebagai balasan"], ["tidak", "Minta digantikan", "Guru tsb mengisi jam saya tanpa balasan"]] as const).map(([v, l, k]) => (
                <label key={v} className="flex cursor-pointer gap-3 rounded-xl border border-black/10 bg-white p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input type="radio" name="balas" value={v} checked={balas === v} onChange={() => setBalas(v)} className="mt-1" />
                  <span><span className="block text-sm font-semibold">{l}</span><span className="block text-xs text-black/50">{k}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {balas === "ya" && <PilihSlot nama="jadwal_mitra" label="Jam guru tsb yang saya isi" slot={slotMitra} tanggal={tanggal} />}
          <TextArea label="Alasan" nama="alasan" baris={2} wajib maks={300} placeholder="mis. Mengikuti MGMP Geografi kota" />
          <TombolSimpan>Kirim pengajuan</TombolSimpan>
        </FormAksi>
      )}
    </div>
  );
}
