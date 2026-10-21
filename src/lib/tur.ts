/**
 * Logika murni tur sekolah (diuji dengan node --test).
 *
 * Gulir section sticky dibagi: 10% pertama = lapisan awan (opacity 1 → 0); sisa 90% dibagi rata per titik.
 * Pergantian media (crossfade) terjadi di 40% tengah tiap batas segmen: dari 0,3 → 0,7 bagian segmen i,
 * media i memudar ke media i+1. Foto aktif zoom pelan 1.12 → 1.04 dan bergeser tipis selama tampil.
 */
export const BAGIAN_AWAN = 0.1;
export const SKALA_AWAL = 1.12;
export const SKALA_AKHIR = 1.04;

const jepit = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export type KeadaanTur = {
  /** opacity lapisan awan pembuka */
  awan: number;
  /** indeks titik yang dianggap aktif (kartu info & penanda) */
  aktif: number;
  /** opacity media tiap titik (jumlahnya ≤ 1 + 1 saat crossfade) */
  bobot: number[];
  /** skala foto tiap titik */
  skala: number[];
  /** geser horizontal tiap foto (persen, -1.5 → 1.5) */
  geser: number[];
};

export function hitungTur(progres: number, n: number): KeadaanTur {
  const p = jepit(progres);
  const awan = p < BAGIAN_AWAN ? 1 - p / BAGIAN_AWAN : 0;
  if (n <= 0) return { awan, aktif: 0, bobot: [], skala: [], geser: [] };
  const q = jepit((p - BAGIAN_AWAN) / (1 - BAGIAN_AWAN));
  const x = Math.min(q * n, n - 1e-9); // posisi dalam satuan segmen
  const i = Math.floor(x);
  const frac = x - i;
  const t = i < n - 1 ? jepit((frac - 0.3) / 0.4) : 0; // crossfade di 40% tengah
  const bobot = Array.from({ length: n }, (_, k) => (k === i ? 1 - t : k === i + 1 ? t : 0));
  // waktu tampil titik k kira-kira dari (k - 0.3) sampai (k + 0.7) dalam satuan segmen
  const skala = Array.from({ length: n }, (_, k) => SKALA_AWAL - (SKALA_AWAL - SKALA_AKHIR) * jepit((x - (k - 0.3)) / 1));
  const geser = Array.from({ length: n }, (_, k) => -1.5 + 3 * jepit((x - (k - 0.3)) / 1));
  return { awan, aktif: t >= 0.5 ? i + 1 : i, bobot, skala, geser };
}

/** Durasi MP4 (detik) dari kotak mvhd; null bila bukan MP4 yang valid. */
export function durasiMp4(isi: Uint8Array): number | null {
  const ascii = (o: number) => String.fromCharCode(isi[o], isi[o + 1], isi[o + 2], isi[o + 3]);
  if (isi.length < 12 || ascii(4) !== "ftyp") return null;
  const dv = new DataView(isi.buffer, isi.byteOffset, isi.byteLength);
  for (let o = 8; o < isi.length - 32; o++) {
    if (isi[o] !== 0x6d || ascii(o) !== "mvhd") continue; // 'm'
    const c = o + 4; // awal isi kotak (versi + flags)
    const versi = isi[c];
    if (versi === 0) {
      const skala = dv.getUint32(c + 12);
      const dur = dv.getUint32(c + 16);
      return skala ? dur / skala : null;
    }
    if (versi === 1) {
      const skala = dv.getUint32(c + 20);
      const dur = Number(dv.getBigUint64(c + 24));
      return skala ? dur / skala : null;
    }
    return null;
  }
  return null;
}
