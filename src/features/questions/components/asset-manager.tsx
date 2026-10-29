"use client";

import { createClient } from "@supabase/supabase-js";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useMessageText } from "@/i18n/use-message-text";
import { createAssetUploadAction, registerAssetAction, removeAssetAction } from "../actions";
import { ASSET_BUCKET, ASSET_MAX_BYTES, ASSET_MIME_TYPES } from "../constants";
import type { BankRef } from "../server/context";

type Asset = { id: string; url: string | null; altBn: string; altEn: string };

/**
 * Uploads go straight from the browser to private Storage through a one-time
 * signed upload URL issued by the server (after Storage RLS has checked the
 * caller may write to this question's path). No service-role key is involved.
 */
export function AssetManager({
  bank,
  questionId,
  assets,
}: {
  bank: BankRef;
  questionId: string;
  assets: Asset[];
}) {
  const t = useTranslations("questionForms.assets");
  const text = useMessageText();
  const router = useRouter();
  const fileId = useId();
  const altBnId = useId();
  const altEnId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [altBn, setAltBn] = useState("");
  const [altEn, setAltEn] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = () => {
    const file = fileRef.current?.files?.[0];
    setMessage(null);
    if (!file) return setMessage({ tone: "danger", text: t("chooseFile") });
    if (!Object.hasOwn(ASSET_MIME_TYPES, file.type))
      return setMessage({ tone: "danger", text: text("validation.imageType") ?? "" });
    if (file.size > ASSET_MAX_BYTES)
      return setMessage({ tone: "danger", text: text("validation.imageTooLarge") ?? "" });

    startTransition(async () => {
      const ticket = await createAssetUploadAction({
        bank,
        questionId,
        mimeType: file.type,
        size: file.size,
      });
      if (!ticket.ok) return setMessage({ tone: "danger", text: text(`errors.${ticket.error.code}`) ?? "" });

      const storage = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        {
          auth: { persistSession: false },
        },
      ).storage;
      const { error } = await storage
        .from(ASSET_BUCKET)
        .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, { contentType: file.type });
      if (error) return setMessage({ tone: "danger", text: t("uploadFailed") });

      const registered = await registerAssetAction({
        bank,
        questionId,
        path: ticket.data.path,
        altBn,
        altEn,
      });
      if (!registered.ok)
        return setMessage({ tone: "danger", text: text(`errors.${registered.error.code}`) ?? "" });
      setAltBn("");
      setAltEn("");
      if (fileRef.current) fileRef.current.value = "";
      setMessage({ tone: "success", text: t("added") });
      router.refresh();
    });
  };

  const remove = (assetId: string) =>
    startTransition(async () => {
      const result = await removeAssetAction({ bank, assetId });
      setMessage(
        result.ok
          ? { tone: "success", text: t("removed") }
          : { tone: "danger", text: text(`errors.${result.error.code}`) ?? "" },
      );
      if (result.ok) router.refresh();
    });

  return (
    <div className="space-y-4">
      {message ? (
        <Alert tone={message.tone} live>
          {message.text}
        </Alert>
      ) : null}
      {assets.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {assets.map((asset) => (
            <li key={asset.id} className="border-border space-y-2 rounded-xl border p-3">
              {asset.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
                <img
                  src={asset.url}
                  alt={asset.altBn || asset.altEn}
                  className="max-h-48 w-full rounded-lg object-contain"
                />
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground truncate text-xs">
                  {[asset.altBn, asset.altEn].filter(Boolean).join(" / ") || t("noAlt")}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  disabled={pending}
                  onClick={() => remove(asset.id)}
                  aria-label={t("remove")}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor={fileId}>{t("file")}</Label>
          <Input
            id={fileId}
            ref={fileRef}
            type="file"
            accept={Object.keys(ASSET_MIME_TYPES).join(",")}
            className="h-auto py-2.5"
            aria-describedby={`${fileId}-hint`}
          />
          <p id={`${fileId}-hint`} className="text-muted-foreground text-sm">
            {t("fileHint")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={altBnId}>{t("altBn")}</Label>
          <Input
            id={altBnId}
            lang="bn"
            maxLength={300}
            value={altBn}
            onChange={(e) => setAltBn(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={altEnId}>{t("altEn")}</Label>
          <Input
            id={altEnId}
            lang="en"
            maxLength={300}
            value={altEn}
            onChange={(e) => setAltEn(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={upload} disabled={pending} className="w-full">
            {pending ? <Spinner label={t("uploading")} /> : <ImagePlus aria-hidden="true" />}
            {t("upload")}
          </Button>
        </div>
      </div>
    </div>
  );
}
