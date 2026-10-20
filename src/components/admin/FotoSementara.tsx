import { tandaiFotoAsli } from "@/app/admin/actions-buku";

/**
 * Penanda media "Ilustrasi sementara" di daftar admin + tombol untuk menandainya sebagai foto asli
 * (setelah admin mengganti gambarnya lewat "Ubah"). Tidak tampil bila kolom is_placeholder belum ada / false.
 */
export function FotoSementara({ tabel, id, sementara, kembali }: { tabel: "berita" | "galeri" | "hero_slide" | "prestasi" | "kartu_beranda"; id: string; sementara?: boolean; kembali: string }) {
  if (!sementara) return null;
  return (
    <form action={tandaiFotoAsli} className="flex items-center gap-1">
      <input type="hidden" name="tabel" value={tabel} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kembali" value={kembali} />
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200">Ilustrasi sementara</span>
      <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-black/5" title="Ganti gambar lewat Ubah, lalu tandai sebagai foto asli">
        Tandai foto asli
      </button>
    </form>
  );
}
