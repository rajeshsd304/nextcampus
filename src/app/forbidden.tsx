import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main
      id="main"
      className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center"
    >
      <div className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </div>
      <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight">
        You don&apos;t have access to this area
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        Your role in this organization does not include this dashboard. If you believe this is a mistake, ask
        an organization administrator to review your role.
      </p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">Go to my dashboard</Link>
      </Button>
    </main>
  );
}
