-- Seed: 3 template packs untuk testing UI

-- 1. Weight Loss Starter (kesehatan, premium)
insert into public.template_packs (slug, title, description, category, emoji, is_premium, is_published, sort_order)
values ('weight-loss-starter', 'Weight Loss Starter', 'Paket lengkap untuk memulai perjalanan diet dan hidup sehat', 'kesehatan', '🏃', true, true, 1)
on conflict (slug) do nothing;

with pack as (select id from public.template_packs where slug = 'weight-loss-starter')
insert into public.template_items (pack_id, name, description, default_send_time, default_days, sort_order)
select pack.id, 'Minum air 2L', 'Pastikan asupan air putih tercukupi sepanjang hari', '08:00', '{1,2,3,4,5,6,7}', 1 from pack
union all select pack.id, 'Jalan pagi 20 menit', 'Jalan kaki santai setelah bangun tidur', '06:30', '{1,2,3,4,5,6,7}', 2 from pack
union all select pack.id, 'Timbang badan', 'Catat berat badan setiap pagi', '07:00', '{1,3,5}', 3 from pack
union all select pack.id, 'Tidur sebelum 22.30', 'Pastikan tidur cukup untuk pemulihan', '21:00', '{1,2,3,4,5,6,7}', 4 from pack
union all select pack.id, 'Tanpa gorengan', 'Hindari makanan yang digoreng hari ini', '12:00', '{1,2,3,4,5,6,7}', 5 from pack
union all select pack.id, 'Defisit kalori tercatat', 'Catat asupan kalori dan jaga defisit', '20:00', '{1,2,3,4,5,6,7}', 6 from pack
union all select pack.id, 'Olahraga 3x seminggu', 'Latihan fisik terjadwal (senin, rabu, jumat)', '16:00', '{1,3,5}', 7 from pack;

-- 2. Produktivitas Harian (produktivitas, premium)
insert into public.template_packs (slug, title, description, category, emoji, is_premium, is_published, sort_order)
values ('produktivitas-harian', 'Produktivitas Harian', 'Rutinitas untuk memaksimalkan produktivitas kerja', 'produktivitas', '⚡', true, true, 2)
on conflict (slug) do nothing;

with pack as (select id from public.template_packs where slug = 'produktivitas-harian')
insert into public.template_items (pack_id, name, description, default_send_time, default_days, sort_order)
select pack.id, 'Rencanakan 3 prioritas pagi', 'Tulis 3 hal paling penting yang harus diselesaikan hari ini', '06:00', '{1,2,3,4,5,6,7}', 1 from pack
union all select pack.id, 'Deep work 90 menit', 'Fokus penuh tanpa distraksi selama 90 menit', '08:00', '{1,2,3,4,5}', 2 from pack
union all select pack.id, 'Tanpa HP jam kerja pertama', 'Jauhkan ponsel saat jam kerja pertama', '08:00', '{1,2,3,4,5}', 3 from pack
union all select pack.id, 'Review harian malam', 'Evaluasi apa yang sudah dikerjakan hari ini', '20:00', '{1,2,3,4,5,6,7}', 4 from pack
union all select pack.id, 'Baca 15 menit', 'Luangkan waktu membaca buku atau artikel', '21:00', '{1,2,3,4,5,6,7}', 5 from pack;

-- 3. Rutinitas Pagi Berkah (ibadah, FREE)
insert into public.template_packs (slug, title, description, category, emoji, is_premium, is_published, sort_order)
values ('rutinitas-pagi-berkah', 'Rutinitas Pagi Berkah', 'Awali pagi dengan ibadah untuk keberkahan sepanjang hari', 'ibadah', '🌅', false, true, 3)
on conflict (slug) do nothing;

with pack as (select id from public.template_packs where slug = 'rutinitas-pagi-berkah')
insert into public.template_items (pack_id, name, description, default_send_time, default_days, sort_order)
select pack.id, 'Sholat Dhuha', 'Jangan lupa sholat dhuha sebelum memulai aktivitas', '07:00', '{1,2,3,4,5,6,7}', 1 from pack
union all select pack.id, 'Baca Quran 10 menit', 'Luangkan waktu untuk membaca Al-Quran', '06:00', '{1,2,3,4,5,6,7}', 2 from pack
union all select pack.id, 'Dzikir pagi', 'Baca dzikir pagi untuk perlindungan dan keberkahan', '05:30', '{1,2,3,4,5,6,7}', 3 from pack;
