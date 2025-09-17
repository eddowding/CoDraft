-- Create a minimal public view to expose user ids and emails
-- sourced from auth.users for server-side/admin usage.
-- This avoids cross-schema queries from application code.

BEGIN;

CREATE OR REPLACE VIEW public.user_emails AS
SELECT u.id, u.email
FROM auth.users AS u;

-- Lock down the view: remove default PUBLIC access and grant only to service role
REVOKE ALL ON TABLE public.user_emails FROM PUBLIC;
GRANT SELECT ON TABLE public.user_emails TO service_role;

COMMENT ON VIEW public.user_emails IS 'Read-only view exposing (id, email) from auth.users for server-side/service-role use.';

COMMIT;

