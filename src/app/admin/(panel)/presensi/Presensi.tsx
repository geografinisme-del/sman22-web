"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { HasilAksi } from "../../actions";
import { ajukanIzinPegawai, presensiLengkap } from "../../actions-pegawai";
import { FormAksi, InputBukti, TextArea, TombolSimpan, useErrorKolom } from "@/components/admin/form";

/** Perkecil foto di HP sebelum dikirim (±720 px, JPEG) */
async function kecilkan(f: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const skala = Math.min(1, 720 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * skala);
    c.height = Math.round(bmp.height * skala);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
    return blob ? new File([blob], "swafoto.jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

function lokasi(): Promise<GeolocationPosition> {
  return new Promise((ok, gagal) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(ok, gagal, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      : gagal(new Error("Browser tidak mendukung lokasi")),
  );
}

export function TombolPresensi({ jenis, wajibLokasi, wajibSwafoto, utama }: { jenis: "masuk" | "pulang"; wajibLokasi: boolean; wajibSwafoto: boolean; utama?: boolean }) {
  const router = useRouter();
  const [hasil, setHasil] = useState<HasilAksi | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [proses, mulai] = useTransition();
  const [tahap, setTahap] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const kirim = () =>
    mulai(async () => {
      setHasil(null);
      const f = new FormData();
      f.set("jenis", jenis);
      try {
        if (wajibLokasi) {
          setTahap("Mengambil lokasi…");
          const p = await lokasi();
          f.set("lat", String(p.coords.latitude));
          f.set("lng", String(p.coords.longitude));
          f.set("akurasi", String(p.coords.accuracy));
        }
      } catch {
        setTahap("");
        return setHasil({ ok: false, pesan: "Lokasi tidak bisa diambil. Izinkan akses lokasi di browser, lalu coba lagi." });
      }
      if (wajibSwafoto) {
        if (!foto) { setTahap(""); return setHasil({ ok: false, pesan: "Ambil swafoto terlebih dahulu." }); }
        f.set("foto", foto);
      }
      setTahap("Menyimpan…");
      const r = await presensiLengkap({ ok: false, pesan: "" }, f);
      setTahap("");
      setHasil(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="mt-6 space-y-3">
      {wajibSwafoto && (
        <div className="flex items-center justify-center gap-3">
          {pratinjau && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pratinjau} alt="Pratinjau swafoto" className="h-16 w-16 rounded-full object-cover" />
          )}
          <input ref={input} type="file" accept="image/*" capture="user" className="sr-only" aria-label="Ambil swafoto"
                 onChange={async (e) => { const x = e.target.files?.[0]; if (!x) return; const k = await kecilkan(x); setFoto(k); setPratinjau(URL.createObjectURL(k)); }} />
          <button type="button" onClick={() => input.current?.click()} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">
            {foto ? "Ulangi swafoto" : "📷 Ambil swafoto"}
          </button>
        </div>
      )}
      <button type="button" onClick={kirim} disabled={proses}
              className={`w-full rounded-full px-6 py-4 text-lg font-semibold disabled:opacity-60 ${utama ? "bg-brand-900 text-white hover:bg-brand-700" : "border-2 border-brand-900 text-brand-900 hover:bg-brand-50"}`}>
        {proses ? tahap || "Memproses…" : `Presensi ${jenis}`}
      </button>
      {hasil?.pesan && <p role={hasil.ok ? "status" : "alert"} className={`text-sm font-medium ${hasil.ok ? "text-emerald-700" : "text-merah"}`}>{hasil.pesan}</p>}
    </div>
  );
}

function Tgl({ nama, label, nilai }: { nama: string; label: string; nilai: string }) {
  const err = useErrorKolom(nama);
  return (
    <label className="block text-sm font-semibold">{label}
      <input type="date" name={nama} defaultValue={nilai} className="mt-1 block w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-normal" />
      {err && <span className="block text-sm font-normal text-merah">{err}</span>}
    </label>
  );
}

export function FormIzinPegawai({ hariIni }: { hariIni: string }) {
  return (
    <FormAksi aksi={ajukanIzinPegawai} className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Jenis</legend>
        <div className="flex flex-wrap gap-2">
          {[["S", "Sakit"], ["I", "Izin"], ["DL", "Dinas luar"], ["C", "Cuti"]].map(([v, l]) => (
            <label key={v} className="cursor-pointer rounded-full px-4 py-2 text-sm ring-1 ring-black/15 has-[:checked]:bg-brand-900 has-[:checked]:text-white">
              <input type="radio" name="jenis" value={v} defaultChecked={v === "S"} className="sr-only" /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Tgl nama="tanggal_mulai" label="Dari" nilai={hariIni} />
        <Tgl nama="tanggal_selesai" label="Sampai" nilai={hariIni} />
      </div>
      <TextArea label="Keterangan" nama="alasan" baris={2} maks={500} wajib placeholder="mis. Rapat MGMP Geografi di Disdik" />
      <InputBukti label="Bukti (surat tugas / surat dokter, opsional)" />
      <TombolSimpan>Kirim pengajuan</TombolSimpan>
    </FormAksi>
  );
}
