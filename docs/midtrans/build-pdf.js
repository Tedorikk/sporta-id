const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'shots');

function img(name) {
    const file = path.join(SHOTS, name);
    return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
}

const SITE = 'https://sporta.web.id';

const steps = [
    {
        n: 1,
        title: 'Pengunjung membuka website',
        url: SITE + '/',
        shot: '01-landing.png',
        body: `Halaman utama langsung menampilkan bagian <b>“Events &amp; Registration Fees”</b> tepat di
        bawah hero. Bagian ini adalah daftar harga: setiap event yang sedang dibuka ditampilkan
        beserta seluruh kategori pendaftaran yang dijual dan harganya dalam Rupiah
        (contoh: <b>5K Individual Run — Rp 150.000</b>). Pengunjung sudah mengetahui produk dan
        harganya tanpa perlu login atau mengklik apa pun.`,
        notes: [
            'Setiap baris kategori dapat diklik dan langsung menuju formulir pendaftaran kategori tersebut.',
            'Kategori yang kuotanya penuh atau pendaftarannya ditutup tetap ditampilkan beserta harganya, dengan keterangan “Sold out” / “Closed”.',
            'Tombol “View &amp; Register” membuka halaman detail event.',
        ],
    },
    {
        n: 2,
        title: 'Pengunjung menelusuri katalog event',
        url: SITE + '/events',
        shot: '02-events.png',
        body: `Halaman katalog memuat seluruh event yang dipublikasikan, lengkap dengan pencarian,
        filter kategori, dan kalender. Setiap kartu event mencantumkan tanggal pelaksanaan dan
        rentang harga pendaftarannya.`,
        notes: [
            'Halaman ini dapat diakses publik tanpa login.',
            'Klik pada kartu event menuju halaman detail event (Langkah 3).',
        ],
    },
    {
        n: 3,
        title: 'Pengunjung memilih produk pada halaman detail event',
        url: SITE + '/events/3',
        shot: '03-event-detail.png',
        body: `Halaman detail event berfungsi sebagai halaman produk. Di sini ditampilkan
        deskripsi lengkap layanan (apa yang diperoleh peserta — misalnya race pack, nomor BIB,
        dan medali finisher), tanggal, kontak penyelenggara, serta seluruh
        <b>kategori pendaftaran beserta harga, satuan penjualan, dan sisa kuota</b>.`,
        notes: [
            'Harga ditampilkan besar dan jelas: Rp 150.000.',
            'Keterangan satuan: “Per person” atau “Per team”.',
            'Sisa kuota ditampilkan real-time (contoh: “199 slots left”).',
            'Di bawah daftar terdapat keterangan bahwa pembayaran diproses melalui Midtrans, beserta tautan ke Syarat &amp; Ketentuan dan Kebijakan Pengembalian Dana.',
        ],
    },
    {
        n: 4,
        title: 'Pengunjung mengisi formulir pendaftaran (keranjang / checkout)',
        url: SITE + '/events/3/registration-categories/3/register',
        shot: '04-form.png',
        body: `Karena produk yang dijual adalah slot pendaftaran event — bukan barang fisik yang
        dapat dibeli beberapa sekaligus — <b>satu formulir pendaftaran setara dengan satu
        keranjang berisi satu item</b>. Di bagian paling atas formulir terdapat
        <b>ringkasan pesanan</b> yang menampilkan nama kategori, nama event, satuan penjualan,
        dan total yang harus dibayar.`,
        notes: [
            'Ringkasan pesanan berada pada layar yang sama dengan tombol kirim, sehingga peserta selalu melihat total sebelum melanjutkan.',
            'Terdapat keterangan: setelah formulir dikirim, peserta akan diarahkan ke halaman pembayaran Midtrans.',
            'Field formulir dapat dikonfigurasi penyelenggara per kategori (nama, ukuran kaos, kontak darurat, unggah dokumen, dan sebagainya).',
        ],
    },
    {
        n: 5,
        title: 'Pengunjung menekan Register — slot direservasi, transaksi dibuat',
        url: SITE + '/registrations/{id}/status',
        shot: '05-pending.png',
        body: `Saat formulir dikirim, sistem menyimpan pendaftaran dengan status
        <span class="code">pending_payment</span>, mengurangi kuota, lalu memanggil
        <b>Midtrans Snap API</b> untuk membuat transaksi dan memperoleh <span class="code">snap_token</span>.
        Peserta melihat halaman konfirmasi berisi nama, jumlah yang harus dibayar, dan tombol
        <b>“Pay Now”</b>.`,
        notes: [
            'Pendaftaran yang belum dibayar berlaku 24 jam. Setelah itu status berubah menjadi expired dan kuota dikembalikan secara otomatis.',
            'Halaman ini dapat dibuka kembali kapan saja melalui tautan “Check registration status”, dan tombol “Pay Now” dapat digunakan ulang jika popup tertutup atau token kedaluwarsa.',
        ],
    },
    {
        n: 6,
        title: 'Peserta diarahkan ke halaman pembayaran Midtrans',
        url: 'Midtrans Snap (popup)',
        shot: null,
        body: `Menekan <b>“Pay Now”</b> memuat <span class="code">snap.js</span> dan memanggil
        <span class="code">window.snap.pay(snap_token)</span>. Popup Snap milik Midtrans terbuka
        di atas halaman, menampilkan nama item, jumlah tagihan, dan seluruh metode pembayaran
        yang aktif pada akun merchant. Seluruh proses pembayaran berlangsung di dalam antarmuka
        Midtrans — <b>website Sporta tidak pernah menerima maupun menyimpan data kartu atau
        kredensial perbankan</b>.`,
        notes: [
            'Data yang dikirim ke Snap API: transaction_details (order_id, gross_amount), item_details (nama event dan kategori, harga, kuantitas), dan customer_details (nama, email, telepon).',
            'Format order_id: REG-{id pendaftaran}-{6 karakter acak}, unik untuk setiap percobaan pembayaran.',
        ],
    },
    {
        n: 7,
        title: 'Pembayaran selesai — pendaftaran dikonfirmasi',
        url: SITE + '/registrations/{id}/status',
        shot: '06-confirmed.png',
        body: `Setelah pembayaran diselesaikan, Midtrans mengirimkan notifikasi HTTP ke
        <span class="code">${SITE}/webhooks/midtrans</span>. Server memverifikasi
        <span class="code">signature_key</span>, memperbarui status pembayaran, lalu mengubah status
        pendaftaran menjadi <b>Confirmed</b>. Peserta melihat halaman konfirmasi dan memperoleh
        kartu identitas peserta beserta QR code untuk registrasi ulang di lokasi acara.`,
        notes: [
            'Status pendaftaran hanya diubah oleh notifikasi terverifikasi dari Midtrans — callback di sisi browser hanya digunakan untuk mengarahkan tampilan.',
            'Tersedia perintah rekonsiliasi manual yang menarik status transaksi langsung dari Midtrans apabila ada notifikasi yang terlewat.',
        ],
    },
];

