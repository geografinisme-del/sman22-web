import { DaftarNotifikasi } from "@/components/notif/Daftar";
import { FormPreferensi } from "@/components/notif/Preferensi";
import { kanalAktif } from "@/lib/notif/kirim";
import { muatPreferensi } from "@/lib/notif/kontak";
import { konteksPortal } from "../data";

export const metadata = { title: "Notifikasi" };

export default async function NotifikasiPortal() {
  const { supabase, akses, contoh } = await konteksPortal();
  const { pref, kontak } = await muatPreferensi(supabase, akses);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Notifikasi</h1>
      {contoh ? (
        <p className="rounded-2xl bg-white p-6 text-[var(--muted)] ring-1 ring-black/5">Data contoh: belum ada notifikasi.</p>
      ) : (
        <DaftarNotifikasi supabase={supabase} kembali="/portal/notifikasi" />
      )}
      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-4 text-2xl">Kirim juga ke WhatsApp / email</h2>
        <FormPreferensi p={pref} kontak={kontak} kanal={kanalAktif()} />
      </section>
    </div>
  );
}
