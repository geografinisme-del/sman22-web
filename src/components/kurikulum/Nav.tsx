"use client";

import { TabPills } from "@/components/admin/TabPills";

const ITEM = [
  { href: "/admin/kurikulum", label: "Struktur" },
  { href: "/admin/kurikulum/atp", label: "CP, TP & ATP" },
  { href: "/admin/perangkat-ajar", label: "Perangkat ajar" },
  { href: "/admin/materi", label: "Materi digital" },
  { href: "/admin/kokurikuler", label: "Kokurikuler" },
  { href: "/admin/supervisi", label: "Supervisi" },
];

export function NavKurikulum() {
  return <TabPills label="Menu kurikulum" item={ITEM} cocok="awalan" />;
}
