"use client";

import { TabPills } from "@/components/admin/TabPills";

export function NavAlumni({ kelola }: { kelola: boolean }) {
  const item = [
    { href: "/admin/alumni", label: "Ringkasan" },
    ...(kelola ? [{ href: "/admin/alumni/pendaftaran", label: "Verifikasi" }, { href: "/admin/alumni/layanan", label: "Layanan & moderasi" }] : []),
    { href: "/admin/alumni/tracer", label: "Tracer study" },
  ];
  return <TabPills label="Menu alumni" item={item} />;
}
