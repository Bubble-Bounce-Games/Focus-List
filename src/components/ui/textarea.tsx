import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Outlined Text Field (multiline)
 *
 * rounded-md (12px), 2px border-outline-variant, focus ring = primary 2px,
 * aria-invalid → error border + error ring. Same look as Input.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-outline-variant placeholder:text-on-surface-variant text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/40 flex field-sizing-content min-h-20 w-full rounded-md border-2 bg-transparent px-3.5 py-2.5 text-base shadow-none transition-[color,box-shadow,border-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] outline-none disabled:cursor-not-allowed disabled:opacity-38 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
