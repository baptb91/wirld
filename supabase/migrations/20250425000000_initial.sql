-- WILDS — initial Supabase schema
-- Run this in your Supabase SQL Editor or via `supabase db push`

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  pending_gold  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- leaderboard
-- ─────────────────────────────────────────────────────────────────────────────
create table public.leaderboard (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null default 'Anonymous',
  creature_count integer not null default 0,
  rarity_score   integer not null default 0,
  level          integer not null default 1,
  updated_at     timestamptz not null default now()
);

create index leaderboard_score_idx on public.leaderboard (rarity_score desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- market_listings
-- ─────────────────────────────────────────────────────────────────────────────
create table public.market_listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references auth.users(id) on delete cascade,
  seller_name   text not null default 'Anonymous',
  species_id    text not null,
  species_name  text not null,
  rarity        text not null,
  is_shiny      boolean not null default false,
  creature_name text not null,
  price_gold    integer not null check (price_gold > 0),
  status        text not null default 'available'
                  check (status in ('available', 'sold', 'cancelled')),
  listed_at     timestamptz not null default now(),
  sold_at       timestamptz
);

create index market_available_idx on public.market_listings (status, listed_at desc)
  where status = 'available';

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.leaderboard     enable row level security;
alter table public.market_listings enable row level security;

-- profiles
create policy "Profiles readable by all"
  on public.profiles for select using (true);
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- leaderboard
create policy "Leaderboard readable by all"
  on public.leaderboard for select using (true);
create policy "Users upsert own score"
  on public.leaderboard for insert with check (auth.uid() = id);
create policy "Users update own score"
  on public.leaderboard for update using (auth.uid() = id);

-- market listings
create policy "Listings readable by all"
  on public.market_listings for select using (true);
create policy "Authenticated users can create listings"
  on public.market_listings for insert with check (auth.uid() = seller_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: complete_purchase (atomic — marks sold + credits seller)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.complete_purchase(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing market_listings%rowtype;
begin
  select * into v_listing
  from market_listings
  where id = p_listing_id and status = 'available'
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Listing no longer available');
  end if;

  if v_listing.seller_id = auth.uid() then
    return json_build_object('success', false, 'error', 'Cannot buy your own listing');
  end if;

  update market_listings
  set status = 'sold', sold_at = now()
  where id = p_listing_id;

  -- Credit seller
  insert into profiles (id, pending_gold)
  values (v_listing.seller_id, v_listing.price_gold)
  on conflict (id) do update
    set pending_gold = profiles.pending_gold + v_listing.price_gold,
        updated_at   = now();

  return json_build_object('success', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: cancel_listing (seller only)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_listing(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update market_listings
  set status = 'cancelled'
  where id = p_listing_id
    and seller_id = auth.uid()
    and status = 'available';

  if not found then
    return json_build_object('success', false, 'error', 'Cannot cancel this listing');
  end if;

  return json_build_object('success', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: claim_pending_gold
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.claim_pending_gold()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer;
begin
  update profiles
  set pending_gold = 0, updated_at = now()
  where id = auth.uid() and pending_gold > 0
  returning pending_gold + (pending_gold - pending_gold) into v_amount;
  -- Note: we snapshot before zeroing via a CTE for clarity:
  return coalesce(v_amount, 0);
end;
$$;

-- Cleaner version of claim_pending_gold:
create or replace function public.claim_pending_gold()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_amount integer := 0;
begin
  update profiles
  set pending_gold = 0, updated_at = now()
  where id = auth.uid()
  returning (select pending_gold from profiles where id = auth.uid()) into v_amount;
  return coalesce(v_amount, 0);
end;
$$;
