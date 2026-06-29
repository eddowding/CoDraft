-- 4b: per-element engagement (votes + reads) for the turnout bar.
-- Applied to the linked project via Supabase MCP on 2026-06-29; this file is the
-- repo-tracked copy for provenance.
--
-- get_document_engagement is SECURITY DEFINER so it can read votes/views (whose
-- SELECT is owner-only), but it returns ONLY aggregate counts and is gated to
-- documents the caller may read (same predicate as the documents_select RLS).
-- It never exposes raw rows or IP addresses.

create or replace function public.get_document_engagement(p_document_id uuid)
returns table (
  element_id uuid,
  upvotes bigint,
  downvotes bigint,
  signed_in_readers bigint,
  total_readers bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    coalesce(vt.upvotes, 0),
    coalesce(vt.downvotes, 0),
    coalesce(rd.signed_in_readers, 0),
    coalesce(rd.total_readers, 0)
  from elements e
  left join lateral (
    select
      count(*) filter (where v.value > 0) as upvotes,
      count(*) filter (where v.value < 0) as downvotes
    from votes v where v.element_id = e.id
  ) vt on true
  left join lateral (
    select
      count(distinct vw.user_id) filter (where vw.user_id is not null) as signed_in_readers,
      count(distinct coalesce(vw.user_id::text, vw.session_id)) as total_readers
    from views vw where vw.element_id = e.id
  ) rd on true
  where e.document_id = p_document_id
    and exists (
      select 1 from documents d
      where d.id = p_document_id
        and (d.is_public or d.author_id = auth.uid() or can_access_document(d.id, auth.uid()))
    );
$$;

grant execute on function public.get_document_engagement(uuid) to anon, authenticated;

-- Harden the existing views insert policy: a row may only be attributed to the
-- caller (or be anonymous with user_id null). Prevents spoofing signed_in_readers.
drop policy if exists views_insert on public.views;
create policy views_insert on public.views
for insert to public
with check (
  (user_id is null or user_id = auth.uid())
  and exists (
    select 1 from elements e
    where e.id = views.element_id and can_access_document(e.document_id, auth.uid())
  )
);
