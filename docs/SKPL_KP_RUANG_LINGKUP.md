# Bahan penyusunan SKPL Kerja Praktik Sporta Indonesia

**Tujuan dokumen ini:** spesifikasi kerja yang dapat diberikan kepada agent AI lain untuk menulis *Spesifikasi Kebutuhan Perangkat Lunak* (SKPL). Ruang lingkupnya **hanya** sistem pendaftaran dan pengelolaan data peserta **event lari** Sporta Indonesia sebagaimana dijelaskan dalam dua dokumen sumber. Ini adalah bahan SKPL, bukan klaim bahwa setiap fungsi sudah tersedia atau sudah lulus pengujian.

## 1. Sumber dan aturan pembacaan

| Kode | Dokumen sumber | Bagian relevan |
|---|---|---|
| P | `C:/Users/User/Documents/TEDRIK/Proposal Kerja Praktik (KP) 2025.docx` | Latar Belakang; Rumusan Masalah; Batasan Masalah; Lingkup Pekerjaan; Metodologi |
| L | `C:/Users/User/Downloads/Laporan KP Tedrik-2.docx` | BAB I Latar Belakang, Rumusan Masalah, Batasan Masalah, Lingkup Pekerjaan; BAB IV Input, Proses, Output dan Pencapaian Hasil |

**Aturan agent penulis:** bedakan (E) kebutuhan yang dinyatakan oleh sumber, (T) rincian turunan yang diperlukan agar kebutuhan dapat diuji tetapi harus dikonfirmasi, dan (I) detail implementasi aktual yang harus diperiksa pada aplikasi bila ingin mengklaim telah direalisasikan. Jangan mengubah T menjadi fakta tanpa konfirmasi. Bila sumber saling berbeda, tulis perbedaannya dan keputusan yang diperlukan. Teks template pada Abstrak/BAB V Laporan, terutama contoh PT. XYZ dan SIM Rumah Sakit, bukan kebutuhan sistem ini.

## 2. Gambaran umum dan batas sistem

**Nama kerja:** Sistem Informasi Pendaftaran dan Pengelolaan Data Peserta Event Lari Sporta Indonesia. **Tujuan:** memusatkan registrasi dan data peserta, mengurangi kesulitan pencocokan data pendaftar dengan bukti transfer/mutasi rekening, kesalahan data peserta dan alokasi racepack/ukuran jersey, serta lamanya verifikasi dan rekapitulasi. Ini didukung oleh P Latar Belakang dan L BAB I Latar Belakang. Kebutuhan ini tidak otomatis berarti membangun modul akuntansi atau inventaris racepack.

Sistem berbasis web dan diakses melalui browser dengan internet. Ada dua aktor bisnis: **peserta/calon peserta** dan **administrator/panitia** (P Batasan Masalah butir 1–4; L BAB I Batasan Masalah). Terdapat subsistem pendaftaran peserta dan subsistem administrasi panitia (L BAB I Lingkup Pekerjaan). Metode pengembangan XP (planning, design, coding, testing) adalah konteks proses pengembangan, **bukan** fitur yang dioperasikan peserta atau panitia.

**Di dalam batas:** pemilihan event dan kategori lari, pendaftaran, pengumpulan data peserta dan bukti transfer, autentikasi panitia, pengelolaan kategori dan kuota, data peserta, verifikasi, pencarian/penyaringan, status pendaftaran peserta. **Di luar batas:** pengelolaan keuangan/akuntansi organisasi, analisis bisnis, aplikasi native Android/iOS, logistik, SMS, dan integrasi pihak ketiga baru termasuk payment gateway. P dan L sama-sama menyebut pengecualian payment gateway dengan klausa “kecuali yang telah tersedia dan menjadi kebutuhan utama”; agent perlu menyebut klausa itu tanpa menjadikan gateway sebagai alur inti SKPL terbatas ini. Jangan menambahkan olahraga selain lari, turnamen basket, voting, kartu identitas, pemindaian QR, grup checkout, refund, atau modul lain hanya karena ada di repositori.

## 3. Aktor, hak akses, dan asumsi

