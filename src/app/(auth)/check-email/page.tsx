import { redirect } from "next/navigation";

/** Superseded by /verify-email (code entry + resend); kept so old links keep working. */
export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 320) : "";
  redirect(email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email");
}
