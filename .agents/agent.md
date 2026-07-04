# RANCANGAN SISTEM (SYSTEM DESIGN) — SPORTA ID
### Versi Laravel (Laravel 11.x / 12.x)

Dokumen ini adalah adaptasi dari rancangan sistem awal (Go + Gin + PostgreSQL) ke stack **Laravel terbaru**. Struktur fitur, alur bisnis, dan skema database tetap sama — yang berubah adalah arsitektur teknis, penamaan pola, dan cara implementasi mengikuti konvensi Laravel (Eloquent, Artisan, Service Container, dsb).

---

## 1. RINGKASAN SISTEM

Sporta ID adalah aplikasi manajemen turnamen basket yang digunakan oleh panitia untuk mengelola event, mulai dari tahap promosi (coming soon), pendaftaran tim, penjualan tiket penonton, pembuatan pool/grup, penjadwalan pertandingan, pencatatan statistik pertandingan, hingga pertandingan final.

Sistem dibangun dengan arsitektur **layered (Controller → Service → Repository/Eloquent Model)** menggunakan:

- **Laravel 11/12** (PHP 8.3+)
- **PostgreSQL** sebagai database utama
- **Laravel Sanctum** untuk autentikasi API berbasis token
- **Docker Compose** untuk containerisasi (app + PostgreSQL + Redis + queue worker)

> Catatan arsitektur: Laravel tidak mewajibkan pola Repository (Eloquent Model sudah berperan sebagai data-access layer), namun untuk menjaga konsistensi dengan rancangan awal dan memudahkan testing/mocking, layer Repository tetap dipertahankan sebagai *optional abstraction* di atas Eloquent.

---

## 2. AKTOR / PENGGUNA SISTEM

| Aktor | Deskripsi | Hak Akses Utama | Implementasi Laravel |
|---|---|---|---|
| **Admin/Panitia** | Pengelola penuh sistem & event | CRUD event, kelola pool, jadwal, verifikasi tim, kelola tiket, input statistik | Role `admin`, dicek via Laravel **Gate/Policy** & middleware `role:admin` |
| **Manajer Tim** | Perwakilan tim peserta | Mendaftarkan tim & pemain (event berikutnya), melihat jadwal & hasil pertandingan timnya | Role `team_manager` |
| **Penonton/Publik** | Pengguna umum/pembeli tiket | Melihat info event, membeli tiket, melihat jadwal, skor, dan statistik | Role `viewer` atau guest (tanpa login) |

> Catatan: Untuk event tahun ini, peran "Manajer Tim" bersifat pasif (data tim di-input manual oleh admin) karena pendaftaran sudah selesai di luar sistem. Fitur pendaftaran mandiri diaktifkan penuh mulai event berikutnya — cukup di-toggle lewat konfigurasi/feature flag (`config('features.self_registration')` atau package **Laravel Pennant**).

---

## 3. MODUL & FITUR DETAIL

### 3.1 Modul Event
- Kelola status event: `coming_soon` → `open_registration` → `ongoing` → `finished`, direpresentasikan sebagai PHP **Enum** (`App\Enums\EventStatus`)
- Simpan pamflet/banner via **Laravel Filesystem (Storage)**, disimpan di disk `public` atau `s3`
- Countdown tetap dihitung di frontend dari `start_date` (API hanya mengirim timestamp ISO 8601)
- Simpan detail lengkap: lokasi, tanggal, kategori, hadiah, contact person
- Toggle visibilitas informasi via kolom `is_detail_published` (boolean)

### 3.2 Modul Registrasi Tim
- Form registrasi tim divalidasi dengan **Form Request** (`StoreTeamRequest`): nama tim, manajer/kontak, logo, daftar pemain (nama, no. punggung, posisi)
- Status verifikasi tim: `pending` → `verified` / `rejected` (Enum `TeamStatus`)
- Validasi periode pendaftaran berdasarkan `registration_start` dan `registration_end` pada event — dilakukan lewat **custom Rule** (`RegistrationPeriodIsOpen`)
- **Diaktifkan mulai event berikutnya**; untuk event saat ini disediakan endpoint admin (`POST /api/admin/events/{event}/teams/bulk`) untuk input data tim secara langsung (bulk/manual) menggunakan **Laravel Excel** jika perlu impor dari file

