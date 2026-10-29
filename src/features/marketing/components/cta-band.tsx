import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-page">
        <div className="bg-navy-950 relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:px-12">
          <div className="bg-hero-glow absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Bring trusted assessments to your institution
            </h2>
            <p className="text-lg text-indigo-100">
              Set up your organization in minutes, invite your staff and students, and keep every change on
              the record.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">Create your workspace</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/contact?topic=sales">Talk to our team</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