| Aktor | Tujuan | Akses minimum dalam SKPL |
|---|---|---|
| Peserta | Memilih event/kategori, mengisi data, mengunggah bukti transfer, melihat status | Form pendaftaran dan informasi status miliknya; mekanisme akses/status tanpa login harus dijelaskan berdasarkan hasil konfirmasi/implementasi, bukan diasumsikan dari sumber |
| Panitia/administrator | Menyiapkan kategori, melihat dan memperbarui data, mencari/memfilter, memverifikasi pendaftaran | Area administrasi setelah autentikasi; hanya pengguna berwenang dapat mengubah data dan keputusan verifikasi |

**A-01 (T):** dokumen tidak menetapkan apakah peserta wajib membuat akun, format identitas pencarian status, atau jumlah akun admin. Jangan mengarang peran tambahan atau model izin yang rumit. **A-02 (T):** event dan kategori harus tersedia sebelum pendaftaran, tetapi batas kemampuan membuat/mengubah event induk belum dijabarkan; spesifikasikan hanya atribut event yang diperlukan untuk memilih event/kategori. **A-03 (T):** status dan kuota perlu nilai awal, tetapi angka kuota dan batas waktu pendaftaran per event ditetapkan panitia, bukan oleh dokumen akademik.

**Matriks akses minimum (T, turunan dari dua aktor dan KF-12; verifikasi sebelum dijadikan kebijakan final):**

| Aktivitas | Peserta | Panitia | Catatan |
|---|---|---|---|
| Melihat event/kategori yang dibuka untuk pendaftaran | Ya | Ya | Kategori yang ditutup tidak boleh ditawarkan sebagai pilihan aktif |
| Mengirim data dan bukti pendaftarannya sendiri | Ya | Tidak perlu hak khusus | “Sendiri” harus didefinisikan tanpa menganggap semua peserta punya akun |
| Melihat status pendaftarannya sendiri | Ya | Ya | Cara membatasi akses peserta ke status miliknya adalah D-06 |
| Melihat/memperbarui seluruh data peserta | Tidak | Ya | Atribut yang boleh diubah masih D-05 |
| Mengelola kategori/kuota dan memutuskan verifikasi | Tidak | Ya | Keputusan panitia harus tercermin pada status peserta |

Untuk setiap layar dan operasi tulis prasyarat akses, data yang terlihat, serta respons bila orang tanpa hak mencoba membuka tautan langsung. Jangan menyimpulkan bahwa tautan status yang sulit ditebak saja sudah cukup aman tanpa memeriksa mekanisme sebenarnya.

## 4. Daftar kebutuhan fungsional yang dapat ditelusuri

Gunakan ID tetap berikut dalam SKPL, use case, diagram, dan pengujian. “Harus” pada butir E berarti kemampuan yang disebut sumber. Rincian validasi atau format di bawahnya yang tidak disebut langsung tetap bertanda T.

### 4.1 Registrasi peserta

**KF-01 — Menampilkan pilihan event dan kategori lari (E).** Peserta dapat melihat event lari yang menerima pendaftaran dan memilih kategori/jenis atau jarak lomba. Tampilkan identitas event, nama kategori, informasi yang dibutuhkan untuk membuat pilihan, serta ketersediaan bila kuota dipakai. Rujukan: P Lingkup Pekerjaan “registrasi peserta” dan “pengelolaan kategori”; L BAB IV Output butir 1 dan 3. **T:** aturan event terbuka/tertutup, apakah peserta boleh berpindah kategori setelah mengisi form, dan urutan pemilihan perlu dikonfirmasi.

**KF-02 — Mengisi dan mengirim formulir (E).** Peserta mengisi data pendaftaran secara daring untuk event dan kategori terpilih; sistem memvalidasi input, menyimpan pendaftaran, dan memberikan hasil pengiriman yang jelas. Rujukan: P Lingkup Pekerjaan; L BAB IV Output butir 1 dan Proses butir 3–4. Minimal entitas yang harus terhubung: peserta, event, kategori, pendaftaran. **T:** daftar kolom identitas persisnya belum ditetapkan dalam sumber. Nama peserta diperlukan secara logis untuk pencarian menurut nama; nomor pendaftaran diperlukan untuk pencarian menurut nomor. Kontak, tanggal lahir, jenis kelamin, ukuran jersey, foto, identitas, dan persetujuan hanya boleh dimasukkan sebagai data wajib bila diverifikasi dari formulir event yang menjadi objek KP atau disetujui panitia. Kesalahan ukuran jersey pada latar belakang adalah alasan kebutuhan, bukan bukti semua event mewajibkan kolom tersebut.

