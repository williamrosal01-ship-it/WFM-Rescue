-- ============================================================
-- WFM RESCUE — INFORMES COMPARTIDOS, ROLES Y LÍMITE DE EDITORES
-- Ejecutar UNA vez en Supabase > SQL Editor (proyecto de producción).
--
-- Requiere lo que ya existe: public.organizations, public.profiles, auth.users.
--
-- Qué guarda:  un resumen del informe (KPIs, gráficas y tablas pequeñas), máximo 256 KB.
-- Qué NO guarda: datos crudos de intervalos ni de agentes. Esos se quedan en el navegador.
-- Clave: solo usa la publishable en la app. Este script NO necesita la clave secret.
--
-- Roles de la app (profiles.role, sin cambios):
--   wfm_analyst          → crea y comparte sus informes.
--   wfm_supervisor       → lo anterior + ve y revoca enlaces de toda la organización.
--   operations_manager   → igual que supervisor.
--   admin                → todo lo anterior + administra cuentas (rol y acceso) y ve correos.
--
-- Editores incluidos: cuentas activas de la organización (cualquier rol). Pro = 5.
-- Viewers: quien abre un enlace. No tienen cuenta, no cuentan como editor, y no hay tope.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Plan y límite de editores por organización
-- ------------------------------------------------------------
create table if not exists public.organization_plans (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'pro',
  editor_seats integer not null default 5 check (editor_seats between 1 and 1000),
  updated_at timestamptz not null default now()
);

alter table public.organization_plans enable row level security;
revoke all on table public.organization_plans from anon, authenticated;
-- Sin políticas: solo se lee y escribe dentro de las funciones de abajo.

-- ------------------------------------------------------------
-- 2) Informes compartidos (la "foto")
-- ------------------------------------------------------------
create table if not exists public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  share_token text not null unique check (char_length(share_token) between 32 and 64),
  payload jsonb not null check (pg_column_size(payload) <= 262144),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0
);

create index if not exists shared_reports_org_idx on public.shared_reports (organization_id, created_at desc);

alter table public.shared_reports enable row level security;
revoke all on table public.shared_reports from anon, authenticated;
-- Sin políticas: el navegador nunca lee ni escribe la tabla directamente.

-- ------------------------------------------------------------
-- 3) Funciones auxiliares (quién soy)
-- ------------------------------------------------------------
create or replace function public.wfm_my_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id from public.profiles p
  where p.id = auth.uid() and p.access_status = 'active'
$$;

create or replace function public.wfm_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.access_status = 'active'
$$;

revoke all on function public.wfm_my_org() from public, anon;
revoke all on function public.wfm_my_role() from public, anon;
grant execute on function public.wfm_my_org() to authenticated;
grant execute on function public.wfm_my_role() to authenticated;

