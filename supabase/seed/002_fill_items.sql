-- Isi item untuk Kesehatan Jantung & Weight Loss
-- Jalankan setelah pack sudah dibuat via admin panel

-- ============================================================
-- Kesehatan Jantung (ID: 5630195f-c867-4131-997b-0336680bccce)
-- ============================================================
with pack as (select id from public.template_packs where id = '5630195f-c867-4131-997b-0336680bccce')
insert into public.template_items (pack_id, name, description, default_send_time, default_days, sort_order)
select pack.id, 'Jalan kaki 30 menit', 'Jalan santai untuk menjaga kebugaran jantung', '06:30'::time, '{1,2,3,4,5,6,7}'::smallint[], 1 from pack
union all select pack.id, 'Makan makanan rendah lemak', 'Kurangi makanan berminyak dan kolesterol tinggi', '12:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 2 from pack
union all select pack.id, 'Cek tekanan darah', 'Pastikan tekanan darah dalam batas normal', '08:00'::time, '{2,4,6}'::smallint[], 3 from pack
union all select pack.id, 'Konsumsi buah dan sayur', 'Penuhi asupan serat harian dari buah dan sayur segar', '10:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 4 from pack
union all select pack.id, 'Olahraga kardio 3x seminggu', 'Lari, bersepeda, atau renang untuk kesehatan jantung', '16:00'::time, '{1,3,5}'::smallint[], 5 from pack
union all select pack.id, 'Kelola stres dengan meditasi', 'Luangkan 5-10 menit untuk meditasi dan tarik napas dalam', '20:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 6 from pack
union all select pack.id, 'Tidur cukup 7-8 jam', 'Pastikan tidur berkualitas untuk pemulihan jantung', '22:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 7 from pack;

-- ============================================================
-- Weight Loss (ID: f22edd7d-ec48-4178-8b71-546941b4ca06)
-- ============================================================
with pack as (select id from public.template_packs where id = 'f22edd7d-ec48-4178-8b71-546941b4ca06')
insert into public.template_items (pack_id, name, description, default_send_time, default_days, sort_order)
select pack.id, 'Minum air putih hangat sebelum makan', 'Air putih hangat membantu pencernaan dan mengurangi nafsu makan', '07:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 1 from pack
union all select pack.id, 'Sarapan tinggi protein', 'Telur, yogurt, atau smoothie protein untuk energi tahan lama', '06:30'::time, '{1,2,3,4,5,6,7}'::smallint[], 2 from pack
union all select pack.id, 'Makan siang dengan porsi terkontrol', 'Gunakan piring lebih kecil, perbanyak sayur dan protein', '12:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 3 from pack
union all select pack.id, 'Camilan sehat (buah/kacang)', 'Hindari gorengan dan cemilan manis, pilih buah atau kacang', '16:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 4 from pack
union all select pack.id, 'Olahraga 30 menit', 'Bakar kalori dengan olahraga ringan hingga sedang', '17:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 5 from pack
union all select pack.id, 'Catat asupan kalori harian', 'Pantau kalori masuk agar tetap defisit terkontrol', '20:00'::time, '{1,2,3,4,5,6,7}'::smallint[], 6 from pack
union all select pack.id, 'Timbang berat badan mingguan', 'Pantau progres penurunan berat badan setiap minggu', '06:00'::time, '{1}'::smallint[], 7 from pack;

-- Publish kedua pack
update public.template_packs set is_published = true where slug in ('kesehatan-jantung', 'weight-loss');
