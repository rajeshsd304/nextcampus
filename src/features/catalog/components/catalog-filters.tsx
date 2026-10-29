import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import type { CatalogFilters as Filters } from "../server/queries";
import { localized, type Catalog } from "../types";

/** Plain GET form: filtering works without client JavaScript and URLs are shareable. */
export async function CatalogFilters({ catalog, filters }: { catalog: Catalog; filters: Filters }) {
  const t = await getTranslations("catalog.filters");
  const locale = await getLocale();
  const active = Boolean(filters.university || filters.category || filters.subject);

  return (
    <form
      method="get"
      action="/exams"
      className="border-border bg-surface rounded-2xl border p-4 shadow-xs sm:p-5"
    >
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">{t("legend")}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="filter-university">{t("university")}</Label>
            <Select id="filter-university" name="university" defaultValue={filters.university ?? ""}>
              <option value="">{t("allUniversities")}</option>
              {catalog.universities.map((u) => (
                <option key={u.id} value={u.slug}>
                  {localized(u, "name", locale)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-category">{t("category")}</Label>
            <Select id="filter-category" name="category" defaultValue={filters.category ?? ""}>
              <option value="">{t("allCategories")}</option>
              {catalog.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {localized(c, "name", locale)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-subject">{t("subject")}</Label>
            <Select id="filter-subject" name="subject" defaultValue={filters.subject ?? ""}>
              <option value="">{t("allSubjects")}</option>
              {catalog.subjects.map((s) => (
                <option key={s.id} value={s.slug}>
                  {localized(s, "name", locale)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="flex-1 lg:flex-none">
              {t("apply")}
            </Button>
            {active ? (
              <Button asChild variant="secondary" className="flex-1 lg:flex-none">
                <Link href="/exams">{t("clear")}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
