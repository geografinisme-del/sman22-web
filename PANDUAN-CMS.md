# Panduan Menyalakan Sistem SMAN 22 Bandung

Setelah langkah ini selesai, isi website dan data sekolah dikelola lewat **https://alamat-website-anda/admin**.
Waktu yang dibutuhkan sekitar 30 menit. Tidak perlu coding.

> ⚠️ **Tentang kunci Supabase**
> - **Project URL** dan **anon / publishable key** aman ditempel ke Vercel (variabel `NEXT_PUBLIC_…`).
> - **service_role / secret key** adalah kunci rahasia. Tempelkan **hanya** sebagai `SUPABASE_SERVICE_ROLE_KEY` di Vercel
>   (tanpa awalan `NEXT_PUBLIC_`). Jangan dikirim lewat WhatsApp/email, dan jangan ditulis di file mana pun.

---

## Langkah 1 — Siapkan proyek Supabase

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   - Name: `sman22-web` · Region: **Southeast Asia (Singapore)** · simpan database password baik-baik.
2. Tunggu ±2 menit sampai proyek siap.

## Langkah 2 — Buat struktur database (sekali saja, berurutan)

Buka **SQL Editor** → **New query**, lalu jalankan **sembilan file** ini **berurutan**:

1. `supabase/migrations/20261005000000_cms_website.sql` (website & CMS) → **Run**
2. `supabase/migrations/20261008000000_akun_data_induk.sql` (akun, peran, data induk) → **Run**
3. `supabase/migrations/20261010000000_absensi.sql` (absensi siswa & guru, SP) → **Run**
4. `supabase/migrations/20261012000000_portal.sql` (portal siswa & orang tua, izin online) → **Run**
5. `supabase/migrations/20261015000000_jadwal.sql` (jadwal pelajaran, guru pengganti, piket) → **Run**
6. `supabase/migrations/20261018000000_cms_lanjutan.sql` (persetujuan berita, jadwal tayang, foto pembuka, SEO) → **Run**
7. `supabase/migrations/20261019000000_absensi_lanjutan.sql` (absensi per jam pelajaran, QR, izin guru, lokasi/swafoto) → **Run**
8. `supabase/migrations/20261022000000_kesiswaan.sql` (prestasi, pelanggaran berpoin, pembinaan, rujukan BK) → **Run**
9. `supabase/migrations/20261023000000_notifikasi.sql` (notifikasi aplikasi, WhatsApp, email) → **Run**
10. `supabase/migrations/20261026000000_keamanan_kalender.sql` (verifikasi dua langkah, kalender sekolah, tukar jam) → **Run**
11. `supabase/migrations/20261029000000_kurikulum.sql` (struktur kurikulum, ATP, perangkat ajar, kokurikuler, supervisi, materi digital) → **Run**
12. `supabase/migrations/20261101000000_lms_sarpras.sql` (kelas digital: tugas & kuis; sarana prasarana) → **Run**
13. `supabase/migrations/20261104000000_perpus_humas.sql` (perpustakaan & literasi; humas, pengaduan, kemitraan, survei) → **Run**
14. `supabase/migrations/20261108000000_bk_ekskul.sql` (bimbingan konseling; ekskul, OSIS & kegiatan) → **Run**
15. `supabase/migrations/20261111000000_alumni_mutu.sql` (alumni & tracer study; mutu, akreditasi & bukti) → **Run**
16. `supabase/migrations/20261115000000_hero_video.sql` (video latar opsional di foto pembuka beranda) → **Run**
17. `supabase/migrations/20261120000000_visual_akun.sql` (visual sinematik halaman masuk) → **Run**
18. `supabase/migrations/20261122000000_visual_beranda.sql` (visual sinematik beranda) → **Run**

Masing-masing harus menampilkan **Success**. Semuanya aman dijalankan ulang.
Bila sistem sudah berjalan dan ada file migrasi baru, cukup jalankan file yang baru saja.

## Langkah 3 — Buat akun super admin pertama

1. **Authentication** → **Users** → **Add user** → **Create new user** → isi email & kata sandi,
   **centang "Auto Confirm User"** → **Create user**.
2. **Authentication** → **Sign In / Providers** → **matikan "Allow new users to sign up"**.
   (Akun berikutnya dibuat oleh super admin dari dalam aplikasi.)
3. **SQL Editor** → salin isi `supabase/tambah-admin.sql`, ganti email & nama, lalu **Run**.
4. Saat super admin pertama kali masuk, sistem **meminta memasang aplikasi autentikator** (Google Authenticator /
   Microsoft Authenticator) di HP — wajib untuk super admin. Siapkan HP; cukup sekali (±2 menit).

## Langkah 4 — Salin kunci Supabase

Klik **Connect** di atas dashboard (atau **Project Settings → API Keys**), lalu salin:
- **Project URL** (contoh `https://abcdefgh.supabase.co`)
- **anon public** / **publishable** key
- **service_role** / **secret** key (rahasia)

## Langkah 5 — Tempel kunci di Vercel

Vercel → proyek → **Settings → Environment Variables** → tambahkan:

| Key | Value | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | publik |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key | **rahasia**: centang *Sensitive* |
| `FONNTE_TOKEN` | *(opsional)* token WhatsApp dari fonnte.com | **rahasia** — notifikasi WhatsApp |
| `RESEND_API_KEY` & `EMAIL_PENGIRIM` | *(opsional)* dari resend.com | **rahasia** — notifikasi email |
| `SITUS_URL` | alamat website, mis. `https://sman22-web.vercel.app` | tautan di dalam pesan & email atur ulang sandi |
| `CRON_SECRET` | teks acak panjang | **rahasia** — untuk penjadwal pengiriman |
| `ANTHROPIC_API_KEY` | *(opsional)* kunci Claude API dari console.anthropic.com | **rahasia** — Asisten AI guru (draf ATP, modul ajar, slide) |
| `AI_MODEL` | *(opsional)* nama model Claude | biarkan kosong untuk bawaan |
| `BK_KUNCI` | teks acak ≥ 32 karakter (mis. hasil `openssl rand -base64 36`) | **rahasia** — mengenkripsi catatan konseling BK. **Simpan salinannya di tempat aman**: bila hilang, catatan lama tidak bisa dibuka. Jangan diganti setelah dipakai |
| `PORTAL_EMAIL_DOMAIN` | *(opsional)* mis. `portal.sman22bdg.sch.id` | domain email internal akun portal. **Jangan diubah** setelah akun portal dibuat |

Lalu **Deployments → ⋯ → Redeploy**.

> Tanpa `SUPABASE_SERVICE_ROLE_KEY` sistem tetap jalan, tetapi akun guru/staf harus dibuat manual di dashboard
> Supabase dulu, baru diberi peran dari aplikasi, dan **akun portal siswa/orang tua tidak bisa dibuat**.

## Langkah 6 — Masuk dan isi data (urutan yang disarankan)

1. Buka `/admin`, masuk dengan akun super admin.
2. **Data Induk → Tahun Ajaran**: buat `2026/2027`, lalu klik **Jadikan aktif**.
3. **Guru & Pegawai → Impor Excel**: unggah daftar PTK (dari Dapodik atau template).
4. **Kelas**: buat kelas dan pilih wali kelasnya. Kelas yang belum ada juga bisa dibuat otomatis saat impor siswa.
5. **Siswa → Impor Excel**: unggah file **ekspor peserta didik Dapodik** apa adanya. Sistem akan:
   - melewati baris judul di atas tabel,
   - mencocokkan kolom secara otomatis,
   - mengembalikan angka 0 di depan NISN yang hilang karena Excel,
   - menandai NISN ganda dan isian yang salah **sebelum** menyimpan,
   - tidak menimpa data lama tanpa persetujuan Anda,
   - tidak mengimpor NIK.
6. **Pengaturan → Pengguna & Peran**: buat akun untuk operator/TU, humas, wali kelas, dan guru, lalu tautkan ke data gurunya.
7. **Website → Profil Sekolah**: lengkapi alamat, visi-misi, dan sambutan.

## Absensi (Fase 3)

**Persiapan (sekali, oleh Kesiswaan/Operator):** menu **Absensi → Pengaturan Absensi**
- batas jam masuk (bawaan 07.15), jam pulang (15.00–17.00), dan hari sekolah,
- **tanggal mulai hitung**: catatan sebelum tanggal ini tidak dihitung (mis. masa uji coba awal Juli),
- daftar **hari libur** (bisa satu rentang tanggal sekaligus).

