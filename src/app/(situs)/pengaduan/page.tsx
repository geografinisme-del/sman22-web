import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/ui";
import { FormPengaduan } from "@/components/humas/Publik";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pengaduan & Aspirasi", description: "Sampaikan pengaduan, laporan perundungan, atau saran untuk SMAN 22 Bandung. Identitas dapat dirahasiakan." };
export const dynamic = "force-dynamic";

export default async function Pengaduan() {
  const login = supabaseAktif ? Boolean((await (await supabaseServer()).auth.getUser()).data.user) : false;
  return (
    <>
      <PageHeader judul="Pengaduan & Aspirasi" deskripsi="Sampaikan keluhan, laporan perundungan, atau saran. Setiap laporan mendapat nomor tiket dan ditanggapi paling lambat 7 hari." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <FormPengaduan login={login} />
          <aside className="space-y-4 text-sm text-black/70">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="font-semibold">Sudah pernah melapor?</h2>
              <p className="mt-1">Cek perkembangan dengan nomor tiket & kode akses.</p>
              <Link href="/pengaduan/cek" className="mt-3 inline-block rounded-full px-4 py-2 font-semibold ring-1 ring-black/15">Cek status pengaduan</Link>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="font-semibold">Privasi</h2>
              <p className="mt-1">Identitas boleh dirahasiakan. Alamat IP tidak disimpan — hanya kode samaran (hash) untuk mencegah spam. Laporan perundungan & kekerasan hanya dibaca tim terbatas.</p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
