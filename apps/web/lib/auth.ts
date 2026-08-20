import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool, withoutTenant } from "@tare/db";
import { createTenant } from "@tare/db/repositories";
import { requireEnv } from "./env";

requireEnv();

/**
 * Better Auth owns identity. Repositories own authorisation.
 *
 * §3 rules from the backend design encoded here:
 *   - sessions in DB, not stateless JWTs. Revocation is a DELETE that takes
 *     effect immediately.
 *   - email + password with a 12-char minimum. No composition rules.
 *   - email verification required before creating a tenant.
 *   - Google links only when both sides have a verified email
 *     (Better Auth's default when allowDifferentEmails is false).
 *   - session cookie carries the __Host- prefix in production.
 *
 * The pool is shared with the rest of the app.
 */
const pool = getPool();

export const auth = betterAuth({
  database: pool,
  secret: process.env["BETTER_AUTH_SECRET"] ?? throwOnMissing("BETTER_AUTH_SECRET"),
  baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Phase 1a: log to console. Real provider lands in phase 1d.
      console.log(`[auth] password reset for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[auth] verify email for ${user.email}: ${url}`);
    },
  },

  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
      scope: ["openid", "email", "profile"],
    },
  },

  account: {
    // The classic hijack: attacker registers vitima@empresa.com with password
    // and never verifies. Later the real victim signs in with Google, both
    // accounts get linked, attacker keeps password access. Better Auth's
    // default (allowDifferentEmails=false) plus our requireEmailVerification
    // on email+password blocks that path.
    accountLinking: {
      enabled: true,
      trustedProviders: [],
      allowDifferentEmails: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,          // 30 days absolute
    updateAge: 60 * 60 * 24 * 7,           // 7-day sliding refresh
    freshAge: 60 * 15,                     // 15 min freshness for sensitive ops
    cookieCache: { enabled: false },
  },

  advanced: {
    cookiePrefix: "tare",
    useSecureCookies: process.env["NODE_ENV"] === "production",
    crossSubDomainCookies: { enabled: false },
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
    },
    // Generate our own IDs so we can prefix them (findable in logs, unambiguous
    // when they appear in URLs or DB dumps).
    generateId: ({ model }: { model: string }) =>
      `${prefix(model)}_${randomBytes(16).toString("base64url")}`,
  },

  databaseHooks: {
    user: {
      create: {
        // Fires only when a user actually gets created (after Google callback,
        // after email verification for email+password). On first user creation
        // we mint their personal tenant and make them the owner.
        after: async (user) => {
          const tenant = await createTenant(defaultTenantName(user.email), "EUR");
          await withoutTenant(async (client) => {
            await client.query(
              `INSERT INTO membership (tenant_id, user_id, role) VALUES ($1, $2, 'owner')
               ON CONFLICT DO NOTHING`,
              [tenant.id, user.id],
            );
          });
          console.log(`[auth] created tenant ${tenant.id} for ${user.email}`);
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

function prefix(model: string): string {
  switch (model) {
    case "user":         return "u";
    case "session":      return "s";
    case "account":      return "acc";
    case "verification": return "v";
    default:             return model.slice(0, 3);
  }
}

function defaultTenantName(email: string): string {
  const domain = email.split("@")[1] ?? "workspace";
  return domain.split(".")[0]!.replace(/^./, (c) => c.toUpperCase());
}

function throwOnMissing(name: string): never {
  throw new Error(
    `${name} is not set. Generate one with: ` +
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`,
  );
}
