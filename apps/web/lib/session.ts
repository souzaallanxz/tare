import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type AuthSession } from "./auth";
import { tenantForUser, type Tenant } from "@tare/db/repositories";

export type ActiveSession = {
  session: AuthSession["session"];
  user: AuthSession["user"];
  tenants: Tenant[];
  activeTenant: Tenant;
};

/**
 * Read the current session from cookies. Returns null when there is none.
 * Server components and route handlers should call this — never construct
 * their own tenant context from a client-supplied value.
 */
export async function getSession(): Promise<AuthSession | null> {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Require an authenticated session with at least one tenant.
 * Redirects unauthenticated visitors to /login.
 * Throws if the authenticated user has no tenant (never expected — signup
 * always mints one — but we fail loudly rather than serve a broken screen).
 */
export async function requireSession(): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenants = await tenantForUser(session.user.id);
  const activeTenant = tenants[0];
  if (!activeTenant) {
    // Something went wrong in the signup hook. Do not fabricate a tenant here.
    throw new Error(
      `User ${session.user.id} has no tenant. Check the databaseHooks.user.create in lib/auth.ts.`,
    );
  }
  return { session: session.session, user: session.user, tenants, activeTenant };
}