-- ------------------------------------------------------------
-- 4) Límite de editores: uso y tope de la organización
-- ------------------------------------------------------------
create or replace function public.get_org_seats()
returns table(seats_used integer, seats_limit integer, plan_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid := public.wfm_my_org();
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_org is null then raise exception 'no_organization' using errcode = '42501'; end if;

  return query
    select
      (select count(*)::int from public.profiles p where p.organization_id = v_org and p.access_status = 'active'),
      coalesce((select op.editor_seats from public.organization_plans op where op.organization_id = v_org), 5),
      coalesce((select op.plan from public.organization_plans op where op.organization_id = v_org), 'demo');
end;
$$;

-- ------------------------------------------------------------
-- 5) Crear, listar, revocar y abrir informes compartidos
-- ------------------------------------------------------------
create or replace function public.create_shared_report(p_title text, p_payload jsonb, p_expires_at timestamptz)
returns table(share_id uuid, share_token text, share_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.wfm_my_org();
  v_active integer;
  v_token text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_org is null then raise exception 'no_organization' using errcode = '42501'; end if;

  if p_expires_at is null or p_expires_at <= now() + interval '1 hour' or p_expires_at > now() + interval '365 days' then
    raise exception 'invalid_expiry' using errcode = '22023';
  end if;

  select count(*) into v_active
  from public.shared_reports s
  where s.organization_id = v_org and s.revoked_at is null and s.expires_at > now();
  if v_active >= 200 then raise exception 'share_limit_reached' using errcode = 'P0001'; end if;

  -- 64 caracteres hexadecimales de dos UUID aleatorios (CSPRNG). No necesita extensiones.
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.shared_reports (organization_id, created_by, title, share_token, payload, expires_at)
  values (
    v_org,
    auth.uid(),
    left(coalesce(nullif(btrim(p_title), ''), 'Informe'), 200),
    v_token,
    p_payload,
    p_expires_at
  )
  returning id into v_id;

  return query select v_id, v_token, p_expires_at;
end;
$$;

create or replace function public.list_shared_reports()
returns table(
  share_id uuid,
  share_title text,
  share_token text,
  share_created_at timestamptz,
  share_expires_at timestamptz,
  share_revoked_at timestamptz,
  share_views integer,
  share_owner_name text,
  share_is_mine boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid := public.wfm_my_org();
  v_role text := public.wfm_my_role();
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_org is null then raise exception 'no_organization' using errcode = '42501'; end if;

  return query
    select s.id, s.title, s.share_token, s.created_at, s.expires_at, s.revoked_at, s.view_count,
           coalesce(p.full_name, ''), (s.created_by = auth.uid())
    from public.shared_reports s
    left join public.profiles p on p.id = s.created_by
    where s.organization_id = v_org
      and (s.created_by = auth.uid() or v_role in ('wfm_supervisor', 'operations_manager', 'admin'))
    order by s.created_at desc
    limit 200;
end;
$$;

create or replace function public.revoke_shared_report(p_share_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.wfm_my_org();
  v_role text := public.wfm_my_role();
  v_rows integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_org is null then raise exception 'no_organization' using errcode = '42501'; end if;

  update public.shared_reports s
  set revoked_at = now()
  where s.id = p_share_id
    and s.organization_id = v_org
    and s.revoked_at is null
    and (s.created_by = auth.uid() or v_role in ('wfm_supervisor', 'operations_manager', 'admin'));

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- Abierto a cualquiera que tenga el enlace (anon). Devuelve null si no existe, caducó o fue revocado.
create or replace function public.get_shared_report(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.shared_reports%rowtype;
begin
  if p_token is null or char_length(p_token) not between 32 and 64 then return null; end if;

  select * into r
  from public.shared_reports s
  where s.share_token = p_token and s.revoked_at is null and s.expires_at > now();
  if not found then return null; end if;

  update public.shared_reports s set view_count = s.view_count + 1 where s.id = r.id;

  return jsonb_build_object(
    'title', r.title,
    'created_at', r.created_at,
    'expires_at', r.expires_at,
    'payload', r.payload
  );
end;
$$;

-- ------------------------------------------------------------
-- 6) Cuentas de la organización (solo admin y gerencia)
-- ------------------------------------------------------------
create or replace function public.list_org_members()
returns table(member_id uuid, member_name text, member_email text, member_role text, member_status text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid := public.wfm_my_org();
  v_role text := public.wfm_my_role();
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_org is null then raise exception 'no_organization' using errcode = '42501'; end if;
  if v_role not in ('wfm_supervisor', 'operations_manager', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select p.id,
           coalesce(p.full_name, ''),
           case when v_role = 'admin' then u.email::text else null end,
           p.role,
           p.access_status
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.organization_id = v_org
    order by p.created_at;
end;
$$;

-- Solo admin. Cambia rol y acceso. Activar a alguien exige un editor libre dentro del límite.
create or replace function public.set_member_access(p_member uuid, p_role text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.wfm_my_org();
  v_role text := public.wfm_my_role();
  v_target_org uuid;
  v_old_status text;
  v_active integer;
  v_limit integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if v_role is distinct from 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role not in ('wfm_analyst', 'wfm_supervisor', 'operations_manager', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if p_status not in ('active', 'pending', 'suspended') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if p_member = auth.uid() and (p_status <> 'active' or p_role <> 'admin') then
    raise exception 'cannot_demote_self' using errcode = '22023';
  end if;

  select p.organization_id, p.access_status into v_target_org, v_old_status
  from public.profiles p where p.id = p_member;
  if v_target_org is distinct from v_org then raise exception 'not_in_organization' using errcode = '42501'; end if;

  if p_status = 'active' and v_old_status is distinct from 'active' then
    select count(*)::int into v_active from public.profiles p
    where p.organization_id = v_org and p.access_status = 'active';
    select coalesce((select op.editor_seats from public.organization_plans op where op.organization_id = v_org), 5)
      into v_limit;
    if v_active >= v_limit then raise exception 'seat_limit_reached' using errcode = 'P0001'; end if;
  end if;

  update public.profiles p
  set role = p_role, access_status = p_status, updated_at = now()
  where p.id = p_member;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- 7) Permisos de ejecución
-- ------------------------------------------------------------
revoke all on function public.get_org_seats() from public, anon;
revoke all on function public.create_shared_report(text, jsonb, timestamptz) from public, anon;
revoke all on function public.list_shared_reports() from public, anon;
revoke all on function public.revoke_shared_report(uuid) from public, anon;
revoke all on function public.list_org_members() from public, anon;
revoke all on function public.set_member_access(uuid, text, text) from public, anon;

grant execute on function public.get_org_seats() to authenticated;
grant execute on function public.create_shared_report(text, jsonb, timestamptz) to authenticated;
grant execute on function public.list_shared_reports() to authenticated;
grant execute on function public.revoke_shared_report(uuid) to authenticated;
grant execute on function public.list_org_members() to authenticated;
grant execute on function public.set_member_access(uuid, text, text) to authenticated;

-- El enlace público: anon y authenticated.
revoke all on function public.get_shared_report(text) from public;
grant execute on function public.get_shared_report(text) to anon, authenticated;
