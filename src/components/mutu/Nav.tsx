"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { TabPills } from "@/components/admin/TabPills";

export function NavMutu() {
  const p = usePathname();
  const q = useSearchParams();
  const sufiks = q.get("k") ? `?k=${q.get("k")}${q.get("periode") ? `&periode=${q.get("periode")}` : ""}` : "";
  const item = [
    { href: "/admin/mutu", label: "Dasbor & kesenjangan" },
    { href: "/admin/mutu/temuan", label: "Temuan & perbaikan" },
    { href: "/admin/mutu/bukti", label: "Repositori bukti" },
  ].map((i) => ({ ...i, href: i.href + sufiks, dasar: i.href }));
  return <TabPills label="Menu mutu" item={item} aktif={item.find((i) => i.dasar === p)?.href} />;
}
