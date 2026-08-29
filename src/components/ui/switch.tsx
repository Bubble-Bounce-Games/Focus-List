"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Switch
 *
 * Track = primary when checked, outline-variant when unchecked. Thumb =
 * on-primary when checked, surface-container-lowest when unchecked. Slightly
 * wider MD3 proportions (h-6 w-[44px]). Public API unchanged from shadcn.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full border-2 border-transparent shadow-none transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] outline-none disabled:cursor-not-allowed disabled:opacity-38 hover:data-[state=unchecked]:bg-on-surface/[0.08]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-on-primary pointer-events-none block size-[18px] rounded-full ring-0 transition-transform duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-[3px] data-[state=unchecked]:bg-surface-container-lowest data-[state=unchecked]:border data-[state=unchecked]:border-outline-variant"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
