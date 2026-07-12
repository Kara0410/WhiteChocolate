begin;

alter table public.parking_segments enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.parking_segments to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'parking_segments'
      and policyname = 'Allow public read parking_segments'
  ) then
    alter policy "Allow public read parking_segments"
      on public.parking_segments
      to anon, authenticated
      using (true);
  else
    create policy "Allow public read parking_segments"
      on public.parking_segments
      as permissive
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

commit;
