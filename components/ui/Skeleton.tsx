import { clsx } from "clsx";

type SkeletonVariant = "text" | "card" | "circle";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  /** Width override (Tailwind class, e.g. "w-32") */
  width?: string;
  /** Height override (Tailwind class, e.g. "h-4") */
  height?: string;
  /** Number of skeleton lines to render (only used with "text" variant) */
  lines?: number;
}

const variantDefaults: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  card: "h-40 w-full rounded-xl",
  circle: "h-10 w-10 rounded-full",
};

function Skeleton({
  variant = "text",
  className,
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const base = clsx(
    "animate-pulse bg-gray-200",
    variantDefaults[variant],
    width,
    height,
    className
  );

  if (variant === "text" && lines > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(base, i === lines - 1 && "w-3/4")}
          />
        ))}
      </div>
    );
  }

  return <div className={base} />;
}

export { Skeleton };
export type { SkeletonProps, SkeletonVariant };
