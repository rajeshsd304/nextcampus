import { describe, expect, it } from "vitest";
import { filterCatalog } from "@/features/catalog/server/queries";
import { categoryFormSchema, examTargetFormSchema, universityFormSchema } from "@/features/catalog/schemas";
import { localized, type Catalog } from "@/features/catalog/types";

// Synthetic fixture: tests never rely on real university names, slugs or counts.
const catalog: Catalog = {
  categories: [
    { key: "alpha", name_en: "Alpha", name_bn: "আলফা", sort_order: 1, is_active: true },
    { key: "beta", name_en: "Beta", name_bn: "বিটা", sort_order: 2, is_active: true },
  ],
  universities: [
    {
      id: "u1",
      slug: "uni-one",
      name_en: "Uni One",
      name_bn: "ইউনি এক",
      short_code: "U1",
      category_key: "alpha",
      website: null,
      sort_order: 1,
      is_active: true,
    },
    {
      id: "u2",
      slug: "uni-two",
      name_en: "Uni Two",
      name_bn: "ইউনি দুই",
      short_code: "U2",
      category_key: "beta",
      website: null,
      sort_order: 2,
      is_active: true,
    },
    {
      id: "u3",
      slug: "uni-empty",
      name_en: "Uni Empty",
      name_bn: "ইউনি খালি",
      short_code: "U3",
      category_key: "alpha",
      website: null,
      sort_order: 3,
      is_active: true,
    },
  ],
  subjects: [
    {
      id: "s1",
      slug: "subject-one",
      name_en: "Subject One",
      name_bn: "বিষয় এক",
      sort_order: 1,
      is_active: true,
    },
    {
      id: "s2",
      slug: "subject-two",
      name_en: "Subject Two",
      name_bn: "বিষয় দুই",
      sort_order: 2,
      is_active: true,
    },
  ],
  targets: [
    {
      id: "t1",
      university_id: "u1",
      slug: "t-one",
      name_en: "T1",
      name_bn: "টি১",
      description_en: null,
      description_bn: null,
      typical_format_en: null,
      typical_format_bn: null,
      negative_marking: 0.25,
      sort_order: 1,
      is_active: true,
      subjectIds: ["s1"],
    },
    {
      id: "t2",
      university_id: "u2",
      slug: "t-two",
      name_en: "T2",
      name_bn: "",
      description_en: null,
      description_bn: null,
      typical_format_en: null,
      typical_format_bn: null,
      negative_marking: 0,
      sort_order: 2,
      is_active: true,
      subjectIds: ["s1", "s2"],
    },
  ],
};

describe("catalog filtering", () => {
  it("returns everything with targets when unfiltered, hiding universities without targets", () => {
    const result = filterCatalog(catalog, {});
    expect(result.universities.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(result.targets).toHaveLength(2);
  });

  it("filters by university, category and subject (combined with AND)", () => {
    expect(filterCatalog(catalog, { university: "uni-two" }).targets.map((t) => t.id)).toEqual(["t2"]);
    expect(filterCatalog(catalog, { category: "alpha" }).targets.map((t) => t.id)).toEqual(["t1"]);
    expect(filterCatalog(catalog, { subject: "subject-two" }).targets.map((t) => t.id)).toEqual(["t2"]);
    expect(filterCatalog(catalog, { category: "alpha", subject: "subject-two" }).targets).toEqual([]);
  });

  it("matches nothing for unknown filter values", () => {
    expect(filterCatalog(catalog, { university: "does-not-exist" }).targets).toEqual([]);
    expect(filterCatalog(catalog, { subject: "nope" }).targets).toEqual([]);
  });

  it("localizes names with an English fallback", () => {
    expect(localized(catalog.universities[0]!, "name", "bn")).toBe("ইউনি এক");
    expect(localized(catalog.universities[0]!, "name", "en")).toBe("Uni One");
    expect(localized(catalog.targets[1]!, "name", "bn")).toBe("T2");
  });
});

describe("catalog admin validation", () => {
  const university = {
    slug: "new-uni",
    nameEn: "New University",
    nameBn: "নতুন বিশ্ববিদ্যালয়",
    shortCode: "NU",
    categoryKey: "alpha",
    website: "",
    isActive: true,
  };

  it("accepts valid bilingual university input", () => {
    expect(universityFormSchema.safeParse(university).success).toBe(true);
  });

  it.each(["Bad Slug", "-x", "x-", "a--b", "x", "a".repeat(61)])("rejects slug %s", (slug) => {
    expect(universityFormSchema.safeParse({ ...university, slug }).success).toBe(false);
  });

  it("requires both language names and a valid category key", () => {
    expect(universityFormSchema.safeParse({ ...university, nameBn: "" }).success).toBe(false);
    expect(
      categoryFormSchema.safeParse({ key: "Engineering!", nameEn: "Eng", nameBn: "প্রকৌশল", isActive: true })
        .success,
    ).toBe(false);
    expect(
      categoryFormSchema.safeParse({ key: "new_category", nameEn: "New", nameBn: "নতুন", isActive: true })
        .success,
    ).toBe(true);
  });

  it("bounds negative marking between 0 and 1", () => {
    const target = {
      universityId: "10000000-0000-4000-8000-000000000001",
      slug: "x-unit",
      nameEn: "Unit",
      nameBn: "ইউনিট",
      descriptionEn: "",
      descriptionBn: "",
      formatEn: "",
      formatBn: "",
      negativeMarking: 0.25,
      isActive: true,
      subjectIds: [],
    };
    expect(examTargetFormSchema.safeParse(target).success).toBe(true);
    expect(examTargetFormSchema.safeParse({ ...target, negativeMarking: 1.5 }).success).toBe(false);
    expect(examTargetFormSchema.safeParse({ ...target, negativeMarking: -0.1 }).success).toBe(false);
  });
});