**Alur harian**
1. **Guru**: buka **Presensi Saya** → tekan *Presensi masuk* / *Presensi pulang*. Jam diambil dari server, jadi tidak bisa diatur dari HP.
2. **Guru piket**: buka **Absensi Siswa** → cari nama siswa → *Catat terlambat*. Terlihat juga kelas mana yang belum diabsen.
3. **Wali kelas**: buka **Kelas Saya → Isi absensi hari ini** → tandai yang Sakit/Izin/Alpa → **Simpan**. Simpan juga walaupun semua hadir.
   - Wali kelas hanya bisa mengubah absensi **minggu berjalan** (Senin–hari ini).
   - Minggu sebelumnya → **Ajukan koreksi** → disetujui/ditolak piket atau admin. Riwayat pengajuan tetap tersimpan sebagai arsip.
4. **Kesiswaan / BK**: menu **SP & Panggilan Ortu** menampilkan otomatis siswa yang mencapai:
   - Alpa 3× → SP 1, 6× → SP 2, 9× → SP 3
   - Terlambat 3× / 6× / 9× → Pemanggilan Orang Tua 1/2/3, lalu 12× / 15× / 18× → SP 1/2/3

   Setelah ditindaklanjuti, tulis tindakan yang dilakukan → **Konfirmasi selesai**.
   Hitungan dimulai ulang setiap tahun ajaran, tetapi riwayat tahun sebelumnya tetap tersimpan.
5. **Rekap Absensi**: per kelas dan periode (S/I/A/T/PC + % hadir), bisa diunduh CSV.
6. **Kehadiran Guru** (Operator/TU, Kepala Sekolah): siapa yang sudah/belum presensi. Operator mencatat izin, sakit, dinas luar, atau cuti.

Angka merah atau kuning di menu menandai pengajuan atau SP yang perlu ditindaklanjuti.

## Visual sinematik: beranda & halaman masuk (Fase 15–16)

Beranda dibuka dengan **panggung sinematik gelap**: saat digulir, kamera "berjalan masuk" (atau video diputar maju-mundur
mengikuti gulir) dan teks berganti tiga babak, lalu pita kegiatan yang mengalir dua arah dan kisi kartu kaca (bento).
Bagian berita & agenda di bawahnya tetap terang. Halaman masuk portal memakai visual yang sama sebagai **latar penuh**
dengan formulir di kartu kaca.

Kelola di **Tampilan Website → Visual sinematik → + Tambah gambar / video**:
- **Tampil di**: *Halaman masuk portal* atau *Beranda — animasi saat digulir*.
- **Video** diunggah langsung dari komputer (MP4/WEBM, maks. 20 MB). Untuk beranda, paling bagus video **5–10 detik**
  dengan kamera bergerak maju pelan, tanpa suara (mis. hasil AI video atau rekaman drone/gimbal). Bila video terasa
  patah-patah saat digulir, kirim ke admin teknis untuk dikodekan ulang (keyframe rapat).
- **Gambar**: di beranda, tiap gambar menjadi satu adegan berurutan dengan efek kamera mendekat; di halaman masuk,
  lebih dari satu visual bergantian otomatis.
- **Keterangan** kecil di pojok (wajib "Visual ilustratif · …" untuk visual buatan AI) dan **tautan** ke halaman lain
  (sambutan kepala sekolah, prestasi siswa, SPMB, galeri, berita tertentu, dll.).
- Tanpa visual beranda, website memakai foto sekolah bawaan + ilustrasi model. Di HP dan bagi pengunjung yang
  mematikan animasi, video tidak dimuat (memakai gambar sampul).
- Pita kegiatan berisi **Ekskul & OSIS** yang tampil publik; bila belum ada, berisi program unggulan.

## Animasi beranda & video latar (Fase 14)

Beranda kini bergerak: judul muncul kata demi kata, foto pembuka bergeser pelan mengikuti scroll dan kursor, kalimat
"Tentang kami" menyala mengikuti scroll, angka statistik menghitung naik, pita foto galeri mengalir dua arah (berhenti saat
disentuh), dan kartu layanan bercahaya mengikuti kursor. Tidak ada yang perlu diatur — foto di pita diambil otomatis dari **Galeri**.
- Pengunjung yang mengaktifkan "kurangi animasi" di HP/komputernya melihat versi diam (aksesibilitas).
- **Video latar (opsional)**: di *Pengaturan situs → Foto pembuka*, isi *Video latar* dengan tautan langsung MP4/WebM.
  Cara termudah: Supabase → **Storage → bucket `video`** → Upload → klik berkas → *Get URL* → tempel di kolom tersebut.
  Saran: 10–20 detik, tanpa suara, 1280–1920 px lebar, < 8 MB. Foto tetap wajib — dipakai sebagai gambar awal, di HP mode hemat
  data, dan bagi yang mematikan animasi. Pastikan video tidak menampilkan wajah siswa tanpa izin.

## Alumni & tracer study (Fase 13)

Peran baru **Admin Alumni** (humas juga dapat mengelola). BK & kepala sekolah melihat statistik agregat.
- **Registrasi** di website `/alumni/daftar`: nama, tahun lulus, NISN & tanggal lahir (untuk pencocokan), email, dan **persetujuan
  kebijakan privasi** (versi dicatat). Admin memverifikasi di *Alumni → Verifikasi*: sistem menandai "cocok kuat" bila NISN + tanggal
  lahir sama dengan data lulusan. Saat disetujui, akun dibuat dan **tautan aktivasi** dikirim ke email (perlu `SUPABASE_SERVICE_ROLE_KEY`
  dan email Resend; tanpa email, alumni memakai *Lupa kata sandi*).
- *Buat profil dari data lulusan*: siswa berstatus **lulus** dibuatkan profil (tanpa akun) sebagai dasar tracer study & pencocokan.
- **Area alumni** (`/alumni/akun`, masuk lewat halaman masuk biasa): profil & kegiatan saat ini, **direktori opt-in** — alumni memilih
  sendiri kolom yang boleh dilihat alumni lain (bawaannya tidak ada), acara + konfirmasi hadir, peluang (bisa mengirim peluang),
  tracer study, menawarkan diri jadi mentor, kontribusi, dan cerita.
- **Tracer study** memakai mesin survei (responden "Alumni", bisa dibatasi angkatan) di *Alumni → Tracer study*. Hasil berupa rekap;
  per angkatan disamarkan bila < 3 responden.
- **Mentoring**: siswa melihat mentor yang disetujui sekolah di portal → *Alumni & Peluang* dan mengajukan topik. Sekolah menyetujui &
  mengatur pertemuan (didampingi BK); mentor baru melihat nama & kelas siswa setelah disetujui. Kontak pribadi tidak dibagikan.
- Semua kiriman alumni (peluang, cerita, mentor, kontribusi) **dimoderasi** sebelum tayang. Halaman publik `/alumni` hanya menampilkan
  cerita yang diizinkan, acara publik, kontribusi yang boleh tampil, dan ringkasan angka (muncul bila ≥ 10 responden).
- **Ekspor** statistik per angkatan (Excel) hanya berisi angka agregat.

## Mutu, akreditasi & manajemen bukti (Fase 13)

Peran baru **Tim Penjaminan Mutu** dan **Auditor Internal**. Kepala sekolah ikut mengelola; wakasek & kurikulum melihat. Guru yang
ditunjuk sebagai **pemilik indikator** atau **koordinator standar** otomatis melihat menu *Mutu*.
- **Kerangka** (mis. IASP 2024, SPM, Rapor Pendidikan) → **standar** → **indikator** (pemilik, cara ukur, bobot). Saat regulasi berubah,
  *Salin sebagai versi baru* — evaluasi & bukti versi lama tetap utuh.
- **Evaluasi diri per periode** (mis. 2026/2027): target, capaian, skor 1–4, status, analisis. Pemilik *mengajukan* → tim mutu/auditor
  *menyetujui* atau *meminta revisi* (riwayat tercatat). Setelah diajukan, isian terkunci.
- **Bukti**: unggah berkas (dicatat sidik jari **SHA-256**; setiap pembukaan dicek keutuhannya & dicatat), tautan Drive, atau **rujukan
  ke modul lain** (perangkat ajar, supervisi, kemitraan, survei, sarpras, dll.) tanpa menggandakan berkas. Bukti tidak bisa diubah —
  perbarui dengan *versi baru*.
