'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { generateStreakCard, CardSize } from '@/lib/streak-card'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  habitName: string
  streak: number
  color: string
  heatmapData: boolean[]
  userName: string
  title?: string
}

export default function StreakShareDialog({
  open,
  onOpenChange,
  habitName,
  streak,
  color,
  heatmapData,
  userName,
  title,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  function setUrl(url: string) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    setPreviewUrl(url)
  }

  async function handleGenerate(size: CardSize) {
    setGenerating(true)
    try {
      const blob = await generateStreakCard({
        habitName,
        streak,
        color,
        heatmapData,
        userName,
        size,
      })
      const url = URL.createObjectURL(blob)
      setUrl(url)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload() {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `streak-${habitName.toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  async function handleShare() {
    if (!previewUrl) return
    const blob = await fetch(previewUrl).then((r) => r.blob())
    const file = new File([blob], `streak-${habitName.toLowerCase().replace(/\s+/g, '-')}.png`, {
      type: 'image/png',
    })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `${streak} hari berturut-turut! 🔥`,
        text: `Aku sudah ${streak} hari berturut-turut "${habitName}"!`,
        files: [file],
      })
    } else {
      handleDownload()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || 'Bagikan Streak'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {previewUrl && (
            <div className="overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Streak Card"
                className="w-full h-auto"
              />
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => handleGenerate('portrait')}
            disabled={generating}
          >
            {generating ? 'Memproses...' : 'Buat Story'}
          </Button>

          {previewUrl && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                Download PNG
              </Button>
              <Button className="flex-1" onClick={handleShare}>
                Bagikan
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
