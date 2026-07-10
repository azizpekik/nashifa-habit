# Task: Refactor Form Habit (Tambah & Edit) — Logika Frekuensi + Modal

## Perubahan yang diminta

### 1. Form "Tambah Habit" jadi modal (Dialog shadcn/ui)

- Hapus halaman `/dashboard/habits/new`. Tombol **+ Tambah Habit** di dashboard membuka `Dialog` berisi form — komponen form yang SAMA dengan yang dipakai Edit (satu komponen `HabitFormDialog`, mode `create` | `edit` via prop).
- Mode create: field kosong, submit = insert. Mode edit: field terisi data habit, submit = update.
- Setelah sukses: tutup dialog, refresh list habit (router.refresh() atau revalidate), tampilkan toast singkat.

### 2. Hilangkan dropdown frequency dari UI — ganti pilihan "Seberapa sering?"

Field frequency (daily/weekly/custom) dan slider target_per_week DIHAPUS dari form. Gantinya, satu kontrol radio/segmented bertajuk **"Seberapa sering?"** dengan 2 opsi:

**Opsi A — "Setiap hari"** (default)
**Opsi B — "Pilih hari tertentu"** → di bawahnya muncul 7 toggle chips: Sen Sel Rab Kam Jum Sab Min (minimal 1 harus terpilih; tombol submit disabled kalau 0)

### 3. Mapping ke database (nilai frequency DITURUNKAN otomatis, bukan dipilih user)

| Pilihan user | habits.frequency | habits.target_per_week | schedules.days_of_week |
|---|---|---|---|
| Setiap hari | `'daily'` | `null` | `{1,2,3,4,5,6,7}` |
| Pilih hari tertentu | `'custom'` | jumlah hari terpilih | array hari terpilih (ISO: 1=Sen..7=Min) |

- Field jam reminder tetap ada di form → `schedules.send_time`.
- **Create**: insert `habits` dulu → ambil id → insert `schedules` (1 baris).
- **Edit**: update `habits` + update baris `schedules` milik habit itu (jangan insert baru).
- Jangan ubah schema/constraint apa pun. Nilai `'weekly'` dibiarkan ada di check constraint tapi tidak pernah dihasilkan UI.

### 4. Saat EDIT, pre-fill kontrol dari data lama

- `days_of_week` berisi 7 hari → pilih "Setiap hari".
- Selain itu → pilih "Pilih hari tertentu" dengan chips sesuai isi array.
- Data lama yang kebetulan `frequency='weekly'` (kalau ada) → perlakukan seperti custom berdasarkan days_of_week-nya; saat disimpan ulang otomatis ternormalisasi jadi daily/custom sesuai tabel mapping.

### 5. Konsistensi tampilan kartu habit

Label jadwal di kartu mengikuti aturan yang sudah ada: 7 hari = "Setiap hari", Sen-Jum = "Hari kerja", Sab+Min = "Akhir pekan", selain itu sebutkan harinya.

## Acceptance criteria

1. Tambah dan Edit memakai satu komponen dialog yang sama; halaman `/dashboard/habits/new` sudah tidak ada.
2. Tidak ada lagi kata "daily/weekly/custom" maupun slider target di UI.
3. Buat habit "Setiap hari" → DB: frequency=daily, days_of_week={1..7}, target_per_week=null.
4. Buat habit pilih Sen,Rab,Jum → DB: frequency=custom, days_of_week={1,3,5}, target_per_week=3.
5. Edit habit dari "Setiap hari" ke "Sen,Rab,Jum" (dan sebaliknya) → baris schedules ter-UPDATE (jumlah baris schedules tidak bertambah).
6. Submit disabled saat mode "Pilih hari tertentu" dengan 0 chip terpilih.
7. Logika streak/report tidak diubah — tetap berbasis days_of_week.