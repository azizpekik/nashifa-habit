import Link from 'next/link'
import { Leaf, BarChart3, MessageCircle, Bell, Zap, Heart } from 'lucide-react'

const features = [
  {
    icon: Bell,
    title: 'Pengingat WhatsApp',
    desc: 'Dapatkan notifikasi otomatis via WhatsApp setiap jadwal habit tiba. Tidak perlu install aplikasi tambahan.',
  },
  {
    icon: BarChart3,
    title: 'Laporan & Streak',
    desc: 'Pantau konsistensi dengan streak harian, grafik 30 hari, dan statistik lengkap. Bagikan sebagai gambar.',
  },
  {
    icon: MessageCircle,
    title: 'Konsultasi 24/7',
    desc: 'Chat langsung dengan Kak Nashifa untuk evaluasi kebiasaan, motivasi, atau sekedar ngobrol.',
  },
  {
    icon: Zap,
    title: 'Template Siap Pakai',
    desc: 'Mulai dengan paket kebiasaan dari Kak Nashifa. Pilih template, terapkan, dan jalankan.',
  },
  {
    icon: Heart,
    title: 'Fleksibel',
    desc: 'Tandai habit sebagai Done, Skipped, atau Tunda. Streak tidak akan putus jika kamu skip di hari libur.',
  },
  {
    icon: Leaf,
    title: 'Gratis Selamanya',
    desc: 'Tidak ada biaya berlangganan. Semua fitur dasar tersedia gratis untuk membantu kamu konsisten.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Nashifa Habit</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 transition-all active:scale-95"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0fdf4_1px,transparent_1px),linear-gradient(to_bottom,#f0fdf4_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:bg-[linear-gradient(to_right,#052e16_1px,transparent_1px),linear-gradient(to_bottom,#052e16_1px,transparent_1px)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
          </div>
          <div className="mx-auto max-w-6xl px-5 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 mb-6 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
              <Heart className="w-3 h-3" />
              Bangun kebiasaan baik setiap hari
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Lacak habit-mu,{' '}
              <span className="text-primary">dapatkan pengingat</span>
              {' '}lewat WhatsApp
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Nashifa Habit membantu kamu konsisten menjalankan rutinitas harian dengan
              pengingat otomatis via WhatsApp, pantau streak, dan chat dengan Kak Nashifa
              kapan saja.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 transition-all active:scale-95 w-full sm:w-auto"
              >
                Mulai Gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3.5 text-sm font-medium shadow-sm hover:bg-accent transition-all active:scale-95 w-full sm:w-auto"
              >
                Masuk
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cara Kerja</h2>
              <p className="mt-3 text-muted-foreground">Tiga langkah mudah untuk mulai membangun kebiasaan</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Buat Habit', desc: 'Tentukan kebiasaan yang ingin kamu bangun, atur jadwal, dan pilih hari dalam seminggu.' },
                { step: '02', title: 'Verifikasi WA', desc: 'Hubungkan nomor WhatsApp kamu agar menerima pengingat otomatis setiap jadwal tiba.' },
                { step: '03', title: 'Check-in & Konsisten', desc: 'Lapor progres setiap hari, jaga streak, dan lihat perkembanganmu dari waktu ke waktu.' },
              ].map((s) => (
                <div key={s.step} className="relative group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <div className="relative rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
                    <span className="text-4xl font-bold text-primary/20">{s.step}</span>
                    <h3 className="text-lg font-semibold mt-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 sm:py-28 bg-muted/30">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Semua Fitur yang Kamu Butuhkan</h2>
              <p className="mt-3 text-muted-foreground">Dirancang untuk membantu kamu tetap konsisten tanpa ribet</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-border/50 bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-6 py-14 sm:px-12 sm:py-20 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground">
                  Siap Memulai Perjalanan?
                </h2>
                <p className="mt-3 text-primary-foreground/80 max-w-md mx-auto">
                  Ribuan pengguna sudah konsisten. Mulai gratis sekarang, tidak perlu kartu kredit.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-sm hover:brightness-95 transition-all active:scale-95 w-full sm:w-auto"
                  >
                    Daftar Gratis
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-primary-foreground/30 text-primary-foreground px-8 py-3.5 text-sm font-medium hover:bg-white/10 transition-all active:scale-95 w-full sm:w-auto"
                  >
                    Masuk
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10">
        <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Nashifa Habit</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nashifa Habit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
