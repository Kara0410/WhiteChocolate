-- Allow deterministic percentage estimates when the source inventory does not
-- provide a usable capacity. Space counts remain null rather than fabricated.

begin;

alter table public.parking_availability_estimates
  drop constraint parking_estimate_values_match_status;

alter table public.parking_availability_estimates
  add constraint parking_estimate_values_match_status
  check (
    (
      status = 'estimated'
      and availability_percent is not null
    )
    or
    (
      status = 'unknown'
      and availability_percent is null
      and available_spaces is null
    )
  );

comment on column public.parking_availability_estimates.available_spaces is
  'Estimated count when source capacity is known; null for percentage-only estimates.';

commit;
