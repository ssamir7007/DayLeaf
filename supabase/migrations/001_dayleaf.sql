create function public.valid_schedule(s jsonb) returns boolean language sql immutable as $$
  select coalesce(case s->>'type'
    when 'daily' then true
    when 'weekdays' then jsonb_typeof(s->'days') = 'array' and jsonb_array_length(s->'days') > 0 and (s->'days') <@ '[1,2,3,4,5,6,7]'::jsonb
    when 'weekly' then (s->>'target') ~ '^[1-7]$' and jsonb_typeof(s->'target')='number'
    else false end,false)
$$;
create table public.profiles (
 user_id uuid primary key references auth.users on delete cascade,
 timezone text not null default 'UTC', reminder_time time not null default '09:00',
 email_enabled boolean not null default false, last_email_sent_on date,
 sms_enabled boolean not null default false, phone_e164 text unique check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 phone_verified_at timestamptz, sms_consent_at timestamptz, last_sms_sent_on date,
 phone_binding text unique, sms_notice text, timezone_initialized boolean not null default false,
 unsubscribe_token uuid not null unique default gen_random_uuid(),
 check(not sms_enabled or (phone_verified_at is not null and sms_consent_at is not null and phone_e164 is not null))
);
create table public.habits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100), schedule jsonb not null check(public.valid_schedule(schedule)),
 created_at timestamptz not null default now(), archived boolean not null default false,
 unique(id,user_id)
);
create table public.habit_periods (
 habit_id uuid not null, user_id uuid not null, effective_on date not null,
 schedule jsonb not null check(public.valid_schedule(schedule)), archived boolean not null,
 primary key(habit_id,effective_on), foreign key(habit_id,user_id) references public.habits(id,user_id) on delete cascade
);
create table public.check_ins (
 id uuid primary key default gen_random_uuid(), habit_id uuid not null, user_id uuid not null,
 date date not null, note text not null default '' check(length(note)<=280), unique(habit_id,date),
 foreign key(habit_id,user_id) references public.habits(id,user_id) on delete cascade
);
create table public.rate_limits (
 user_id uuid not null references public.profiles on delete cascade, action text not null,
 started_at timestamptz not null, attempts int not null, primary key(user_id,action)
);
create table public.reminder_deliveries (
 user_id uuid not null references public.profiles on delete cascade, day date not null,
 channel text not null check(channel in ('email','sms')), primary key(user_id,day,channel)
);
create index habits_owner on public.habits(user_id);
create index checks_owner on public.check_ins(user_id);
create index periods_owner on public.habit_periods(user_id);
do $$ declare t text; begin
 foreach t in array array['profiles','habits','check_ins','habit_periods','rate_limits','reminder_deliveries'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy own_records on public.%I for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid())',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.habits,public.habit_periods,public.check_ins to authenticated;
grant insert,update,delete on public.check_ins to authenticated;
grant insert(user_id,name,schedule), update(name,schedule,archived) on public.habits to authenticated;
grant select(user_id,timezone,reminder_time,email_enabled,last_email_sent_on,sms_enabled,phone_e164,phone_verified_at,sms_consent_at,last_sms_sent_on,sms_notice,timezone_initialized) on public.profiles to authenticated;
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(user_id) values(new.id); return new; end $$;
create trigger dayleaf_signup after insert on auth.users for each row execute function public.new_profile();
insert into public.profiles(user_id) select id from auth.users on conflict do nothing;
create function public.record_period() returns trigger language plpgsql security definer set search_path='' as $$
declare d date;
begin
 select (now() at time zone timezone)::date into d from public.profiles where user_id=new.user_id;
 if tg_op='INSERT' then select (new.created_at at time zone timezone)::date into d from public.profiles where user_id=new.user_id; end if;
 insert into public.habit_periods values(new.id,new.user_id,d,new.schedule,new.archived)
 on conflict(habit_id,effective_on) do update set schedule=excluded.schedule,archived=excluded.archived;
 return new;
end $$;
create trigger save_period after insert or update of schedule,archived on public.habits for each row execute function public.record_period();
create function public.take_attempt(owner_id uuid, action_name text, maximum int, seconds int)
returns boolean language plpgsql set search_path='' as $$
declare count_used int;
begin
 insert into public.rate_limits values(owner_id,action_name,now(),1)
 on conflict(user_id,action) do update set
 attempts=case when public.rate_limits.started_at <= now()-make_interval(secs=>seconds) then 1 else public.rate_limits.attempts+1 end,
 started_at=case when public.rate_limits.started_at <= now()-make_interval(secs=>seconds) then now() else public.rate_limits.started_at end
 returning attempts into count_used;
 return count_used<=maximum;
end $$;
revoke all on function public.take_attempt(uuid,text,int,int),public.new_profile(),public.record_period() from public,anon,authenticated;
grant execute on function public.take_attempt(uuid,text,int,int) to service_role;
