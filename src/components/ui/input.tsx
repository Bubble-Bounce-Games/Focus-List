import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Outlined Text Field
 *
 * rounded-md (12px), 2px border-outline-variant, focus ring = primary 2px,
 * disabled opacity 0.38 + cursor not-allowed. Aria-invalid → error border +
 * error ring. md:text-sm (label-medium).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-on-surface-variant selection:bg-primary selection:text-primary-foreground border-outline-variant flex h-11 w-full min-w-0 rounded-md border-2 bg-transparent px-3.5 py-1 text-base text-on-surface shadow-none transition-[color,box-shadow,border-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-38 md:text-sm",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
