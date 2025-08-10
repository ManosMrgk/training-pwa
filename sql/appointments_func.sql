create or replace function is_admin(uid uuid)
returns boolean language sql stable security invoker as $$
  select exists(select 1 from public.profiles where id = uid and role='admin');
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

create or replace function get_appointments_with_users()
returns setof jsonb
language plpgsql
security definer
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
  select jsonb_build_object(
    'id', a.id,
    'date', a.date,
    'start_time', a.start_time,
    'end_time', a.end_time,
    'status', a.status,
    'appointment_type_id', a.appointment_type_id,
    'user_display_name',
    coalesce(
        u.email,
        'User ID: ' || a.user_id
    )
  )
  from public.appointments a
  left join auth.users u on a.user_id = u.id
  order by a.date, a.start_time;
end;
$$;

select * from get_appointments_with_users();

create or replace function public.get_booked_counts_for_date(p_date date)
returns table (
  slot_id int,
  start_time time,
  end_time time,
  booked int
)
language sql
security definer
as $$
  select a.slot_id, a.start_time, a.end_time, count(*)::int as booked
  from public.appointments a
  where a.date = p_date
    and a.status = 'booked'
  group by a.slot_id, a.start_time, a.end_time
  order by 1,2,3;
$$;

create or replace function public.get_upcoming_appointments_with_users(
  from_date  date default current_date,
  from_time  time default (now()::time),
  days_ahead int  default 60,
  only_status text[] default array['booked']
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- hard stop: only admins may run this definer RPC
  if v_uid is null or not public.is_admin(v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select jsonb_build_object(
    'id', a.id,
    'date', a.date,
    'start_time', a.start_time,
    'end_time', a.end_time,
    'status', a.status,
    'appointment_type_id', a.appointment_type_id,
    'user_display_name',
      coalesce(
        u.raw_user_meta_data->>'full_name',
        u.email,
        'User ID: ' || a.user_id::text
      )
  )
  from public.appointments a
  left join auth.users u on u.id = a.user_id
  where a.status = any(only_status)
    and (
      a.date > from_date
      or (a.date = from_date and a.end_time > from_time)
    )
    and a.date <= from_date + days_ahead
  order by a.date, a.start_time;
end;
$$;

grant execute on function public.get_upcoming_appointments_with_users(date,time,int,text[])
  to authenticated;

create index if not exists appt_status_date_end_idx on public.appointments(status, date, end_time);
create index if not exists appt_date_start_idx       on public.appointments(date, start_time);


-- read own
create policy "read own appts" on appointments
  for select using (user_id = auth.uid() or is_admin(auth.uid()));

-- insert own
create policy "insert own appt" on appointments
  for insert with check (user_id = auth.uid());

-- update/cancel own
create policy "update own appt" on appointments
  for update using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "read overrides" on overrides for select using (true);
create policy "admin write overrides" on overrides
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));