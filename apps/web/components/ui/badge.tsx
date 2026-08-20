import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[.08em] " +
    "px-2 py-[3px] border whitespace-nowrap bg-surface",
  {
    variants: {
      variant: {
        muted:      "border-rule text-muted",
        ink:        "border-ink/40 text-ink",
        estimated:  "border-estimated text-estimated",
        recovered:  "border-recovered text-recovered",
        overrun:    "border-overrun text-overrun",
        threshold:  "border-threshold text-threshold",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="w-1.5 h-1.5 bg-current inline-block" /> : null}
      {children}
    </span>
  );
}
