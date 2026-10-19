\connect wfmtest
-- ===== helpers de prueba (se borran al final) =====
create or replace function public.t_as(uid text, r text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  if r = 'root' then execute 'reset role'; else execute format('set role %I', r); end if;
end $$;

create or replace function public.t_ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL [%]', label; end if;
  raise notice 'PASS [%]', label;
end $$;

create or replace function public.t_fails(q text, want text, label text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    if position(want in sqlerrm) = 0 then
      raise exception 'FAIL [%]: esperado "%", recibido "%"', label, want, sqlerrm;
    end if;
    raise notice 'PASS [%]: error esperado (%)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL [%]: se esperaba error "%" y no hubo error', label, want;
end $$;

-- IDs de prueba
-- a1 admin org1 · a2 analyst org1 · a3 supervisor org1 · a4 analyst org1 · a5/a6 pending org1
-- b1 admin org2 · c1 sin organización
do $$
declare
  A1 text := '00000000-0000-0000-0000-0000000000a1';
  A2 text := '00000000-0000-0000-0000-0000000000a2';
  A3 text := '00000000-0000-0000-0000-0000000000a3';
  A4 text := '00000000-0000-0000-0000-0000000000a4';
  A5 text := '00000000-0000-0000-0000-0000000000a5';
  A6 text := '00000000-0000-0000-0000-0000000000a6';
  B1 text := '00000000-0000-0000-0000-0000000000b1';
  C1 text := '00000000-0000-0000-0000-0000000000c1';
  r record;
  n integer;
  tok text;
  tok_exp text;
  id_exp uuid;
  small jsonb := '{"v":1,"kpis":[{"label":"Attendance","value":"95.8%"}]}';
  big jsonb := jsonb_build_object('x', repeat('a', 300000));
  seats record;
begin
  -- 1) Creación por analista
  perform public.t_as(A2, 'authenticated');
  select * into r from public.create_shared_report('Attendance demo', small, now() + interval '7 days');
  perform set_config('t.token', r.share_token, false);
  perform set_config('t.id', r.share_id::text, false);
  perform public.t_ok(length(r.share_token) = 64 and r.share_token ~ '^[0-9a-f]{64}$', 'T01 token de 64 hex generado');

  -- 2) Enlace público (anon) muestra el informe y cuenta la vista
  perform public.t_as(null, 'anon');
  perform public.t_ok(public.get_shared_report(current_setting('t.token')) is not null, 'T02 anon abre el enlace válido');
  perform public.t_ok(public.get_shared_report('corto') is null, 'T03 token corto -> null, sin error');
  perform public.t_ok(public.get_shared_report(repeat('z', 64)) is null, 'T04 token inexistente -> null');

  -- 3) Validación de caducidad
  perform public.t_as(A2, 'authenticated');
  perform public.t_fails($q$select * from public.create_shared_report('x', '{}', now() + interval '400 days')$q$, 'invalid_expiry', 'T05a caducidad > 365 días rechazada');
  perform public.t_fails($q$select * from public.create_shared_report('x', '{}', now() + interval '10 minutes')$q$, 'invalid_expiry', 'T05b caducidad < 1 hora rechazada');

  -- 4) Tamaño máximo del payload (256 KB)
  perform public.t_fails(format($q$select * from public.create_shared_report('x', %L::jsonb, now() + interval '7 days')$q$, big::text), 'shared_reports_payload_check', 'T06 payload > 256 KB rechazado');

  -- 5) Cuenta pendiente y sin organización no pueden compartir
  perform public.t_as(A5, 'authenticated');
  perform public.t_fails($q$select * from public.create_shared_report('x', '{}', now() + interval '7 days')$q$, 'no_organization', 'T07 cuenta pendiente no puede compartir');
  perform public.t_as(C1, 'authenticated');
  perform public.t_fails($q$select * from public.create_shared_report('x', '{}', now() + interval '7 days')$q$, 'no_organization', 'T08 usuario sin organización no puede compartir');
  perform public.t_as(null, 'anon');
  perform public.t_fails($q$select * from public.create_shared_report('x', '{}', now() + interval '7 days')$q$, 'permission denied', 'T09 anon no puede llamar create');

  -- 6) Listado y revocación por rol y organización
  perform public.t_as(A4, 'authenticated');
  select count(*) into n from public.list_shared_reports();
  perform public.t_ok(n = 0, 'T10 analista ve solo sus propios enlaces (no los de otro)');
  perform public.t_ok(public.revoke_shared_report(current_setting('t.id')::uuid) = false, 'T11 analista no puede revocar el enlace de otro');

  perform public.t_as(A3, 'authenticated');
  select count(*) into n from public.list_shared_reports() where share_token = current_setting('t.token');
  perform public.t_ok(n = 1, 'T12 supervisor ve los enlaces de toda la organización');

  perform public.t_as(B1, 'authenticated');
  select count(*) into n from public.list_shared_reports();
  perform public.t_ok(n = 0, 'T13 admin de otra organización no ve enlaces de esta');
  perform public.t_ok(public.revoke_shared_report(current_setting('t.id')::uuid) = false, 'T14 admin de otra organización no puede revocar');

  perform public.t_as(A2, 'authenticated');
  perform public.t_ok(public.revoke_shared_report(current_setting('t.id')::uuid) = true, 'T15 dueño revoca su enlace');
  perform public.t_as(null, 'anon');
  perform public.t_ok(public.get_shared_report(current_setting('t.token')) is null, 'T16 enlace revocado ya no abre');

  -- 7) Caducado: se crea, se fuerza vencimiento (como superusuario), y ya no abre
  perform public.t_as(A1, 'authenticated');
  select * into r from public.create_shared_report('Caduca', small, now() + interval '2 days');
  tok_exp := r.share_token; id_exp := r.share_id;
  perform public.t_as(null, 'anon');
  perform public.t_ok(public.get_shared_report(tok_exp) is not null, 'T17 enlace vigente abre');
  perform public.t_as('00000000-0000-0000-0000-000000000000', 'root');
  perform public.t_as(null, 'root');
  update public.shared_reports set expires_at = now() - interval '1 minute' where id = id_exp;
  perform public.t_as(null, 'anon');
  perform public.t_ok(public.get_shared_report(tok_exp) is null, 'T18 enlace caducado no abre');

  -- 8) Acceso directo a tablas bloqueado (solo funciones)
  perform public.t_as(A1, 'authenticated');
  perform public.t_fails('select count(*) from public.shared_reports', 'permission denied', 'T19 authenticated no lee la tabla directamente');
  perform public.t_fails('select count(*) from public.organization_plans', 'permission denied', 'T20 authenticated no lee organization_plans');
  perform public.t_as(null, 'anon');
  perform public.t_fails('select count(*) from public.shared_reports', 'permission denied', 'T21 anon no lee la tabla directamente');

  -- 9) Cuentas y límite de editores
  perform public.t_as(A2, 'authenticated');
  select * into seats from public.get_org_seats();
  perform public.t_ok(seats.seats_used = 4 and seats.seats_limit = 5 and seats.plan_name = 'pro', 'T22 uso 4 de 5 editores (Pro)');
  perform public.t_fails('select * from public.list_org_members()', 'forbidden', 'T23 analista no ve la lista de cuentas');

  perform public.t_as(A3, 'authenticated');
  select count(*) into n from public.list_org_members();
  perform public.t_ok(n = 6, 'T24 gerencia ve las 6 cuentas de la organización');
  select count(*) into n from public.list_org_members() where member_email is not null;
  perform public.t_ok(n = 0, 'T25 gerencia no ve correos (solo admin)');
  perform public.t_fails($q$select public.set_member_access('00000000-0000-0000-0000-0000000000a5', 'wfm_analyst', 'active')$q$, 'forbidden', 'T26 gerencia no cambia accesos');

  perform public.t_as(A1, 'authenticated');
  select count(*) into n from public.list_org_members() where member_email is not null;
  perform public.t_ok(n = 6, 'T27 admin ve correos de su organización');
  perform public.t_fails($q$select public.set_member_access('00000000-0000-0000-0000-0000000000a1', 'admin', 'suspended')$q$, 'cannot_demote_self', 'T28 admin no se suspende a sí mismo');
  perform public.t_fails($q$select public.set_member_access('00000000-0000-0000-0000-0000000000a5', 'wrong', 'active')$q$, 'invalid_role', 'T29 rol inválido rechazado');
  perform public.t_fails($q$select public.set_member_access('00000000-0000-0000-0000-0000000000b1', 'admin', 'active')$q$, 'not_in_organization', 'T30 no se gestiona una cuenta de otra organización');
  perform public.t_ok(public.set_member_access('00000000-0000-0000-0000-0000000000a5', 'wfm_analyst', 'active'), 'T31 admin activa cuenta pendiente dentro del límite');
  perform public.t_fails($q$select public.set_member_access('00000000-0000-0000-0000-0000000000a6', 'wfm_analyst', 'active')$q$, 'seat_limit_reached', 'T32 sexto editor bloqueado por el límite de 5');

  -- Pro extendido: sube el tope a 6 (como lo hará el cobro en el futuro) y ya entra
  perform public.t_as('00000000-0000-0000-0000-000000000000', 'root');
  perform public.t_as(null, 'root');
  insert into public.organization_plans (organization_id, plan, editor_seats)
  values ('00000000-0000-0000-0000-00000000a001', 'pro', 6)
  on conflict (organization_id) do update set editor_seats = excluded.editor_seats;
  perform public.t_as(A1, 'authenticated');
  perform public.t_ok(public.set_member_access('00000000-0000-0000-0000-0000000000a6', 'wfm_analyst', 'active'), 'T33 con extra de editor (límite 6) activa la sexta cuenta');
  select * into seats from public.get_org_seats();
  perform public.t_ok(seats.seats_used = 6 and seats.seats_limit = 6, 'T34 uso 6 de 6 tras el extra');

  -- Suspender libera un editor y bloquea el acceso a compartir
  perform public.t_ok(public.set_member_access('00000000-0000-0000-0000-0000000000a4', 'wfm_analyst', 'suspended'), 'T35 admin suspende a un analista');
  perform public.t_as(A4, 'authenticated');
  perform public.t_fails($q$select * from public.create_shared_report('x', '{}', now() + interval '7 days')$q$, 'no_organization', 'T36 cuenta suspendida no puede compartir');

  -- 10) El enlace de una organización no se revoca desde otra
  perform public.t_as(B1, 'authenticated');
  perform public.t_ok(public.revoke_shared_report(id_exp) = false, 'T37 admin de otra organización no revoca enlace ajeno');

  -- 11) Vistas contadas
  perform public.t_as('00000000-0000-0000-0000-000000000000', 'root');
  perform public.t_as(null, 'root');
  select view_count into n from public.shared_reports where id = current_setting('t.id')::uuid;
  perform public.t_ok(n = 1, 'T38 la vista se cuenta una vez por apertura válida');
end $$;

-- Limpieza de helpers
reset role;
drop function public.t_as(text, text);
drop function public.t_ok(boolean, text);
drop function public.t_fails(text, text, text);
