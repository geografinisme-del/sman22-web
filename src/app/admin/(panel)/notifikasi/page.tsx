import Link from "next/link";
import { JudulHalaman, Kartu } from "@/components/admin/ui";
import { DaftarNotifikasi } from "@/components/notif/Daftar";
import { FormPreferensi } from "@/components/notif/Preferensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { kanalAktif } from "@/lib/notif/kirim";
import { muatPreferensi } from "@/lib/notif/kontak";

export const metadata = { title: "Notifikasi" };

export default async function Notifikasi() {
  const { supabase, akses } = await wajibLogin();
  if (!akses) return null;
  const { pref, kontak } = await muatPreferensi(supabase, akses);
  return (
    <>
      <JudulHalaman judul="Notifikasi" aksi={punya(akses, "pengguna.kelola") ? <Link href="/admin/notifikasi/kanal" className="text-sm text-brand-700 underline">Status WhatsApp & email →</Link> : undefined} />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <DaftarNotifikasi supabase={supabase} kembali="/admin/notifikasi" />
        <Kartu>
          <h2 className="mb-4 font-serif text-2xl">Kirim juga ke</h2>
          <FormPreferensi p={pref} kontak={kontak} kanal={kanalAktif()} />
        </Kartu>
      </div>
    </>
  );
}
