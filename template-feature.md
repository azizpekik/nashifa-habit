# PRD — Fase 6: Template Habit Packs + Superadmin Panel

## 1. Konteks

Aplikasi Nashifa Habit (Next.js 14 + Supabase + Tailwind/shadcn) sudah berjalan: onboarding, dashboard "Hari Ini", Laporan, Pengaturan, reminder WA via n8n. Fitur baru: **template packs** — paket habit siap pakai (mis. "Weight Loss", "Produktivitas", "Sehat Jantung") yang bisa diterapkan sekali klik, dikelola lewat **panel superadmin**. Template premium = etalase upgrade Pro.

Migration SQL BOLEH dibuat untuk fase ini (satu file, lihat §2). Selain yang tercantum, jangan ubah schema/fungsi lain.

## 2. Migration (buat file SQL, jalankan sekali)

```sql
-- role untuk gerbang admin
alter table public.profiles add column if not exists role text not null default 'user'
  check (role in ('user','admin'));

-- atribusi habit ke template (analitik)
alter table public.habits add column if not exists template_item_id uuid;

create table public.template_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text not null,            -- 'kesehatan' | 'produktivitas' | 'ibadah' | 'keluarga' | 'lainnya'
  emoji text default '✨',
  is_premium boolean not null default true,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.template_packs(id) on delete cascade,
  name text not null,
  description text,
  default_send_time time not null default '06:00',
  default_days smallint[] not null default '{1,2,3,4,5,6,7}',
  sort_order int not null default 0
);

create trigger trg_template_packs_updated before update on public.template_packs
  for each row execute function public.set_updated_at();

alter table public.template_packs enable row level security;
alter table public.template_items enable row level security;

-- semua user login boleh BACA pack yang published (+ itemnya)
create policy "packs_read_published" on public.template_packs
  for select using (is_published = true or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "items_read" on public.template_items
  for select using (exists (
    select 1 from template_packs tp where tp.id = pack_id
      and (tp.is_published = true or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))));

-- TULIS hanya lewat service role (API route admin) — tidak ada policy write.
```

Setelah migration, set admin pertama manual: `update profiles set role='admin' where id='<uuid-akun-edi>';`

## 3. Sisi User — Halaman Template

### 3.1 Entry point
- Tab/menu baru "Template" (ikon ✨) di bottom nav ATAU tombol "Mulai dari Template" di modal Tambah Habit dan di empty state dashboard.

### 3.2 Daftar template (`/dashboard/templates`)
- Grid kartu pack, dikelompokkan per kategori. Kartu: emoji, judul, jumlah habit ("7 kebiasaan"), badge "PRO" jika is_premium.
- Query: hanya `is_published = true` (RLS sudah menjaga, tapi filter juga di query).
- User FREE + pack premium: kartu tampil dengan ikon 🔒; klik → modal upsell ("Fitur Pro — buka semua template" + tombol Upgrade). JANGAN sembunyikan pack premium dari free user — justru itu etalasenya.
- Cek status Pro dari tabel `subscriptions` (plan='pro' AND status='active'). Selama billing belum live, buat helper `isPro()` di satu tempat supaya gampang diganti.

### 3.3 Detail & terapkan (`/dashboard/templates/[slug]`)
- Tampilkan deskripsi pack + daftar item berurutan. Tiap item: nama, deskripsi, **time picker terisi default_send_time (bisa diubah)**, chips hari terisi default_days (bisa diubah), dan checkbox include (default semua tercentang — user boleh menerapkan sebagian).
- Tombol "Terapkan X Habit" → insert per item tercentang: 1 baris `habits` (name, description, frequency diturunkan dari days [aturan sama dengan form manual], template_item_id) + 1 baris `schedules` (send_time, days_of_week dari pilihan user).
- Guard duplikat: jika user sudah punya habit dengan `template_item_id` sama, item itu tampil "Sudah ditambahkan ✓" dan tidak bisa dicentang lagi.
- Sukses → redirect dashboard + toast "7 habit ditambahkan 🎉".
- Insert memakai client anon + RLS user biasa (habits_all_own sudah ada) — TIDAK butuh API route.

