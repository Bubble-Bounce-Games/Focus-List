"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Radio Button
 *
 * Outer ring border-outline, inner dot primary when selected. State-layer
 * hover + clean focus ring. Public API unchanged from shadcn.
 */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "border-outline-variant text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-invalid:ring-2 aria-invalid:ring-error/40 aria-invalid:border-error aspect-square size-[18px] shrink-0 rounded-full border-2 shadow-none transition-[background-color,border-color,color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] outline-none hover:bg-on-surface/[0.08] data-[state=checked]:border-primary disabled:cursor-not-allowed disabled:opacity-38",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-primary text-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