- **Analisis kesenjangan** menandai: tanpa pemilik, target kosong, belum dievaluasi, tanpa bukti, belum tercapai tanpa rencana
  perbaikan, belum disetujui. **Ini penanda kelengkapan, bukan klaim kepatuhan** — penilaian tetap oleh tim & asesor.
- **Temuan** (mayor/minor/observasi; dari audit internal, evaluasi diri, visitasi) dan **rencana perbaikan** dengan PJ & tenggat.
  Pengingat otomatis: indikator tanpa bukti (mingguan) dan rencana mendekati tenggat.
- **Paket laporan** Excel (ringkasan, indikator, daftar bukti + hash, temuan) dan **laporan cetak/PDF**.

## Bimbingan & Konseling (Fase 12)

Isi konseling **hanya untuk guru BK** (peran *Guru BK*). Super admin, kepala sekolah, wali kelas, dan guru lain tidak dapat membacanya.
- **Permintaan layanan**: siswa (untuk dirinya) atau orang tua (untuk anaknya) mengajukan dari portal → menu **Layanan BK**: topik singkat,
  cerita (opsional, terenkripsi), waktu yang memungkinkan, tanda *mendesak*. Orang tua tidak melihat permintaan yang diajukan anaknya sendiri.
  Guru BK diberi tahu tanpa nama siswa.
- **Kasus**: dibuka dari permintaan, dari *Rujukan guru* (tombol "Buka kasus BK"), atau inisiatif BK. Berisi status, prioritas, risiko,
  konselor, **asesmen awal** dan **ringkasan penutupan** (terenkripsi), **sesi** (jadwal anti-bentrok + catatan terenkripsi),
  **tindak lanjut** (pengingat saat jatuh tempo), dan **rujukan ke luar** (psikolog, puskesmas, UPTD PPA…).
- **Kerahasiaan**: catatan dienkripsi di server dengan `BK_KUNCI` — di database hanya tersimpan sandi acak. Setiap pembukaan kasus tercatat
  di **Log Akses BK**; konselor lain yang membuka kasus wajib menulis alasan. Isi BK tidak disalin ke log audit umum.
- **Siswa/orang tua** hanya melihat status, balasan BK, dan jadwal (orang tua hanya undangan *konsultasi orang tua*). Pemberitahuan jadwal
  hanya lewat aplikasi, tidak lewat WhatsApp.
- **Wali kelas** tidak melihat isi konseling; ia hanya menerima **saran pendampingan** yang sengaja ditulis BK (tampil di *Kelas Saya*).
- **Laporan agregat** (kepala sekolah, wakasek): jumlah per kategori/tingkat/prioritas, sesi, rujukan — kelompok < 3 kasus disamarkan.
- **Retensi**: isi terenkripsi kasus yang sudah ditutup dimusnahkan otomatis setelah masa simpan (bawaan 3 tahun, atur di Laporan BK).

## Ekstrakurikuler, OSIS & kegiatan (Fase 12)

Semua organisasi (ekskul seperti KOMPFI, OSIS, MPK, komunitas) memakai **mesin yang sama** dengan identitas visual (warna, logo) dan
isian pendaftaran tambahan masing-masing. Kesiswaan mengelola semuanya; guru menjadi **pembina** organisasi tertentu.
- **Pendaftaran** (portal siswa → **Ekskul**): periode buka–tutup, untuk kelas tertentu, syarat, isian tambahan (mis. "Punya kamera?"),
  batas jumlah ekskul per siswa. Pembina menerima/menolak; bila **kuota** penuh → **daftar tunggu**, otomatis naik saat ada anggota keluar.
- **Anggota & jabatan**: ketua, wakil, sekretaris, bendahara, koordinator. Pengurus siswa mengelola dari portal **sesuai jabatannya**:
  ketua/wakil — kegiatan, presensi, program kerja, pengajuan; sekretaris — kegiatan, presensi, pengajuan & LPJ; bendahara — anggaran & LPJ.
- **Kegiatan & presensi** (latihan, rapat, acara, lomba); acara bertanda "di website" tampil di halaman publik organisasi.
- **Program kerja** tahunan dan **pengajuan kegiatan**: proposal (tujuan, risiko & mitigasi, kebutuhan sarpras, rincian anggaran) →
  disetujui pembina → disetujui kesiswaan → **LPJ** (ringkasan, realisasi, dokumentasi) → selesai. Peran **Bendahara/Keuangan** melihat
  anggaran & LPJ tanpa bisa mengubah.
- **Sertifikat** (keanggotaan, kepengurusan, penghargaan, panitia): dicetak sebagai PDF dengan QR; keasliannya bisa dicek siapa saja di
  `/sertifikat` (nama ditampilkan tersamar). Sertifikat bisa dicabut.
- **Portofolio** siswa: riwayat organisasi & jabatan, kehadiran, sertifikat, dan prestasi yang ditautkan pembina.
- **Website** `/ekskul`: profil, jadwal, pembina, agenda, galeri, prestasi (tanpa nama siswa).

## Perpustakaan & literasi (Fase 11)

Peran baru **Pustakawan** dan **Koordinator Literasi** (beri di *Pengguna & Peran*). Kepala sekolah & kurikulum dapat melihat laporan.
- **Katalog**: data judul terpisah dari **eksemplar** fisik. Tiap eksemplar punya kode otomatis `PUS000123` (label QR/barcode
  dicetak di *Label buku*), status, dan lokasi (perpustakaan atau pojok baca). Tandai *Rekomendasi pustakawan* agar tampil paling atas.
- **E-book**: isi tautan + **dasar lisensi**. Pilih *terbuka untuk umum* hanya bila lisensinya terbuka (mis. Buku Kemendikbud);
  selain itu tautan hanya terlihat oleh warga sekolah yang masuk.
- **Sirkulasi**: pindai NISN/NIP lalu kode buku. Aturan (lama pinjam, maks. buku, perpanjangan, **denda per hari — isi 0 untuk tanpa
  denda**) di *Laporan & aturan*. Pengingat H-1 dan terlambat otomatis.
- **Pesan buku (reservasi)**: siswa/guru menekan *Pesan* di halaman buku pada website (setelah masuk). Bila semua dipinjam, mereka antre;
  saat buku kembali, eksemplar **ditahan 3 hari** untuk pemesan terdepan (dan diberi tahu). Eksemplar itu tidak bisa dipinjamkan ke orang lain.
  Tidak diambil → gugur otomatis, diteruskan ke antrean berikutnya.
- **Literasi**: siswa menulis **jurnal baca** di portal → pembina menyetujui/minta perbaikan. **Tantangan literasi** (mis. 5 buku per
  semester) dihitung dari jurnal yang disetujui; progres tampil di portal siswa & orang tua. **Ulasan buku** (bintang + komentar) tampil di
  website **tanpa nama** setelah dimoderasi. **Duta literasi** ditetapkan per tahun ajaran.
- **Pojok baca**: lokasi, kelas, penanggung jawab, koleksi (eksemplar yang ditempatkan), dan jurnal kegiatan + tautan dokumentasi.
  Guru penanggung jawab mencatat kegiatannya sendiri.
- **Katalog publik**: `/perpustakaan` — pencarian & ketersediaan, tanpa data peminjam.

## Humas, pengaduan & layanan publik (Fase 11)

- **Pengaduan & aspirasi** (`/pengaduan`, tanpa login atau dari portal): nomor tiket + kode akses (ditampilkan sekali), bisa anonim.
  Kategori *perundungan* & *kekerasan* otomatis **rahasia** — hanya kepala sekolah, BK, dan kesiswaan yang dapat membaca.
  Kategori *Permohonan informasi publik* untuk layanan informasi. Anti-spam: jebakan bot + batas 3 pengaduan/jam per perangkat (IP hanya
  disimpan sebagai hash).
- **Penanganan**: tetapkan PIC (diberi tahu), status, tenggat, tanggapan untuk pelapor & catatan internal. Setiap langkah tercatat di
  **riwayat tindak lanjut**. Menutup pengaduan wajib disertai tanggapan. Pelapor menilai layanan (1–5 bintang) sekali, lewat cek tiket/portal.
- **SLA** per kategori (hari) diatur di **Dasbor Humas**; dasbor juga menampilkan angka agregat (masuk, rahasia, lewat tenggat, % tepat
  waktu, rata-rata kepuasan, mitra, tamu, responden survei) — tanpa isi pengaduan rahasia.