**KF-03 — Menerima bukti transfer (E).** Untuk alur pembayaran manual yang dijelaskan L BAB IV Proses butir 3 dan Output butir 1, peserta dapat mengunggah bukti pembayaran yang dikaitkan dengan pendaftarannya. Sistem menampilkan apakah bukti sudah diterima dan belum/ sudah diverifikasi. **T:** tipe berkas, ukuran maksimum, apakah bukti dapat diganti, waktu unggah, informasi rekening tujuan, dan apakah semua kategori berbayar perlu dibuktikan harus dikonfirmasi. “Nama Rekening yang Melakukan Pembayaran” adalah detail fitur aplikasi yang ditambahkan kemudian, **tidak dinyatakan eksplisit oleh P/L**, sehingga boleh dicatat sebagai detail implementasi yang diverifikasi tetapi jangan dinyatakan sebagai kebutuhan sumber.

**KF-04 — Menghindari data pendaftaran yang tidak konsisten (T dari masalah).** Validasi mencegah field wajib kosong, pilihan kategori tidak sah, penyimpanan pendaftaran melebihi kuota, dan duplikasi yang didefinisikan panitia. Sumber menyebut kesalahan dan duplikasi data sebagai masalah, tetapi tidak memberi kunci unik atau kebijakan penanganannya. Cantumkan aturan duplikasi sebagai keputusan terbuka, bukan klaim fungsi yang sudah pasti tersedia.

### 4.2 Administrasi event, kategori, dan peserta

**KF-05 — Mengelola informasi kategori lari dan kuota (E).** Panitia dapat mencatat/memperbarui kategori atau jarak lomba pada event dan kuotanya sehingga pilihan peserta sesuai konfigurasi. Sumber: P Lingkup Pekerjaan butir “pengelolaan kategori atau jenis event”; L BAB IV Output butir 3. **T:** perilaku menghapus kategori yang sudah memiliki pendaftar, perubahan kuota setelah pendaftaran, harga, dan jadwal buka/tutup perlu dikonfirmasi. Jangan mendefinisikan manajemen seluruh penyelenggaraan event atau jarak secara mendalam bila tidak diperlukan untuk pendaftaran.

**KF-06 — Melihat daftar dan rincian peserta terpusat (E).** Panitia melihat data pendaftar yang terhubung ke event, kategori, data pendaftaran, status, dan bukti bila ada. Sumber: P Rumusan Masalah nomor 2 dan Lingkup Pekerjaan; L BAB IV Output butir 2. **T:** pagination, urutan, kolom tabel, dan unduhan berkas bukan syarat eksplisit; jelaskan sebagai keputusan rancangan bila dipakai.

**KF-07 — Memperbarui data peserta/pendaftaran (E tingkat tujuan, T tingkat aturan).** Proposal dan L BAB I Rumusan Masalah menyebut panitia “memperbarui” data peserta; SKPL harus menentukan atribut mana dapat diedit, oleh siapa, kapan, dan bagaimana perubahan tidak merusak hasil verifikasi atau kuota. Jangan otomatis memasukkan penghapusan permanen atau perubahan pembayaran; keduanya tidak ditetapkan sumber.

**KF-08 — Mencari data pendaftar (E).** L BAB IV Output butir 5 menyebut pencarian berdasarkan **nama** dan **nomor pendaftaran**. P Lingkup Pekerjaan menyebut pencarian secara umum. Hasil yang ditemukan harus mengarah ke pendaftaran yang sesuai. **T:** pencarian parsial, tidak peka huruf besar/kecil, dan penanganan nomor tidak ditemukan perlu diputuskan.

**KF-09 — Menyaring data pendaftar (E).** L BAB IV Output butir 5 menyebut penyaringan berdasarkan **event** atau **status verifikasi**; P Lingkup Pekerjaan juga menyebut penyaringan. Jika antarmuka sudah berada pada satu event/kategori, jelaskan event tersebut sebagai filter konteks. Jangan mengklaim pencarian lintas semua event bila implementasi hanya per kategori; tulis gap yang perlu diselesaikan.

