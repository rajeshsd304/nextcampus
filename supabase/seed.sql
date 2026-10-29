-- NextCampus NON-PRODUCTION seed data.
-- Loaded by `supabase db reset` against the LOCAL stack only. Never run this
-- against a production project: it creates accounts with a shared password.
--
-- Password for every seeded account: NextCampus-Dev-2026!

do $$
declare
  v_password text := extensions.crypt('NextCampus-Dev-2026!', extensions.gen_salt('bf'));
  v_user record;
begin
  for v_user in
    select * from (values
      ('00000000-0000-4000-8000-000000000001'::uuid, 'superadmin@nextcampus.test', 'Sam Superadmin'),
      ('00000000-0000-4000-8000-000000000002'::uuid, 'admin@northbridge.test', 'Avery Admin'),
      ('00000000-0000-4000-8000-000000000003'::uuid, 'instructor@northbridge.test', 'Indra Instructor'),
      ('00000000-0000-4000-8000-000000000004'::uuid, 'student@northbridge.test', 'Sasha Student'),
      ('00000000-0000-4000-8000-000000000005'::uuid, 'reviewer@northbridge.test', 'Riley Reviewer'),
      ('00000000-0000-4000-8000-000000000006'::uuid, 'admin@apex.test', 'Alex Apex'),
      ('00000000-0000-4000-8000-000000000007'::uuid, 'newuser@nextcampus.test', 'Noor Newcomer')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated', v_user.email,
      v_password, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_user.full_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_user.id, v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

-- Everyone except the newcomer has completed their profile.
update public.profiles
set onboarded_at = now(), timezone = 'Asia/Dhaka'
where id <> '00000000-0000-4000-8000-000000000007';

insert into public.platform_admins (user_id) values ('00000000-0000-4000-8000-000000000001');

insert into public.organizations (id, name, slug, type, website, contact_email, created_by) values
  ('10000000-0000-4000-8000-000000000001', 'Northbridge University', 'northbridge', 'university',
   'https://northbridge.example', 'exams@northbridge.test', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000002', 'Apex Coaching Centre', 'apex-coaching', 'coaching_center',
   null, 'hello@apex.test', '00000000-0000-4000-8000-000000000006');

insert into public.organization_members (organization_id, user_id, role) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'org_admin'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'instructor'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'student'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'invigilator'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006', 'org_admin');

-- Pending invitation for the newcomer. Raw token (dev only):
--   5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed
-- Accept at http://localhost:3000/invite/5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed
insert into public.invitations (organization_id, email, role, token_hash, invited_by) values (
  '10000000-0000-4000-8000-000000000001',
  'newuser@nextcampus.test',
  'student',
  encode(sha256(convert_to('5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed', 'UTF8')), 'hex'),
  '00000000-0000-4000-8000-000000000002'
);

insert into public.notifications (user_id, organization_id, kind, title, body, action_url) values
  ('00000000-0000-4000-8000-000000000007', null, 'invitation',
   'You have been invited to join Northbridge University', 'Review the invitation to join as student.', '/invitations'),
  ('00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'system',
   'Welcome to NextCampus', 'Your student workspace is ready. Exams published by your instructors will appear here.', '/dashboard');