- **Kemitraan & MoU**: pihak, ruang lingkup, periode, dokumen, PIC, **kegiatan + nilai manfaat**, dan evaluasi. Diingatkan 30 hari sebelum
  berakhir. Centang *tampilkan di website* untuk memuat nama mitra di halaman Profil.
- **Survei** (`/survei`): untuk umum, warga sekolah, siswa, orang tua, atau guru. Tulis pertanyaan satu per baris:
  `S:` skala 1–5, `P: pertanyaan | pilihan A | pilihan B`, `T:` isian (`T?:` = tidak wajib). Jawaban anonim, satu kali per akun,
  hasil berupa rekap. Pertanyaan terkunci setelah ada jawaban.
- **Kontak media** (internal humas) dan **Buku tamu** (pos/TU/piket; guru yang dituju langsung diberi tahu dan bisa menandai tamu keluar).
- Berita, agenda, galeri, dan publikasi program tetap dikelola di menu **Website** (Fase 1 & 6).

## Kelas digital (LMS) — tugas & kuis online (Fase 10)

Menu **Pembelajaran → Kelas Digital**: satu ruang per kelas & mapel yang diajar guru.
- **Tugas**: judul, instruksi, tautan, tenggat (WIB), nilai maksimal, terima/tolak terlambat, kelas tujuan. Saat **diterbitkan**,
  siswa diberi tahu di lonceng portal. Siswa mengumpulkan jawaban teks / tautan / berkas (PDF, Word, PowerPoint, Excel, foto ≤ 4 MB)
  dan bisa memperbarui sebelum dinilai. Guru menilai + komentar atau **mengembalikan** untuk diperbaiki; siswa & orang tua melihat nilainya.
  Siswa yang belum mengumpulkan diingatkan otomatis ±24 jam sebelum tenggat (lewat penjadwal harian yang sama dengan notifikasi).
- **Kuis online**: soal pilihan ganda (bisa dibuat manual atau dengan **Asisten AI**), jendela waktu buka–tutup, durasi per siswa,
  acak urutan soal. Siswa sekali mengerjakan; jawaban tersimpan otomatis dan terkirim sendiri saat waktu habis. **Kunci jawaban tidak
  pernah dikirim ke perangkat siswa** — nilai dihitung di server. Nilai & pembahasan tampil langsung atau setelah kuis ditutup (pilihan guru).
  Setelah ada siswa yang mengerjakan, soal terkunci.
- **Rekap nilai** per kelas–mapel (tugas & kuis) bisa diunduh sebagai Excel — bahan untuk rapor.
- Portal siswa/orang tua: menu **Tugas** (perlu dikerjakan, sudah dikumpulkan, kuis), dan materi slide di menu **Materi**.

## Sarana & prasarana (Fase 10)

Peran baru **Wakasek Sarpras** (beri di *Pengguna & Peran*). Kepala sekolah, wakasek, dan operator dapat melihat inventaris.
- **Inventaris**: kode otomatis `SMAN22/<KATEGORI>/<TAHUN>/<NOMOR>`, kategori, lokasi (ruang), merk, jumlah, kondisi, sumber dana,
  tahun & harga perolehan, foto. Rekap per kategori × kondisi dan **nilai aset**; unduh Excel. Penghapusan aset wajib disertai alasan
  (data tetap tersimpan untuk riwayat).
- **Label QR**: cetak di kertas stiker A4; dipindai kamera HP → membuka data barang (guru/staf yang login) untuk meminjam atau melapor rusak.
- **Ruang**: gedung, kondisi, kapasitas, penanggung jawab, dan apakah bisa dipinjam.
- **Peminjaman ruang/barang** (semua guru & staf): sistem menolak bila **bentrok** dengan peminjaman lain, **jadwal pelajaran** di ruang
  itu, atau **stok** barang tidak cukup. Sarpras menyetujui/menolak (peminjam diberi tahu), mencatat serah-terima & pengembalian.
- **Laporan kerusakan** (semua guru & staf, dengan foto dari HP): prioritas tinggi diberitahukan sebagai pesan penting. Sarpras
  memproses → selesai (catat tindakan & biaya, sekaligus memperbarui kondisi barang). Pelapor diberi tahu.

## Kurikulum, perangkat ajar & pembelajaran digital (Fase 9)

Menu **Kurikulum** di panel. Wakasek Kurikulum (dan Wakasek/Super Admin) mengelola; guru mengisi bagiannya sendiri.

1. **Struktur Kurikulum** — mapel & JP/minggu per tingkat (X = fase E, XI–XII = fase F), kelompok umum/pilihan/mulok.
   Bagian *Kesesuaian* menunjukkan kelas yang penugasan gurunya belum sesuai struktur (mapel belum ada guru / JP berbeda).
   Tahun ajaran baru: tombol **Salin dari tahun lalu**.
2. **CP, TP & ATP** — guru pengampu menyalin CP resmi per elemen, lalu menyusun Tujuan Pembelajaran beserta **KKTP** dan alokasi JP
   per semester (ATP). Kurikulum dapat **menetapkan ATP final** (terkunci untuk guru). Bisa dicetak/simpan PDF.
3. **Perangkat Ajar** — guru mengunggah prota, promes, ATP, modul ajar, bahan ajar, asesmen (PDF/Word/PowerPoint/Excel/foto ≤ 4 MB,
   atau tautan Google Drive) → **ajukan** → kurikulum **setujui / minta revisi** (guru diberi tahu). **Periksa Perangkat** berisi
   antrean dan rekap kelengkapan seluruh guru (prota, promes, ATP, modul ajar per mapel & kelas). Berkas disimpan privat.
4. **Projek Kokurikuler** — projek P5/kokurikuler per tingkat: tema, dimensi profil lulusan, kelas, fasilitator, koordinator, jadwal.
   Koordinator bisa mengubah status (rencana/berjalan/selesai). Siswa melihatnya di portal (menu *Materi*).
5. **Supervisi Akademik** — kepala sekolah/kurikulum menjadwalkan (guru + supervisor). Supervisor mengisi instrumen 11 butir
   (skor 1–4; nilai = rata-rata × 25), kekuatan, perbaikan, rekomendasi. Guru menerima hasil & menulis tanggapan. Hanya guru ybs,
   supervisor, dan pimpinan yang bisa melihat.
6. **Materi & Papan Interaktif** — guru menyusun slide (teks/poin, gambar, video YouTube, soal pilihan ganda), memilih kelas,
   lalu **Terbitkan** (siswa diberi tahu di lonceng portal).
   - **▶ Tayangkan di papan**: tampilan layar penuh untuk papan interaktif/proyektor — geser/tombol panah untuk pindah slide,
     **Pena** (coret di atas slide, 6 warna, penghapus), **Papan tulis** kosong, **Pewaktu** (1/3/5/10 menit + bunyi),
     **Pilih siswa acak** (nama panggilan kelas tsb, tidak mengulang), dan **tampilkan jawaban** pada soal.
     Coretan hanya ada di perangkat itu (tidak disimpan/dikirim). Papan tulis kosong: *Materi → Papan tulis kosong*.
7. **Asisten AI (opsional)** — dengan `ANTHROPIC_API_KEY` di Vercel, guru bisa: menyusun **draf TP/ATP + KKTP** dari CP,
   **kerangka modul ajar** (unduh Word), dan **slide + soal** dari topik. Hasil selalu draf yang diperiksa guru.
   **Tidak ada data siswa** yang dikirim ke AI. Kuota 30 permintaan/orang/hari. Tanpa kunci, tombol AI disembunyikan.

## Keamanan akun: verifikasi dua langkah & lupa sandi (Fase 8)

**Verifikasi dua langkah (MFA)** — setelah kata sandi, pengguna memasukkan kode 6 angka dari aplikasi di HP.
- **Super admin wajib.** Peran lain bisa diwajibkan oleh super admin di **Pengaturan → Keamanan Akun → Peran yang wajib verifikasi dua langkah**
  (disarankan juga untuk Kepala Sekolah dan Operator).
