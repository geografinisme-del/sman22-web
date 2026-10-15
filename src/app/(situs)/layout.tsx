import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "@/components/beranda/beranda.css";

export default function SitusLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>
      <Header />
      <main id="konten" className="lp halaman-publik flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