**KF-10 — Memverifikasi pendaftaran/bukti transfer (E).** Panitia dapat melihat data dan bukti transfer, lalu mengambil keputusan menerima atau menolak verifikasi; status pendaftaran diperbarui sesuai keputusan. Sumber: P Batasan Masalah/Lingkup Pekerjaan; L BAB IV Output butir 4. **T:** apakah penolakan dapat diperbaiki/diunggah ulang, alasan penolakan, audit keputusan, serta batas waktu verifikasi belum ditetapkan. Dalam alur SKPL yang mengikuti L, verifikasi dilakukan panitia, bukan diputuskan oleh bukti unggah semata.

**KF-11 — Melihat status pendaftaran sebagai peserta (E).** Peserta dapat mengetahui apakah pendaftarannya masih menunggu bukti, menunggu verifikasi, diterima, atau ditolak; label final harus selaras dengan alur nyata. Sumber: P Lingkup Pekerjaan; L BAB IV Output butir 6. **T:** metode akses status, apakah peserta menerima pemberitahuan, dan kapan status diperbarui di layar belum ditetapkan. Jangan menambahkan email/SMS otomatis sebagai kebutuhan pokok hanya karena mungkin ada pada aplikasi.

**KF-12 — Autentikasi dan otorisasi panitia (E).** Panitia harus masuk sebelum melihat atau mengubah area administrasi; peserta tidak boleh mengakses pengelolaan peserta/verifikasi. Sumber: P Batasan Masalah tentang autentikasi/otorisasi dan dua aktor; L BAB IV Proses butir 3–4 tentang modul autentikasi dan perlindungan hak akses. **T:** kebijakan kata sandi, reset akun, dan subperan admin tidak dirinci.

### 4.3 Aturan bisnis lintas fungsi

**RB-01:** satu pendaftaran merujuk pada satu event dan satu kategori lari yang termasuk event tersebut. **RB-02:** kuota kategori membatasi penerimaan pendaftaran; definisi kursi “terpakai” selama menunggu verifikasi dan setelah penolakan harus ditentukan. **RB-03:** unggahan bukti adalah data pendukung verifikasi dan tidak dengan sendirinya berarti pendaftaran diterima. **RB-04:** perubahan keputusan admin harus konsisten dengan status yang dilihat peserta dan daftar admin. **RB-05:** nomor pendaftaran harus dapat dipakai sebagai identitas pencarian bila KF-08 diambil secara literal. RB-01 s.d. RB-05 adalah perumusan operasional (T) dari fungsi eksplisit; rincian teknisnya perlu dipastikan.

## 5. Alur kerja yang perlu dijelaskan dalam SKPL

1. **Alur peserta:** membuka pendaftaran web → memilih event lari → memilih kategori/jarak yang tersedia → mengisi data dan validasi → mengirim → memperoleh identitas/rujukan pendaftaran → pada kategori yang relevan melihat instruksi transfer dan mengunggah bukti → melihat status.
2. **Alur panitia:** autentikasi → menyiapkan/memperbarui kategori dan kuota → melihat daftar peserta menurut event/kategori → mencari/menyaring → membuka detail dan bukti → memverifikasi atau menolak → peserta melihat status yang diperbarui.
3. **Alur pengecualian:** data kosong/tidak sah; kategori penuh/tertutup; berkas tidak valid; pengiriman berulang; bukti belum ada; dua admin menilai pendaftaran yang sama; edit peserta setelah terverifikasi. Hanya hasil bisnis yang perlu dirinci; jangan mengarang solusi teknis tanpa bukti.

**Model status konseptual (T, perlu disesuaikan dengan aplikasi):** `Dibuat / Menunggu bukti` → `Menunggu verifikasi` → `Diterima` atau `Ditolak`. Bila pendaftaran gratis atau ada pembayaran lain, tulis percabangan terpisah hanya setelah sumber/implementasi diverifikasi. Untuk setiap transisi, SKPL harus menyatakan aktor pemicu, syarat, perubahan data/kuota, dan pesan yang terlihat peserta. Nama status konseptual tidak harus sama dengan nilai database.