- Selama kode belum dimasukkan, **izin dari peran tersebut ditahan oleh database** — bukan sekadar disembunyikan di layar.
- Setiap orang bisa mengaktifkannya sendiri di **Keamanan Akun**, dan disarankan menambah **HP kedua** sebagai cadangan.
- **HP hilang / ganti HP:** super admin lain membuka **Pengguna & Peran → pilih akun → Reset verifikasi dua langkah**.
  Bila super admin satu-satunya yang kehilangan HP: Supabase → **Authentication → Users** → pilih akun → hapus *MFA factor*.
  Karena itu **sebaiknya ada 2 super admin**.
- Di Supabase, TOTP sudah aktif secara bawaan (**Authentication → Multi-Factor**). Jangan dimatikan.

**Lupa kata sandi (guru & staf)** — tautan *Lupa kata sandi?* di halaman masuk → email berisi tautan (berlaku 1 jam, sekali pakai).
- Email dikirim lewat **Resend** (`RESEND_API_KEY`, `EMAIL_PENGIRIM`) + `SUPABASE_SERVICE_ROLE_KEY` + `SITUS_URL` yang sudah dipasang
  untuk notifikasi. Tautan bisa dibuka di HP mana pun. Maksimal 3 permintaan per email per 15 menit.
- Bila Resend belum dipasang, sistem memakai email bawaan Supabase. Atur dulu di Supabase → **Authentication → URL Configuration**:
  *Site URL* = alamat website, *Redirect URLs* tambahkan `https://ALAMAT-WEBSITE/auth/callback`. (Email bawaan Supabase sangat
  dibatasi; untuk sekolah sebaiknya pakai Resend.)
- Siswa & orang tua tidak memakai email: sandinya diatur ulang oleh wali kelas/operator (cetak ulang kartu akun).
- Admin juga bisa menekan **Kirim tautan atur ulang** di halaman pengguna, sehingga admin tidak perlu tahu sandi orang lain.

**Lainnya:** ganti sandi sendiri (wajib isi sandi lama), **Keluar dari semua perangkat**, akun yang dinonaktifkan langsung
diakhiri sesinya. Masuk, keluar, gagal masuk, ganti sandi, dan perubahan MFA tercatat di **Log Aktivitas** dan pemilik akun
menerima pemberitahuan (tidak bisa dimatikan).

> **Login sebagai pengguna lain (impersonasi) sengaja tidak dibuat.** Fitur itu membuat admin bisa bertindak atas nama guru/ortu
> dan mengaburkan jejak audit. Untuk membantu pengguna, cukup lihat datanya dari menu admin atau minta tangkapan layar.

## Kalender sekolah & tukar jam (Fase 8)

**Kalender Sekolah** (menu *Jadwal → Kalender Sekolah*; dikelola Wakasek Kurikulum, Wakasek, Humas, Super Admin):
- Jenis: akademik, ujian, kegiatan, rapat, libur. Sasaran: **Umum** (tampil di website & iCal), **Warga sekolah** (guru, siswa, ortu
  yang login), **Guru & pegawai**.
- Centang **Tidak ada KBM** (otomatis untuk jenis Libur) → tanggal-tanggal itu menjadi **hari libur** di absensi & jadwal (Minggu dilewati);
  mengubah/menghapus kegiatan ikut memperbarui hari libur.
- Ujian & libur baru otomatis diberitahukan di lonceng aplikasi.
- Tautan **/kalender.ics** bisa dilanggan dari Google Calendar (*Tambah kalender → Dari URL*).

**Tukar Jam** (menu *Jadwal → Tukar Jam*, semua guru yang akunnya tertaut ke data guru):
1. Guru memilih rekan, jam yang dilepas + tanggal, lalu **Tukar jam** (rekan mengisi jam saya, saya mengisi jam rekan) atau
   **Minta digantikan** (tanpa balasan).
2. Rekan menerima/menolak → 3. Wakasek Kurikulum menyetujui di **Persetujuan Tukar Jam**.
3. Saat disetujui, sistem memeriksa ulang bentrok, mengubah jadwal hari itu (tampil di Jadwal Saya, absensi per JP, portal),
   dan memberi tahu kedua guru serta **siswa kelas tersebut** (lonceng saja, tanpa WhatsApp).
- Perubahan oleh piket (guru pengganti, ditiadakan, pindah ruang) kini juga diberitahukan ke guru pengampu dan siswa kelasnya.
- **Riwayat Jadwal**: siapa mengubah jadwal/perubahan/tukar jam dan kapan.

## Kesiswaan: prestasi, pelanggaran berpoin, pembinaan (Fase 7)

Prinsipnya **pembinaan lebih dulu**. Tidak ada peringkat pelanggaran yang tampil di website, dan rincian kejadian tidak dikirim ke orang tua lewat WhatsApp.

1. **Sesuaikan aturan dulu** (Kesiswaan/Super Admin): **Kesiswaan → Aturan Poin**.
   - Daftar jenis pelanggaran berisi **contoh** yang wajib disesuaikan dengan tata tertib sekolah.
   - Atur poin prestasi per tingkat & peringkat, serta tindak lanjut per ambang poin (bawaan: 25 bimbingan wali, 50 panggil orang tua, 75 SP1, 100 SP2 + BK, 150 SP3).
   - Pilih apakah poin prestasi mengurangi poin pelanggaran.
   - Mengubah poin membuat **versi baru**, sehingga catatan lama tidak ikut berubah.
2. **Semua guru** bisa melapor lewat **Kesiswaan → Lapor Pelanggaran/Prestasi**: cari nama siswa, pilih jenis, tulis kronologi, saksi, dan bukti foto. Siswa juga bisa melaporkan prestasinya sendiri dari portal dengan foto piagam.
3. **Kesiswaan memverifikasi** di **Prestasi & Poin**. Poin baru dihitung setelah diverifikasi; laporan bisa ditolak dengan catatan, dan catatan terverifikasi bisa dibatalkan dengan alasan.
4. **Rapor perkembangan siswa** (klik nama siswa) menampilkan prestasi, pelanggaran, SP dari absensi, dan riwayat pembinaan, dan bisa dicetak.
   - Wali kelas/kesiswaan/BK mencatat **pembinaan**: bimbingan, pemanggilan orang tua, kunjungan rumah, perjanjian, dll.
   - Mereka juga bisa **merujuk ke BK**. Isi konseling hanya dibaca guru BK; perujuk hanya melihat statusnya.
5. **Orang tua & siswa** melihat menu **Prestasi** di portal: prestasi, nama pelanggaran & poinnya, serta pembinaan. Kronologi, saksi, dan nama pelapor tidak ditampilkan.

## Notifikasi: lonceng, WhatsApp, email (Fase 7)

- **Lonceng** di admin dan portal menampilkan pemberitahuan. Angka merah = belum dibaca; klik untuk langsung menuju halamannya.
- **Kejadian yang memberi notifikasi:**

| Kejadian | Penerima |
|---|---|
| Izin/sakit dari orang tua | wali kelas; lalu hasilnya ke orang tua |
| Berita diajukan | kepala sekolah; lalu hasilnya ke humas |
| Izin/cuti guru diajukan | kepala sekolah; lalu hasilnya ke guru |
| Guru pengganti ditugaskan | guru pengganti |
| Koreksi absensi diajukan | piket/kesiswaan; lalu hasilnya ke wali kelas |
| Pelanggaran dilaporkan | kesiswaan; setelah diverifikasi: orang tua, siswa, wali kelas |
| Poin mencapai ambang tindak lanjut | kesiswaan & wali kelas |
| Prestasi diajukan | kesiswaan; setelah diverifikasi: ucapan selamat ke siswa, orang tua, wali |
| Alpa/terlambat mencapai ambang SP / panggilan orang tua | kesiswaan, wali kelas, **orang tua** |
| Rujukan BK | guru BK; lalu status ke perujuk |

- **WhatsApp & email (opsional):**
  - Isi `FONNTE_TOKEN` (WhatsApp) dan/atau `RESEND_API_KEY` + `EMAIL_PENGIRIM` (email) di Vercel, lalu Redeploy.
  - **Pengaturan → WhatsApp & Email** menampilkan status, antrian, dan pengiriman terakhir (nomor disensor).
  - Nomor diambil dari data pegawai/orang tua (Dapodik). Setiap orang bisa mengganti nomornya, mematikan WhatsApp/email, atau membisukan kategori tertentu di menu **Notifikasi**, lalu menekan **Kirim notifikasi tes ke saya**.
  - **Jam tenang 21.00–06.00 WIB**: pesan biasa ditunda sampai pagi; hanya peringatan penting (SP, tugas menggantikan) yang langsung dikirim.
  - **Anti-spam**: maksimal satu pesan per kategori per 10 menit untuk orang yang sama.
  - Siswa tidak dikirimi email. Pesan ke orang tua tentang pelanggaran hanya berisi pemberitahuan singkat dan tautan ke portal.
  - Catatan: Fonnte adalah layanan WhatsApp tidak resmi. Gunakan nomor khusus sekolah (bukan nomor pribadi) dan kirim seperlunya agar tidak diblokir WhatsApp.
