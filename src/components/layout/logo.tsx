import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="nc-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#1F2D59" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#nc-logo)" />
      <path
        d="M9 22V10l14 12V10"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display inline-flex items-center gap-2.5 rounded-lg text-lg font-semibold tracking-tight",
        className,
      )}
    >
      <LogoMark />
      <span>
        Next<span className="text-primary dark:text-indigo-300">Campus</span>
      </span>
    </Link>
  );
}
