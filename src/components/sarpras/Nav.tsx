"use client";

import { TabPills } from "@/components/admin/TabPills";

export function NavSarpras({ lihat, kelola }: { lihat: boolean; kelola: boolean }) {
  const item = [
    { href: "/admin/sarpras", label: "Inventaris", boleh: lihat },
    { href: "/admin/sarpras/peminjaman", label: "Peminjaman", boleh: true },
    { href: "/admin/sarpras/kerusakan", label: "Laporan kerusakan", boleh: true },
    { href: "/admin/sarpras/ruang", label: "Ruang", boleh: kelola },
    { href: "/admin/sarpras/label", label: "Label QR", boleh: kelola },
  ].filter((i) => i.boleh);
  return <TabPills label="Menu sarpras" item={item} />;
}
