-- NextCampus Phase 1: authorization matrix (reference data required in every
-- environment). Mirrored in src/features/access/permissions.ts; the database
-- test suite asserts the two stay identical.

insert into public.permissions (key, description) values
  ('org.read', 'View organization profile'),
  ('org.update', 'Edit organization profile'),
  ('members.read', 'View the organization roster'),
  ('members.manage', 'Change member roles and remove members'),
  ('invitations.read', 'View organization invitations'),
  ('invitations.manage', 'Create and revoke invitations'),
  ('audit.read', 'View the organization audit log'),
  ('dashboard.admin', 'Access the organization administrator dashboard'),
  ('dashboard.instructor', 'Access the instructor dashboard'),
  ('dashboard.reviewer', 'Access the invigilator and reviewer dashboard'),
  ('dashboard.student', 'Access the student dashboard');

insert into public.role_permissions (role, permission_key) values
  ('org_admin', 'org.read'),
  ('org_admin', 'org.update'),
  ('org_admin', 'members.read'),
  ('org_admin', 'members.manage'),
  ('org_admin', 'invitations.read'),
  ('org_admin', 'invitations.manage'),
  ('org_admin', 'audit.read'),
  ('org_admin', 'dashboard.admin'),
  ('instructor', 'org.read'),
  ('instructor', 'members.read'),
  ('instructor', 'dashboard.instructor'),
  ('invigilator', 'org.read'),
  ('invigilator', 'members.read'),
  ('invigilator', 'dashboard.reviewer'),
  ('student', 'org.read'),
  ('student', 'dashboard.student');
