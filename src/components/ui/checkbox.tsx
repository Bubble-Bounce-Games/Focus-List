"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Checkbox
 *
 * Outline (border-outline) when unchecked, primary fill when checked.
 * Indicator icon in on-primary. State-layer hover (8% of on-surface) and
 * clean focus ring. Public API unchanged from shadcn.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-outline-variant text-on-primary bg-transparent data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-invalid:ring-2 aria-invalid:ring-error/40 aria-invalid:border-error size-[18px] shrink-0 rounded-[4px] border-2 shadow-none transition-[background-color,border-color,color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] outline-none hover:bg-on-surface/[0.08] data-[state=checked]:hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-38",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