const statusRows = [
    ['capture / settlement (fraud_status ≠ deny)', 'settlement', 'Confirmed — pendaftaran aktif, kartu peserta terbit'],
    ['pending', 'pending', 'Pending Payment — slot tetap direservasi'],
    ['expire', 'expire', 'Expired — kuota dikembalikan'],
    ['cancel', 'cancel', 'Rejected — kuota dikembalikan'],
    ['deny / fraud_status = deny', 'deny', 'Rejected — kuota dikembalikan'],
    ['lainnya', 'failure', 'Rejected — kuota dikembalikan'],
];

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Alur Transaksi — Sporta Indonesia</title>
<style>
    @page { size: A4; margin: 16mm 14mm 18mm 14mm; }

    * { box-sizing: border-box; }

    body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 10.5pt;
        line-height: 1.55;
        color: #1a1a1a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    h1, h2, h3 { margin: 0; line-height: 1.2; }

    a { color: #b91c1c; text-decoration: none; }

    .page-break { page-break-before: always; }

    /* ---- Cover ---------------------------------------------------------- */
    .cover {
        height: 250mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        page-break-after: always;
    }
    .cover-rule { height: 6px; width: 90px; background: #dc2626; margin-bottom: 26px; }
    .cover-eyebrow {
        font-size: 9pt; letter-spacing: 3px; text-transform: uppercase;
        color: #dc2626; font-weight: 700; margin-bottom: 10px;
    }
    .cover h1 { font-size: 30pt; font-weight: 800; letter-spacing: -0.5px; }
    .cover .sub { font-size: 13pt; color: #52525b; margin-top: 14px; max-width: 135mm; }
    .cover-meta {
        margin-top: 48px; border-top: 1px solid #d4d4d8; padding-top: 20px;
        display: grid; grid-template-columns: 40mm 1fr; row-gap: 7px; font-size: 10pt;
    }
    .cover-meta dt { color: #71717a; }
    .cover-meta dd { margin: 0; font-weight: 600; }

    /* ---- Sections ------------------------------------------------------- */
    .section-title {
        font-size: 15pt; font-weight: 800; margin: 0 0 4px;
        padding-bottom: 6px; border-bottom: 2px solid #18181b;
    }
    .section-lead { color: #52525b; margin: 8px 0 16px; }

    /* ---- Flow diagram --------------------------------------------------- */
    .flow { display: flex; flex-direction: column; gap: 0; margin: 14px 0 4px; }
    .flow-row { display: flex; align-items: stretch; gap: 8px; }
    .flow-box {
        flex: 1; border: 1.5px solid #18181b; border-radius: 8px;
        padding: 9px 11px; background: #fafafa;
    }
    .flow-box .idx {
        display: inline-block; background: #dc2626; color: #fff; font-weight: 700;
        font-size: 8pt; border-radius: 999px; padding: 1px 7px; margin-right: 7px;
    }
    .flow-box .t { font-weight: 700; font-size: 10pt; }
    .flow-box .d { font-size: 8.5pt; color: #52525b; margin-top: 3px; }
    .flow-box.pay { border-color: #dc2626; background: #fef2f2; }
    .flow-arrow { text-align: center; color: #a1a1aa; font-size: 12pt; line-height: 1; margin: 3px 0; }

    /* ---- Steps ---------------------------------------------------------- */
    .step { page-break-before: always; }
    .step-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
    .step-num {
        background: #dc2626; color: #fff; font-weight: 800; font-size: 11pt;
        border-radius: 6px; padding: 2px 11px; flex-shrink: 0;
    }
    .step-title { font-size: 14pt; font-weight: 800; }
    .step-url {
        font-family: Consolas, "Courier New", monospace; font-size: 8.5pt;
        color: #3f3f46; background: #f4f4f5; border: 1px solid #e4e4e7;
        border-radius: 4px; padding: 3px 8px; display: inline-block; margin: 6px 0 10px;
    }
    .step p { margin: 0 0 10px; }
    .notes { margin: 0 0 12px; padding-left: 18px; }
    .notes li { margin-bottom: 4px; font-size: 9.5pt; color: #3f3f46; }
    .shot {
        border: 1px solid #d4d4d8; border-radius: 6px; overflow: hidden;
        background: #fff; margin-top: 4px;
    }
    .shot img { display: block; width: 100%; }
    .caption { font-size: 8.5pt; color: #71717a; margin-top: 5px; font-style: italic; }

    .code {
        font-family: Consolas, "Courier New", monospace; font-size: 9pt;
        background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 3px; padding: 0 4px;
    }

    /* ---- Snap illustration ---------------------------------------------- */
    .snap {
        border: 1.5px dashed #a1a1aa; border-radius: 10px; padding: 16px 18px;
        background: #fafafa; margin-top: 6px;
    }
    .snap-head { font-weight: 700; margin-bottom: 3px; }
    .snap-amount { font-size: 17pt; font-weight: 800; margin: 6px 0 12px; }
    .methods { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
    .method {
        border: 1px solid #d4d4d8; border-radius: 6px; padding: 7px 10px;
        background: #fff; font-size: 9pt;
    }
    .method b { display: block; font-size: 9.5pt; }
    .method span { color: #71717a; font-size: 8.5pt; }

    /* ---- Tables --------------------------------------------------------- */
    table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 9.5pt; }
    th, td { border: 1px solid #d4d4d8; padding: 6px 9px; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; font-weight: 700; }
    td.mono, th.mono { font-family: Consolas, "Courier New", monospace; font-size: 8.5pt; }

    .kv { display: grid; grid-template-columns: 46mm 1fr; row-gap: 6px; font-size: 10pt; margin: 10px 0 16px; }
    .kv dt { color: #71717a; }
    .kv dd { margin: 0; font-weight: 600; }

    .callout {
        border-left: 4px solid #dc2626; background: #fef2f2;
        padding: 10px 14px; margin: 12px 0; font-size: 9.5pt;
    }
</style>
</head>
<body>

<!-- ============================ COVER ============================ -->
<div class="cover">
    <div class="cover-rule"></div>
    <div class="cover-eyebrow">Dokumen Pendukung Pengajuan Akun Produksi</div>
    <h1>Alur Transaksi<br>Pembayaran Online</h1>
    <div class="sub">
        Dokumen ini menjelaskan alur transaksi di website Sporta Indonesia, mulai dari pengunjung
        membuka website, memilih produk, melakukan checkout, hingga diarahkan ke halaman
        pembayaran Midtrans dan menerima konfirmasi.
    </div>

    <dl class="cover-meta">
        <dt>Merchant</dt><dd>Sporta Indonesia</dd>
        <dt>Website</dt><dd>${SITE}</dd>
        <dt>Bidang usaha</dt><dd>Penyelenggara event olahraga &amp; seni</dd>
        <dt>Produk yang dijual</dt><dd>Slot pendaftaran peserta event</dd>
        <dt>Payment gateway</dt><dd>Midtrans Snap</dd>
        <dt>Mata uang</dt><dd>IDR (Rupiah)</dd>
        <dt>Alamat</dt><dd>Jl. Pak Kasih, Gg. Merak II, Kel. Mariana,<br>Kec. Pontianak Kota, Kota Pontianak,<br>Kalimantan Barat, Indonesia</dd>
        <dt>Email</dt><dd>sportakalbar@gmail.com</dd>
        <dt>Telepon</dt><dd>+62 811-5639-555</dd>
        <dt>Tanggal dokumen</dt><dd>3 September 2026</dd>
    </dl>
</div>

<!-- ============================ 1. RINGKASAN ============================ -->
<h2 class="section-title">1. Ringkasan Model Bisnis</h2>
<p class="section-lead">Apa yang dijual, kepada siapa, dan bagaimana pembayarannya diterima.</p>

<p>
    Sporta Indonesia adalah penyelenggara event olahraga dan seni yang berbasis di Pontianak,
    Kalimantan Barat, aktif sejak 2011 sebagai komunitas dan berbadan usaha sejak 2019.
    Melalui website ${SITE}, kami menjual <b>slot pendaftaran peserta</b> untuk event yang kami
    selenggarakan.
</p>

<dl class="kv">
    <dt>Jenis produk</dt><dd>Jasa — slot pendaftaran peserta event</dd>
    <dt>Satuan penjualan</dt><dd>Per orang (individual) atau per tim, sesuai kategori</dd>
    <dt>Contoh produk</dt><dd>Sporta Fun Run 2027 — 5K Individual Run, Rp 150.000 / orang</dd>
    <dt>Yang diterima peserta</dt><dd>Hak ikut serta pada tanggal acara, race pack, nomor BIB, medali finisher, serta kartu identitas peserta ber-QR code</dd>
    <dt>Harga</dt><dd>Ditetapkan per kategori, ditampilkan penuh dalam Rupiah; tidak ada biaya tambahan saat checkout</dd>
    <dt>Cakupan pembeli</dt><dd>Publik umum, tanpa perlu membuat akun</dd>
</dl>

<div class="callout">
    <b>Catatan.</b> Karena produk yang dijual berupa slot pendaftaran event, satu transaksi
    selalu berisi tepat satu item. Website karena itu tidak menggunakan keranjang belanja
    multi-item; fungsi keranjang digantikan oleh <b>formulir pendaftaran yang menampilkan
    ringkasan pesanan dan total pembayaran</b> sebelum peserta menekan tombol kirim
    (lihat Langkah 4).
</div>

<h2 class="section-title" style="margin-top:22px">2. Diagram Alur Transaksi</h2>
<p class="section-lead">Ringkasan tujuh langkah dari kunjungan pertama hingga pendaftaran terkonfirmasi.</p>

<div class="flow">
    ${[
        ['1', 'Membuka website', 'Landing page menampilkan daftar event beserta harga tiap kategori pendaftaran.'],
        ['2', 'Menelusuri katalog event', 'Halaman /events memuat seluruh event dengan pencarian, filter, dan rentang harga.'],
        ['3', 'Memilih produk', 'Halaman detail event menampilkan deskripsi layanan, kategori, harga, dan sisa kuota.'],
        ['4', 'Checkout — mengisi formulir', 'Ringkasan pesanan (kategori, event, satuan, total harga) tampil di atas formulir.'],
        ['5', 'Transaksi dibuat', 'Slot direservasi, status pending_payment, sistem meminta snap_token ke Midtrans Snap API.'],
    ]
        .map(
            ([i, t, d]) => `<div class="flow-row"><div class="flow-box"><div><span class="idx">${i}</span><span class="t">${t}</span></div><div class="d">${d}</div></div></div><div class="flow-arrow">&#9660;</div>`,
        )
        .join('')}
    <div class="flow-row">
        <div class="flow-box pay">
            <div><span class="idx">6</span><span class="t">Halaman pembayaran Midtrans</span></div>
            <div class="d">Popup Snap terbuka: peserta memilih metode (VA / e-wallet / QRIS / kartu) dan menyelesaikan pembayaran di antarmuka Midtrans.</div>
        </div>
    </div>
    <div class="flow-arrow">&#9660;</div>
    <div class="flow-row">
        <div class="flow-box">
            <div><span class="idx">7</span><span class="t">Konfirmasi</span></div>
            <div class="d">Midtrans mengirim notifikasi ke webhook; signature diverifikasi; status menjadi Confirmed dan kartu peserta terbit.</div>
        </div>
    </div>
</div>

<!-- ============================ STEPS ============================ -->
${steps
    .map(
        (s) => `
<div class="step">
    <div class="step-head">
        <span class="step-num">${s.n}</span>
        <span class="step-title">${s.title}</span>
    </div>
    <div class="step-url">${s.url}</div>
    <p>${s.body}</p>
    <ul class="notes">${s.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    ${
        s.shot
            ? `<div class="shot"><img src="${img(s.shot)}" alt=""></div>
               <div class="caption">Tangkapan layar — ${s.title.toLowerCase()}.</div>`
            : `<div class="snap">
                 <div class="snap-head">Midtrans Snap — tampilan popup pembayaran</div>
                 <div style="font-size:9pt;color:#52525b">Sporta Fun Run 2027 — 5K Individual Run</div>
                 <div class="snap-amount">Rp 150.000</div>
                 <div class="methods">
                   <div class="method"><b>Virtual Account / Transfer Bank</b><span>BCA, BNI, BRI, Mandiri, Permata, dll.</span></div>
                   <div class="method"><b>QRIS</b><span>Dapat dipindai dari seluruh aplikasi pendukung QRIS</span></div>
                   <div class="method"><b>E-Wallet</b><span>GoPay, ShopeePay, dan lainnya</span></div>
                   <div class="method"><b>Kartu Kredit / Debit</b><span>Visa, Mastercard, JCB</span></div>
                 </div>
               </div>
               <div class="caption">Ilustrasi. Tampilan dan daftar metode pembayaran sepenuhnya dikendalikan oleh Midtrans Snap sesuai konfigurasi akun merchant.</div>`
    }
</div>`,
    )
    .join('')}

<!-- ============================ TEKNIS ============================ -->
<div class="page-break"></div>
<h2 class="section-title">3. Detail Teknis Integrasi Midtrans</h2>
<p class="section-lead">Endpoint, format data, dan penanganan notifikasi.</p>

<h3 style="font-size:11pt;margin-top:14px">3.1 Pembuatan transaksi (Snap)</h3>
<table>
    <tr><th style="width:38mm">Endpoint</th><td class="mono">POST https://app.midtrans.com/snap/v1/transactions</td></tr>
    <tr><th>Autentikasi</th><td>HTTP Basic Auth menggunakan Server Key merchant</td></tr>
    <tr><th>transaction_details</th><td class="mono">order_id, gross_amount</td></tr>
    <tr><th>Format order_id</th><td class="mono">REG-{id_pendaftaran}-{6 karakter acak}</td></tr>
    <tr><th>item_details</th><td class="mono">id, name (nama event — nama kategori), price, quantity: 1</td></tr>
    <tr><th>customer_details</th><td class="mono">first_name, email, phone</td></tr>
    <tr><th>Hasil</th><td class="mono">token &rarr; disimpan sebagai snap_token pada record pembayaran</td></tr>
</table>

<h3 style="font-size:11pt;margin-top:6px">3.2 Notifikasi pembayaran (webhook)</h3>
<table>
    <tr><th style="width:38mm">Notification URL</th><td class="mono">${SITE}/webhooks/midtrans</td></tr>
    <tr><th>Metode</th><td class="mono">POST (server-to-server, tanpa sesi/CSRF)</td></tr>
    <tr><th>Verifikasi</th><td class="mono">sha512(order_id + status_code + gross_amount + server_key) dibandingkan dengan signature_key</td></tr>
    <tr><th>Jika tidak valid</th><td>Permintaan ditolak dengan HTTP 403 dan tidak ada data yang diubah</td></tr>
    <tr><th>Idempoten</th><td>Notifikasi berulang untuk pendaftaran yang sudah final diabaikan, sehingga kuota tidak dilepas dua kali</td></tr>
</table>

<h3 style="font-size:11pt;margin-top:6px">3.3 Pemetaan status transaksi</h3>
<table>
    <tr><th style="width:58mm">transaction_status dari Midtrans</th><th style="width:28mm">Status pembayaran</th><th>Akibat pada pendaftaran</th></tr>
    ${statusRows.map(([a, b, c]) => `<tr><td class="mono">${a}</td><td class="mono">${b}</td><td>${c}</td></tr>`).join('')}
</table>

<div class="callout">
    Status pendaftaran <b>hanya</b> diubah oleh notifikasi Midtrans yang signature-nya
    terverifikasi, atau oleh proses rekonsiliasi yang menarik status langsung dari
    Transaction Status API Midtrans. Callback di sisi browser hanya dipakai untuk mengarahkan
    tampilan, tidak pernah untuk menentukan status pembayaran.
</div>

<h3 style="font-size:11pt;margin-top:6px">3.4 Masa berlaku &amp; pengembalian kuota</h3>
<p>
    Pendaftaran yang belum dibayar berlaku <b>24 jam</b> sejak dibuat. Sebuah tugas terjadwal
    berjalan setiap jam untuk menandai pendaftaran yang melewati batas waktu sebagai
    <span class="code">expired</span> dan mengembalikan kuotanya, sehingga slot tidak tertahan oleh
    transaksi yang tidak diselesaikan.
</p>

<!-- ============================ KEBIJAKAN ============================ -->
<div class="page-break"></div>
<h2 class="section-title">4. Halaman Kebijakan</h2>
<p class="section-lead">Seluruh halaman berikut dapat diakses publik dan tertaut pada footer di setiap halaman website.</p>

<table>
    <tr><th style="width:52mm">Halaman</th><th>URL</th></tr>
    <tr><td>Syarat &amp; Ketentuan</td><td class="mono">${SITE}/terms</td></tr>
    <tr><td>Kebijakan Pengembalian Dana &amp; Pembatalan</td><td class="mono">${SITE}/refund-policy</td></tr>
    <tr><td>Kebijakan Privasi</td><td class="mono">${SITE}/privacy</td></tr>
    <tr><td>Kontak</td><td class="mono">${SITE}/contact</td></tr>
    <tr><td>Tentang Kami</td><td class="mono">${SITE}/about</td></tr>
</table>

<div class="shot"><img src="${img('07-terms.png')}" alt=""></div>
<div class="caption">Halaman Syarat &amp; Ketentuan — memuat identitas merchant, produk yang dijual, cara mendaftar, dan ketentuan pembayaran.</div>

<div style="height:10px"></div>

<div class="shot"><img src="${img('08-refund.png')}" alt=""></div>
<div class="caption">Halaman Kebijakan Pengembalian Dana &amp; Pembatalan — memuat ketentuan refund, tenggat, dan cara pengajuannya.</div>

<h2 class="section-title" style="margin-top:24px">5. Kontak Merchant</h2>
<dl class="kv">
    <dt>Nama</dt><dd>Sporta Indonesia</dd>
    <dt>Alamat</dt><dd>Jl. Pak Kasih, Gg. Merak II, Kelurahan Mariana, Kecamatan Pontianak Kota, Kota Pontianak, Kalimantan Barat, Indonesia</dd>
    <dt>Email</dt><dd>sportakalbar@gmail.com</dd>
    <dt>Telepon / WhatsApp</dt><dd>+62 811-5639-555</dd>
    <dt>Website</dt><dd>${SITE}</dd>
    <dt>Instagram</dt><dd>@sportaindonesia</dd>
</dl>

</body>
</html>`;

const out = path.join(__dirname, 'alur-transaksi.html');
fs.writeFileSync(out, html, 'utf8');
console.log('written', out, Math.round(html.length / 1024) + 'KB');
