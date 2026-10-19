-- Emula el entorno de Supabase: roles anon/authenticated, auth.users, auth.uid(), y privilegios por defecto.
drop database if exists wfmtest;
create database wfmtest;
\connect wfmtest
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role text not null default 'wfm_analyst' check (role in ('wfm_analyst','wfm_supervisor','operations_manager','admin')),
  access_status text not null default 'pending' check (access_status in ('active','pending','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
insert into public.organizations(id,name) values ('00000000-0000-0000-0000-00000000a001','Org Uno'),('00000000-0000-0000-0000-00000000a002','Org Dos');
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','admin1@uno.test'),
 ('00000000-0000-0000-0000-0000000000a2','analyst1@uno.test'),
 ('00000000-0000-0000-0000-0000000000a3','super1@uno.test'),
 ('00000000-0000-0000-0000-0000000000a4','analyst2@uno.test'),
 ('00000000-0000-0000-0000-0000000000a5','pending1@uno.test'),
 ('00000000-0000-0000-0000-0000000000a6','pending2@uno.test'),
 ('00000000-0000-0000-0000-0000000000b1','admin@dos.test'),
 ('00000000-0000-0000-0000-0000000000c1','analyst@anon.test');
insert into public.profiles(id,organization_id,full_name,role,access_status) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','Ada Admin','admin','active'),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-00000000a001','Ana Analyst','wfm_analyst','active'),
 ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-00000000a001','Sam Supervisor','wfm_supervisor','active'),
 ('00000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-00000000a001','Bea Analyst','wfm_analyst','active'),
 ('00000000-0000-0000-0000-0000000000a5','00000000-0000-0000-0000-00000000a001','Pat Pending','wfm_analyst','pending'),
 ('00000000-0000-0000-0000-0000000000a6','00000000-0000-0000-0000-00000000a001','Pia Pending','wfm_analyst','pending'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000a002','Dos Admin','admin','active'),
 ('00000000-0000-0000-0000-0000000000c1',null,'Sin org','wfm_analyst','pending');