### 3.3 Modul Tiket Penonton
- Admin membuat jenis tiket per event (nama tiket, harga, kuota)
- Penonton melakukan pemesanan tiket → status pembayaran (`unpaid`, `paid`, `expired`, `cancelled`)
- Setelah pembayaran berhasil, sistem menerbitkan kode tiket/QR (paket `simplesoftwareio/simple-qrcode`) sebagai bukti masuk
- Integrasi payment gateway (Midtrans/Xendit) via HTTP Client Laravel (`Http::` facade) + **Webhook Controller** khusus
- Tiket kadaluarsa otomatis di-set via **Laravel Scheduler** (`schedule:run` job `ExpireUnpaidOrders`)

### 3.4 Modul Pool / Grup Pertandingan
- Admin membuat pool secara dinamis (jumlah pool & jumlah tim per pool tidak dibatasi sistem)
- Assign tim ke pool via tabel pivot `pool_teams`
- Satu tim hanya boleh berada di satu pool per event — divalidasi di **Service class** (`PoolService::assignTeam()`), bukan di level DB constraint saja, agar bisa mengembalikan pesan error yang jelas ke API

### 3.5 Modul Penjadwalan Pertandingan
- Buat pertandingan (`match`) antar dua tim dalam satu pool atau babak (round: `pool`, `quarterfinal`, `semifinal`, `final`)
- Tentukan tanggal, jam, dan venue/lapangan pertandingan
- Deteksi bentrok jadwal (tim/venue yang sama pada waktu yang sama) sebagai validasi dasar — diimplementasikan sebagai custom validation rule `NoScheduleConflict`

### 3.6 Modul Pertandingan & Statistik
- Update skor live per pertandingan (skor tim A, skor tim B) — bisa dipush real-time via **Laravel Reverb / WebSockets** & **Broadcasting** (event `MatchScoreUpdated`)
- Input statistik per pemain per pertandingan: poin, rebound, assist, steal, block, foul, menit bermain
- Penentuan pemenang otomatis berdasarkan skor akhir saat status pertandingan diubah menjadi `finished` — dipicu oleh **Model Observer** (`MatchObserver::updating()`) atau **Event/Listener** (`MatchFinished` → `DetermineWinner`)
- Bracket/klasemen dihasilkan dari agregasi hasil pertandingan per pool via Eloquent aggregate query / **Laravel Query Builder**, di-cache dengan `Cache::remember()`

### 3.7 Modul Pembayaran
- Generik untuk transaksi tiket (dan dapat diperluas untuk biaya registrasi tim di event berikutnya)
- Menyimpan status transaksi, metode pembayaran, dan callback/webhook dari payment gateway
- Webhook diproses secara **asynchronous** lewat Laravel Queue (`ProcessPaymentWebhookJob`) agar respons ke gateway tetap cepat (< 5 detik)

---

## 4. ENTITY RELATIONSHIP DIAGRAM (ERD) — DESKRIPSI RELASI (Eloquent)

```
User            hasMany     Team              (manager_user_id)
Event           hasMany     Team
Event           hasMany     Pool
Pool            belongsToMany Team  (via pool_teams)
Event           hasMany     GameMatch
Pool            hasMany     GameMatch
Team            hasMany     GameMatch   (team_a_id, team_b_id — dua relasi terpisah)
GameMatch       hasMany     MatchStat   belongsTo Player
Team            hasMany     Player
Event           hasMany     Ticket
Ticket          hasMany     TicketOrder
TicketOrder     hasOne      Payment
User            hasMany     TicketOrder  (buyer, opsional / guest checkout)
```

> Catatan penamaan: tabel/model `Match` **tidak digunakan** karena `Match` adalah reserved word di PHP 8+ (match expression). Model diberi nama **`GameMatch`** dengan tabel tetap bernama `matches`.

---

