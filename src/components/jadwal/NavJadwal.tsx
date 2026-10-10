import Link from "next/link";
import { punya, type Akses } from "@/lib/admin/auth";

export function NavJadwal({ akses, aktif }: { akses: Akses | null; aktif: string }) {
  const item = [
    { href: "/admin/jadwal", label: "Lihat jadwal", boleh: true },
    { href: "/admin/jadwal/susun", label: "Susun jadwal", boleh: punya(akses, "jadwal.kelola") },
    { href: "/admin/jadwal/penugasan", label: "Penugasan mengajar", boleh: punya(akses, "jadwal.kelola") },
    { href: "/admin/jadwal/pengganti", label: "Guru pengganti", boleh: punya(akses, "jadwal.pengganti") || punya(akses, "jadwal.kelola") },
    { href: "/admin/jadwal/pengaturan", label: "Mapel, jam & piket", boleh: punya(akses, "jadwal.kelola") },
  ].filter((i) => i.boleh);
  if (item.length < 2) return null;
  return (
    <nav aria-label="Menu jadwal" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm print:hidden">
      {item.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={aktif === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${aktif === i.href ? "bg-brand-900 text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
