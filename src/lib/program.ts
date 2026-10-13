import { programUnggulan } from "@/content/sekolah";

export type Program = (typeof programUnggulan)[number];

/** Alamat halaman program, mis. "7KAIH" → "7kaih" */
export const slugProgram = (p: Pick<Program, "kode">) => p.kode.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const cariProgram = (slug: string) => programUnggulan.find((p) => slugProgram(p) === slug) ?? null;
