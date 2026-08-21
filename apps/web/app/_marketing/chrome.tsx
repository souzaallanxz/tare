import Link from "next/link";
import { Lockup } from "../../components/logo";
import { Button } from "../../components/ui/button";

/**
 * Shared header + footer for every public marketing page. Kept in
 * app/_marketing/ so it lives outside the route tree (leading underscore).
 */
export function MarketingNav() {
  return (
    <nav className="flex items-center justify-between py-5 border-b border-rule">
      <Link href="/"><Lockup /></Link>
      <div className="flex items-center gap-6 text-[14px]">
        <Link href="/#how" className="text-muted hover:text-ink">How it works</Link>
        <Link href="/pricing" className="text-muted hover:text-ink">Pricing</Link>
        <Link href="/#security" className="text-muted hover:text-ink">Security</Link>
        <Link href="/sample" className="text-muted hover:text-ink">Sample</Link>
        <Button asChild size="sm"><Link href="/login">Log in</Link></Button>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="py-12 mt-10 border-t border-rule text-muted text-[13px]">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Lockup />
          <p className="mt-3 max-w-[42ch]">
            Cost observability for Databricks. Built in Lisbon, hosted in the EU.
          </p>
        </div>
        <div className="flex gap-10">
          <FooterCol
            title="Product"
            links={[
              ["Sample report", "/sample"],
              ["Pricing", "/pricing"],
              ["Assessment", "/assessment"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["Security", "/#security"],
              ["Log in", "/login"],
            ]}
          />
        </div>
      </div>
      <p className="mt-8 font-mono text-[11px] uppercase tracking-[.14em] text-muted/70">
        © Tare · Lisbon · EU-only data residency
      </p>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly [string, string][];
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-2">{title}</p>
      <ul className="space-y-1">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href as never} className="hover:text-ink">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
