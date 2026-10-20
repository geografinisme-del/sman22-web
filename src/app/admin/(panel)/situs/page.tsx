import { JudulHalaman, Kartu, Lencana, Notifikasi } from "@/components/admin/ui";
import { sekolah } from "@/content/sekolah";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { formatWaktu, keInputWaktu } from "@/lib/format";
import { redirect } from "next/navigation";
import { arsipSlide } from "../../actions-situs";
import { arsipVisual } from "../../actions-visual";
import { FormVisual } from "./FormVisual";
import { FormFooter, FormHeroTeks, FormLayanan, FormPersetujuan, FormSeo, FormSlide, type DataSitus } from "./Form";

export const metadata = { title: "Tampilan Website" };

export default async function PengaturanSitus({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "konten.kelola");
  const terbitkan = punya(akses, "konten.terbitkan");
  if (!kelola && !terbitkan) redirect("/admin?pesan=tanpa-akses");
  const [{ data: s }, { data: slide }, { data: visual, error: errVisual }] = await Promise.all([
    supabase.from("pengaturan_situs").select("*").eq("id", 1).maybeSingle(),
    kelola ? supabase.from("hero_slide").select("*").is("deleted_at", null).order("urutan").order("created_at") : Promise.resolve({ data: [] }),
    kelola
      ? supabase.from("visual_akun").select("*").is("deleted_at", null).order("urutan").order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (!s) return <p>Pengaturan situs belum tersedia. Jalankan migrasi 20261018000000_cms_lanjutan.sql.</p>;
  const d = s as DataSitus;
  const sekarang = new Date();

  return (
    <>
      <JudulHalaman judul="Tampilan Website" deskripsi="Atur bagian pembuka beranda, foto, tautan layanan, footer, dan tampilan di Google — tanpa mengubah kode." />
      <Notifikasi kode={sp.pesan} />
      <div className="space-y-8">
        {kelola && (
          <>
            <Kartu>
              <h2 className="mb-4 text-3xl">Bagian pembuka (hero)</h2>
              <FormHeroTeks d={d} />
            </Kartu>

            <Kartu>
              <h2 id="foto-hero" className="text-3xl">Foto pembuka</h2>
              <p className="mt-1 text-sm text-black/60">Foto berganti otomatis. Bila belum ada foto di sini, website memakai foto bawaan.</p>
              <ul className="mt-5 space-y-4">
                {(slide ?? []).map((x) => {
                  const terjadwal = x.tayang_mulai && new Date(x.tayang_mulai) > sekarang;
                  const berakhir = x.tayang_selesai && new Date(x.tayang_selesai) <= sekarang;
                  return (
                    <li key={x.id} className="rounded-2xl bg-soft p-4">
                      <details open={sp.ubah === x.id}>
                        <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={x.gambar_url} alt="" className="h-14 w-24 rounded-lg object-cover" style={{ objectPosition: `${x.fokus_x}% ${x.fokus_y}%` }} />
                          <span className="font-medium">#{x.urutan} {x.alt}</span>
                          {!x.aktif ? <Lencana>Disembunyikan</Lencana> : berakhir ? <Lencana>Berakhir</Lencana> : terjadwal ? <Lencana warna="kuning">Mulai {formatWaktu(x.tayang_mulai)}</Lencana> : <Lencana warna="hijau">Tayang</Lencana>}
                          {x.gambar_hp_url && <Lencana>Ada versi HP</Lencana>}
                        </summary>
                        <div className="mt-4">
                          <FormSlide s={{ ...x, tayang_mulai: keInputWaktu(x.tayang_mulai), tayang_selesai: keInputWaktu(x.tayang_selesai) }} />
                          <form action={arsipSlide} className="mt-3">
                            <input type="hidden" name="id" value={x.id} />
                            <button className="text-sm text-blue-teks underline">Hapus foto dari pembuka</button>
                          </form>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
              <details className="mt-5" open={!slide?.length}>
                <summary className="cursor-pointer font-semibold text-blue-teks">+ Tambah foto pembuka</summary>
                <div className="mt-4">
                  <FormSlide s={{ alt: "", fokus_x: 50, fokus_y: 50, skala: 100, tautan: "", urutan: (slide?.length ?? 0) + 1, aktif: true, tayang_mulai: "", tayang_selesai: "" }} />
                </div>
              </details>
            </Kartu>

            <Kartu>
              <h2 id="visual-masuk" className="scroll-mt-24 text-3xl">Visual sinematik (beranda & halaman masuk)</h2>
              <p className="mt-1 text-sm text-black/60">
                Video atau gambar untuk <strong>beranda</strong> (bergerak mengikuti gulir) dan latar <strong>halaman masuk</strong> guru, siswa &amp;
                orang tua. Bila kosong, memakai visual bawaan.{" "}
                <a href="/" target="_blank" className="font-medium text-blue-teks underline">
                  Lihat beranda ↗
                </a>{" "}
                ·{" "}
                <a href="/admin/login" target="_blank" className="font-medium text-blue-teks underline">
                  Lihat halaman masuk ↗
                </a>
              </p>
              {errVisual ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                  Fitur ini perlu migrasi <code>20261120000000_visual_akun.sql</code> dijalankan di Supabase → SQL Editor.
                </p>
              ) : (
                <>
                  <ul className="mt-5 space-y-4">
                    {(visual ?? []).map((x) => (
                      <li key={x.id} className="rounded-2xl bg-soft p-4">
                        <details open={sp.ubah === x.id}>
                          <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                            {x.jenis === "video" ? (
                              <video src={x.berkas_url} poster={x.poster_url || undefined} muted preload="metadata" className="h-16 w-14 rounded-lg bg-black object-cover" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={x.berkas_url} alt="" className="h-16 w-14 rounded-lg object-cover" />
                            )}
                            <span className="font-medium">
                              #{x.urutan} {x.jenis === "video" ? "Video" : "Gambar"}
                              {x.keterangan ? ` · ${x.keterangan}` : ""}
                            </span>
                            <Lencana warna="kuning">{x.lokasi === "beranda" ? "Beranda" : "Halaman masuk"}</Lencana>
                            {x.aktif ? <Lencana warna="hijau">Tayang</Lencana> : <Lencana>Disembunyikan</Lencana>}
                            {x.tautan && <Lencana>→ {x.tautan}</Lencana>}
                          </summary>
                          <div className="mt-4">
                            <FormVisual v={x} />
                            <form action={arsipVisual} className="mt-3">
                              <input type="hidden" name="id" value={x.id} />
                              <button className="text-sm text-blue-teks underline">Hapus visual ini</button>
                            </form>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                  <details className="mt-5" open={!visual?.length}>
                    <summary className="cursor-pointer font-semibold text-blue-teks">+ Tambah gambar / video</summary>
                    <div className="mt-4">
                      <FormVisual
                        v={{ jenis: "video", keterangan: "", judul_tautan: "", tautan: "", urutan: (visual?.length ?? 0) + 1, aktif: true }}
                      />
                    </div>
                  </details>
                </>
              )}
            </Kartu>

            <Kartu>
              <h2 className="mb-4 text-3xl">Tautan layanan</h2>
              <FormLayanan d={d} />
            </Kartu>

            <Kartu>
              <h2 className="mb-4 text-3xl">Footer & media sosial</h2>
              <FormFooter d={d} />
            </Kartu>

            <Kartu>
              <h2 className="mb-4 text-3xl">Tampilan di Google & media sosial (SEO)</h2>
              <FormSeo d={d} situs={sekolah.urlSitus.replace(/^https?:\/\//, "")} />
            </Kartu>
          </>
        )}
        <Kartu>
          <h2 className="mb-4 text-3xl">Alur persetujuan berita</h2>
          <FormPersetujuan d={d} boleh={terbitkan} />
        </Kartu>
      </div>
    </>
  );
}
