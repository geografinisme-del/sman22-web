import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArtikelBerita } from "@/components/ArtikelBerita";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { formatWaktu } from "@/lib/format";
import "@/components/langit/langit.css";
import "@/components/langit/halaman.css";

export const metadata = { title: "Pratinjau berita", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { draft: "DRAF", diajukan: "MENUNGGU PERSETUJUAN", terbit: "TERBIT", ditolak: "DIKEMBALIKAN" };

export default async function PratinjauBerita({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase, akses } = await wajibLogin();
  if (!punya(akses, "konten.kelola") && !punya(akses, "konten.terbitkan")) redirect("/admin?pesan=tanpa-akses");
  const { data: b } = await supabase
    .from("berita")
    .select("id, slug, judul, tanggal, kategori, ringkasan, isi, gambar_url, status, tayang_mulai")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!b) notFound();
  const kembali = punya(akses, "konten.kelola") ? `/admin/berita/${b.id}` : "/admin/persetujuan";

  return (
    <div className="min-h-screen bg-[var(--soft)]">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-amber-400 px-5 py-3 text-sm font-semibold text-[var(--ink)]">
        <span>
          PRATINJAU · {STATUS[b.status] ?? b.status}
          {b.tayang_mulai && ` · jadwal tayang ${formatWaktu(b.tayang_mulai)}`} — halaman ini hanya terlihat oleh pengelola
        </span>
        <Link href={kembali} className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-white">← Kembali ke admin</Link>
      </div>
      <ArtikelBerita
        b={{
          id: b.id,
          slug: b.slug,
          judul: b.judul,
          tanggal: b.tanggal,
          kategori: b.kategori,
          ringkasan: b.ringkasan,
          isi: b.isi.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean),
          gambar: b.gambar_url || undefined,
        }}
      />
    </div>
  );
}
