"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { updatePreferencesAction } from "@/features/preferences/actions";
import {
  LOCALE_NATIVE_NAMES,
  LOCALES,
  NUMERAL_SYSTEMS,
  type Locale,
  type NumeralSystem,
} from "@/i18n/config";
import { useMessageText } from "@/i18n/use-message-text";

/** Language and digit preferences (saved to the profile and cookies). */
export function PreferencesForm({ locale, numerals }: { locale: Locale; numerals: NumeralSystem }) {
  const t = useTranslations("profileForm.preferences");
  const text = useMessageText();
  const router = useRouter();
  const localeId = useId();
  const numeralsId = useId();
  const [values, setValues] = useState({ locale, numerals });
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updatePreferencesAction(values);
      if (result.ok) {
        setMessage({ tone: "success", text: t("saved") });
        router.refresh();
      } else setMessage({ tone: "danger", text: text(`errors.${result.error.code}`) ?? "" });
    });
  };

  return (
    <div className="space-y-5">
      {message ? (
        <Alert tone={message.tone} live>
          {message.text}
        </Alert>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={localeId}>{t("language")}</Label>
          <Select
            id={localeId}
            value={values.locale}
            onChange={(event) => setValues((v) => ({ ...v, locale: event.target.value as Locale }))}
          >
            {LOCALES.map((option) => (
              <option key={option} value={option} lang={option}>
                {LOCALE_NATIVE_NAMES[option]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={numeralsId}>{t("digits")}</Label>
          <Select
            id={numeralsId}
            value={values.numerals}
            onChange={(event) => setValues((v) => ({ ...v, numerals: event.target.value as NumeralSystem }))}
          >
            {NUMERAL_SYSTEMS.map((option) => (
              <option key={option} value={option}>
                {t(`digitOptions.${option}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Button onClick={save} disabled={pending}>
        {pending ? <Spinner label={t("saving")} /> : null}
        {t("save")}
      </Button>
    </div>
  );
}
