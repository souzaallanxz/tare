import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
    "transition-colors disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-paper",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper hover:bg-ink/90 border border-ink",
        ghost:
          "bg-transparent text-ink border border-ink hover:bg-ink/5",
        subtle:
          "bg-transparent text-ink border border-rule hover:bg-ink/5",
        danger:
          "bg-transparent text-overrun border border-overrun hover:bg-overrun/5",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-7 px-3 text-[13px]",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