**Tabel transisi yang perlu dilengkapi agent (T):**

| Dari | Pemicu/aktor | Syarat yang perlu dipastikan | Ke | Hal yang harus diperiksa |
|---|---|---|---|---|
| Belum mendaftar | Peserta mengirim formulir | Form valid; kategori tersedia | Menunggu bukti atau tahap awal lain | Ada satu pendaftaran yang terhubung ke event/kategori benar; nomor/rujukan dapat ditelusuri |
| Menunggu bukti | Peserta mengirim bukti | Bukti lolos validasi; pendaftaran miliknya | Menunggu verifikasi | Bukti tersimpan pada pendaftaran yang tepat; unggah tidak otomatis mengesahkan |
| Menunggu verifikasi | Panitia menyetujui | Panitia berwenang; bukti tersedia | Diterima | Status di admin dan peserta sama; kuota konsisten |
| Menunggu verifikasi | Panitia menolak | Panitia berwenang; aturan alasan/ulang unggah disepakati | Ditolak | Status di admin dan peserta sama; kuota konsisten |
| Status akhir | Pengiriman ulang/keputusan kedua | Aturan koreksi belum ditentukan | TBD | Tidak terjadi keputusan ganda yang saling bertentangan |

Jangan menyatakan kuota selalu dilepas setelah penolakan atau status pasti dapat dibuka kembali: kedua aturan itu masih D-04/D-05. Untuk kategori gratis, jika ada, dokumentasikan kondisi masuk langsung ke status yang sesuai sebagai cabang terpisah setelah D-03 diputuskan.

## 6. Data, masukan, dan keluaran yang harus dimodelkan

| Entitas konseptual | Atribut minimum yang didukung kebutuhan | Catatan |
|---|---|---|
| Event lari | identitas, nama, informasi yang diperlukan untuk memilih event | Atribut jadwal/lokasi bersifat T kecuali ditemukan dalam formulir objek KP |
| Kategori lari | identitas, event induk, nama/jenis/jarak, kuota | Harga dapat dicatat bila alur transfer memang berbayar; aturan harga tidak diberikan P/L |
| Peserta | identitas dan nama; kontak hanya bila dibuktikan pada objek KP | Jangan menetapkan seluruh kolom dari aplikasi yang lebih luas |
| Pendaftaran | identitas/nomor, peserta, event, kategori, tanggal, status | Nomor dibutuhkan oleh klaim pencarian di L |
| Bukti pembayaran manual | pendaftaran terkait, referensi berkas, status/hasil pemeriksaan | Nama pemilik rekening boleh menjadi detail I jika ditemukan di aplikasi, bukan E dari P/L |
| Akun panitia | identitas login dan hak akses | Tidak perlu menguraikan pengelolaan akun umum di luar lingkup |

Masukan: konfigurasi kategori/kuota oleh panitia; pilihan event/kategori dan data form oleh peserta; bukti transfer; kriteria pencarian/filter; keputusan verifikasi. Keluaran: daftar kategori tersedia, hasil registrasi/nomor, daftar dan detail pendaftar, hasil pencarian/filter, status peserta, hasil verifikasi. Untuk setiap atribut, agent penulis perlu mengisi sumber, tipe/format, wajib/opsional, validasi, pemilik data, dan batas retensi **jika diketahui**; tulis TBD bila tidak diketahui. Buat ERD konseptual saja dahulu, kemudian bedakan dari skema fisik bila implementasi dianalisis.

**Kamus data awal (bukan skema tabel yang sudah dipastikan):**

