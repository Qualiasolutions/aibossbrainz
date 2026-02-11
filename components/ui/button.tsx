import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary red gradient button
        default:
          "bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/20 hover:shadow-red-500/40",
        // Premium button with soft red tint
        premium:
          "bg-gradient-to-r from-red-50 to-rose-100 text-red-700 border border-red-200/50 hover:border-red-300 shadow-lg hover:shadow-red-200/50",
        // Glass outline button - bright theme
        outline:
          "border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700",
        // Secondary muted button
        secondary: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80",
        // Ghost transparent button - bright hover
        ghost: "hover:bg-neutral-100 hover:text-neutral-900 text-neutral-600",
        // Destructive red gradient
        destructive:
          "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/20",
        // Silver gradient button
        silver:
          "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-50 hover:to-slate-100 shadow-md",
        // Link style
        link: "text-red-600 underline-offset-4 hover:underline hover:text-red-500",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? SlotPrimitive.Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
