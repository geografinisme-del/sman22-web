/**
 * Kerangka (skeleton) halaman admin untuk loading.tsx — tampil seketika saat menu diklik, sebelum data selesai dimuat.
 * Bentuknya mengikuti tata letak halaman supaya konten tidak "melompat" (tanpa CLS) saat data datang.
 */
type Bentuk = "tabel" | "ringkasan" | "tab-statistik" | "kartu" | "formulir";

const Balok = ({ className = "" }: { className?: string }) => <span aria-hidden className={`block animate-pulse rounded-md bg-[color-mix(in_srgb,var(--line)_75%,#fff)] ${className}`} />;

function Kepala({ aksi = 1 }: { aksi?: number }) {
  return (
    <div className="mb-6 border-b border-[var(--line)] pb-5">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Balok className="h-8 w-64 max-w-full" />
        <div className="flex gap-2">
          {Array.from({ length: aksi }, (_, i) => (
            <Balok key={i} className="h-11 w-32 rounded-full" />
          ))}
        </div>
        <Balok className="h-4 w-full max-w-xl sm:col-span-2" />
      </div>
    </div>
  );
}

function Tab() {
  return (
    <div className="-mt-2 mb-6 flex gap-2 overflow-hidden">
      {[96, 112, 148, 80, 104].map((w, i) => (
        <span key={i} style={{ width: w }} className="shrink-0">
          <Balok className="h-10 rounded-full" />
        </span>
      ))}
    </div>
  );
}

function Tabel({ baris = 8 }: { baris?: number }) {
  const lebar = [30, 20, 25, 15];
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      {Array.from({ length: baris + 1 }, (_, r) => (
        <div key={r} className={`flex gap-4 border-b border-[var(--line)] px-4 last:border-0 ${r === 0 ? "py-3" : "py-3.5"}`}>
          {lebar.map((w, i) => (
            <span key={i} style={{ width: `${w}%` }}>
              <Balok className="h-4" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Statistik() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <Balok className="h-7 w-16" />
          <Balok className="mt-2 h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function Kerangka({ bentuk = "tabel" }: { bentuk?: Bentuk }) {
  return (
    <div data-memuat-halaman aria-busy="true">
      <span role="status" className="sr-only">
        Memuat halaman…
      </span>
      <Kepala aksi={bentuk === "ringkasan" ? 0 : bentuk === "formulir" ? 0 : 1} />
      {bentuk === "tabel" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Balok className="h-11 w-full max-w-sm rounded-full" />
            <Balok className="h-11 w-36 rounded-full" />
          </div>
          <Tabel />
        </>
      )}
      {bentuk === "tab-statistik" && (
        <>
          <Tab />
          <Statistik />
          <Tabel baris={6} />
        </>
      )}
      {bentuk === "ringkasan" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          {[2, 1, 3, 1, 2].map((kolom, i) => (
            <div key={i} className={`rounded-[10px] border border-[var(--line)] bg-white p-5 ${kolom === 2 ? "lg:col-span-2" : kolom === 3 ? "lg:col-span-3" : ""}`}>
              <Balok className="h-5 w-40" />
              <Balok className="mt-4 h-4 w-full" />
              <Balok className="mt-2 h-4 w-4/5" />
              <Balok className="mt-2 h-4 w-3/5" />
            </div>
          ))}
        </div>
      )}
      {bentuk === "kartu" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <Balok className="h-5 w-2/3" />
              <Balok className="mt-3 h-4 w-full" />
              <Balok className="mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {bentuk === "formulir" && (
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="mb-5">
              <Balok className="h-4 w-32" />
              <Balok className="mt-2 h-11 w-full rounded-xl" />
            </div>
          ))}
          <Balok className="h-11 w-36 rounded-full" />
        </div>
      )}
    </div>
  );
}
