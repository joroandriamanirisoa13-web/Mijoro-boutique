
-- Table products + triggers + RLS (Owner-only write)

-- Mila extension ho an'ny UUID
create extension if not exists "pgcrypto";

-- Table: products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text check (type in ('ebook','video','app')) not null,
  is_free boolean not null default false,
  price numeric(10,2) not null default 0,
  promo int not null default 0 check (promo between 0 and 100),
  is_vip boolean not null default false,

  -- Media fototra
  image_url text,    -- sary cover
  media_url text,    -- video na PDF na trailer link

  -- App/Jeux fanampiny
  platform text check (platform in ('android','ios','windows','mac','linux','web')),
  version text,
  build_number text,
  file_url text,        -- APK/ZIP/EXE/DMG ...
  file_size bigint,
  file_type text,       -- mime/extension
  screenshots text[] default '{}', -- sary maromaro
  sha256 text,

  description text,
  tags text[] default '{}',

  owner uuid not null,  -- ref ho an'ny user (auth.users.id)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products(created_at desc);

-- Trigger hanavaozana updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- RLS
alter table public.products enable row level security;

-- SELECT: public (anon & authenticated) afaka mamaky
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'public can read products'
  ) then
    create policy "public can read products"
    on public.products for select
    to anon, authenticated
    using (true);
  end if;
end $$;

-- INSERT: owner ihany (email mifanaraka)
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'only owner can insert'
  ) then
    create policy "only owner can insert"
    on public.products for insert
    to authenticated
    with check (
      auth.uid() = owner
      and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com'
    );
  end if;
end $$;

-- UPDATE: owner ihany
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'only owner can update'
  ) then
    create policy "only owner can update"
    on public.products for update
    to authenticated
    using (
      auth.uid() = owner
      and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com'
    )
    with check (
      auth.uid() = owner
      and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com'
    );
  end if;
end $$;

-- DELETE: owner ihany
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'only owner can delete'
  ) then
    create policy "only owner can delete"
    on public.products for delete
    to authenticated
    using (
      auth.uid() = owner
      and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com'
    );
  end if;
end $$;
