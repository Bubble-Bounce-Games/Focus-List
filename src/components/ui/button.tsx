import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Material Design 3 Button
 *
 * Variants map to MD3 button types (legacy shadcn variant names preserved):
 *   default     → MD3 Filled     (bg-primary / on-primary)
 *   secondary   → MD3 Tonal      (bg-secondary-container / on-secondary-container)
 *   tonal       → MD3 Tonal alt  (alias of secondary, MD3 name)
 *   outline     → MD3 Outlined   (border outline-variant, text-primary)
 *   ghost       → MD3 Text       (transparent, text-primary)
 *   destructive → MD3 Filled error (bg-error / on-error)
 *   link        → inline link    (text-primary + underline on hover)
 *
 * Shape: pill (`rounded-full`) for all variants except `link`.
 * State layers: hover 8% / focus-visible 10% / active 12% of content color.
 * Motion: --duration-short --ease-standard.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] outline-none focus-visible:outline-none transition-[background-color,box-shadow,color,border-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-e1 hover:bg-primary/90 focus-visible:bg-primary/90 active:bg-primary/85 aria-invalid:bg-error aria-invalid:text-on-error",
        destructive:
          "bg-error text-on-error shadow-e1 hover:bg-error/90 focus-visible:bg-error/90 active:bg-error/85",
        outline:
          "border-2 border-outline-variant text-primary bg-transparent hover:bg-primary/[0.08] focus-visible:bg-primary/[0.10] active:bg-primary/[0.12] dark:border-outline-variant",
        secondary:
          "bg-secondary text-secondary-foreground shadow-e1 hover:bg-secondary/90 focus-visible:bg-secondary/90 active:bg-secondary/85",
        tonal:
          "bg-secondary text-secondary-foreground shadow-e1 hover:bg-secondary/90 focus-visible:bg-secondary/90 active:bg-secondary/85",
        ghost:
          "bg-transparent text-primary hover:bg-primary/[0.08] focus-visible:bg-primary/[0.10] active:bg-primary/[0.12]",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline hover:bg-transparent focus-visible:underline",
      },
      size: {
        default: "h-10 px-5 has-[>svg]:px-5",
        sm: "h-8 px-3 text-sm gap-1.5 has-[>svg]:px-3",
        lg: "h-11 px-6 text-base has-[>svg]:px-6",
        icon: "size-10 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
