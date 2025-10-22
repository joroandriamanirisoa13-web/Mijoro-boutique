
-- Buckets 'media' sy 'apps' + policies (public read, owner-only write)

-- Raha tsy mbola nisy buckets, afaka mamorona amin'ny SQL:
-- select
--   storage.create_bucket('media', public => true),
--   storage.create_bucket('apps',  public => true);

-- Public READ for 'media' and 'apps'
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'public can read media'
  ) then
    create policy "public can read media"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'media');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'public can read apps'
  ) then
    create policy "public can read apps"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'apps');
  end if;
end $$;

-- INSERT: owner only
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'owner can upload to media'
  ) then
    create policy "owner can upload to media"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'media'
      and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com'
    );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'owner can upload to apps'
  ) then
    create policy "owner can upload to apps"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'apps'
      and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com'
    );
  end if;
end $$;

-- UPDATE: owner only
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'owner can update media'
  ) then
    create policy "owner can update media"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com')
    with check (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'owner can update apps'
  ) then
    create policy "owner can update apps"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'apps' and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com')
    with check (bucket_id = 'apps' and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com');
  end if;
end $$;

-- DELETE: owner only
do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'owner can delete media'
  ) then
    create policy "owner can delete media"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where polname = 'owner can delete apps'
  ) then
    create policy "owner can delete apps"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'apps' and (auth.jwt() ->> 'email') = 'joroandriamanirisoa13@gmail.com');
  end if;
end $$;
