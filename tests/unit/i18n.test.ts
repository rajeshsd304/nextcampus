import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";
import { CLIENT_NAMESPACES } from "@/i18n/messages";
import { ERROR_MESSAGES } from "@/lib/errors";

type Tree = string | Tree[] | { [key: string]: Tree };
// JSON imports are structurally checked here at runtime, so widen them to the recursive Tree type.
const catalogs: Record<string, Tree> = { en: en as unknown as Tree, bn: bn as unknown as Tree };

/** Flattens to "path → leaf" including array indices, so structure must match exactly. */
function flatten(node: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === "string") {
    out.set(prefix, node);
  } else if (Array.isArray(node)) {
    node.forEach((child, i) => flatten(child, `${prefix}[${i}]`).forEach((v, k) => out.set(k, v)));
  } else {
    for (const [key, child] of Object.entries(node)) {
      flatten(child, prefix ? `${prefix}.${key}` : key).forEach((v, k) => out.set(k, v));
    }
  }
  return out;
}

const flat = Object.fromEntries(Object.entries(catalogs).map(([locale, tree]) => [locale, flatten(tree)]));

function placeholders(message: string): string[] {
  const args = [...message.matchAll(/\{(\w+)\}/g)].map((m) => `{${m[1]}}`);
  const tags = [...message.matchAll(/<(\w+)>/g)].map((m) => `<${m[1]}>`);
  return [...args, ...tags].sort();
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("message catalogs", () => {
  it("exist for every configured locale and the default is Bangla", () => {
    expect([...LOCALES].sort()).toEqual(Object.keys(catalogs).sort());
    expect(DEFAULT_LOCALE).toBe("bn");
  });

  it("have exactly the same keys in every locale", () => {
    const reference = [...flat.en!.keys()].sort();
    for (const locale of LOCALES) {
      const keys = [...flat[locale]!.keys()].sort();
      const missing = reference.filter((k) => !flat[locale]!.has(k));
      const extra = keys.filter((k) => !flat.en!.has(k));
      expect({ locale, missing, extra }).toEqual({ locale, missing: [], extra: [] });
    }
  });

  it("have no empty messages", () => {
    for (const locale of LOCALES) {
      const empty = [...flat[locale]!.entries()].filter(([, v]) => v.trim() === "").map(([k]) => k);
      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });

  it("use the same placeholders and rich-text tags in every locale", () => {
    const mismatches: string[] = [];
    for (const [key, english] of flat.en!) {
      for (const locale of LOCALES) {
        const other = flat[locale]!.get(key) ?? "";
        if (placeholders(english).join() !== placeholders(other).join()) mismatches.push(`${locale}:${key}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("translate Bangla content into Bangla script (not left in English)", () => {
    // Every Bangla namespace except brand-only ones must contain Bengali characters.
    const namespaces = Object.keys(bn).filter((ns) => ns !== "og");
    for (const ns of namespaces) {
      const values = [...flatten((bn as unknown as Record<string, Tree>)[ns]!).values()].join(" ");
      expect(/[ঀ-৿]/.test(values), ns).toBe(true);
    }
  });

  it("ship every client namespace", () => {
    for (const ns of CLIENT_NAMESPACES) expect(Object.hasOwn(en, ns), ns).toBe(true);
  });
});

describe("keys referenced as data", () => {
  const files = sourceFiles(path.resolve("src"));
  const source = files.map((f) => readFileSync(f, "utf8")).join("\n");

  it("every validation/error/form key used in code exists", () => {
    const pattern =
      /"((?:validation|errors|common|authForms|orgForms|invitationForms|profileForm|contactForm|catalogAdmin)\.[A-Za-z_.]+)"/g;
    const used = new Set([...source.matchAll(pattern)].map((m) => m[1]!));
    expect(used.size).toBeGreaterThan(10);
    // A reference may be a message (leaf) or a namespace passed to useTranslations().
    const keys = [...flat.en!.keys()];
    const missing = [...used].filter(
      (key) => !flat.en!.has(key) && !keys.some((k) => k.startsWith(`${key}.`)),
    );
    expect(missing).toEqual([]);
  });

  it("every error code raised by the database has a translation", () => {
    const sql = readdirSync(path.resolve("supabase/migrations"))
      .map((f) => readFileSync(path.join("supabase/migrations", f), "utf8"))
      .join("\n");
    const codes = new Set([...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]!));
    expect(codes.size).toBeGreaterThan(10);
    const missing = [...codes].filter(
      (code) => !Object.hasOwn(ERROR_MESSAGES, code) && code !== "audit_logs_are_append_only",
    );
    expect(missing).toEqual([]);
  });
});
