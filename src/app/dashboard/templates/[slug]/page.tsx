'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Check, Loader2, Crown, Sparkles, Archive, Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { isPro } from '@/lib/subscription'
import type { TemplatePack, TemplateItem } from '@/lib/templates'

const DAY_LABELS = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [pack, setPack] = useState<TemplatePack | null>(null)
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [pro, setPro] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [times, setTimes] = useState<Record<string, string>>({})
  const [days, setDays] = useState<Record<string, number[]>>({})

  const [activeCount, setActiveCount] = useState(0)
  const [showArchiveChoice, setShowArchiveChoice] = useState(false)
  const [showFocusWarning, setShowFocusWarning] = useState(false)
  const [archiveFirst, setArchiveFirst] = useState(false)
  const [pendingApply, setPendingApply] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: packData } = await supabase
      .from('template_packs')
      .select('*, items:template_items(*)')
      .eq('slug', slug)
      .single()

    if (!packData) {
      toast.error('Template tidak ditemukan')
      router.push('/dashboard/templates')
      return
    }

    const sortedItems = (packData.items || []).sort((a: TemplateItem, b: TemplateItem) => a.sort_order - b.sort_order)
    const fullPack: TemplatePack = { ...packData, items: sortedItems }
    setPack(fullPack)

    const isProUser = await isPro()
    setPro(isProUser)

    if (fullPack.is_premium && !isProUser) {
      setShowUpsell(true)
      setLoading(false)
      return
    }

    const { data: allActive } = await supabase
      .from('habits')
      .select('id, template_item_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    setActiveCount(allActive?.length || 0)

    const existing = new Set<string>((allActive || []).filter((h) => h.template_item_id).map((h) => h.template_item_id))
    setExistingIds(existing)

    const initialSelected = new Set<string>()
    const initialTimes: Record<string, string> = {}
    const initialDays: Record<string, number[]> = {}

    for (const item of sortedItems) {
      if (!existing.has(item.id)) {
        initialSelected.add(item.id)
      }
      initialTimes[item.id] = item.default_send_time?.slice(0, 5) || '07:00'
      initialDays[item.id] = item.default_days || [1, 2, 3, 4, 5, 6, 7]
    }

    setSelected(initialSelected)
    setTimes(initialTimes)
    setDays(initialDays)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleItem(itemId: string) {
    if (existingIds.has(itemId)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function updateTime(itemId: string, value: string) {
    setTimes((prev) => ({ ...prev, [itemId]: value }))
  }

  function toggleDay(itemId: string, day: number) {
    setDays((prev) => {
      const current = prev[itemId] || []
      return {
        ...prev,
        [itemId]: current.includes(day)
          ? current.filter((d) => d !== day)
          : [...current, day].sort((a, b) => a - b),
      }
    })
  }

  async function handleApplyClick() {
    const selectedItems = (pack?.items || []).filter((item) => selected.has(item.id))
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal satu habit untuk diterapkan')
      return
    }

    if (activeCount > 0) {
      setPendingApply(true)
      setArchiveFirst(false)
      setShowArchiveChoice(true)
    } else {
      doApply(selectedItems, false)
    }
  }

  async function doApply(selectedItems: TemplateItem[], archiveOld: boolean) {
    setApplying(true)
    setShowArchiveChoice(false)
    setShowFocusWarning(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (archiveOld) {
      await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true)
    }

    const newCount = archiveOld ? selectedItems.length : activeCount + selectedItems.length
    if (newCount > 8) {
      setPendingApply(false)
      setShowFocusWarning(true)
      return
    }

    let created = 0

    for (const item of selectedItems) {
      const itemDays = days[item.id] || item.default_days || [1, 2, 3, 4, 5, 6, 7]
      const frequency = itemDays.length === 7 ? 'daily' : 'custom'
      const targetPerWeek = frequency === 'custom' ? itemDays.length : null

      const { data: newHabit, error: habitError } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: item.name,
          description: item.description,
          frequency,
          target_per_week: targetPerWeek,
          color: '#22c55e',
          template_item_id: item.id,
          sort_order: item.sort_order,
        })
        .select()
        .single()

      if (habitError) {
        console.error('Failed to create habit:', habitError)
        continue
      }

      const { error: schedError } = await supabase
        .from('schedules')
        .insert({
          habit_id: newHabit.id,
          user_id: user.id,
          send_time: (times[item.id] || item.default_send_time || '07:00') + ':00',
          days_of_week: itemDays,
        })

      if (schedError) {
        console.error('Failed to create schedule:', schedError)
        continue
      }

      created++
    }

    setApplying(false)
    setPendingApply(false)

    if (created > 0) {
      toast.success(`${created} habit berhasil ditambahkan 🎉`)
      window.dispatchEvent(new Event('habit-created'))
      router.push('/dashboard')
    } else {
      toast.error('Gagal menambahkan habit, coba lagi')
    }
  }

  async function doApplyAfterWarning() {
    const selectedItems = (pack?.items || []).filter((item) => selected.has(item.id))
    await doApply(selectedItems, archiveFirst)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse mb-3" />
        ))}
      </div>
    )
  }

  if (!pack) return null

  return (
    <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
      <button
        onClick={() => router.push('/dashboard/templates')}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      <div className="flex items-start gap-3 mb-6">
        <div className="text-3xl">{pack.emoji}</div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{pack.title}</h1>
            {pack.is_premium && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
          </div>
          {pack.description && (
            <p className="text-sm text-muted-foreground mt-1">{pack.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {(pack.items || []).map((item) => {
          const isExisting = existingIds.has(item.id)
          const isSelected = selected.has(item.id)
          const itemDays = days[item.id] || item.default_days || []

          return (
            <div
              key={item.id}
              className={`rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] p-4 transition-all ${
                isExisting ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  disabled={isExisting}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isExisting
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                  }`}
                >
                  {(isExisting || isSelected) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${isExisting ? 'text-muted-foreground' : ''}`}>
                      {item.name}
                    </p>
                    {isExisting && (
                      <span className="text-[10px] text-green-600 font-medium">Sudah ditambahkan</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}

                  {!isExisting && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Jam reminder</Label>
                        <Input
                          type="time"
                          value={times[item.id] || item.default_send_time?.slice(0, 5) || '07:00'}
                          onChange={(e) => updateTime(item.id, e.target.value)}
                          className="h-8 mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Hari</Label>
                        <div className="flex gap-1 mt-1.5">
                          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(item.id, day)}
                              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                                itemDays.includes(day)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {DAY_LABELS[day]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <Button
          className="w-full gap-2"
          onClick={handleApplyClick}
          disabled={applying || selected.size === 0 || pendingApply}
        >
          {applying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {applying ? 'Menerapkan...' : `Terapkan ${selected.size} Habit`}
        </Button>
      </div>

      <AlertDialog open={showArchiveChoice} onOpenChange={(o) => { if (!o) { setShowArchiveChoice(false); setPendingApply(false) } }}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Kamu punya {activeCount} habit aktif</AlertDialogTitle>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>Mau diapakan habit yang sudah ada?</div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setArchiveFirst(false); doApply((pack?.items || []).filter((item) => selected.has(item.id)), false) }}
                  className="flex items-start gap-3 rounded-xl border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Tambahkan ke habit yang ada</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Habit baru akan ditambahkan tanpa mengganggu habit yang sudah ada</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setArchiveFirst(true); doApply((pack?.items || []).filter((item) => selected.has(item.id)), true) }}
                  className="flex items-start gap-3 rounded-xl border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <Archive className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Arsipkan habit lama, mulai fresh</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Habit lama akan diarsipkan (riwayat aman, bisa diaktifkan kapan saja) dan diganti dengan habit baru dari template ini</div>
                  </div>
                </button>
              </div>
            </div>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFocusWarning} onOpenChange={(o) => { if (!o) { setShowFocusWarning(false); setApplying(false) } }}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Terlalu banyak habit?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Total habit aktif kamu akan melebihi 8. Terlalu banyak habit bisa menurunkan fokus. Sebaiknya tetap di bawah 8 habit agar konsisten. Tetap lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batalkan</AlertDialogCancel>
            <AlertDialogAction onClick={doApplyAfterWarning}>
              Ya, lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showUpsell} onOpenChange={(o) => {
        if (!o) {
          setShowUpsell(false)
          router.push('/dashboard/templates')
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-5 h-5 text-amber-500" />
              Fitur Pro
            </DialogTitle>
            <DialogDescription className="text-sm">
              Template <strong>{pack?.title}</strong> adalah paket premium. Upgrade ke Pro untuk mengaksesnya.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2">
              <Crown className="w-4 h-4" />
              Upgrade ke Pro
            </Button>
            <Button variant="outline" onClick={() => { setShowUpsell(false); router.push('/dashboard/templates') }}>
              Kembali
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
