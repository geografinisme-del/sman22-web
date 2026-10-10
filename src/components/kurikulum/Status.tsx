import { STATUS_PERANGKAT } from "@/lib/kurikulum";

export function Status({ s }: { s: string }) {
  const x = STATUS_PERANGKAT[s] ?? STATUS_PERANGKAT.draf;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${x.warna}`}>{x.label}</span>;
}
