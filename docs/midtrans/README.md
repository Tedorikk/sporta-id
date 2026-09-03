# Midtrans — dokumen alur transaksi

`Alur-Transaksi-Sporta-Indonesia.pdf` adalah dokumen yang diminta Midtrans pada tahap review
("Lengkapi Flow Transaksi dalam format PDF"). Dokumen ini merujuk ke URL produksi
`https://sporta.web.id`, jadi **perubahan pada branch ini harus sudah ter-deploy sebelum
dokumen dikirim ulang** — kalau tidak, tangkapan layar di PDF tidak akan cocok dengan website.

## Regenerasi

Screenshot diambil dari server dev lokal, lalu di-render menjadi PDF dengan headless Chrome.

1. Jalankan aplikasi (`composer run dev`) dengan minimal satu event terpublikasi yang punya
   kategori pendaftaran berbayar.
2. Ambil ulang screenshot ke `screenshots/` (sesuaikan id event/kategori dan tinggi window):

   ```bash
   chrome --headless=new --disable-gpu --hide-scrollbars \
     --window-size=1280,1320 --virtual-time-budget=10000 \
     --screenshot=screenshots/01-landing.png http://localhost:8000/
   ```

3. Bangun ulang PDF:

   ```bash
   node build-pdf.js
   chrome --headless=new --disable-gpu --no-pdf-header-footer \
     --print-to-pdf=Alur-Transaksi-Sporta-Indonesia.pdf \
     --virtual-time-budget=20000 file:///<path>/alur-transaksi.html
   ```

`build-pdf.js` menuliskan `alur-transaksi.html` (screenshot di-inline sebagai data URI), yang
kemudian dicetak menjadi PDF. Isi teks dokumen — langkah, tabel status, detail teknis — semuanya
ada di dalam `build-pdf.js`.
