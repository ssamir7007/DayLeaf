create function public.load_sample(owner_id uuid) returns void language plpgsql set search_path='' as $$
declare day_local date; h uuid; n int; d int; schedule_data jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
 if exists(select 1 from public.rate_limits where user_id=owner_id and action='sample-loaded') then return; end if;
 select (now() at time zone timezone)::date into day_local from public.profiles where user_id=owner_id;
 for n in 1..3 loop
 schedule_data=(array['{"type":"daily"}','{"type":"weekdays","days":[1,3,5]}','{"type":"weekly","target":3}'])[n]::jsonb;
 insert into public.habits(user_id,name,schedule,created_at) select owner_id,(array['Read a few pages','Take a walk','Make time to stretch'])[n],schedule_data,((day_local-60)+time '12:00') at time zone timezone from public.profiles where user_id=owner_id returning id into h;
 for d in 1..60 loop
 if mod(d+n,5)<>0 and (n=1 or (n=2 and extract(isodow from day_local-d) in (1,3,5)) or (n=3 and extract(isodow from day_local-d) in (2,4,6))) then
 insert into public.check_ins(habit_id,user_id,date) values(h,owner_id,day_local-d);
 end if; end loop; end loop;
 insert into public.rate_limits values(owner_id,'sample-loaded',now(),1);
end $$;
revoke all on function public.load_sample(uuid) from public,anon,authenticated;
grant execute on function public.load_sample(uuid) to service_role;