| Data | Asal kebutuhan | Ketentuan yang aman ditulis sekarang | Yang masih TBD |
|---|---|---|---|
| Nama peserta | P Rumusan Masalah 2; L Output 5 | Dapat dipakai mencari pendaftaran menurut nama | Panjang, karakter, aturan nama tim vs individu |
| Nomor/rujukan pendaftaran | L Output 5 | Dapat mengidentifikasi hasil pendaftaran untuk pencarian | Format, cara penerbitan, keterlihatan kepada peserta, unik lintas event atau per event |
| Event dan kategori/jarak | P Lingkup Pekerjaan; L Output 1/3 | Kategori harus terkait event yang dipilih | Struktur jarak, jadwal dan syarat usia bila ada |
| Kuota kategori | L Output 3 | Panitia dapat melihat/mengubah kapasitas kategori | Angka, kuota tidak terbatas, penanganan kursi tertahan/ditolak |
| Data kontak dan ukuran jersey | P/L latar belakang tentang administrasi/racepack | Relevan sebagai kandidat atribut form | Kolom mana wajib, jenis data, daftar ukuran, apakah berlaku untuk semua event |
| Bukti transfer | L Proses/Output | Tertaut pada satu pendaftaran untuk dinilai panitia | Jenis/ukuran berkas, lokasi simpan, hak lihat, unggah ulang, retensi |
| Status dan keputusan verifikasi | P/L Lingkup Pekerjaan; L Output 4/6 | Konsisten pada layar panitia dan peserta | Daftar status final, alasan penolakan, riwayat keputusan |

**Kardinalitas konseptual (T):** satu event mempunyai banyak kategori; satu kategori mempunyai banyak pendaftaran; satu pendaftaran mengacu pada satu event dan satu kategori; satu pendaftaran mempunyai data peserta serta mungkin bukti transfer yang diperiksa. Apakah seorang peserta dapat mempunyai lebih dari satu pendaftaran, atau satu pendaftaran memuat beberapa peserta, **tidak** ditentukan P/L. Jangan memilih kardinalitas peserta–pendaftaran atau grup checkout hanya dari kemampuan aplikasi saat ini.

## 7. Kebutuhan nonfungsional yang didukung sumber

| ID | Kebutuhan | Dasar dan batas |
|---|---|---|
| KNF-01 | Berjalan melalui browser dengan koneksi internet | P dan L Batasan Masalah; jangan menentukan versi browser tanpa pengujian |
| KNF-02 | Memisahkan akses peserta dan panitia serta memvalidasi data masuk | P Batasan Masalah tentang autentikasi, otorisasi, validasi; L BAB IV Testing |
| KNF-03 | Data pendaftaran tersimpan terpusat, akurat, dan dapat ditemukan kembali | P/L latar belakang serta tujuan; butuh kriteria uji konkrit, bukan janji “tanpa kesalahan” |
| KNF-04 | Antarmuka pendaftaran mudah dipahami dan dapat diakses di browser | L BAB IV eksplorasi UI/UX; ukuran layar dan standar aksesibilitas khusus belum ditentukan |
| KNF-05 | Waktu respons/pembaruan status memadai untuk operasional panitia | P/L menyebut lebih cepat dan pemantauan; angka detik, beban simultan, dan SLA **tidak** disebut sehingga harus TBD, bukan diada-adakan |
| KNF-06 | Pengujian fungsi utama dan dokumentasi | P Metodologi; L BAB IV Testing; ini kebutuhan proses/penyerahan, bukan fitur produk |

Teknologi Laravel, React, Inertia.js, dan MySQL disebut L BAB III/BAB IV sebagai lingkungan implementasi; XP, Figma, draw.io, Git/GitHub adalah proses/perangkat kerja. Tempatkan di “lingkungan pengembangan/implementasi” jika SKPL akademik memerlukannya, bukan sebagai kebutuhan fungsional atau alasan menambah modul.

## 8. Struktur SKPL yang harus dibuat agent berikutnya

