import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Lencana, Notifikasi } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { gantiFotoSlot, kembalikanFotoAsli } from "../../actions-foto-slot";

export const metadata = { title: "Foto sementara" };

type Slot = {
  lokasi: string;
  nama: string;
  jenis: "dekorasi" | "kegiatan";
  tabel: string | null;
  url_aktif: string;
  is_placeholder: boolean;
  url_asli: string | null;
  asli_sementara: boolean;
  fotografer: string;
  sumber: string;
  tautan_sumber: string;
  dikembalikan_pada: string | null;
};

/** halaman CMS tempat foto slot tabel diganti */
const HALAMAN_CMS: Record<string, { href: string; label: string }> = {
  kartu_beranda: { href: "/admin/kartu-beranda", label: "Kartu Beranda" },
  tur_sekolah: { href: "/admin/tur-sekolah", label: "Tur Sekolah" },
  galeri: { href: "/admin/galeri", label: "Galeri" },
  menu_sorotan: { href: "/admin/menu", label: "Menu navigasi" },
  portal_login: { href: "/admin/portal-masuk", label: "Halaman masuk portal" },
};

function Mini({ src, label }: { src: string | null; label: string }) {
  return (
    <figure className="w-36 shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- pratinjau kecil admin (berkas situs/Storage)
        <img src={src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-black/10" />
      ) : (
        <span className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-[var(--soft)] text-xs text-[var(--muted)]">Kosong</span>
      )}
      <figcaption className="mt-1 text-xs text-[var(--muted)]">{label}</figcaption>
    </figure>
  );
}

export default async function AdminFotoSementara({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const { data, error } = await supabase.from("foto_slot").select("*").order("jenis").order("nama");
  const list = (data ?? []) as Slot[];
  const sementara = list.filter((s) => s.is_placeholder).length;

  return (
    <>
      <JudulHalaman
        judul="Foto sementara"
        deskripsi="Foto yang buram atau kecil diganti sementara dengan foto stok berlisensi bebas (berlabel di situs). Foto asli tidak dihapus: kembalikan dengan satu klik, atau ganti dengan foto asli sekolah yang baru."
      />
      <Notifikasi kode={pesan} />
      {error ? (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel foto_slot belum tersedia. Jalankan migrasi <code>20261227000000_foto_slot.sql</code>.
        </p>
      ) : !list.length ? (
        <KosongAdmin teks="Belum ada foto sementara." />
      ) : (
        <>
          <p className="mb-5 text-sm text-[var(--muted)]">
            {sementara} dari {list.length} lokasi masih memakai ilustrasi sementara.{" "}
            <Link href="/kredit-foto" className="font-semibold text-[var(--ink)] underline underline-offset-2">
              Lihat halaman kredit foto
            </Link>
          </p>
          <ul className="grid gap-4">
            {list.map((s) => {
              const cms = s.tabel ? HALAMAN_CMS[s.tabel] : undefined;
              return (
                <li key={s.lokasi}>
                  <Kartu>
                    <div className="flex flex-wrap items-start gap-5">
                      <Mini src={s.url_aktif} label={s.is_placeholder ? "Dipakai sekarang (sementara)" : "Dipakai sekarang"} />
                      <Mini src={s.url_asli} label={s.url_asli ? (s.asli_sementara ? "Sebelumnya (foto stok lama)" : "Foto asli (arsip)") : "Sebelumnya kosong"} />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold">{s.nama}</h2>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          {s.is_placeholder ? <Lencana warna="kuning">{s.jenis === "kegiatan" ? "Ilustrasi — bukan foto kegiatan" : "Ilustrasi sementara"}</Lencana> : <Lencana warna="hijau">Foto asli</Lencana>}
                          {s.dikembalikan_pada && <Lencana>Dikembalikan</Lencana>}
                        </p>
                        {s.fotografer && (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Foto stok: {s.fotografer} ·{" "}
                            <a href={s.tautan_sumber} target="_blank" rel="noopener" className="underline underline-offset-2">
                              {s.sumber || "sumber"}
                            </a>
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {s.url_asli && s.url_aktif !== s.url_asli && (
                            <form action={kembalikanFotoAsli}>
                              <input type="hidden" name="lokasi" value={s.lokasi} />
                              <button type="submit" className="inline-flex min-h-10 items-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:bg-[var(--soft)]">
                                Kembalikan foto asli
                              </button>
                            </form>
                          )}
                          {cms && (
                            <Link href={cms.href} className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold underline underline-offset-2">
                              Ganti foto di {cms.label}
                            </Link>
                          )}
                        </div>
                        {!s.tabel && (
                          <form action={gantiFotoSlot} className="mt-4 flex flex-wrap items-end gap-3">
                            <input type="hidden" name="lokasi" value={s.lokasi} />
                            <label className="grid gap-1 text-sm">
                              <span className="font-semibold">Ganti dengan foto asli sekolah</span>
                              <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
                            </label>
                            <label className="grid gap-1 text-sm">
                              <span className="font-semibold">Teks alternatif</span>
                              <input type="text" name="alt" maxLength={200} placeholder="mis. Gedung utama sekolah" className="min-h-10 rounded-lg border border-[var(--line)] px-3" />
                            </label>
                            <button type="submit" className="inline-flex min-h-10 items-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white">
                              Unggah
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </Kartu>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
