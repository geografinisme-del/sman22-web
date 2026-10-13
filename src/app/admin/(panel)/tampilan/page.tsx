import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { bacaTema } from "@/lib/tema";
import { FormBento, FormBeranda, FormMasuk, FormWarna, TombolReset } from "./Form";

export const metadata = { title: "Tema & Tampilan" };

export default async function TemaTampilan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "konten.kelola")) redirect("/admin?pesan=tanpa-akses");
  const { data: s } = await supabase.from("pengaturan_situs").select("*").eq("id", 1).maybeSingle();
  const adaKolom = Boolean(s && "tema" in s);
  const t = bacaTema((s as { tema?: unknown } | null)?.tema);
  // kunci berubah saat data berubah → formulir dimuat ulang dengan nilai terbaru (mis. setelah "kembalikan bawaan")
  const kunci = (x: unknown) => {
    let h = 0;
    for (const c of JSON.stringify(x)) h = (h * 31 + c.charCodeAt(0)) | 0;
    return String(h);
  };

  return (
    <>
      <JudulHalaman
        judul="Tema & Tampilan"
        deskripsi="Atur warna, teks, ikon, dan kartu beranda sinematik serta halaman masuk — tanpa mengubah kode. Foto pembuka diatur di Tampilan Website; video/gambar sinematik di Tampilan Website → Visual sinematik."
      />
      <Notifikasi kode={sp.pesan} />
      {!adaKolom && (
        <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Jalankan migrasi <code>20261124000000_tema_tampilan.sql</code> di Supabase → SQL Editor agar pengaturan ini bisa disimpan.
        </p>
      )}
      <div className="space-y-8">
        <Kartu>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl">Warna</h2>
            <TombolReset yang="warna" />
          </div>
          <FormWarna key={kunci(t.warna)} w={t.warna} />
        </Kartu>
        <Kartu>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl">Beranda sinematik</h2>
            <TombolReset yang="beranda" />
          </div>
          <FormBeranda key={kunci({ ...t.beranda, bento: 0 })} b={t.beranda} />
        </Kartu>
        <Kartu>
          <h2 className="font-serif text-3xl">Kartu beranda (bento)</h2>
          <p className="mb-4 mt-1 text-sm text-black/60">Kartu kaca di bawah hero. Atur judul, ikon, gambar, ukuran, dan halaman tujuannya. Maksimal 10 kartu.</p>
          <FormBento key={kunci(t.beranda.bento)} kartu={t.beranda.bento} />
        </Kartu>
        <Kartu>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl">Halaman masuk portal</h2>
            <TombolReset yang="masuk" />
          </div>
          <FormMasuk key={kunci(t.masuk)} m={t.masuk} />
        </Kartu>
      </div>
    </>
  );
}
