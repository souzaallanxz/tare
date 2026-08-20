import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Consistent page header. Title + description on the left, actions on the
 * right. Every app screen uses this — replaces the ad-hoc `display` + flex
 * scaffolding scattered across pages.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-6 mb-6", className)}>
      <div>
        {eyebrow ? (
          <div className="text-[13px] text-muted mb-1.5">{eyebrow}</div>
        ) : null}
        <h1 className="text-[34px] font-medium leading-[1.14] tracking-[-0.022em]">{title}</h1>
        {description ? (
          <p className="text-muted mt-1.5">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
