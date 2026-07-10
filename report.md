# PRD — Fase 2.5: Polish Dashboard + Report Habit & Streak

## 1. Konteks

Lanjutan dari web onboarding yang sudah jadi (Nashifa HTTracker). Database Supabase **live, jangan ubah schema, jangan buat migration**. Semua fitur di PRD ini murni membaca/menulis tabel yang sudah ada (`habits`, `schedules`, `checkins`, `profiles`) lewat client Supabase yang sudah terpasang, dengan RLS yang sudah berjalan.

Tujuan fase ini: dashboard terasa seperti produk jadi — rapi, informatif, dan punya halaman report streak yang enak dilihat (good-looking, layak di-screenshot).

## 2. Scope A — Polish Dashboard (perbaikan kecil, kerjakan dulu)

1. **Format jam**: `07:00:00` → tampil `07.00` (potong detik, pemisah titik gaya Indonesia).
2. **Label hari**: jika `days_of_week` berisi 7 hari → tampil **"Setiap hari"**. Jika Sen-Jum → **"Hari kerja"**. Jika Sab+Min → **"Akhir pekan"**. Selain itu baru sebutkan harinya ("Sen, Rab, Jum").
3. **Edit habit**: menu ⋯ di tiap kartu habit → edit nama, deskripsi, jadwal (jam + hari) → update `habits` + `schedules`.
4. **Hapus habit**: di menu yang sama, dengan dialog konfirmasi ("Semua riwayat check-in habit ini ikut terhapus"). Delete `habits` (cascade menangani sisanya).
5. **Empty state**: jika belum ada habit → ilustrasi/ikon sederhana + teks "Belum ada habit" + tombol Tambah Habit.
6. **Kartu habit menampilkan ringkas**: current streak dengan ikon 🔥 jika ≥ 3 hari.

## 3. Scope B — Halaman Report (`/dashboard/reports`)

Tambahkan link/tab "Laporan" di dashboard. Halaman berisi, urut dari atas:

### B1. Kartu ringkasan (3 kartu sejajar, stack di mobile)
- **Streak saat ini** (angka besar + 🔥) — streak gabungan terbaik dari semua habit aktif
- **Streak terpanjang** (all-time)
- **Tingkat konsistensi 30 hari** (%, lihat definisi §4)

### B2. Heatmap kalender (per habit, 12 minggu terakhir)
- Grid ala GitHub contribution graph: kolom = minggu (12), baris = hari (Sen-Min), sel = satu hari.
- Warna sel: hijau pekat = done, hijau muda = partial, abu terang = tidak ada check-in, abu kosong = tanggal sebelum habit dibuat / masa depan.
- Dropdown/tab untuk ganti habit jika user punya > 1.
- Tooltip/tap: tanggal + status.
- Implementasi: **CSS grid murni** (div per sel), TIDAK perlu library chart untuk heatmap.

### B3. Grafik bar mingguan (8 minggu terakhir)
- Sumbu X = minggu ("12 Jan", "19 Jan", ...), Y = jumlah check-in done semua habit.
- Boleh pakai **recharts** (satu-satunya library chart yang diizinkan; jangan tambah library lain).

### B4. Kartu pencapaian per habit (list)
- Per habit: nama, current streak, longest streak, % konsistensi 30 hari, total check-in all-time.

## 4. Definisi Perhitungan (PENTING — sumber kebenaran)

Semua dihitung di web dari tabel `checkins` (JANGAN pakai/mengubah fungsi `get_due_reminders` — hitungan streak di fungsi itu hanya aproksimasi untuk copy pesan reminder).

- **Current streak (per habit)**: jumlah hari berturut-turut dengan check-in `status='done'`, dihitung mundur mulai dari **hari ini ATAU kemarin** (jika hari ini belum check-in, streak belum putus — mulai hitung dari kemarin). Putus saat ketemu hari tanpa check-in done. Hanya hitung hari yang termasuk `days_of_week` habit tersebut (hari libur jadwal tidak memutus streak).
- **Longest streak**: streak terpanjang sepanjang riwayat, logika sama.
- **Konsistensi 30 hari**: (jumlah hari done dalam 30 hari terakhir) ÷ (jumlah hari terjadwal dalam 30 hari terakhir, dibatasi sejak habit dibuat) × 100, bulatkan ke integer.
- **Streak gabungan (kartu B1)**: nilai maksimum current streak di antara semua habit aktif.
- Zona waktu: semua "hari" mengikuti `profiles.timezone` user.
- Buat util `lib/streaks.ts` berisi fungsi murni (input: array checkins + days_of_week + timezone; output: angka-angka di atas) **plus unit test sederhana** untuk kasus: streak berjalan, hari ini belum check-in, jadwal hanya Sen-Jum, dan habit baru dibuat kemarin.

## 5. Desain

- Mobile-first (mayoritas user buka dari HP setelah terima WA).
- Konsisten dengan style dashboard yang ada (Tailwind + shadcn/ui yang sudah terpasang).
- Halaman report harus **layak di-screenshot**: rapi, kontras baik, tidak ada elemen debug.
- Loading state skeleton untuk heatmap & chart; jangan layout shift.

## 6. Nice-to-have (kerjakan HANYA jika semua di atas selesai)

- **Kartu share streak**: tombol "Bagikan" menghasilkan kartu PNG (canvas) berisi nama habit, streak 🔥, dan heatmap mini — untuk dibagikan ke story/status WA. Ini fitur growth: user yang pamer streak = iklan gratis.

## 7. Acceptance Criteria

1. Jam tampil `07.00`, jadwal harian tampil "Setiap hari".
2. Edit dan hapus habit berfungsi; hapus meminta konfirmasi.
3. `/dashboard/reports` menampilkan B1-B4 dengan data nyata dari `checkins`.
4. Streak TIDAK putus jika hari ini belum check-in tapi kemarin done.
5. Streak TIDAK putus oleh hari di luar `days_of_week` (uji: habit Sen-Jum, cek Jumat→Senin tersambung).
6. Habit yang baru dibuat kemarin tidak menampilkan konsistensi 0% yang menyesatkan (pembagi dibatasi sejak created_at).
7. Semua query tetap lewat anon key + RLS (tidak ada service role di halaman ini).
8. Tampilan rapi di layar 380px.

## 8. Out of Scope

- Billing, n8n/reminder engine, AI reply, notifikasi web/push
- Perubahan schema database atau fungsi SQL apa pun
- Library chart selain recharts