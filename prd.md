# PRD — Fase 2: Web Onboarding Habit Tracker SaaS (WhatsApp + AI)

## 1. Konteks

Ini adalah Fase 2 dari SaaS habit tracker berbasis WhatsApp. Database Supabase (Fase 1) **sudah selesai dan live** — jangan buat migration baru, jangan ubah schema. Web app ini hanya untuk: signup/login, onboarding (set habit + jadwal reminder), verifikasi nomor WhatsApp via OTP, dan dashboard sederhana. Reminder engine dan AI reply ditangani sistem lain (n8n) — di luar scope.

## 2. Tech Stack (wajib)

- **Next.js 14+ (App Router) + TypeScript**
- **Tailwind CSS** (boleh + shadcn/ui)
- **Supabase**: `@supabase/supabase-js` + `@supabase/ssr` untuk auth (email + password)
- **Fonnte API** untuk kirim OTP WhatsApp (server-side only)
- Deploy target: Vercel

## 3. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only, JANGAN pernah terekspos ke client
FONNTE_TOKEN=                     # server-side only
```

## 4. Schema Database yang Sudah Ada (referensi, JANGAN dibuat ulang)

- `profiles`: id (uuid, = auth.users.id), full_name, wa_number (format 628xx), wa_verified (bool), wa_otp, wa_otp_expires_at, timezone (IANA, default 'Asia/Jakarta'), opted_out, ai_summary, last_summarized_at, created_at, updated_at
- `habits`: id, user_id, name, description, frequency ('daily'|'weekly'|'custom'), target_per_week (1-7), is_active
- `schedules`: id, habit_id, user_id, send_time (time), days_of_week (smallint[], ISO 1=Senin..7=Minggu), is_active, last_sent_at
- `checkins`: id, habit_id, user_id, checkin_date, status ('done'|'skipped'|'partial'), note, source ('whatsapp'|'web'), unique(habit_id, checkin_date)
- `subscriptions`: user_id (unique), plan ('free'|'pro'), status ('active'|'past_due'|'canceled'|'expired')
- `conversations`, `message_logs`: read-only dari sisi web, tidak dipakai di fase ini

**Perilaku penting yang sudah otomatis di database:**
- Trigger `handle_new_user`: setiap signup di Supabase Auth otomatis membuat baris `profiles` + `subscriptions` (free/active). Web TIDAK perlu insert ke dua tabel itu — cukup UPDATE profiles.
- RLS aktif: dengan anon key, user hanya bisa akses barisnya sendiri. `habits`, `schedules`, `checkins` full CRUD milik sendiri; `profiles` select+update milik sendiri.

## 5. Struktur Halaman & Routing

```
/                      → landing sederhana (headline, CTA daftar)
/signup                → form email + password + nama lengkap
/login                 → form email + password
/onboarding            → wizard 3 langkah (protected, lihat §6)
/dashboard             → daftar habit + streak + status WA (protected)
/dashboard/habits/new  → tambah habit baru (form sama dengan wizard step 1+2)
```

- Middleware: `/onboarding` dan `/dashboard/*` wajib login; kalau belum login redirect ke `/login`.
- Setelah login: jika `profiles.wa_verified = false` ATAU user belum punya habit → redirect ke `/onboarding`; selain itu ke `/dashboard`.

## 6. Wizard Onboarding (3 langkah, satu halaman dengan state stepper)

**Step 1 — Habit**
- Input: nama habit (wajib), deskripsi (opsional), frequency (pilihan: daily/weekly/custom; default daily), target_per_week (slider 1-7, tampil hanya jika weekly/custom)

**Step 2 — Jadwal Reminder**
- Input: jam reminder (time picker → `send_time`), hari aktif (toggle chip Sen-Min → `days_of_week`, default semua), timezone (select 3 opsi: Asia/Jakarta WIB / Asia/Makassar WITA / Asia/Jayapura WIT; default Asia/Jakarta → disimpan ke `profiles.timezone`)

**Step 3 — Verifikasi WhatsApp**
- Input nomor WA. Normalisasi ke format `628xxxxxxxxxx` (user boleh ketik 08xx / +628xx / 628xx).
- Tombol "Kirim OTP" → panggil route handler `POST /api/otp/send`.
- Input 6 digit OTP → `POST /api/otp/verify`.
- Setelah verified: simpan habit (step 1) + schedule (step 2) ke database, lalu redirect `/dashboard`.
- Data step 1-2 ditahan di state client sampai step 3 sukses (supaya tidak ada habit yatim tanpa WA verified).

## 7. API Routes (server-side, route handlers)

**`POST /api/otp/send`** — body: `{ wa_number }`
1. Validasi & normalisasi nomor (regex `^628[0-9]{8,12}$` setelah normalisasi).
2. Generate OTP 6 digit random.
3. Pakai **service role client**: update `profiles` milik user yang sedang login → set `wa_number`, `wa_otp`, `wa_otp_expires_at = now() + 5 menit`, `wa_verified = false`.
4. Kirim pesan via Fonnte: `POST https://api.fonnte.com/send`, header `Authorization: FONNTE_TOKEN`, body **multipart/form-data** dengan field `target` (nomor) dan `message` (`"Kode OTP kamu: {otp}. Berlaku 5 menit. Jangan bagikan ke siapa pun."`).
5. Rate limit: maksimal 3 kirim OTP per nomor per 15 menit (cek `wa_otp_expires_at`/hitung sederhana; tolak dengan 429 jika lebih).
6. Response: `{ ok: true }` — JANGAN kembalikan OTP di response.

**`POST /api/otp/verify`** — body: `{ otp }`
1. Ambil profile user login (service role), cocokkan `otp === wa_otp` dan `wa_otp_expires_at > now()`.
2. Sukses → set `wa_verified = true`, kosongkan `wa_otp` + `wa_otp_expires_at`. Response `{ ok: true }`.
3. Gagal → `{ ok: false, error: 'invalid' | 'expired' }`, maksimal 5 percobaan.

Catatan: identitas user diambil dari session Supabase (cookie via `@supabase/ssr`), BUKAN dari body request.

## 8. Dashboard (minimal, jangan over-build)

- Kartu status WA: nomor + badge "Terverifikasi ✓" / tombol verifikasi ulang.
- Daftar habit: nama, jadwal (jam + hari), streak (hitung dari `checkins` status done 30 hari terakhir), toggle `is_active`.
- Tombol check-in manual hari ini per habit (insert ke `checkins` dengan source 'web'; handle conflict unique dengan upsert).
- Tombol tambah habit → `/dashboard/habits/new`.

## 9. Acceptance Criteria

1. Signup baru → baris `profiles` + `subscriptions` muncul otomatis (via trigger, bukan kode web).
2. Wizard selesai end-to-end → ada 1 baris `habits`, 1 baris `schedules`, `profiles.wa_verified = true`, `profiles.timezone` terisi.
3. OTP benar-benar terkirim ke WA via Fonnte; OTP salah/kedaluwarsa ditolak.
4. Service role key & Fonnte token tidak pernah muncul di bundle client (cek: hanya dipakai di route handlers).
5. User A tidak bisa membaca/mengubah data user B (RLS — uji dengan dua akun).
6. Nomor `08123...`, `+628123...`, `628123...` semua ternormalisasi ke `628123...`.
7. Mobile-first: wizard nyaman dipakai di layar 380px.

## 10. Out of Scope (JANGAN dikerjakan)

- Billing/payment (Fase 5)
- Pengiriman reminder terjadwal (n8n, Fase 3)
- AI reply / chatbot (Fase 4)
- Halaman admin, reset password, magic link, OAuth
- Migration/perubahan schema database apa pun