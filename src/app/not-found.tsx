import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main"
      className="container-page flex min-h-dvh flex-col items-center justify-center py-24 text-center"
    >
      <p className="text-primary text-sm font-semibold dark:text-indigo-300">404</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        The page you are looking for does not exist, or you do not have access to it.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
