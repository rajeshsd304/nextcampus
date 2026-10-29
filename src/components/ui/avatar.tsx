import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-lg" } as const;
  return (
    <span
      className={cn(
        "to-navy-700 relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 font-semibold text-white",
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatars from OAuth providers; decorative
        <img src={src} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
