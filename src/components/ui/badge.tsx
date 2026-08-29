import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Chips (rendered via shadcn Badge API)
 *
 * Pill shape (rounded-full) + label-medium typography + MD3 container/outline
 * token styling. Legacy variants preserved (default/secondary/destructive/
 * outline); new MD3-style variants added (tonal/success/warning/info). All
 * render as MD3 assist/filter chips.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-0.5 text-label-medium font-medium w-fit whitespace-nowrap shrink-0 transition-[background-color,box-shadow,color,border-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-primary-container [a&]:hover:bg-on-primary-container/[0.08]",
        secondary:
          "bg-secondary-container text-on-secondary-container [a&]:hover:bg-on-secondary-container/[0.08]",
        tonal:
          "bg-secondary-container text-on-secondary-container [a&]:hover:bg-on-secondary-container/[0.08]",
        outline:
          "border-outline-variant text-on-surface bg-transparent [a&]:hover:bg-on-surface/[0.08]",
        success:
          "bg-success-container text-on-success-container [a&]:hover:bg-on-success-container/[0.08]",
        warning:
          "bg-warning-container text-on-warning-container [a&]:hover:bg-on-warning-container/[0.08]",
        info:
          "bg-info-container text-on-info-container [a&]:hover:bg-on-info-container/[0.08]",
        destructive:
          "bg-error-container text-on-error-container [a&]:hover:bg-on-error-container/[0.08]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
