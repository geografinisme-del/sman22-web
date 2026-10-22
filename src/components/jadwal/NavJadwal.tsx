import { TabPills } from "@/components/admin/TabPills";
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
  return <TabPills label="Menu jadwal" item={item.map(({ href, label }) => ({ href, label }))} aktif={aktif} />;
}

