// Ukur waktu pindah menu admin DI BROWSER SENDIRI (server sungguhan: preview / production), BACA-SAJA.
// Cara pakai: login admin → buka /admin → F12 → Console → tempel seluruh isi berkas ini → Enter.
// Skrip hanya mengklik tautan sidebar (Ringkasan ↔ 5 menu), 3 putaran, lalu menampilkan median.
// Tidak mengisi formulir, tidak menyimpan, tidak menghapus apa pun.
//   reaksi = menu yang diklik tampak aktif / kerangka halaman tampil
//   konten = alamat berpindah & judul halaman baru tampil (kerangka hilang)
(async () => {
  const MENU = [
    ["Data Induk", "/admin/siswa", "Siswa"],
    ["Ekskul & OSIS", "/admin/ekskul", "Ekskul"],
    ["Perpustakaan", "/admin/perpus", "Perpustakaan"],
    ["Sarpras", "/admin/sarpras", "Sarana"],
    ["Alumni", "/admin/alumni", "Alumni"],
  ];
  const PUTARAN = 3;
  const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
  const tautan = (href) => document.querySelector(`a[href="${href}"]`);

  // grup menu yang tertutup tidak menampilkan tautannya: buka grupnya, lalu muat ulang & jalankan lagi
  if (MENU.some(([, href]) => !tautan(href))) {
    let grup = [];
    try {
      grup = JSON.parse(localStorage.getItem("admin-menu-grup") ?? "[]");
    } catch {}
    localStorage.setItem("admin-menu-grup", JSON.stringify([...new Set([...grup, ...MENU.map(([g]) => g)])]));
    console.log("%cGrup menu dibuka. Halaman dimuat ulang — tempel & jalankan skrip ini SEKALI LAGI.", "font-weight:bold;color:#b45309");
    location.reload();
    return;
  }

  const ukur = (href, judul) =>
    new Promise((selesai) => {
      const t = { mulai: performance.now() };
      const lamaH1 = document.querySelector("main h1")?.textContent;
      const cek = () => {
        const d = Math.round(performance.now() - t.mulai);
        const a = tautan(href);
        const kerangka = Boolean(document.querySelector("[data-memuat-halaman]"));
        if (t.reaksi == null && (a?.getAttribute("aria-current") === "page" || a?.getAttribute("data-memuat") === "1" || kerangka)) t.reaksi = d;
        const h1 = document.querySelector("main h1")?.textContent ?? "";
        if (t.konten == null && location.pathname === href && !kerangka && h1 !== lamaH1 && h1.includes(judul)) t.konten = d;
        if (t.konten == null && d < 30000) requestAnimationFrame(cek);
        else selesai({ reaksi: t.reaksi ?? t.konten ?? d, konten: t.konten ?? null });
      };
      requestAnimationFrame(cek);
      tautan(href).click();
    });

  const keRingkasan = async () => {
    if (location.pathname === "/admin") return;
    await ukur("/admin", "Ringkasan");
  };

  console.log(`Mengukur di ${location.origin} … (±1 menit, jangan klik apa pun)`);
  const hasil = [];
  for (let p = 1; p <= PUTARAN; p++) {
    for (const [nama, href, judul] of MENU) {
      await keRingkasan();
      await tidur(1500); // beri waktu prefetch seperti pengguna biasa
      const t = await ukur(href, judul);
      hasil.push({ putaran: p, menu: nama, ...t });
      console.log(`p${p} ${nama}: reaksi ${t.reaksi} ms, konten ${t.konten ?? "gagal"} ms`);
    }
  }
  await keRingkasan();
  const median = (a) => {
    const s = a.filter((x) => x != null).sort((x, y) => x - y);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const tabel = MENU.map(([nama]) => {
    const h = hasil.filter((x) => x.menu === nama);
    return { menu: nama, "reaksi (ms)": median(h.map((x) => x.reaksi)), "konten tampil (ms)": median(h.map((x) => x.konten)) };
  });
  console.log(`%cHASIL (median ${PUTARAN} kali) — ${location.host}`, "font-weight:bold");
  console.table(tabel);
  console.log(JSON.stringify({ server: location.host, tabel }));
})();