1. **Pendahuluan:** tujuan SKPL, definisi/akronim (SKPL, KP, XP, admin, peserta, event, kategori, bukti transfer, verifikasi), sumber P/L, konvensi ID dan status E/T/I.
2. **Deskripsi umum:** konteks sistem lama Google Form; tujuan, batas sistem, diagram konteks dua aktor, antarmuka peserta/panitia, asumsi dan ketergantungan.
3. **Kebutuhan spesifik:** KF-01–KF-12 dengan aktor, pemicu, prasyarat, input, alur normal, alur alternatif/gagal, keluaran, pascakondisi, aturan bisnis, otorisasi, dan keterlacakan ke P/L.
4. **Data:** kamus data, validasi, hubungan ERD konseptual, atribut yang TBD, status/transisi; pisahkan model konseptual dari tabel aplikasi nyata.
5. **Antarmuka:** daftar layar minimal (pemilihan event/kategori, form, unggah bukti, status peserta, login panitia, pengelolaan kategori/kuota, daftar/detail peserta, review bukti). Uraikan data serta aksi per layar; jangan memasukkan layar dari modul di luar lingkup.
6. **Nonfungsional dan batas:** KNF-01–KNF-06, pengecualian eksplisit, kebutuhan yang belum dapat diberi angka.
7. **Diagram:** use case (dua aktor), activity untuk registrasi dan verifikasi, diagram status, ERD; diagram deployment/arsitektur hanya bila diwajibkan kampus dan tetap dalam batas.
8. **Matriks keterlacakan dan uji penerimaan:** setiap KF ditautkan ke bagian P/L, skenario uji positif/negatif, dan bukti keluaran; tandai celah implementasi secara jujur.
9. **Pertanyaan terbuka/keputusan:** tabel pada §10, dengan penanggung jawab dan tanggal keputusan bila tersedia.

**Format tiap requirement:** `ID — Judul; kategori E/T/I; sumber; aktor; pernyataan “Sistem harus ...”; prasyarat; masukan; aturan/validasi; alur utama; pengecualian; keluaran/pascakondisi; kriteria penerimaan; status verifikasi`. Hindari kata yang tidak terukur seperti “cepat” tanpa angka yang disepakati.

## 9. Contoh kriteria penerimaan yang dapat diuji

| ID | Skenario inti | Hasil yang perlu dibuktikan |
|---|---|---|
| KF-01/05 | Panitia membuat kategori lari dengan kuota; peserta membuka event | Kategori berada pada event yang tepat dan dapat dipilih sesuai ketersediaan |
| KF-02 | Peserta mengirim form lengkap dan tidak lengkap | Yang valid tersimpan sekali dengan nomor/rujukan; yang tidak lengkap ditolak dengan pesan jelas |
| KF-03 | Peserta mengunggah bukti yang valid/tidak valid | Bukti valid tertaut ke pendaftaran; format/ukuran salah ditolak sesuai batas yang disepakati |
| KF-06/07 | Panitia melihat dan mengubah data yang diizinkan | Daftar/detail sesuai data; perubahan sah tersimpan dan konsisten dengan pendaftaran |
| KF-08/09 | Cari nama/nomor, saring event/status | Daftar sesuai kriteria, termasuk hasil kosong tanpa data dari event lain |
| KF-10/11 | Panitia menerima/menolak bukti; peserta membuka status | Keputusan tersimpan satu kali; status peserta dan daftar panitia sama; perubahan kuota sesuai aturan yang diputuskan |
| KF-12 | Peserta/anonim membuka area admin | Akses ditolak; panitia yang masuk dapat menjalankan fungsi sesuai wewenang |

**Kasus batas tambahan yang bernilai untuk uji (T):** kuota tepat satu slot tersisa dan dua peserta mendaftar hampir bersamaan; peserta mencoba kategori dari event lain; peserta mengirim bukti kedua kali; panitia memutuskan pendaftaran yang telah diputuskan admin lain; pencarian menghasilkan nol atau banyak peserta bernama sama; perubahan kuota lebih kecil dari jumlah pendaftar yang sudah ada; form ditolak namun input yang telah diisi tetap dapat diperbaiki. Untuk setiap kasus, tulis hasil yang diharapkan **setelah** keputusan D-03–D-08 tersedia. Jangan mengklaim kasus ini telah diuji hanya karena tercantum di SKPL.

Kriteria di atas adalah rancangan uji (T), bukan bukti bahwa aplikasi sudah lulus. Sesuaikan dengan aturan final dan hasil pengujian.

## 10. Keputusan yang perlu dipastikan sebelum SKPL diberi status final

