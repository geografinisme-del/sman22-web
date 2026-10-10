import "server-only";
import QRCode from "qrcode";
import { alamatSitus } from "@/lib/notif/kirim";

/** QR (SVG data URI) berisi tautan halaman barang — dipindai dengan kamera HP oleh guru/staf yang login */
export async function qrBarang(id: string) {
  const svg = await QRCode.toString(`${alamatSitus()}/admin/sarpras/barang/${id}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** QR menuju halaman verifikasi sertifikat publik */
export async function qrSertifikat(kode: string) {
  const svg = await QRCode.toString(`${alamatSitus()}/sertifikat?kode=${encodeURIComponent(kode)}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
