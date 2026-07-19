'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Lock, Crown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isPro } from '@/lib/subscription'
import type { TemplatePack } from '@/lib/templates'

type Category = {
  key: string
  label: string
  emoji: string
}

const CATEGORIES: Category[] = [
  { key: 'kesehatan', label: 'Kesehatan', emoji: '💪' },
  { key: 'produktivitas', label: 'Produktivitas', emoji: '⚡' },
  { key: 'ibadah', label: 'Ibadah', emoji: '🕌' },
  { key: 'keluarga', label: 'Keluarga', emoji: '👨‍👩‍👧‍👦' },
  { key: 'lainnya', label: 'Lainnya', emoji: '📌' },
]

function getCatMeta(cat: string): Category {
  return CATEGORIES.find((c) => c.key === cat) || { key: cat, label: cat, emoji: '📌' }
}

export default function TemplatesPage() {
  const router = useRouter()
  const [packs, setPacks] = useState<TemplatePack[]>([])
  const [loading, setLoading] = useState(true)
  const [pro, setPro] = useState(false)
  const [showUpsell, setShowUpsell] = useState<TemplatePack | null>(null)
  const [checkingPro, setCheckingPro] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('template_packs')
      .select('*, items:template_items(id)')
      .eq('is_published', true)
      .order('sort_order')

    setPacks((data || []).map((p) => ({
      ...p,
      item_count: p.items?.length || 0,
      items: undefined,
    })))

    const isProUser = await isPro()
    setPro(isProUser)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    packs: packs.filter((p) => p.category === cat.key),
  })).filter((g) => g.packs.length > 0)

  async function handlePackClick(pack: TemplatePack) {
    if (pack.is_premium && !pro) {
      setShowUpsell(pack)
      return
    }
    router.push(`/dashboard/templates/${pack.slug}`)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse mb-4" />
        ))}
      </div>
    )
  }

  if (packs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-accent/40 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">Belum ada template</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px] mx-auto">
            Template akan muncul di sini setelah admin mempublikasikannya
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">

      <div>
        <p className="text-[13px] text-muted-foreground font-medium">Template Habit</p>
        <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Mulai dari Template</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih paket habit siap pakai dan terapkan dengan sekali klik
        </p>
      </div>

      <div className="mt-6 space-y-8">
        {grouped.map((group) => (
          <section key={group.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{group.emoji}</span>
              <h2 className="font-semibold text-base">{group.label}</h2>
            </div>
            <div className="space-y-3">
              {group.packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handlePackClick(pack)}
                  className="w-full text-left rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] p-4 transition-all active:scale-[0.98] hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{pack.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{pack.title}</p>
                        {pack.is_premium && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" />
                            PRO
                          </span>
                        )}
                      </div>
                      {pack.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {pack.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {pack.item_count} kebiasaan
                      </p>
                    </div>
                    <div className="shrink-0 mt-1">
                      {pack.is_premium && !pro ? (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!showUpsell} onOpenChange={(o) => !o && setShowUpsell(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-5 h-5 text-amber-500" />
              Fitur Pro
            </DialogTitle>
            <DialogDescription className="text-sm">
              Template <strong>{showUpsell?.title}</strong> adalah paket premium. Upgrade ke Pro untuk mengakses semua template habit eksklusif.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full gap-2"
              disabled={checkingPro}
              onClick={() => {
                setCheckingPro(true)
                isPro().then((p) => {
                  if (p) {
                    setPro(true)
                    setShowUpsell(null)
                    if (showUpsell) router.push(`/dashboard/templates/${showUpsell.slug}`)
                  }
                  setCheckingPro(false)
                })
              }}
            >
              {checkingPro ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              Upgrade ke Pro
            </Button>
            <Button variant="outline" onClick={() => setShowUpsell(null)}>
              Nanti saja
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
