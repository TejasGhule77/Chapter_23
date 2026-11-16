
-- Run once in Supabase SQL Editor. Admin privileges are granted manually.
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 customer_name text not null,
 customer_email text not null,
 occasion text not null,
 edition text not null,
 notes text not null default '',
 status text not null default 'requested' check(status in ('requested','confirmed','in_production','shipped','completed','cancelled')),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','refunded')),
 created_at timestamptz not null default now()
);
create table if not exists public.login_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,email) values(new.id,coalesce(new.email,''))
 on conflict (id) do update set email=excluded.email;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile();
insert into public.profiles(id,email)
select id,coalesce(email,'') from auth.users
on conflict (id) do update set email=excluded.email;

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.login_events enable row level security;

drop policy if exists "Admins see own membership" on public.admin_users;
create policy "Admins see own membership" on public.admin_users
for select to authenticated using (user_id=(select auth.uid()));

-- Security definer prevents policy recursion and does not expose the admin list.
create or replace function public.is_chapter23_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_users where user_id=(select auth.uid())); $$;
revoke all on function public.is_chapter23_admin() from public;
grant execute on function public.is_chapter23_admin() to authenticated;

drop policy if exists "Profile owners and admins read" on public.profiles;
create policy "Profile owners and admins read" on public.profiles
for select to authenticated using (id=(select auth.uid()) or (select public.is_chapter23_admin()));

drop policy if exists "Customers see own orders and admins see all" on public.orders;
create policy "Customers see own orders and admins see all" on public.orders
for select to authenticated using (user_id=(select auth.uid()) or (select public.is_chapter23_admin()));
drop policy if exists "Customers submit own requests" on public.orders;
create policy "Customers submit own requests" on public.orders
for insert to authenticated with check (
 user_id=(select auth.uid()) and status='requested' and payment_status='pending'
 and customer_email=(select auth.jwt()->>'email')
);
drop policy if exists "Admins update order progress" on public.orders;
create policy "Admins update order progress" on public.orders
for update to authenticated using ((select public.is_chapter23_admin()))
with check ((select public.is_chapter23_admin()));

drop policy if exists "Customers log own signins" on public.login_events;
create policy "Customers log own signins" on public.login_events
for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "Admins see signin history" on public.login_events;
create policy "Admins see signin history" on public.login_events
for select to authenticated using ((select public.is_chapter23_admin()));

-- AFTER signing up as the business owner, run the following in SQL Editor,
-- replacing the email with the email used for your owner account:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email='YOUR_OWNER_EMAIL@example.com'
-- on conflict do nothing;
