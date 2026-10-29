-- NextCampus NON-PRODUCTION seed data.
-- Loaded by `supabase db reset` against the LOCAL stack only, after
-- reference-data/catalog.sql. Never run this
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
      ('00000000-0000-4000-8000-000000000007'::uuid, 'newuser@nextcampus.test', 'Noor Newcomer'),
      -- Phase 1.5: self-signup learners in the public practice organization.
      ('00000000-0000-4000-8000-000000000008'::uuid, 'learner@nextcampus.test', 'Lina Learner'),
      ('00000000-0000-4000-8000-000000000009'::uuid, 'learner2@nextcampus.test', 'Rafi Rahman'),
      ('00000000-0000-4000-8000-00000000000a'::uuid, 'dual@nextcampus.test', 'Dina Dual')
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

-- The profile trigger enrolls every new account into the public organization.
-- Phase 1 seed accounts represent institution-provisioned staff and students,
-- so their automatic public enrollment is removed to keep Phase 1 behavior.
delete from public.organization_members m
using public.organizations o
where o.id = m.organization_id
  and o.is_system
  and m.user_id in (
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000007'
  );

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
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006', 'org_admin'),
  -- Dina belongs to both the public organization and a coaching center.
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'student');

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

insert into public.notifications (user_id, organization_id, kind, template, params, title, body, action_url) values
  ('00000000-0000-4000-8000-000000000007', null, 'invitation', 'invitation_received',
   '{"organization": "Northbridge University", "role": "student"}',
   'You have been invited to join Northbridge University', 'Review the invitation to join as student.', '/invitations'),
  ('00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'system', 'workspace_ready', '{}',
   'Welcome to NextCampus', 'Your student workspace is ready. Exams published by your instructors will appear here.', '/dashboard'),
  ('00000000-0000-4000-8000-000000000008', null, 'system', 'public_welcome', '{}',
   'Welcome to NextCampus', 'Your practice space is ready.', '/dashboard');

-- ---------------------------------------------------------------------------
-- Phase 2: sample questions (non-production), created through the real RPCs
-- as the seeded authors, so revisions, audit and integrity rules all apply.
-- Subjects/topics are looked up from reference data, not hard-coded ids.
-- ---------------------------------------------------------------------------
do $$
declare
  v_subject uuid;
  v_topic uuid;
  v_question uuid;
  v_public uuid := (select id from public.organizations where is_system and slug = 'public');
begin
  select t.subject_id, t.id into v_subject, v_topic
  from public.topics t join public.subjects s on s.id = t.subject_id
  where t.is_active and s.is_active
  order by s.sort_order, t.sort_order
  limit 1;
  if v_topic is null then
    return;
  end if;

  -- Northbridge instructor: an MCQ draft.
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
  perform public.save_question(null, '10000000-0000-4000-8000-000000000001', jsonb_build_object(
    'type', 'mcq', 'subject_id', v_subject, 'topic_id', v_topic, 'difficulty', 'easy', 'marks', 1,
    'stem_bn', 'একটি বস্তু স্থির অবস্থা থেকে $a = 2\,\mathrm{m/s^2}$ ত্বরণে চলে। $5$ সেকেন্ড পর এর বেগ কত?',
    'stem_en', 'A body starts from rest with acceleration $a = 2\,\mathrm{m/s^2}$. What is its velocity after $5$ s?',
    'import_key', 'seed-mcq-1',
    'mcq', jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object('text_bn', '৫ মি/সে', 'text_en', '5 m/s'),
        jsonb_build_object('text_bn', '১০ মি/সে', 'text_en', '10 m/s'),
        jsonb_build_object('text_bn', '২০ মি/সে', 'text_en', '20 m/s'),
        jsonb_build_object('text_bn', '২৫ মি/সে', 'text_en', '25 m/s')),
      'correct_index', 1,
      'explanation_bn', '$v = u + at = 0 + 2 \times 5 = 10$ মি/সে।',
      'explanation_en', '$v = u + at = 0 + 2 \times 5 = 10$ m/s.')));

  -- Northbridge instructor: a written question submitted for review.
  select question_id into v_question from public.save_question(null, '10000000-0000-4000-8000-000000000001', jsonb_build_object(
    'type', 'written', 'subject_id', v_subject, 'topic_id', v_topic, 'difficulty', 'medium', 'marks', 5,
    'stem_bn', 'নিউটনের গতির প্রথম সূত্রটি লেখো এবং একটি উদাহরণ দাও।',
    'stem_en', 'State Newton''s first law of motion and give one example.',
    'import_key', 'seed-written-1',
    'written', jsonb_build_object(
      'answer_mode', 'text', 'word_limit', 150,
      'model_answer_bn', 'বাহ্যিক বল প্রয়োগ না করলে স্থির বস্তু স্থির থাকে এবং গতিশীল বস্তু সুষম বেগে চলতে থাকে।',
      'model_answer_en', 'An object stays at rest or in uniform motion unless acted on by an external force.',
      'criteria', jsonb_build_array(
        jsonb_build_object('text_bn', 'সূত্রের সঠিক বিবৃতি', 'text_en', 'Correct statement of the law', 'max_marks', 3),
        jsonb_build_object('text_bn', 'প্রাসঙ্গিক উদাহরণ', 'text_en', 'A relevant example', 'max_marks', 2)))));
  perform public.transition_question(v_question, 'submit', null);

  -- Platform admin: a published public-bank MCQ (both languages complete).
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select question_id into v_question from public.save_question(null, v_public, jsonb_build_object(
    'type', 'mcq', 'subject_id', v_subject, 'topic_id', v_topic, 'difficulty', 'medium', 'marks', 1,
    'stem_bn', 'নিচের কোনটি ভেক্টর রাশি?',
    'stem_en', 'Which of the following is a vector quantity?',
    'import_key', 'seed-public-mcq-1',
    'mcq', jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object('text_bn', 'ভর', 'text_en', 'Mass'),
        jsonb_build_object('text_bn', 'সরণ', 'text_en', 'Displacement'),
        jsonb_build_object('text_bn', 'তাপমাত্রা', 'text_en', 'Temperature')),
      'correct_index', 1,
      'explanation_bn', 'সরণের মান ও দিক দুটোই আছে, তাই এটি ভেক্টর রাশি।',
      'explanation_en', 'Displacement has both magnitude and direction, so it is a vector.')));
  perform public.transition_question(v_question, 'submit', null);
  perform public.transition_question(v_question, 'publish', null);

  perform set_config('request.jwt.claims', '', true);
end;
$$;
