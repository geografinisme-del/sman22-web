"use client";

export function TombolCetak({ label = "Cetak / simpan PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-black/15 hover:bg-black/5 print:hidden">
      {label}
    </button>
  );
}
