import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Nashifa Habit
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        Bangun kebiasaan baik dengan pengingat otomatis via WhatsApp. Lacak
        progresmu setiap hari.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Daftar Gratis
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent"
        >
          Masuk
        </Link>
      </div>
    </div>
  )
}
