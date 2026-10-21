import { Backpack, BadgeCheck, BookOpenCheck, Building2, FolderOpen, GraduationCap, HeartHandshake, Home, LayoutDashboard, Library, Megaphone, School, Settings, Users, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { BIDANG, type KunciBidang } from "@/lib/bidang";

const PETA: Record<string, ComponentType<LucideProps>> = {
  Backpack,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Library,
  Megaphone,
  School,
  Settings,
  Users,
};

/** Ikon satu gaya untuk setiap bidang (nama ikon ada di src/lib/bidang.ts). */
export function IkonBidang({ bidang, ...p }: { bidang: KunciBidang } & LucideProps) {
  const I = PETA[BIDANG[bidang].ikon] ?? LayoutDashboard;
  return <I aria-hidden strokeWidth={1.8} {...p} />;
}
