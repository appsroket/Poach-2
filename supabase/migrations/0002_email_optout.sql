-- Prompt 11: email digest opt-out.
-- email_optout already ships in 0001_init.sql's profiles table; this guard
-- makes the column's presence explicit and safe to run against older copies of
-- the schema that predate it. Idempotent — no-op when the column exists.
alter table profiles
  add column if not exists email_optout boolean default false;
