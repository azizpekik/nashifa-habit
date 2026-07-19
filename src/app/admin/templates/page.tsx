'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react'
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
  DialogFooter,
} from '@/components/ui/dialog'

type TemplatePack = {
  id: string
  slug: string
  title: string
  description: string | null
  category: string
  emoji: string
  is_premium: boolean
  is_published: boolean
  sort_order: number
  item_count?: number
}

type TemplateItem = {
  id: string
  pack_id: string
  name: string
  description: string | null
  default_send_time: string
  default_days: number[]
  sort_order: number
}

const CATEGORIES = ['kesehatan', 'produktivitas', 'ibadah', 'keluarga', 'lainnya']
const DAY_LABELS = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const defaultPackForm = {
  title: '',
  slug: '',
  description: '',
  category: 'kesehatan',
  emoji: '✨',
  is_premium: true,
  is_published: false,
  sort_order: 0,
}

const defaultItemForm = {
  name: '',
  description: '',
  default_send_time: '07:00',
  default_days: [1, 2, 3, 4, 5, 6, 7] as number[],
  sort_order: 0,
}

export default function AdminTemplatesPage() {
  const [packs, setPacks] = useState<TemplatePack[]>([])
  const [loading, setLoading] = useState(true)

  const [showPackDialog, setShowPackDialog] = useState(false)
  const [packForm, setPackForm] = useState(defaultPackForm)
  const [editingPack, setEditingPack] = useState<string | null>(null)
  const [savingPack, setSavingPack] = useState(false)

  const [showDeletePack, setShowDeletePack] = useState<string | null>(null)

  const [selectedPack, setSelectedPack] = useState<TemplatePack | null>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [showItemDialog, setShowItemDialog] = useState(false)
  const [itemForm, setItemForm] = useState(defaultItemForm)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [savingItem, setSavingItem] = useState(false)

  const [showDeleteItem, setShowDeleteItem] = useState<string | null>(null)

  const loadPacks = useCallback(async () => {
    const res = await fetch('/api/admin/templates')
    if (res.ok) {
      const data = await res.json()
      setPacks(data.map((p: any) => ({ ...p, item_count: p.items?.length || 0, items: undefined })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPacks() }, [loadPacks])

  const loadItems = useCallback(async (packId: string) => {
    setLoadingItems(true)
    const res = await fetch(`/api/admin/templates/${packId}/items`)
    if (res.ok) {
      const data = await res.json()
      setItems(data)
    }
    setLoadingItems(false)
  }, [])

  async function savePack() {
    setSavingPack(true)
    const url = editingPack ? `/api/admin/templates/${editingPack}` : '/api/admin/templates'
    const method = editingPack ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packForm),
    })

    if (res.ok) {
      toast.success(editingPack ? 'Pack diperbarui' : 'Pack dibuat')
      setShowPackDialog(false)
      setEditingPack(null)
      setPackForm(defaultPackForm)
      loadPacks()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Gagal menyimpan')
    }
    setSavingPack(false)
  }

  function editPack(pack: TemplatePack) {
    setPackForm({
      title: pack.title,
      slug: pack.slug,
      description: pack.description || '',
      category: pack.category,
      emoji: pack.emoji,
      is_premium: pack.is_premium,
      is_published: pack.is_published,
      sort_order: pack.sort_order,
    })
    setEditingPack(pack.id)
    setShowPackDialog(true)
  }

  async function deletePack(id: string) {
    const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Pack dihapus')
      setShowDeletePack(null)
      if (selectedPack?.id === id) {
        setSelectedPack(null)
        setItems([])
      }
      loadPacks()
    } else {
      toast.error('Gagal menghapus')
    }
  }

  async function saveItem() {
    if (!selectedPack) return
    setSavingItem(true)
    const url = editingItem
      ? `/api/admin/templates/${selectedPack.id}/items/${editingItem}`
      : `/api/admin/templates/${selectedPack.id}/items`
    const method = editingItem ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemForm),
    })

    if (res.ok) {
      toast.success(editingItem ? 'Item diperbarui' : 'Item ditambahkan')
      setShowItemDialog(false)
      setEditingItem(null)
      setItemForm(defaultItemForm)
      loadItems(selectedPack.id)
      loadPacks()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Gagal menyimpan')
    }
    setSavingItem(false)
  }

  function editItem(item: TemplateItem) {
    setItemForm({
      name: item.name,
      description: item.description || '',
      default_send_time: item.default_send_time?.slice(0, 5),
      default_days: item.default_days,
      sort_order: item.sort_order,
    })
    setEditingItem(item.id)
    setShowItemDialog(true)
  }

  async function deleteItem(id: string) {
    if (!selectedPack) return
    const res = await fetch(`/api/admin/templates/${selectedPack.id}/items/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Item dihapus')
      setShowDeleteItem(null)
      loadItems(selectedPack.id)
      loadPacks()
    } else {
      toast.error('Gagal menghapus')
    }
  }

  function toggleItemDay(day: number) {
    setItemForm((prev) => ({
      ...prev,
      default_days: prev.default_days.includes(day)
        ? prev.default_days.filter((d) => d !== day)
        : [...prev.default_days, day].sort((a, b) => a - b),
    }))
  }

  if (loading) {
    return (
      <div>
        <div className="h-7 w-32 bg-muted rounded animate-pulse mb-6" />
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Template Packs</h1>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingPack(null); setPackForm(defaultPackForm); setShowPackDialog(true) }}>
          <Plus className="w-4 h-4" />
          Tambah Pack
        </Button>
      </div>

      {packs.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Belum ada template pack</p>
          <p className="text-sm text-muted-foreground mt-1">Klik &quot;Tambah Pack&quot; untuk membuat template pertama</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map((pack) => (
            <div
              key={pack.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedPack(selectedPack?.id === pack.id ? null : pack)
                if (selectedPack?.id !== pack.id) loadItems(pack.id)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPack(selectedPack?.id === pack.id ? null : pack); if (selectedPack?.id !== pack.id) loadItems(pack.id) } }}
              className={`text-left rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] p-4 transition-all hover:shadow-md cursor-pointer ${
                selectedPack?.id === pack.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{pack.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{pack.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pack.item_count || 0} item</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{pack.category}</span>
                    {pack.is_premium && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">PRO</span>}
                    {pack.is_published ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Published</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Draft</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); editPack(pack) }}
                    className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDeletePack(pack.id) }}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPack && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{selectedPack.emoji} {selectedPack.title} — Item</h2>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditingItem(null); setItemForm(defaultItemForm); setShowItemDialog(true) }}>
              <Plus className="w-3.5 h-3.5" />
              Tambah Item
            </Button>
          </div>

          {loadingItems ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada item. Tambah item pertama.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.default_send_time?.slice(0, 5)} • {item.default_days?.map((d: number) => DAY_LABELS[d]).join(', ') || 'Setiap hari'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => editItem(item)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button type="button" onClick={() => setShowDeleteItem(item.id)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showPackDialog} onOpenChange={(o) => !o && setShowPackDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPack ? 'Edit Pack' : 'Buat Pack Baru'}</DialogTitle>
            <DialogDescription>Template pack berisi kumpulan habit siap pakai</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Judul</Label>
              <Input value={packForm.title} onChange={(e) => {
                const title = e.target.value
                setPackForm((p) => ({
                  ...p,
                  title,
                  slug: editingPack ? p.slug : slugify(title),
                }))
              }} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={packForm.slug} onChange={(e) => setPackForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Auto dari judul" />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input value={packForm.description} onChange={(e) => setPackForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <select
                  value={packForm.category}
                  onChange={(e) => setPackForm((p) => ({ ...p, category: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <Input value={packForm.emoji} onChange={(e) => setPackForm((p) => ({ ...p, emoji: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={packForm.is_premium} onChange={(e) => setPackForm((p) => ({ ...p, is_premium: e.target.checked }))} />
                Premium
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={packForm.is_published} onChange={(e) => setPackForm((p) => ({ ...p, is_published: e.target.checked }))} />
                Published
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackDialog(false)}>Batal</Button>
            <Button onClick={savePack} disabled={savingPack || !packForm.title || !packForm.slug}>
              {savingPack ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showItemDialog} onOpenChange={(o) => !o && setShowItemDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Tambah Item'}</DialogTitle>
            <DialogDescription>Setiap item akan menjadi habit yang bisa diterapkan user</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Habit</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Input value={itemForm.description} onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Jam Default</Label>
              <Input type="time" value={itemForm.default_send_time} onChange={(e) => setItemForm((p) => ({ ...p, default_send_time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Hari Default</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleItemDay(day)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      itemForm.default_days.includes(day)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Batal</Button>
            <Button onClick={saveItem} disabled={savingItem || !itemForm.name}>
              {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeletePack} onOpenChange={(o) => !o && setShowDeletePack(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pack?</DialogTitle>
            <DialogDescription>
              Semua item dalam pack akan ikut terhapus. Habit user yang sudah dibuat dari template ini TIDAK ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePack(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => showDeletePack && deletePack(showDeletePack)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteItem} onOpenChange={(o) => !o && setShowDeleteItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Item?</DialogTitle>
            <DialogDescription>Item akan dihapus dari template pack ini.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => showDeleteItem && deleteItem(showDeleteItem)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
