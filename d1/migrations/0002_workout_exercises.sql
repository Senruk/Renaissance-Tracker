-- AI muscle detection and recovery tracking.
-- Adds a structured exercise list to each workout so recovery can be
-- computed from real load (sets x reps x weight) instead of muscle taps.
alter table workout_logs add column if not exists exercises text default '[]';

-- Backfill so existing rows are never NULL for the D1 reader.
update workout_logs set exercises = '[]' where exercises is null;
