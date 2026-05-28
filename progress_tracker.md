# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- In progress

## Current Goal

- Harden Supabase schema access, normalize `asb_showrooms`, and add admin-only profile/delete workflows.

## Completed

- Replaced app references to schema `"ASB showrooms"` with `"asb_showrooms"`.
- Added server-side admin request checks that support bearer-token API calls.
- Added admin credential verification shared by profile updates, profile creation, profile deletion, and record deletion.
- Added admin profile creation through Supabase Auth with `email_confirm: true`, avoiding verification email.
- Added fetched dealer/showroom code options for profile creation and code assignment.
- Added admin-only profile deletion with credential confirmation.
- Added generic allowlisted admin record deletion endpoint for database records.
- Added delete controls with credential confirmation for admin dealer and showroom pages.
- Created `fixed_update.sql` to rename legacy schema, add relationships, tighten grants/RLS, and add delete audit infrastructure.
- Added `supabase_complete_repair.sql` to restore PostgREST schema-cache compatibility and stabilize login/profile lookup after RLS hardening.
- Restored login to simple Supabase Auth + own `profiles` row read and added `supabase_postgrest_cache_fix.sql` for the 503 schema-cache failure.
- Moved dealer/showroom code generation fully server-side with duplicate retry protection.
- Updated admin route checks to verify user session, then read role through service-role client so create APIs do not depend on profile RLS.
- Hardened vehicle model and spare code generation against random duplicate collisions.

## In Progress

- Expanding delete controls across the remaining admin data tables and document history screens.

## Next Up

- Run `supabase_postgrest_cache_fix.sql` in Supabase SQL Editor, then restart the Next dev server and hard refresh.
- Wire `/api/admin/records` delete actions into warehouse inventory, spare inventory, request history, sales documents, and issued-history UI tables.
- Run `npm run lint` and `npm run build` after Supabase env variables are confirmed.
- Validate `fixed_update.sql` against a Supabase staging copy and resolve any dirty historical rows before validating `NOT VALID` constraints.

## Open Questions

- Should dealer/showroom deletion be hard delete only, or should records with stock/sales be converted to `is_active = false` instead?
- Should non-admin sales users keep write access to customer/company sales records, or should all writes go through service-role route handlers only?

## Architecture Decisions

- Use `asb_showrooms` as the only application schema name; the migration safely renames/moves legacy `"ASB showrooms"` objects where possible.
- Keep destructive actions behind both an authenticated admin session and a fresh admin credential prompt.
- Use an allowlist for generic delete operations so client input cannot choose arbitrary schemas/tables.
- Add foreign keys as `NOT VALID` so new bad data is blocked without breaking migration on existing historical inconsistencies.

## Session Notes

- Next.js 16.2.3 local docs were checked before route-handler changes.
- Current app still uses service-role route handlers heavily, so stricter RLS should not break most API flows.
- Some remaining admin pages need UI delete buttons, but the secure delete endpoint is available for integration.