## 4. Superadmin Panel (`/admin`)

### 4.1 Akses
- Middleware: `/admin/*` hanya untuk user login dengan `profiles.role='admin'`; selain itu redirect ke `/dashboard`.
- SEMUA operasi tulis admin lewat API routes server-side (`/api/admin/*`) yang: (1) baca session, (2) verifikasi role='admin' dari DB via service role, (3) baru eksekusi. Service role key TIDAK PERNAH ke client.

### 4.2 Kelola Template (`/admin/templates`)
- Tabel pack: judul, kategori, jumlah item, premium?, published?, tombol Edit/Hapus.
- Form pack (create/edit, modal): judul, slug (auto dari judul, editable), deskripsi, kategori (select), emoji, toggle premium, toggle published.
- Halaman item per pack: daftar item bisa tambah/edit/hapus + drag/tombol atur sort_order. Form item: nama, deskripsi, jam default, chips hari default.
- Hapus pack → konfirmasi ("Habit user yang sudah dibuat dari template ini TIDAK ikut terhapus").

### 4.3 Kelola User (`/admin/users`)
- Tabel: nama, email (dari auth via service role), nomor WA, wa_verified, plan, status, current_period_end, jumlah habit, created_at. Search by nama/nomor. Pagination 20.
- Aksi per user: (a) perpanjang langganan manual (+7/+30 hari → update subscriptions), (b) ubah plan free/pro, (c) toggle opted_out, (d) nonaktifkan user (set semua habits is_active=false).
- TIDAK ada fitur baca isi conversations user dari panel (privasi) — cukup jumlah pesan.

### 4.4 Ringkasan (`/admin` home)
- 4 angka: total user, user aktif 7 hari terakhir (ada checkin/pesan), user Pro, checkin hari ini. Query sederhana saja, tanpa chart.

## 5. Konten Awal (seed, buat file SQL terpisah)

Buat 3 pack contoh agar UI bisa diuji (Edi akan mengedit lewat panel):
1. **Weight Loss Starter** (kesehatan, premium): Minum air 2L, Jalan pagi 20 menit, Timbang badan, Tidur sebelum 22.30, Tanpa gorengan, Defisit kalori tercatat, Olahraga 3x seminggu (days Sen/Rab/Jum).
2. **Produktivitas Harian** (produktivitas, premium): Rencanakan 3 prioritas pagi, Deep work 90 menit, Tanpa HP jam kerja pertama, Review harian malam, Baca 15 menit.
3. **Rutinitas Pagi Berkah** (ibadah, FREE — umpan gratis): Sholat Dhuha, Baca Quran 10 menit, Dzikir pagi. 

## 6. Acceptance Criteria

1. Admin bisa buat pack + item lewat panel, publish, dan pack langsung muncul di halaman Template user.
2. User Pro menerapkan pack 7 item → 7 habits + 7 schedules tercipta sesuai jam/hari yang dia sesuaikan, dan reminder WA jalan untuk habit itu (bukti: get_due_reminders mengembalikannya saat jamnya tiba).
3. User Free melihat pack premium terkunci; pack free tetap bisa diterapkan.
4. Terapkan pack yang sama dua kali → item yang sudah ada tidak terduplikasi.
5. Non-admin membuka /admin → redirect; panggilan langsung ke /api/admin/* tanpa role admin → 403.
6. Service role key tidak ada di bundle client (audit network + source).
7. Aksi admin "perpanjang +30 hari" mengubah current_period_end dengan benar.
8. Mobile-first: halaman Template dan detail nyaman di 380px; panel admin boleh desktop-first.

## 7. Out of Scope

- Billing/pembayaran (Fase 5 terpisah) — cukup helper isPro()
- Template buatan user / marketplace
- Statistik lanjutan admin, ekspor data
- Perubahan workflow n8n apa pun (template menghasilkan habits+schedules biasa — scheduler sudah otomatis menanganinya)