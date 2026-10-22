"use client";

import { TabPills } from "@/components/admin/TabPills";

export function NavBk({ konselor, agregat }: { konselor: boolean; agregat: boolean }) {
  const item = [
    ...(konselor ? [{ href: "/admin/bk", label: "Layanan & kasus" }, { href: "/admin/bk/kasus/baru", label: "+ Kasus" }, { href: "/admin/rujukan-bk", label: "Rujukan guru" }] : []),
    ...(agregat ? [{ href: "/admin/bk/laporan", label: "Laporan agregat" }] : []),
    ...(konselor ? [{ href: "/admin/bk/log", label: "Log akses" }] : []),
  ];
  return <TabPills label="Menu BK" item={item} />;
}
