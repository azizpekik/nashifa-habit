'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ColorPicker from '@/components/color-picker'
import FrequencyPicker from '@/components/frequency-picker'
import { Loader2, Check } from 'lucide-react'

type FrequencyType = 'everyday' | 'pickdays'

type Recommendation = {
  icon: string
  name: string
  time: string
  description: string
  color: string
  daysOfWeek: number[]
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    icon: '💧',
    name: 'Minum Air Putih Hangat',
    time: '05:30',
    description: 'Hidrasi tubuh setelah bangun tidur',
    color: '#3b82f6',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    icon: '🚶',
    name: 'Jalan Kaki 3000 Langkah',
    time: '16:30',
    description: 'Aktivitas fisik ringan setiap sore',
    color: '#22c55e',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    icon: '😴',
    name: 'Tidur Tepat Waktu',
    time: '20:30',
    description: 'Istirahat cukup untuk kesehatan',
    color: '#8b5cf6',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  },
]

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB (Asia/Jakarta)' },
  { value: 'Asia/Makassar', label: 'WITA (Asia/Makassar)' },
  { value: 'Asia/Jayapura', label: 'WIT (Asia/Jayapura)' },
]

const REFERRAL_OPTIONS = [
  { value: 'threads', label: 'Threads' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google Search' },
  { value: 'rekomendasi_orang', label: 'Rekomendasi Orang' },
  { value: 'ads', label: 'Iklan (Ads)' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)

  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [loading, setLoading] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)

  const [habitName, setHabitName] = useState('')
  const [habitDesc, setHabitDesc] = useState('')
  const [habitColor, setHabitColor] = useState('#22c55e')
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('everyday')
  const [sendTime, setSendTime] = useState('07:00')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])

  const [successAnim, setSuccessAnim] = useState<string | null>(null)

  const [referralSource, setReferralSource] = useState('')
  const [referralOther, setReferralOther] = useState('')

  function handleFrequencyChange(type: FrequencyType) {
    if (type === 'everyday') {
      setDaysOfWeek([1, 2, 3, 4, 5, 6, 7])
    }
    setFrequencyType(type)
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  function isCustomValid() {
    if (!showCustomForm) return false
    if (!habitName.trim()) return false
    if (frequencyType === 'pickdays' && daysOfWeek.length === 0) return false
    return true
  }

  function canFinish() {
    if (selectedRec) return true
    if (isCustomValid()) return true
    return false
  }

  function getHabitData() {
    if (selectedRec) {
      return {
        name: selectedRec.name,
        color: selectedRec.color,
        time: selectedRec.time,
        daysOfWeek: selectedRec.daysOfWeek,
        frequency: 'daily' as const,
        targetPerWeek: null as number | null,
        description: selectedRec.description,
      }
    }
    return {
      name: habitName.trim(),
      color: habitColor,
      time: sendTime,
      daysOfWeek: frequencyType === 'everyday' ? [1, 2, 3, 4, 5, 6, 7] : daysOfWeek,
      frequency: frequencyType === 'everyday' ? 'daily' as const : 'custom' as const,
      targetPerWeek: frequencyType === 'everyday' ? null : daysOfWeek.length,
      description: habitDesc || null,
    }
  }

  async function handleFinish() {
    if (!canFinish()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); window.location.href = '/login'; return }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ timezone })
      .eq('id', user.id)
    if (profileErr) { setError('Gagal simpan preferensi'); setLoading(false); return }

    const h = getHabitData()
    const { data: habit, error: habitErr } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        name: h.name,
        description: h.description,
        frequency: h.frequency,
        target_per_week: h.targetPerWeek,
        color: h.color,
      })
      .select()
      .single()
    if (habitErr || !habit) { setError('Gagal simpan habit'); setLoading(false); return }

    const { error: schedErr } = await supabase.from('schedules').insert({
      habit_id: habit.id,
      user_id: user.id,
      send_time: h.time + ':00',
      days_of_week: h.daysOfWeek,
    })
    if (schedErr) { setError('Gagal simpan jadwal'); setLoading(false); return }

    setLoading(false)
    setSuccessAnim(h.name)
    await new Promise((r) => setTimeout(r, 1500))
    setSuccessAnim(null)
    setStep(2)
  }

  async function handleSurvey() {
    const source = referralSource === 'lainnya' && referralOther.trim()
      ? referralOther.trim()
      : referralSource
    if (!source) return

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ referral_source: source }).eq('id', user.id)
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="flex min-h-screen flex-col px-5 py-10">
      {successAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-300">
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in duration-500">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-xl font-bold">All Set! 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {successAnim} sudah siap dilacak
            </p>
          </div>
        </div>
      )}

      <div className="relative mx-auto w-full max-w-sm flex-1">
        <div
          className={`transition-all duration-500 ${
            step === 0
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none absolute inset-0'
          }`}
        >
          {step === 0 && (
            <div className="flex flex-col justify-center min-h-full pt-12">
              <div className="text-center">
                <Image
                  src="/logo-nashifa.png"
                  alt="Nashifa Habit"
                  width={80}
                  height={80}
                  className="mx-auto mb-4"
                />

                <h1 className="text-2xl font-bold tracking-tight">Selamat Datang!</h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Mulai lacak kebiasaan baikmu dengan Nashifa Habit
                </p>

                <div className="mt-8 space-y-3 text-left">
                  <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                    <span className="mt-0.5 text-lg">📊</span>
                    <div>
                      <p className="text-sm font-medium">Lacak Kebiasaan Harian</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Catat progres harian dan lihat perkembangan streak
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                    <span className="mt-0.5 text-lg">🔔</span>
                    <div>
                      <p className="text-sm font-medium">Reminder WhatsApp</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dapatkan pengingat otomatis via WhatsApp setiap hari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                    <span className="mt-0.5 text-lg">🔥</span>
                    <div>
                      <p className="text-sm font-medium">Streak & Laporan</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pantau konsistensi dengan streak dan laporan mingguan
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-2">
                  <Label className="text-xs text-muted-foreground">Zona Waktu</Label>
                  <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="mt-3 text-sm text-destructive">{error}</p>
                )}

                <Button
                  className="mt-6 w-full rounded-xl py-6 text-base font-semibold"
                  onClick={async () => {
                    setStartLoading(true)
                    await new Promise((r) => setTimeout(r, 300))
                    setStep(1)
                    setStartLoading(false)
                  }}
                  disabled={startLoading}
                >
                  {startLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Memuat...
                    </>
                  ) : (
                    'Mulai'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`transition-all duration-500 ${
            step === 1
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none absolute inset-0'
          }`}
        >
          {step === 1 && (
            <div className="pt-4">
              <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Langkah 2 dari 2
              </p>
              <h1 className="mt-2 text-center text-xl font-bold tracking-tight">
                Buat 1 Habit Pertamamu
              </h1>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Pilih rekomendasi atau buat habit custom
              </p>

              {error && (
                <p className="my-3 text-sm text-destructive text-center">{error}</p>
              )}

              <div className="mt-5 space-y-3">
                {RECOMMENDATIONS.map((rec) => {
                  const isSelected = selectedRec?.name === rec.name
                  return (
                    <button
                      key={rec.name}
                      onClick={() => {
                        setSelectedRec(isSelected ? null : rec)
                        setShowCustomForm(false)
                      }}
                      disabled={loading}
                      className={`group relative w-full rounded-2xl border p-4 text-left shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'bg-card hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                          style={{ backgroundColor: rec.color + '20' }}
                        >
                          {rec.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{rec.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                          <p className="text-xs font-medium mt-1" style={{ color: rec.color }}>
                            ⏰ {rec.time.slice(0, 5).replace(':', '.')} • Setiap hari
                          </p>
                        </div>
                        <div className="shrink-0">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground scale-100'
                              : 'bg-primary/10 text-primary opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                          }`}>
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}

                <div className="relative">
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">atau</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCustomForm(!showCustomForm)
                    if (!showCustomForm) setSelectedRec(null)
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 border-dashed bg-card p-4 text-left transition-all active:scale-[0.98] ${
                    showCustomForm
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50 hover:bg-primary/[0.02]'
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <span className="text-xl text-primary">+</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Buat Habit Custom</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Atur sendiri nama, warna, dan jadwal reminder
                    </p>
                  </div>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-400 ${
                    showCustomForm ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-4 pt-2 pb-2">
                    <div className="space-y-2">
                      <Label htmlFor="habitName">Nama Habit</Label>
                      <Input
                        id="habitName"
                        placeholder="Misal: Minum Air Putih"
                        value={habitName}
                        onChange={(e) => setHabitName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="habitDesc">Deskripsi (opsional)</Label>
                      <Input
                        id="habitDesc"
                        placeholder="Deskripsi habit"
                        value={habitDesc}
                        onChange={(e) => setHabitDesc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Warna Accent</Label>
                      <ColorPicker value={habitColor} onChange={setHabitColor} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sendTime">Jam Reminder</Label>
                      <Input
                        id="sendTime"
                        type="time"
                        value={sendTime}
                        onChange={(e) => setSendTime(e.target.value)}
                      />
                    </div>
                    <FrequencyPicker
                      frequencyType={frequencyType}
                      daysOfWeek={daysOfWeek}
                      onFrequencyChange={handleFrequencyChange}
                      onToggleDay={toggleDay}
                    />
                  </div>
                </div>
              </div>

              <Button
                className="mt-6 w-full rounded-xl py-6 text-base font-semibold"
                onClick={handleFinish}
                disabled={!canFinish() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Selesai'
                )}
              </Button>
            </div>
          )}
        </div>

        <div
          className={`transition-all duration-500 ${
            step === 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none absolute inset-0'
          }`}
        >
          {step === 2 && (
            <div className="flex flex-col justify-center min-h-full pt-12">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="text-3xl">🎉</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">Hampir Selesai!</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Dapat info Nashifa Habit dari mana?
                </p>
              </div>

              <div className="mt-6 space-y-2">
                {REFERRAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReferralSource(opt.value)}
                    className={`w-full rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
                      referralSource === opt.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'bg-card hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        referralSource === opt.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      }`}>
                        {referralSource === opt.value && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {referralSource === 'lainnya' && (
                <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                  <Input
                    placeholder="Tulis sumber lainnya..."
                    value={referralOther}
                    onChange={(e) => setReferralOther(e.target.value)}
                  />
                </div>
              )}

              <Button
                className="mt-8 w-full rounded-xl py-6 text-base font-semibold"
                onClick={handleSurvey}
                disabled={!referralSource || loading || (referralSource === 'lainnya' && !referralOther.trim())}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Selesai'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