## 5. RANCANGAN SKEMA DATABASE (MIGRATION LARAVEL)

Semua tabel dibuat lewat `php artisan make:migration`, menggunakan `id()` (BIGINT auto-increment) atau `uuid()` sesuai preferensi tim. Contoh di bawah memakai `id()` standar Laravel.

### `users`
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->enum('role', ['admin', 'team_manager', 'viewer'])->default('viewer');
    $table->rememberToken();
    $table->timestamps();
});
```

### `events`
```php
Schema::create('events', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->text('description')->nullable();
    $table->string('category')->nullable(); // Umum, Pelajar, dsb
    $table->string('location')->nullable();
    $table->string('banner_image')->nullable();
    $table->text('prize')->nullable();
    $table->string('contact_person')->nullable();
    $table->date('registration_start')->nullable();
    $table->date('registration_end')->nullable();
    $table->timestamp('start_date')->nullable();
    $table->timestamp('end_date')->nullable();
    $table->enum('status', ['coming_soon', 'open_registration', 'ongoing', 'finished'])
          ->default('coming_soon');
    $table->boolean('is_detail_published')->default(false);
    $table->timestamps();
});
```

### `teams`
```php
Schema::create('teams', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('logo')->nullable();
    $table->foreignId('manager_user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->string('contact_number')->nullable();
    $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
    $table->timestamp('registered_at')->nullable();
    $table->timestamps();
});
```

### `players`
```php
Schema::create('players', function (Blueprint $table) {
    $table->id();
    $table->foreignId('team_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->unsignedSmallInteger('jersey_number')->nullable();
    $table->string('position')->nullable();
    $table->string('photo')->nullable();
    $table->timestamps();
});
```

### `pools`
```php
Schema::create('pools', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_id')->constrained()->cascadeOnDelete();
    $table->string('name'); // mis. "Pool A"
    $table->timestamps();
});
```

### `pool_teams` (pivot)
```php
Schema::create('pool_teams', function (Blueprint $table) {
    $table->id();
    $table->foreignId('pool_id')->constrained()->cascadeOnDelete();
    $table->foreignId('team_id')->constrained()->cascadeOnDelete();
    $table->timestamps();
    $table->unique(['team_id'], 'unique_team_per_event_pool'); // catatan: perlu scoping tambahan per event di service layer
});
```

### `matches`
```php
Schema::create('matches', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_id')->constrained()->cascadeOnDelete();
    $table->foreignId('pool_id')->nullable()->constrained('pools')->nullOnDelete();
    $table->enum('round', ['pool', 'quarterfinal', 'semifinal', 'final'])->default('pool');
    $table->foreignId('team_a_id')->constrained('teams');
    $table->foreignId('team_b_id')->constrained('teams');
    $table->string('venue')->nullable();
    $table->timestamp('scheduled_at')->nullable();
    $table->enum('status', ['scheduled', 'ongoing', 'finished'])->default('scheduled');
    $table->unsignedInteger('score_a')->default(0);
    $table->unsignedInteger('score_b')->default(0);
    $table->foreignId('winner_team_id')->nullable()->constrained('teams')->nullOnDelete();
    $table->timestamps();
});
```

### `match_stats`
```php
Schema::create('match_stats', function (Blueprint $table) {
    $table->id();
    $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
    $table->foreignId('player_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('points')->default(0);
    $table->unsignedInteger('rebounds')->default(0);
    $table->unsignedInteger('assists')->default(0);
    $table->unsignedInteger('steals')->default(0);
    $table->unsignedInteger('blocks')->default(0);
    $table->unsignedInteger('fouls')->default(0);
    $table->unsignedInteger('minutes_played')->default(0);
    $table->timestamps();
});
```

### `tickets`
```php
Schema::create('tickets', function (Blueprint $table) {
    $table->id();
    $table->foreignId('event_id')->constrained()->cascadeOnDelete();
    $table->string('name'); // mis. "Tiket Reguler"
    $table->decimal('price', 12, 2);
    $table->unsignedInteger('quota');
    $table->unsignedInteger('sold_count')->default(0);
    $table->timestamps();
});
```

### `ticket_orders`
```php
Schema::create('ticket_orders', function (Blueprint $table) {
    $table->id();
    $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
    $table->foreignId('buyer_user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->string('buyer_name');
    $table->string('buyer_contact');
    $table->unsignedInteger('quantity');
    $table->decimal('total_price', 12, 2);
    $table->string('order_code')->unique(); // kode unik/QR
    $table->enum('payment_status', ['unpaid', 'paid', 'expired', 'cancelled'])->default('unpaid');
    $table->timestamp('purchased_at')->nullable();
    $table->timestamps();
});
```

### `payments`
```php
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('ticket_order_id')->constrained()->cascadeOnDelete();
    $table->decimal('amount', 12, 2);
    $table->string('method')->nullable();
    $table->string('status')->nullable();
    $table->timestamp('paid_at')->nullable();
    $table->timestamps();
});
```

---

## 6. ALUR BISNIS (BUSINESS FLOW) PER FITUR

**a. Coming Soon → Rilis Detail Event**
1. Admin membuat event dengan status `coming_soon` + banner + nama + tanggal tentatif (`EventController@store`)
2. Publik melihat pamflet & countdown di halaman utama (`GET /api/events` — hanya field publik yang di-expose lewat **API Resource** `EventResource`)
3. Saat tanggal resmi & detail siap, admin update event → status `open_registration`, isi lokasi, kategori, CP, hadiah, periode pendaftaran (`PUT /api/admin/events/{event}`)

**b. Registrasi Tim** *(berlaku penuh mulai event berikutnya)*
1. Manajer tim mengisi form registrasi selama periode `registration_start`–`registration_end` — divalidasi oleh Form Request + custom rule
2. Sistem menyimpan tim dengan status `pending`
3. Admin memverifikasi → status `verified`/`rejected` (`PUT /api/admin/teams/{team}/verify`), memicu event `TeamVerified` (mis. untuk kirim notifikasi email via `Mail::to()->send()`)

**c. Pembelian Tiket**
1. Penonton memilih jenis tiket & jumlah
2. Sistem membuat `ticket_order` dengan status `unpaid` di dalam **DB Transaction** (`DB::transaction()`) & memanggil payment gateway
3. Callback/webhook pembayaran sukses → job queue memproses: status `paid`, `sold_count` pada tiket bertambah (`increment()`), kode tiket/QR diterbitkan

**d. Pembuatan Pool & Penjadwalan**
1. Admin membuat pool, memasukkan tim yang sudah `verified`
2. Admin membuat pertandingan antar tim dalam pool (atau babak gugur) beserta jadwal & venue
3. Sistem memvalidasi tidak ada bentrok jadwal tim/venue via custom Rule sebelum data disimpan

**e. Pertandingan & Statistik**
1. Admin mengubah status match → `ongoing`, input skor berjalan (opsional broadcast real-time)
2. Admin input statistik per pemain selama/setelah pertandingan
3. Match diubah → `finished`, **Observer/Listener** menentukan `winner_team_id` otomatis dari skor akhir
4. Data agregat digunakan untuk klasemen pool & bracket babak selanjutnya (query aggregate, di-cache)

**f. Final**
1. Match dengan `round = final` diselesaikan
2. Event diubah menjadi status `finished`

---

## 7. RANCANGAN API ENDPOINT (Laravel `routes/api.php`)

```php
use Illuminate\Support\Facades\Route;

