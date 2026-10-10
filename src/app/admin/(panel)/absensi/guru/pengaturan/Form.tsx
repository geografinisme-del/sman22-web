"use client";

import { useActionState, useState } from "react";
import { Centang, FormAksi, Input, TombolSimpan } from "@/components/admin/form";
import { HARI } from "@/lib/admin/jadwal";
import { hapusSwafotoLama, simpanKelompokKerja, simpanLokasiSekolah } from "../../../../actions-pegawai";

export type Kelompok = { id?: string; nama: string; jam_masuk: string; toleransi_menit: number; jam_pulang: string; hari_kerja: number[]; wajib_lokasi: boolean; wajib_swafoto: boolean };

export function FormKelompok({ k }: { k: Kelompok }) {
  return (
    <FormAksi aksi={simpanKelompokKerja} className="space-y-4">
      {k.id && <input type="hidden" name="id" value={k.id} />}
      <div className="grid gap-3 sm:grid-cols-4">
        <Input label="Nama kelompok" nama="nama" nilai={k.nama} wajib maks={60} />
        <Input label="Jam masuk" nama="jam_masuk" tipe="time" nilai={k.jam_masuk.slice(0, 5)} />
        <Input label="Toleransi (menit)" nama="toleransi_menit" tipe="number" nilai={k.toleransi_menit} />
        <Input label="Pulang mulai" nama="jam_pulang" tipe="time" nilai={k.jam_pulang.slice(0, 5)} />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Hari kerja</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((h) => (
            <label key={h} className="cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 ring-black/15 has-[:checked]:bg-brand-900 has-[:checked]:text-white">
              <input type="checkbox" name="hari_kerja" value={h} defaultChecked={k.hari_kerja.includes(h)} className="sr-only" /> {HARI[h]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Centang label="Wajib lokasi (dalam radius sekolah)" nama="wajib_lokasi" nilai={k.wajib_lokasi} bantuan="Perlu titik lokasi sekolah di bawah. Catatan: lokasi HP dapat dipalsukan aplikasi tertentu." />
        <Centang label="Wajib swafoto" nama="wajib_swafoto" nilai={k.wajib_swafoto} bantuan="Aktifkan hanya bila sudah menjadi keputusan sekolah & disosialisasikan." />
      </div>
      <TombolSimpan>{k.id ? "Simpan kelompok" : "Tambah kelompok"}</TombolSimpan>
    </FormAksi>
  );
}

export function FormLokasi({ lat, lng, radius, retensi }: { lat: number | null; lng: number | null; radius: number; retensi: number }) {
  const [la, setLa] = useState(lat?.toString() ?? "");
  const [ln, setLn] = useState(lng?.toString() ?? "");
  const [info, setInfo] = useState("");
  return (
    <FormAksi aksi={simpanLokasiSekolah} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm font-semibold">Lintang (lat)
          <input name="lokasi_lat" value={la} onChange={(e) => setLa(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-xl border border-black/15 px-3 py-2.5 font-normal" />
        </label>
        <label className="text-sm font-semibold">Bujur (lng)
          <input name="lokasi_lng" value={ln} onChange={(e) => setLn(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-xl border border-black/15 px-3 py-2.5 font-normal" />
        </label>
        <Input label="Radius (meter)" nama="lokasi_radius" tipe="number" nilai={radius} />
        <Input label="Simpan swafoto (hari)" nama="retensi_swafoto_hari" tipe="number" nilai={retensi} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15"
          onClick={() => navigator.geolocation?.getCurrentPosition(
            (p) => { setLa(p.coords.latitude.toFixed(6)); setLn(p.coords.longitude.toFixed(6)); setInfo(`Akurasi ±${Math.round(p.coords.accuracy)} m`); },
            () => setInfo("Lokasi tidak bisa diambil"), { enableHighAccuracy: true, timeout: 15000 })}>
          📍 Pakai lokasi saya sekarang (berdiri di halaman sekolah)
        </button>
        {info && <span className="text-sm text-black/60">{info}</span>}
        {la && ln && <a href={`https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=18/${la}/${ln}`} target="_blank" rel="noopener" className="text-sm text-brand-700 underline">Cek di peta ↗</a>}
      </div>
      <TombolSimpan>Simpan lokasi</TombolSimpan>
    </FormAksi>
  );
}

export function TombolHapusSwafoto() {
  const [hasil, jalankan, proses] = useActionState(hapusSwafotoLama, { ok: false, pesan: "" });
  return (
    <form action={jalankan} onSubmit={(e) => { if (!confirm("Hapus permanen swafoto yang melewati masa simpan?")) e.preventDefault(); }}>
      <button disabled={proses} className="rounded-full px-4 py-2 text-sm font-semibold text-merah ring-1 ring-red-200 disabled:opacity-50">
        {proses ? "Menghapus…" : "Hapus swafoto lama sekarang"}
      </button>
      {hasil.pesan && <span className={`ml-3 text-sm ${hasil.ok ? "text-emerald-700" : "text-merah"}`}>{hasil.pesan}</span>}
    </form>
  );
}
