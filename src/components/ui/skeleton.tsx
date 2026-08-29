import { cn } from "@/lib/utils"

/**
 * Material Design 3 Skeleton
 *
 * Pulse animation over surface-variant (lighter tonal surface).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-surface-variant animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
