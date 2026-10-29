import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/features/access/permissions";
import { ORG_ROLES } from "@/features/access/roles";
import { createTestDatabase } from "./harness";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase({ seed: false });
});

afterAll(async () => {
  await db.close();
});

describe("permission matrix parity", () => {
  it("application permission keys match the database", async () => {
    const { rows } = await db.query<{ key: string }>(`select key from public.permissions order by key`);
    expect(rows.map((r) => r.key)).toEqual([...PERMISSIONS].sort());
  });

  it("application role → permission map matches the database", async () => {
    const { rows } = await db.query<{ role: string; permission_key: string }>(
      `select role::text, permission_key from public.role_permissions`,
    );
    for (const role of ORG_ROLES) {
      const fromDb = rows
        .filter((r) => r.role === role)
        .map((r) => r.permission_key)
        .sort();
      expect(fromDb, role).toEqual([...ROLE_PERMISSIONS[role]].sort());
    }
  });

  it("application role list matches the org_role enum", async () => {
    const { rows } = await db.query<{ value: string }>(
      `select unnest(enum_range(null::public.org_role))::text as value`,
    );
    expect(rows.map((r) => r.value)).toEqual([...ORG_ROLES]);
  });
});