- **Penjadwal (agar pesan pagi terkirim):**
  - Pesan dikirim otomatis segera setelah kejadian. Pesan yang ditunda (jam tenang) atau gagal dicoba lagi oleh penjadwal.
  - Vercel Hobby sudah memanggil `/api/notifikasi/kirim` setiap hari pukul 06.05 WIB (`vercel.json`); isi `CRON_SECRET` agar berjalan.
  - Agar lebih sering (mis. tiap 10 menit), daftar gratis di **cron-job.org**: URL `https://alamat-website/api/notifikasi/kirim`, header `Authorization: Bearer <CRON_SECRET>`.
- **Ringkasan (dashboard) per peran** menampilkan:
  - **Perlu ditindaklanjuti**: berita, izin, koreksi, laporan kesiswaan, rujukan BK, SP, jam mengajar yang belum dijurnal, notifikasi gagal;
  - kehadiran siswa hari ini + grafik 10 hari terakhir;
  - kehadiran guru hari ini;
  - prestasi/pelanggaran bulan ini.
- `/api/sehat` dapat dipakai layanan pemantau uptime (mis. UptimeRobot).

## Website: persetujuan, jadwal tayang, tampilan (Fase 6)

**Alur berita (humas → kepala sekolah):**
1. Humas menulis berita → pilih **Ajukan untuk disetujui** → Simpan. Tombol **Pratinjau** menampilkan berita persis seperti di website, tetapi belum bisa dilihat publik.
2. Kepala sekolah membuka **Website → Persetujuan Konten** (angka merah = jumlah yang menunggu) → baca pratinjau → **Setujui & terbitkan**, atau **Kembalikan** dengan catatan perbaikan.
3. **Jadwal tayang**: isi tanggal & jam di kolom *Jadwal tayang*. Berita yang sudah disetujui baru muncul otomatis pada waktu itu (±1 menit). Pengumuman juga bisa diberi waktu mulai dan berhenti tayang.
4. **Riwayat revisi**: setiap perubahan isi berita menyimpan versi sebelumnya. Di halaman ubah berita ada daftar versi beserta pengubahnya, dan tombol **Pulihkan versi ini**.
5. Kewajiban persetujuan bisa dimatikan oleh kepala sekolah/super admin di **Tampilan Website → Alur persetujuan berita**. Catatan: perbaikan kecil pada berita yang sudah terbit langsung tampil, tetapi tetap tercatat di riwayat revisi.

**Tampilan Website** (humas):
- **Bagian pembuka**: label, judul (dengan kata miring berwarna emas), teks, dua tombol, dan lama pergantian foto (6–8 detik).
- **Foto pembuka**: unggah foto layar lebar dan (opsional) foto khusus HP. **Klik pratinjau untuk memilih titik fokus**, yaitu bagian yang tidak boleh terpotong, misalnya wajah. Bisa diperbesar, diurutkan, diberi tautan, dan dijadwalkan tayang (mis. foto HUT sekolah hanya seminggu). Keterangan foto wajib diisi untuk tunanetra & mesin pencari. Pengunjung yang mengaktifkan "kurangi gerakan" tidak melihat pergantian otomatis.
- **Tautan layanan** (8 baris), **footer & media sosial**, serta **SEO**: judul & deskripsi di Google (dengan pratinjau) dan gambar saat tautan dibagikan di WhatsApp/Facebook.
- Tautan hanya boleh diawali `/` (halaman situs) atau `https://`; tautan berbahaya ditolak.

## Absensi per jam pelajaran & QR (Fase 6)

- **Guru mapel**: buka **Jadwal Saya** → tombol **Absen kelas** di setiap jam hari ini.
  - Semua siswa bawaannya *Hadir*. Siswa yang sakit/izin di absensi harian otomatis ditandai.
  - Ubah yang tidak hadir: Telat, Sakit, Izin, Dispen (tugas sekolah), atau Alpa. Isi **materi/jurnal mengajar** → Simpan.
  - Bisa diisi pada hari itu sampai 2 hari sesudahnya. Guru pengganti otomatis mendapat hak mengisi; guru yang digantikan tidak.
- **QR (opsional)**: di halaman absen kelas tekan **Tampilkan QR kehadiran** (tampilkan di proyektor).
  - Siswa memindai dengan kamera HP. Halaman portal terbuka dan kehadiran tercatat (wajib login akun siswa).
  - Kode berganti tiap 20 detik dan hanya berlaku ±1 menit, satu siswa hanya tercatat sekali.
  - QR **bukan bukti tunggal**: guru tetap memeriksa daftar. Tombol *Tandai yang belum memindai sebagai Alpa* membantu mempercepat.
- **Wali kelas / piket / kesiswaan**: **Absensi → Per Jam Pelajaran** menampilkan tabel siswa × jam dan jurnal setiap guru. Tanda ⚠ menandai siswa yang **alpa di jam pelajaran padahal datang ke sekolah** (indikasi membolos).
- **Orang tua** melihat catatan per jam pelajaran anaknya di portal.
- **Bukti**: pengajuan koreksi (wali kelas) dan izin online orang tua bisa dilampiri foto surat/PDF. Berkas disimpan **privat**: hanya bisa dibuka piket/admin/wali yang berhak lewat tautan sementara 60 detik, dan setiap pembukaan tercatat di Log Aktivitas.

## Kehadiran guru: jam kerja, izin/cuti, lokasi & swafoto (Fase 6)

- **Absensi → Jam Kerja Pegawai** (Operator/TU): buat **kelompok** (mis. Guru 07.15–15.00, Tendik 07.00–15.30, Satpam) dengan toleransi terlambat dan hari kerja, lalu pindahkan pegawai ke kelompoknya.
- **Izin/sakit/dinas luar/cuti mandiri**: guru mengisi di **Presensi Saya** (boleh lampirkan surat tugas/dokter) → kepala sekolah menyetujui di **Absensi → Izin Guru & Pegawai**.
  - Setelah disetujui, kehadiran terisi otomatis dan guru tersebut langsung muncul di **Guru Pengganti** untuk tanggal itu.
  - Pengajuan sendiri tidak bisa disetujui sendiri.
- **Lokasi & swafoto — MATI secara bawaan.** Aktifkan per kelompok **hanya setelah menjadi keputusan sekolah dan disosialisasikan**:
  - **Lokasi**:
    - Isi titik sekolah (tombol *Pakai lokasi saya sekarang* sambil berdiri di halaman sekolah) dan radius (bawaan 150 m).
    - Lokasi hanya diperiksa saat menekan tombol presensi, dan yang disimpan hanya **jaraknya**, bukan koordinat.
    - Keterbatasan: aplikasi pemalsu lokasi dapat mengakali.
  - **Swafoto**:
    - Foto diperkecil di HP lalu disimpan privat.
    - Hanya bisa dilihat pegawai itu sendiri serta TU/kepala sekolah.
    - Masa simpan bawaan 30 hari. Tombol **Hapus swafoto lama sekarang** menghapus permanen yang melewati masa simpan; jalankan rutin, mis. tiap awal bulan.
  - Sampaikan kepada guru: tujuan, siapa yang bisa melihat, dan lama penyimpanan (persetujuan/consent).

## Jadwal Pelajaran (Fase 5)

Dikerjakan oleh **Wakasek Kurikulum** (peran baru) atau Operator. Urutannya:

1. **Jadwal → Jadwal Pelajaran → Mapel, jam & piket**
   - **Jam pelajaran**: isi jam masuk, durasi 1 JP (bawaan 40 menit), jumlah JP, kegiatan awal (literasi/tadarus/upacara), serta istirahat & ishoma. Pratinjau jam pulang langsung terlihat.
     Hari yang susunannya berbeda (Senin ada upacara, Jumat lebih pendek) disimpan terpisah: pilih harinya, ubah isian, simpan lagi.
     Jam boleh diubah kapan saja tanpa merusak jadwal yang sudah disusun.
   - **Mata pelajaran** dan **Ruang** (ruang opsional, untuk lab/lapangan yang dipakai bergantian).
   - **Jadwal piket guru** per hari.
