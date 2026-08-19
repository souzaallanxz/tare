import { betterAuth } from "better-auth";
import { Pool } from "pg";

/**
 * Better Auth handles who-you-are. What-you-have-access-to lives in our
 * repository layer (see @tare/db).
 *
 * Rules encoded here rather than in prose (see §3 of the backend design):
 *   - sessions in DB, not stateless JWTs. Revocation is a DELETE with immediate effect.
 *   - email + password with a 12-char minimum, no composition rules.
 *   - Google linked only when both sides have a verified email.
 *   - no user enumeration — Better Auth's defaults are correct here; do not override.
 */
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env["DATABASE_URL"] }),
  secret: process.env["BETTER_AUTH_SECRET"],
  baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    autoSignIn: false,
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
      scope: ["openid", "email", "profile"],
    },
  },

  account: {
    // Do not auto-link on first sign-in unless BOTH sides have a verified email.
    // Prevents the classic hijack: unverified email/password registration linked
    // later to a real Google account.
    accountLinking: {
      enabled: true,
      trustedProviders: [],
      allowDifferentEmails: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,          // 30 days absolute
    updateAge: 60 * 60 * 24 * 7,           // 7-day sliding refresh
    cookieCache: { enabled: false },
  },

  advanced: {
    cookiePrefix: "__Host-",
    useSecureCookies: process.env["NODE_ENV"] === "production",
  },
});

export type AuthSession = typeof auth.$Infer.Session;
