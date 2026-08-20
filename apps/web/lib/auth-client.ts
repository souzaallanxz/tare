import { createAuthClient } from "better-auth/react";

/**
 * Client-side auth helper. Uses relative URLs, so the same bundle works
 * against localhost, preview and production without a rebuild.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000"
      : window.location.origin,
});

export const { signIn, signOut, signUp, useSession } = authClient;
