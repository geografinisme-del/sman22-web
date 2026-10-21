import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, BookUser, CalendarDays, ShieldCheck, UserRound } from "lucide-react";
import { Panel } from "@/components/dashboard/HariIni";
import { berperan, type Akses } from "@/lib/admin/auth";
import { getTautanGuruLama } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

/**
 * Dasbor dasar — tampil untuk SETIAP akun Guru & Tendik (termasuk Pegawai umum & akun tanpa peran):
 * pengumuman internal, pintasan (profil saya, direktori GTK, kalender sekolah, keamanan), jadwal piket bila ada,
 * dan kartu "aplikasi guru lama" (Ruang Guru) bila admin mengisinya. Tidak pernah layar kosong.
 */
export async function DasborDasar({ supabase, akses }: { supabase: SupabaseClient; akses: Akses }) {
  const { data: pid } = await supabase.rpc("pegawai_saya");
  const [umumkan, piket, guruLama] = await Promise.all([
    // kolom sasaran ada setelah migrasi 20261225; galat = tidak ditampilkan
    supabase.from("pengumuman").select("id, judul, isi, tanggal, penting").eq("sasaran", "pegawai").is("deleted_at", null).eq("aktif", true).order("tanggal", { ascending: false }).limit(4),
    pid ? supabase.from("piket_guru").select("hari, tahun_ajaran!inner(aktif)").eq("pegawai_id", pid).eq("tahun_ajaran.aktif", true).order("hari") : Promise.resolve({ data: [], error: null }),
    berperan(akses, "guru") ? getTautanGuruLama() : Promise.resolve(null),
  ]);
  const pengumuman = umumkan.error ? [] : (umumkan.data ?? []);
  const hariPiket = ((piket.data ?? []) as { hari: number }[]).map((p) => HARI[p.hari]).filter(Boolean);

  const pintasan = [
    { href: "/admin/profil-saya", label: "Profil saya", ket: "Data akun, jabatan & peran", Ikon: UserRound },
    { href: "/admin/direktori", label: "Direktori GTK", ket: "Rekan guru & tendik", Ikon: BookUser },
    { href: "/admin/kalender", label: "Kalender sekolah", ket: "Kegiatan & hari libur", Ikon: CalendarDays },
    { href: "/admin/keamanan", label: "Keamanan akun", ket: "Kata sandi & dua langkah", Ikon: ShieldCheck },
  ];

  return (
    <>
      <Panel judul="Pengumuman internal" className="lg:col-span-2">
        {pengumuman.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada pengumuman internal untuk Guru &amp; Tendik.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {pengumuman.map((p) => (
              <li key={p.id} className="py-2.5">
                <p className="font-semibold">
                  {p.penting && <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Penting</span>}
                  {p.judul}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted)]">
                  {formatTanggal(p.tanggal)}
                  {p.isi && ` · ${p.isi}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel judul="Pintasan saya">
        <ul className="grid gap-1">
          {pintasan.map(({ href, label, ket, Ikon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--soft)]">
                <Ikon size={18} aria-hidden className="shrink-0 text-[var(--muted)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-[var(--muted)]">{ket}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {hariPiket.length > 0 && (
          <p className="mt-3 border-t border-[var(--line)] pt-3 text-sm">
            <span className="font-semibold">Jadwal piket Anda:</span> {hariPiket.join(", ")}
          </p>
        )}
      </Panel>

      {guruLama && (
        <Panel judul="Ruang Guru" className="lg:col-span-3">
          <a href={guruLama.url} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--soft)] px-4 py-3 hover:ring-1 hover:ring-[var(--line)]">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{guruLama.judul}</span>
              <span className="block truncate text-sm text-[var(--muted)]">{guruLama.url.replace(/^https:\/\//, "")}</span>
            </span>
            <ArrowUpRight size={18} aria-hidden />
            <span className="sr-only">(membuka situs lain di tab baru)</span>
          </a>
        </Panel>
      )}
    </>
  );
}
