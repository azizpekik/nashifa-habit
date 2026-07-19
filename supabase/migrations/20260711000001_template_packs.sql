-- Role untuk gerbang admin
alter table public.profiles add column if not exists role text not null default 'user'
  check (role in ('user','admin'));

-- Atribusi habit ke template (analitik & duplikasi guard)
alter table public.habits add column if not exists template_item_id uuid;

-- Template packs
create table if not exists public.template_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text not null,            -- 'kesehatan' | 'produktivitas' | 'ibadah' | 'keluarga' | 'lainnya'
  emoji text default '✨',
  is_premium boolean not null default true,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Template items
create table if not exists public.template_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.template_packs(id) on delete cascade,
  name text not null,
  description text,
  default_send_time time not null default '06:00',
  default_days smallint[] not null default '{1,2,3,4,5,6,7}',
  sort_order int not null default 0
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_template_packs_updated on public.template_packs;
create trigger trg_template_packs_updated before update on public.template_packs
  for each row execute function public.set_updated_at();

-- RLS
alter table public.template_packs enable row level security;
alter table public.template_items enable row level security;

drop policy if exists "packs_read_published" on public.template_packs;
create policy "packs_read_published" on public.template_packs
  for select using (is_published = true or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "items_read" on public.template_items;
create policy "items_read" on public.template_items
  for select using (exists (
    select 1 from template_packs tp where tp.id = pack_id
      and (tp.is_published = true or exists (
        select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))));
