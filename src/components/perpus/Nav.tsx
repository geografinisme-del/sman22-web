"use client";

import { TabPills } from "@/components/admin/TabPills";

export function NavPerpus({ kelola }: { kelola: boolean }) {
  const item = [
    { href: "/admin/perpus", label: "Sirkulasi" },
    { href: "/admin/perpus/katalog", label: "Katalog" },
    { href: "/admin/perpus/literasi", label: "Literasi" },
    { href: "/admin/perpus/pojok", label: "Pojok baca" },
    { href: "/admin/perpus/laporan", label: "Laporan & aturan" },
    ...(kelola ? [{ href: "/admin/perpus/label", label: "Label buku" }] : []),
  ];
  return <TabPills label="Menu perpustakaan" item={item} />;
}