2. **Penugasan mengajar**: siapa mengajar mapel apa di kelas mana, berapa JP per minggu.
   Cara tercepat: siapkan di Excel 4 kolom **Kelas | Mapel | Guru (nama atau NIP) | JP**, blok → salin → **tempel** di kotak *Isi banyak sekaligus*.
   Bila ada baris yang salah (kelas tidak ada, nama guru tidak dikenal), **tidak ada yang disimpan** dan baris yang salah disebutkan.
   Tab **Beban mengajar guru** menampilkan total JP tiap guru (tanda ⚠ bila kurang dari 24 JP).
3. **Susun jadwal**: pilih kelas → pilih mapel di setiap jam → **Simpan jadwal**.
   - Guru yang sudah mengajar di kelas lain pada jam yang sama **tidak bisa dipilih**; ruang juga begitu.
   - Penghitung di atas menunjukkan JP terisi dibanding target (hijau = pas, merah = berlebih).
   - Database tetap memeriksa ulang saat menyimpan, jadi dua orang yang menyusun bersamaan pun tidak bisa membuat bentrok.
4. **Lihat jadwal** per kelas, per guru, per ruang, atau per hari (semua kelas). Tombol **Cetak / simpan PDF** dan **Unduh Excel** (satu lembar per kelas atau per guru).

**Guru berhalangan (Guru Piket / Kurikulum):** menu **Jadwal → Guru Pengganti** → pilih tanggal.
- Guru yang tercatat sakit/izin/dinas/cuti di **Kehadiran Guru** muncul otomatis beserta jumlah jam yang belum teratasi.
- Untuk setiap jam pilih **Guru pengganti** (hanya guru yang sedang kosong dan hadir yang ditawarkan, diurutkan dari yang paling ringan hari itu), **Tugas mandiri**, **Ditiadakan**, atau **Pindah ruang**.
- Perubahan langsung tampil (kuning) di **Jadwal Saya** guru pengganti dan di **portal siswa/orang tua**.

**Guru:** menu **Jadwal Saya**: jadwal hari ini, tugas menggantikan, hari piket, dan jadwal seminggu (bisa dicetak).
**Siswa & orang tua:** menu **Jadwal** di portal, termasuk perubahan jadwal minggu ini.

## Portal Siswa & Orang Tua (Fase 4)

Alamat masuk: **https://alamat-website-anda/masuk** (tombol **Masuk** juga ada di menu website).
Siswa dan orang tua **tidak perlu email**: masuk dengan **NISN siswa** + kata sandi.

**Membuat akun (Operator/TU atau super admin):** menu **Pengaturan → Akun Portal Siswa & Ortu**
1. Pilih kelas → centang siswa → pilih *Akun orang tua* dan/atau *Akun siswa* → **Buat akun**.
   Maksimal 40 akun sekali tekan; tekan lagi untuk sisanya. Siswa yang belum punya NISN 10 digit dilewati.
2. **Kata sandi hanya tampil sekali.** Langsung klik **Cetak kartu akun** (2 kartu per baris, siap gunting)
   atau **Unduh CSV**. Bagikan kartu langsung, misalnya saat rapat orang tua. Jangan dikirim lewat grup.
3. Lupa kata sandi → di halaman yang sama klik **atur ulang sandi** di baris siswa itu → cetak kartu baru.
   Fitur ini hanya bisa dipakai untuk akun portal, bukan akun guru/staf.

**Yang dilihat orang tua & siswa** (hanya data anaknya sendiri, dijaga oleh database):
- persentase hadir bulan ini, jumlah Sakit/Izin/Alpa/Terlambat,
- peringatan SP / panggilan orang tua yang sedang berjalan,
- kalender kehadiran per bulan dan pengumuman sekolah.

**Izin/sakit online (khusus akun orang tua):** menu **Izin / Sakit** → pilih Sakit atau Izin, tanggal, dan keterangan → **Kirim**.
- Bisa dikirim paling lambat 3 hari setelah tanggalnya, paling lama 14 hari per pengajuan.
- **Wali kelas** (atau piket/kesiswaan) membuka **Absensi → Izin dari Orang Tua** → **Terima** / **Tolak** (boleh diberi catatan).
- Bila diterima, absensi siswa **terisi otomatis** Sakit/Izin pada hari sekolah. Catatan Terlambat atau Pulang cepat tidak ditimpa.
- Orang tua melihat status dan catatan sekolah di portal. Pengajuan yang masih menunggu dapat dibatalkan orang tua.

> Kakak-adik di sekolah ini: setiap siswa punya akun orang tua sendiri (login dengan NISN masing-masing anak).

### Siapa bisa apa

| Peran | Website | Data induk | Absensi siswa | SP / disiplin | Kehadiran guru | Pengguna & log |
|---|---|---|---|---|---|---|
| Super Admin | ✅ | ✅ kelola | ✅ kelola | ✅ konfirmasi | ✅ | ✅ |
| Wakasek Kurikulum | — | 👁 | — | — | — | jadwal ✅ susun + pengganti |
| Kepala Sekolah | setujui berita | 👁 | 👁 | 👁 | 👁 + setujui izin guru | log 👁 |
| Wakasek | — | 👁 | 👁 | 👁 | — | — |
| Kesiswaan | — | 👁 | ✅ kelola + pengaturan | ✅ konfirmasi + verifikasi prestasi/pelanggaran, aturan poin | — | — |
| Guru BK | — | 👁 | 👁 | ✅ konfirmasi + rujukan BK | — | — |
| Guru Piket | — | — | ✅ catat terlambat, setujui koreksi & izin ortu | — | — | guru pengganti ✅ |
| Operator / TU | — | ✅ kelola | 👁 + pengaturan | — | ✅ kelola | akun portal ✅, jadwal ✅ susun |
| Humas | ✅ + pengaduan, kemitraan, survei, buku tamu | — | — | — | — | — |
| Admin Alumni | verifikasi & layanan alumni, tracer study | — | — | — | — | — |
| Tim Penjaminan Mutu | kerangka, indikator, bukti, persetujuan evaluasi | — | — | — | — | — |
| Auditor Internal | meninjau evaluasi, mencatat temuan | — | — | — | — | — |
| Alumni | area alumni (profil, direktori opt-in, tracer study) | — | — | — | — | — |
| Guru BK | kasus konseling (rahasia), laporan BK | — | — | — | — | log akses BK |
| Bendahara / Keuangan | anggaran pengajuan kegiatan & LPJ (lihat) | — | — | — | — | — |
| Pustakawan | katalog & sirkulasi perpustakaan, literasi | — | — | — | — | — |
| Koordinator Literasi | jurnal baca, tantangan, ulasan, pojok baca | — | — | — | — | — |
| Wali Kelas | — | 👁 kelasnya | ✅ kelasnya (minggu berjalan) + terima izin ortu | 👁 kelasnya | — | — |
| Guru | — | — | — | — | presensi sendiri | — |
| Siswa / Orang Tua | — | 👁 diri/anaknya (portal) | 👁 + ortu kirim izin | 👁 | — | — |

Setiap guru (termasuk piket, wali kelas, BK) bisa memakai **Presensi Saya** bila akunnya ditautkan ke data guru.

Semua guru, siswa, dan orang tua yang login dapat **melihat** jadwal (jadwal tidak bersifat rahasia).

Matriks ini disimpan di database (tabel `peran_izin`), jadi bisa diubah tanpa mengubah kode.

## Keamanan yang sudah diterapkan

- Hak akses dijaga oleh **database (Row Level Security)**, bukan hanya tampilan. Diuji untuk 13 jenis pengguna, termasuk percobaan penyalahgunaan.
- Data siswa **tidak pernah** tampil di website publik.
- Hanya super admin yang bisa memberi peran super admin, dan super admin terakhir tidak bisa dicabut.
- Super admin wajib verifikasi dua langkah; tanpa kode, hak aksesnya ditahan oleh database.
- Tidak ada hapus permanen. Data diarsipkan, atau statusnya diubah (lulus, mutasi, keluar).
- Setiap perubahan dan setiap **ekspor data** tercatat di **Log Aktivitas** (siapa, kapan, sebelum/sesudah).
- Impor bersifat **semua-atau-tidak-sama-sekali**: bila satu baris gagal, tidak ada data yang tersimpan setengah-setengah.
- File CSV hasil ekspor aman dibuka di Excel (mencegah *formula injection*).

