import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { waktuWIB } from "@/lib/admin/label-audit";
import { getSitus } from "@/lib/data";
import { bacaKonfigurasi } from "@/lib/tampilan/konfigurasi";
import { bacaTema } from "@/lib/tema";
import { EditorTampilan } from "./Editor";
import { FormBento, FormBeranda, FormMasuk, TombolReset } from "./Form";

export const metadata = { title: "Tema & Tampilan" };
export const dynamic = "force-dynamic";

const kunci = (x: unknown) => {
  let h = 0;
  for (const c of JSON.stringify(x)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return String(h);
};

/**
 * Tampilan → Tema → Pratinjau → Sesuaikan → Terapkan.
 * Draf (tampilan_draf) & riwayat hanya bisa dibaca pengelola konten (RLS); publik hanya melihat versi terbit.
 */
export default async function TemaTampilan({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "konten.kelola")) redirect("/admin?pesan=tanpa-akses");

  const [{ data: s }, { tampilan: terbit }, draf, riwayatRes] = await Promise.all([
    supabase.from("pengaturan_situs").select("*").eq("id", 1).maybeSingle(),
    getSitus(),
    supabase.from("tampilan_draf").select("konfigurasi").eq("id", 1).maybeSingle(),
    supabase.from("riwayat_tampilan").select("id, waktu, catatan, oleh").order("waktu", { ascending: false }).limit(15),
  ]);
  const siap = !draf.error && !riwayatRes.error;
  const t = bacaTema((s as { tema?: unknown } | null)?.tema);
  const riwayat = riwayatRes.data ?? [];
  const ids = [...new Set(riwayat.map((r) => r.oleh).filter(Boolean))];
  const { data: orang } = ids.length ? await supabase.from("pengguna").select("user_id, nama, email").in("user_id", ids) : { data: [] };
  const nama = new Map((orang ?? []).map((o) => [o.user_id, o.nama || o.email]));

  return (
    <>
      <JudulHalaman
        judul="Tema & Tampilan"
        deskripsi="Pilih tema, susun widget beranda, atur popup & pemandu. Perubahan tersimpan sebagai draf; pratinjau dulu, lalu terapkan. Dasbor admin tidak ikut berubah."
      />
      <Notifikasi kode={sp.pesan} />
      <EditorTampilan
        siap={siap}
        terbit={terbit}
        draf={draf.data ? bacaKonfigurasi(draf.data.konfigurasi) : terbit}
        riwayat={riwayat.map((r) => ({ id: Number(r.id), waktu: waktuWIB(r.waktu), catatan: r.catatan, oleh: nama.get(r.oleh) ?? "—" }))}
      />

      <h2 className="mb-1 mt-10 text-lg font-semibold">Teks & tautan</h2>
      <p className="mb-4 text-sm text-[var(--muted)]">Isi berikut langsung berlaku (bukan bagian dari draf tema).</p>
      <div className="space-y-6">
        <Kartu>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">Judul bagian akses layanan</h3>
            <TombolReset yang="beranda" />
          </div>
          <FormBeranda key={kunci({ ...t.beranda, bento: 0 })} b={t.beranda} />
        </Kartu>
        <Kartu>
          <h3 className="font-semibold">Daftar akses layanan</h3>
          <p className="mb-4 mt-1 text-sm text-[var(--muted)]">Tautan layanan yang dipakai widget “Akses layanan”. Atur judul, teks singkat, ikon, dan halaman tujuan.</p>
          <FormBento key={kunci(t.beranda.bento)} kartu={t.beranda.bento} />
        </Kartu>
        <Kartu>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">Halaman masuk portal</h3>
            <TombolReset yang="masuk" />
          </div>
          <FormMasuk key={kunci(t.masuk)} m={t.masuk} />
        </Kartu>
      </div>
    </>
  );
}
