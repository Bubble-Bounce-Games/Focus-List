"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Label
 *
 * label-medium typography (12px/500). Inherits Radix Label primitive so it
 * associates with form controls. Public API unchanged.
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-label-medium text-on-surface-variant flex items-center gap-2 leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-38 peer-disabled:cursor-not-allowed peer-disabled:opacity-38",
        className
      )}
      {...props}
    />
  )
}

export { Label }
