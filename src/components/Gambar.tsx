import Image from "next/image";

/** Menampilkan foto jika ada; jika belum ada, tampil kotak warna sebagai pengganti. */
export function Gambar({
  src,
  alt,
  className = "",
  sizes = "(min-width: 768px) 33vw, 100vw",
  priority,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <svg aria-hidden width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
          <span className="sr-only">{alt} (foto belum tersedia)</span>
        </div>
      )}
    </div>
  );
}