| Kode | Pertanyaan | Mengapa penting |
|---|---|---|
| D-01 | Event lari mana yang menjadi objek KP dan kategori/jarak mana yang dicakup? | Menetapkan data dan contoh tanpa menyeret seluruh fitur aplikasi |
| D-02 | Kolom registrasi apa yang wajib untuk event itu (nama, kontak, tanggal lahir, jersey, dsb.)? | P/L tidak memberikan skema form lengkap |
| D-03 | Apakah semua kategori berbayar memakai unggah bukti manual, atau ada kategori gratis/pengecualian? | L menjelaskan unggah bukti; P/L membatasi gateway tetapi memberi pengecualian |
| D-04 | Kapan kuota berkurang dan kapan dilepas bila bukti ditolak/pendaftaran batal? | Menghindari spesifikasi yang kontradiktif saat pendaftar menunggu verifikasi |
| D-05 | Apa aturan duplikasi, pengubahan data setelah daftar, dan unggah ulang setelah penolakan? | Sumber hanya menyebut masalah dan kemampuan umum |
| D-06 | Bagaimana peserta mengakses statusnya tanpa membuka status peserta lain? | Metode identifikasi/otorisasi status tidak dijelaskan |
| D-07 | Apakah pencarian nomor dan filter event lintas kategori benar-benar tersedia pada hasil KP? | L mengklaim keduanya; perlu verifikasi terhadap implementasi nyata |
| D-08 | Apa arti status “terverifikasi”, “ditolak”, “menunggu” serta apakah alasan penolakan wajib? | Diperlukan untuk diagram status dan kriteria uji |
| D-09 | Bagian mana dari manajemen event induk yang termasuk pekerjaan KP? | Sumber menekankan kategori dan informasi event, bukan seluruh administrasi event |
| D-10 | Nilai target kinerja, browser yang didukung, ukuran file, dan kebijakan retensi/akses bukti? | Sumber tidak memberi angka sehingga tidak boleh diciptakan |

**Urutan keputusan yang disarankan:** tetapkan D-01–D-03 terlebih dahulu agar subjek event, kolom form, dan alur bukti jelas; lanjutkan D-04–D-08 untuk aturan kuota, status, akses, dan pencarian; D-09–D-10 untuk memastikan batas implementasi serta angka nonfungsional. Jika jawaban belum tersedia saat menulis, buat bagian “asumsi yang belum disahkan” dan biarkan kriteria penerimaan terkait berstatus TBD.

**Catatan konsistensi:** L BAB IV Output menyebut pencarian berdasarkan nomor dan event, sementara pemeriksaan aplikasi pada percakapan ini sebelumnya menemukan pencarian nama serta filter status dalam konteks satu kategori. Ini harus dicatat sebagai *gap klaim vs implementasi yang perlu diverifikasi ulang*, bukan dihilangkan dari SKPL atau langsung dinyatakan selesai. L menyebut unggah bukti dan verifikasi admin; fitur bank transfer manual memang pernah ditambahkan ke aplikasi, namun SKPL tetap harus berangkat dari kebutuhan P/L dan tidak mengimpor seluruh alur pembayaran aplikasi. L BAB V dan Abstrak berisi contoh/template yang belum final; jangan gunakan sebagai sumber.

## 11. Instruksi siap serah kepada agent AI penulis SKPL

> Tulis SKPL berbahasa Indonesia untuk “Sistem Informasi Pendaftaran dan Pengelolaan Data Peserta Event Lari Sporta Indonesia” berdasarkan hanya Proposal Kerja Praktik (KP) 2025.docx, Laporan KP Tedrik-2.docx, dan bahan ruang lingkup ini. Pertahankan dua aktor: peserta dan panitia. Jabarkan KF-01–KF-12, KNF-01–KNF-06, alur utama/pengecualian, aturan bisnis, data, antarmuka, diagram yang relevan, serta matriks keterlacakan dan kriteria penerimaan. Bedakan kebutuhan eksplisit (E), rincian turunan (T), dan temuan implementasi (I); beri label TBD untuk data atau angka yang tidak didukung sumber. Utamakan alur bukti transfer manual dan verifikasi panitia sebagaimana Laporan; jangan menambah payment gateway, akuntansi, logistik, aplikasi mobile, atau fitur olahraga lain sebagai ruang lingkup. Jangan mengutip teks contoh PT. XYZ/SIM Rumah Sakit di Laporan. Sebelum menyatakan fitur “telah diimplementasikan”, cek aplikasi dan tulis gap secara jujur, terutama pencarian berdasarkan nomor/event. Jika ada perbedaan proposal dan laporan, tampilkan keduanya beserta keputusan yang perlu dikonfirmasi.
