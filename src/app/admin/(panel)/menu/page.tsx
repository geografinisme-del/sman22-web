import Image from "next/image";
import Link from "next/link";
import { Centang, FormAksi, Input, InputGambar, TextArea, TombolSimpan } from "@/components/admin/form";
import { FotoSementara } from "@/components/admin/FotoSementara";
import { JudulHalaman, Kartu, Lencana, Notifikasi } from "@/components/admin/ui";
import { GRUP_LANGIT } from "@/content/menu-langit";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { simpanMenuGrup, simpanSorotan } from "../../actions-menu";

export const metadata = { title: "Menu navigasi" };

type Sorotan = { id: string; grup: string; urutan: number; aktif: boolean; judul: string; keterangan: string; tautan: string; foto_url: string; is_placeholder: boolean; fokus_x: number; fokus_y: number };

/**
 * CMS navigasi: teks pengantar, keterangan tautan, teks tombol ajakan HP, dan kartu sorotan mega menu.
 * Label & tujuan tautan menu tetap di kode. Kosong = teks bawaan.
 */
export default async function AdminMenu({ searchParams }: { searchParams: Promise<{ pesan?: string; ubah?: string; baru?: string }> }) {
  const { pesan, ubah, baru } = await searchParams;
  const { supabase } = await wajibIzin("konten.kelola");
  const [g, k, s] = await Promise.all([
    supabase.from("menu_grup").select("*"),
    supabase.from("menu_keterangan").select("*"),
    supabase.from("menu_sorotan").select("*").order("grup").order("urutan").order("created_at"),
  ]);
  const galat = g.error ?? k.error ?? s.error;
  const isiGrup = new Map((g.data ?? []).map((r) => [r.kunci as string, r]));
  const ket = (grup: string, href: string) => (k.data ?? []).find((r) => r.grup === grup && r.href === href)?.keterangan ?? "";
  const sorotan = (s.data ?? []) as Sorotan[];
  const diubah = ubah && uuid.safeParse(ubah).success ? sorotan.find((x) => x.id === ubah) : undefined;

  return (
    <>
      <JudulHalaman judul="Menu navigasi" deskripsi="Teks mega menu (desktop) dan menu HP. Label & alamat tautan tetap; kosongkan isian untuk memakai teks bawaan. Perubahan tampil maksimal 5 menit (langsung setelah disimpan)." />
      <Notifikasi kode={pesan} />
      {galat && (
        <p role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Tabel menu navigasi belum tersedia. Jalankan migrasi <code>20261223000000_menu_navigasi.sql</code>. Sampai itu, menu memakai teks & foto bawaan.
        </p>
      )}
      {!galat &&
        GRUP_LANGIT.map((grup) => {
          const isi = isiGrup.get(grup.kunci);
          const milik = sorotan.filter((x) => x.grup === grup.kunci);
          const formSorotan = grup.jenis === "foto" && ((diubah && diubah.grup === grup.kunci) || baru === grup.kunci);
          const d = diubah && diubah.grup === grup.kunci ? diubah : { judul: "", keterangan: "", tautan: "", foto_url: "", fokus_x: 50, fokus_y: 50, urutan: milik.length + 1, aktif: true };
          return (
            <Kartu key={grup.kunci} className="mb-8 scroll-mt-24">
              <h2 id={`menu-${grup.kunci}`} className="mb-4 text-2xl">
                {grup.label}
              </h2>
              <FormAksi aksi={simpanMenuGrup} className="grid gap-4">
                <input type="hidden" name="kunci" value={grup.kunci} />
                <TextArea label="Kalimat pengantar" nama="pengantar" nilai={isi?.pengantar ?? ""} baris={2} maks={200} placeholder={grup.keterangan} />
                <Input label="Teks tombol ajakan (menu HP)" nama="ajakan" nilai={isi?.ajakan ?? ""} maks={60} placeholder={grup.ajakan.label} />
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-semibold">Keterangan tautan (1 baris)</legend>
                  {grup.anak.map((a, i) => (
                    <Input key={a.href} label={`${a.label} (${a.href})`} nama={`ket_${i}`} nilai={ket(grup.kunci, a.href)} maks={120} placeholder={a.keterangan} />
                  ))}
                </fieldset>
                <div>
                  <TombolSimpan>Simpan teks {grup.label}</TombolSimpan>
                </div>
              </FormAksi>

              {grup.jenis === "foto" && (
                <div className="mt-8 border-t border-[var(--line)] pt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Kartu sorotan (maks. 3 aktif tampil)</h3>
                    {!formSorotan && (
                      <Link href={`/admin/menu?baru=${grup.kunci}#menu-${grup.kunci}`} className="inline-flex min-h-10 items-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white">
                        Tambah kartu
                      </Link>
                    )}
                  </div>
                  {milik.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">Belum ada kartu dari CMS — menu memakai 3 kartu bawaan ({grup.sorotan.map((x) => x.judul).join(", ")}).</p>
                  ) : (
                    <ul className="divide-y divide-[var(--line)] rounded-2xl ring-1 ring-[var(--line)]">
                      {milik.map((x) => (
                        <li key={x.id} className="flex flex-wrap items-center gap-3 p-3">
                          <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--soft)]">
                            {x.foto_url && <Image src={x.foto_url} alt="" fill sizes="64px" className="object-cover" style={{ objectPosition: `${x.fokus_x}% ${x.fokus_y}%` }} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 font-medium">
                              {x.urutan}. {x.judul} {!x.aktif && <Lencana>Nonaktif</Lencana>}
                            </span>
                            <span className="block truncate text-sm text-[var(--muted)]">
                              {x.tautan} · {x.keterangan}
                            </span>
                          </span>
                          <FotoSementara tabel="menu_sorotan" id={x.id} sementara={x.is_placeholder && Boolean(x.foto_url)} kembali="/admin/menu" />
                          <Link href={`/admin/menu?ubah=${x.id}#menu-${grup.kunci}`} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-[var(--soft)]">
                            Ubah
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {formSorotan && (
                    <FormAksi key={diubah?.id ?? `baru-${grup.kunci}`} aksi={simpanSorotan} className="mt-5 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="grup" value={grup.kunci} />
                      {diubah && <input type="hidden" name="id" value={diubah.id} />}
                      <Input label="Judul" nama="judul" nilai={d.judul} wajib maks={60} />
                      <Input label="Tautan" nama="tautan" nilai={d.tautan} wajib placeholder="/profil atau https://…" />
                      <div className="sm:col-span-2">
                        <Input label="Keterangan (1 baris)" nama="keterangan" nilai={d.keterangan} maks={120} />
                      </div>
                      <div className="sm:col-span-2">
                        <InputGambar label="Foto (4:3, minimal 1200×900 px)" nama="foto" sekarang={d.foto_url || undefined} />
                      </div>
                      <Input label="Titik fokus horizontal (0–100, 50 = tengah)" nama="fokus_x" tipe="number" nilai={String(d.fokus_x)} />
                      <Input label="Titik fokus vertikal (0–100, 50 = tengah)" nama="fokus_y" tipe="number" nilai={String(d.fokus_y)} />
                      <Input label="Urutan" nama="urutan" tipe="number" nilai={String(d.urutan)} />
                      <Centang label="Tampilkan di menu" nama="aktif" nilai={d.aktif} />
                      <div className="flex items-center gap-3 sm:col-span-2">
                        <TombolSimpan>{diubah ? "Simpan kartu" : "Tambah kartu"}</TombolSimpan>
                        <Link href={`/admin/menu#menu-${grup.kunci}`} className="text-sm text-[var(--muted)] hover:underline">
                          Batal
                        </Link>
                      </div>
                    </FormAksi>
                  )}
                </div>
              )}
            </Kartu>
          );
        })}
    </>
  );
}