## Jika ada masalah

| Gejala | Solusi |
|---|---|
| "Database belum disambungkan" | Kunci di Vercel belum diisi atau belum **Redeploy** (Langkah 5). |
| "Akun belum diberi akses" | Akun belum punya peran → super admin mengatur di **Pengguna & Peran** (atau jalankan `tambah-admin.sql`). |
| Tombol "Buat akun" meminta membuat akun di Supabase dulu | `SUPABASE_SERVICE_ROLE_KEY` belum dipasang di Vercel. |
| Impor: "NIP tersimpan sebagai angka di Excel" | Ubah format kolom NIP/NUPTK menjadi **Teks** di Excel, ketik ulang/ekspor ulang dari Dapodik. |
| Impor: "Belum ada tahun ajaran aktif" | Buat & aktifkan tahun ajaran (Langkah 6 nomor 2). |
| Orang tua: "NISN atau kata sandi salah" | Pastikan memilih **Orang Tua** (bukan Siswa) saat masuk dan NISN 10 digit. Bila lupa, operator mengatur ulang sandi. |
| Tombol *Buat akun* portal gagal | Isi `SUPABASE_SERVICE_ROLE_KEY` (Langkah 5) dan pastikan siswa punya NISN 10 digit. |
| Susun jadwal: "Jam pelajaran belum diatur" | Atur dulu di **Mapel, jam & piket**. |
| Tempel penugasan: "guru tidak ditemukan" / "namanya ganda" | Pastikan guru ada di **Guru & Pegawai**; bila namanya mirip, tulis NIP-nya. |
| Jam pelajaran tidak bisa dikurangi | Hari itu masih memakai JP terakhir di jadwal. Kosongkan JP tersebut di **Susun jadwal** dulu. |
| Humas tidak bisa memilih "Terbit" | Wajar: berita perlu disetujui kepala sekolah (atau matikan kewajiban persetujuan). |
| Tombol presensi: "Izinkan akses lokasi" | Di HP: izinkan lokasi untuk browser; nyalakan GPS. |
| "Lihat bukti" tidak terbuka | Pastikan `SUPABASE_SERVICE_ROLE_KEY` terpasang di Vercel. |
| WhatsApp tidak terkirim | Cek **Pengaturan → WhatsApp & Email**: token Fonnte, perangkat Fonnte tersambung, dan nomor tujuan benar. Pesan malam ditunda sampai 06.00. |
| Guru tidak bisa mencari siswa saat melapor | Akun guru harus ditautkan ke data guru (Pengguna & Peran). |
| Super admin terus diminta kode / tidak bisa masuk panel | Masukkan kode dari aplikasi autentikator. HP hilang → super admin lain mereset di Pengguna & Peran. |
| "Kode salah" padahal baru disalin | Jam di HP tidak tepat. Aktifkan *waktu otomatis* di pengaturan HP. |
| Email lupa sandi tidak datang | Cek folder spam; pastikan `RESEND_API_KEY`, `EMAIL_PENGIRIM`, `SITUS_URL` terpasang. Akun portal siswa/ortu memang tidak dikirimi email. |
| Tautan lupa sandi "kedaluwarsa" | Tautan hanya berlaku 1 jam & sekali pakai. Minta tautan baru. |
| Siswa: "Kuis belum dibuka" | Periksa jam buka kuis (WIB) dan pastikan kuis sudah diterbitkan. |
| Soal kuis tidak bisa diubah | Sudah ada siswa yang mengerjakan — buat kuis baru bila perlu. |
| Peminjaman ditolak "Bentrok" | Ruang sedang dipinjam/dipakai kelas atau stok barang habis pada jam itu; pilih waktu lain. |
| Menu Inventaris tidak muncul | Hanya untuk Wakasek Sarpras (kelola) serta kepala sekolah/wakasek/operator (lihat). |
| ATP tidak bisa diubah guru | ATP sudah ditetapkan final oleh kurikulum; minta dibuka kuncinya. |
| Unggah perangkat "maksimal 4 MB" | Simpan berkas di Google Drive (izinkan "siapa saja yang memiliki link") lalu tempel tautannya. |
| Tombol AI tidak muncul / "belum diaktifkan" | Isi `ANTHROPIC_API_KEY` di Vercel lalu Redeploy. Kuota habis → coba besok. |
| "Pilih siswa acak" tidak aktif | Hanya untuk kelas yang Anda ajar/walikan dan sudah berisi siswa. |
| Tukar jam ditolak "Bentrok" | Salah satu guru sudah mengajar/menggantikan di jam itu. Pilih jam/tanggal lain. |
| Video latar beranda tidak muncul | Tautan harus https dan berakhiran .mp4/.webm; tunggu ±1 menit (cache). Di HP hemat data / "kurangi animasi", yang tampil memang foto. |
| Tombol "Setujui & buat akun" alumni gagal | Pasang `SUPABASE_SERVICE_ROLE_KEY`. Bila "email sudah dipakai", alumni perlu email lain. |
| Alumni tidak menerima email aktivasi | Email Resend belum aktif — minta alumni memakai *Lupa kata sandi* di halaman masuk dengan email yang didaftarkan. |
| Alumni tidak melihat tracer study | Survei hanya untuk angkatan yang dipilih, harus *Terbit*, dan dalam rentang tanggal. |
| Guru tidak melihat menu Mutu | Jadikan guru tersebut pemilik indikator atau koordinator standar. |
| Membuka bukti mutu: "isi berkas tidak sama" | Berkas di penyimpanan berubah sejak diunggah. Laporkan ke tim mutu & unggah ulang sebagai versi baru dari sumber asli. |
| Evaluasi indikator tidak bisa diubah | Sedang ditinjau/sudah disetujui. Minta revisi dari tim mutu. |
| "BK_KUNCI belum dipasang" / catatan BK tertulis 🔒 | Pasang `BK_KUNCI` di Vercel lalu Redeploy. Bila kunci pernah diganti, kembalikan kunci lama — catatan lama hanya terbuka dengan kunci yang sama. |
| Kepala sekolah/super admin tidak bisa membuka kasus BK | Disengaja: isi konseling hanya untuk guru BK. Pimpinan melihat *Laporan BK (agregat)*. |
| Siswa: "Pendaftaran … sedang tidak dibuka" | Atur tanggal buka–tutup dan kelas di tab *Profil & pembina* organisasi. |
| Pendaftar masuk "Daftar tunggu" | Kuota penuh. Naikkan kuota, atau ia otomatis diterima saat ada anggota keluar. |
| Pengurus siswa tidak bisa membuat kegiatan/pengajuan | Hak mengikuti jabatan; pembina mengatur jabatan di tab *Anggota*. |
| Isi proposal tidak bisa diubah | Sudah diajukan. Peninjau memilih *Minta revisi* agar bisa diedit lagi. |
| Siswa: "Anda sedang meminjam buku ini" saat memesan | Pesanan hanya untuk buku yang tidak sedang dipinjam orang itu. |
| Buku tidak bisa dipinjamkan: "disimpan untuk pemesan lain" | Eksemplar sedang ditahan untuk pemesan. Pakai eksemplar lain atau batalkan pesanan di Sirkulasi. |
| Tautan e-book tidak muncul di website | Akses e-book diatur *hanya warga sekolah* — pengunjung harus masuk. Ubah ke *terbuka* hanya bila lisensinya terbuka. |
| Humas tidak melihat pengaduan perundungan | Disengaja: kategori rahasia hanya untuk kepala sekolah, BK, kesiswaan. |
| Pertanyaan survei tidak bisa diubah | Sudah ada jawaban. Buat survei baru. |
| Pilihan PIC/guru kosong | Data guru belum diisi di **Guru & Pegawai**. |
| Wali kelas tidak melihat siswanya | Pastikan akunnya **ditautkan ke data guru** dan guru itu dipilih sebagai **wali kelas** di menu Kelas. |

## Untuk pengembang

- Migrasi: `supabase/migrations/`, uji hak akses: `supabase/tests/rls_*.sql` (jalankan di database uji).
- Izin dicek di server: `src/lib/admin/auth.ts` (`wajibIzin`, `aksesAksi`) + RLS di database.
- Kunci rahasia hanya dipakai di `src/lib/supabase/admin.ts` (server-only) untuk membuat akun/mengatur sandi.