// Auth
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Public — Events (read-only)
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);

// Admin — Events
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);

    // Teams
    Route::get('/events/{event}/teams', [TeamController::class, 'index']);
    Route::post('/events/{event}/teams', [TeamController::class, 'store']);
    Route::post('/events/{event}/teams/bulk', [TeamController::class, 'bulkStore']);
    Route::put('/teams/{team}', [TeamController::class, 'update']);
    Route::delete('/teams/{team}', [TeamController::class, 'destroy']);
    Route::put('/teams/{team}/verify', [TeamController::class, 'verify']);
    Route::post('/teams/{team}/players', [PlayerController::class, 'store']);
    Route::put('/players/{player}', [PlayerController::class, 'update']);
    Route::delete('/players/{player}', [PlayerController::class, 'destroy']);

    // Pools
    Route::get('/events/{event}/pools', [PoolController::class, 'index']);
    Route::post('/events/{event}/pools', [PoolController::class, 'store']);
    Route::post('/pools/{pool}/teams', [PoolController::class, 'assignTeam']);
    Route::delete('/pools/{pool}/teams/{team}', [PoolController::class, 'removeTeam']);

    // Matches
    Route::get('/events/{event}/matches', [MatchController::class, 'index']);
    Route::post('/events/{event}/matches', [MatchController::class, 'store']);
    Route::put('/matches/{match}', [MatchController::class, 'update']);
    Route::put('/matches/{match}/score', [MatchController::class, 'updateScore']);
    Route::put('/matches/{match}/status', [MatchController::class, 'updateStatus']);

    // Match Stats
    Route::post('/matches/{match}/stats', [MatchStatController::class, 'store']);
    Route::put('/match-stats/{matchStat}', [MatchStatController::class, 'update']);

    // Tickets
    Route::post('/events/{event}/tickets', [TicketController::class, 'store']);
});

// Public — Matches & Stats (read-only)
Route::get('/events/{event}/matches', [MatchController::class, 'index']);
Route::get('/matches/{match}/stats', [MatchStatController::class, 'index']);
Route::get('/events/{event}/tickets', [TicketController::class, 'index']);

// Ticket ordering (guest atau viewer)
Route::post('/tickets/{ticket}/orders', [TicketOrderController::class, 'store']);
Route::get('/orders/{order}', [TicketOrderController::class, 'show']);

// Payment webhook (tanpa auth Sanctum, verifikasi via signature gateway)
Route::post('/payments/webhook', [PaymentWebhookController::class, 'handle']);
```

---

## 8. PEMETAAN KE STRUKTUR FOLDER LARAVEL

| Folder | Isi terkait fitur di atas |
|---|---|
| `app/Http/Controllers/Api` | `EventController`, `TeamController`, `PlayerController`, `PoolController`, `MatchController`, `MatchStatController`, `TicketController`, `TicketOrderController`, `PaymentWebhookController`, `AuthController` |
| `app/Services` | `EventService`, `TeamService`, `PoolService`, `MatchService`, `StatService`, `TicketService`, `OrderService`, `PaymentService` (integrasi gateway via `Http::` facade) |
| `app/Repositories` *(opsional)* | `EventRepository`, `TeamRepository`, `PlayerRepository`, `PoolRepository`, `MatchRepository`, `MatchStatRepository`, `TicketRepository`, `OrderRepository`, `PaymentRepository` — masing-masing implement interface untuk memudahkan unit test |
| `app/Models` | `Event`, `Team`, `Player`, `Pool`, `GameMatch`, `MatchStat`, `Ticket`, `TicketOrder`, `Payment`, `User` |
| `app/Http/Requests` | `StoreEventRequest`, `StoreTeamRequest`, `StoreMatchRequest`, `UpdateMatchScoreRequest`, `StoreTicketOrderRequest`, dsb — semua validasi input |
| `app/Http/Resources` | `EventResource`, `TeamResource`, `MatchResource`, `TicketResource`, dsb — kontrol format response JSON |
| `app/Policies` | `EventPolicy`, `TeamPolicy`, `MatchPolicy` — otorisasi berbasis role, didaftarkan di `AuthServiceProvider`/`bootstrap/app.php` |
| `app/Observers` | `MatchObserver` (auto-set `winner_team_id`), `TicketOrderObserver` |
| `app/Events` & `app/Listeners` | `TeamVerified`, `MatchFinished`, `PaymentSucceeded` beserta listener-nya (kirim notifikasi, update statistik) |
| `app/Jobs` | `ProcessPaymentWebhookJob`, `ExpireUnpaidOrdersJob`, `GenerateTicketQrJob` |
| `app/Rules` | `RegistrationPeriodIsOpen`, `NoScheduleConflict` |
| `app/Enums` | `EventStatus`, `TeamStatus`, `MatchStatus`, `PaymentStatus`, `MatchRound` |
| `database/migrations` | Sesuai skema pada bagian 5 |
| `database/factories` & `database/seeders` | Untuk data dummy saat development/testing |
| `routes/api.php` | Sesuai bagian 7, dikelompokkan per modul dengan middleware `auth:sanctum` & `role:*` |

---

## 9. CATATAN TEKNIS & NON-FUNGSIONAL

- **Autentikasi & Otorisasi**: **Laravel Sanctum** untuk token API (menggantikan JWT custom di rancangan Go), dikombinasikan dengan **Policy/Gate** dan middleware `role` kustom (`App\Http\Middleware\CheckRole`) untuk role-based access (admin vs viewer/team_manager).
- **Validasi**: seluruhnya lewat **Form Request classes** — validasi periode pendaftaran, validasi bentrok jadwal, dan validasi kuota tiket sebelum order dibuat (custom Rule + query lock).
- **Pembayaran**: integrasi payment gateway pihak ketiga (Midtrans/Xendit) via `Http::` facade; webhook diverifikasi signature-nya lalu diproses lewat **Queue Job** agar idempotent dan tahan retry dari gateway.
- **Konsistensi Data**: gunakan `DB::transaction()` saat proses order tiket (create order + kurangi kuota), dengan `lockForUpdate()` pada baris tiket agar tidak terjadi race condition saat kuota tiket menipis.
- **Skalabilitas Fitur Statistik**: struktur tabel `match_stats` tetap generik per kategori (points, rebounds, dst.); jika ke depan kategori makin dinamis, bisa dipertimbangkan migrasi ke model EAV (`stat_type`, `stat_value`) — namun untuk saat ini kolom tetap eksplisit demi performa query.
- **Dokumentasi API**: gunakan **Scribe** atau **L5-Swagger** untuk menghasilkan dokumentasi OpenAPI otomatis dari Form Request & Resource yang sudah ada.
- **Testing**: **Pest** atau **PHPUnit** untuk Feature Test tiap endpoint, plus **Laravel Factories** untuk seed data pengujian (event, team, match, dsb).
- **Real-time (opsional)**: **Laravel Reverb** (WebSocket bawaan Laravel) untuk broadcast skor live pertandingan ke frontend tanpa polling.
- **Caching**: **Redis** untuk cache klasemen/bracket pool dan rate-limiting endpoint publik.
- **Deployment**: seluruh service dikemas dalam **Docker Compose** (app PHP-FPM/Nginx + PostgreSQL + Redis + queue worker `php artisan queue:work` + scheduler via cron `php artisan schedule:run`).
- **Package pendukung yang direkomendasikan**:
  - `laravel/sanctum` — autentikasi API
  - `spatie/laravel-permission` — alternatif role/permission yang lebih kaya dibanding kolom `role` sederhana
  - `simplesoftwareio/simple-qrcode` — generate QR tiket
  - `spatie/laravel-query-builder` — filtering/sorting endpoint listing (event, match, dsb.)
  - `laravel/horizon` — monitoring queue (jika volume job tinggi, mis. saat penjualan tiket ramai)

---

## 10. PERBEDAAN UTAMA VS RANCANGAN GO/GIN

| Aspek | Go + Gin (awal) | Laravel (adaptasi) |
|---|---|---|
| Data access | Repository manual (SQL/query builder Go) | Eloquent ORM (+ Repository opsional sebagai pembungkus) |
| Auth | JWT manual | Laravel Sanctum (token based) |
| Validasi | Middleware/manual di service | Form Request classes + custom Rule |
| Business logic pemenang match | Manual di service saat update status | Model Observer / Event-Listener |
| Job async (webhook, expired order) | Goroutine/worker manual | Laravel Queue + Job class |
| Response API | JSON manual per controller | API Resource class |
| Scheduler (expired ticket) | Cron job terpisah | `routes/console.php` + Laravel Scheduler |
