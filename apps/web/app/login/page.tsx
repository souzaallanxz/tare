"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lockup } from "../../components/logo";
import { authClient } from "../../lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/overview";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const res = await authClient.signIn.email({ email, password, callbackURL: nextPath });
    setSubmitting(false);
    if (res.error) {
      // Deliberately generic. Distinguishing "no such user" from "wrong password"
      // leaks account existence to enumeration probes.
      setError("Invalid email or password.");
      return;
    }
    router.push(nextPath as never);
    router.refresh();
  }

  async function onGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: nextPath });
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div
        style={{
          background: "var(--color-ink)",
          color: "#C6CEDA",
          padding: 44,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Link href="/"><Lockup variant="dark" size={24} /></Link>
        <h2 style={{ color: "#fff", fontSize: 25, fontWeight: 500, letterSpacing: "-.02em", maxWidth: "20ch", margin: 0 }}>
          Know what you spent. Know what you only think you spent.
        </h2>
        <div />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 44 }}>
        <form style={{ width: "100%", maxWidth: 344 }} onSubmit={onSubmit}>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>Log in</h1>

          <div style={{ marginTop: 22, marginBottom: 16 }}>
            <label className="label" htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" required autoComplete="username" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={12} required autoComplete="current-password" style={inputStyle} />
          </div>

          {error ? (
            <p style={{ color: "var(--color-overrun)", fontSize: 13, marginBottom: 12 }}>{error}</p>
          ) : null}

          <button className="btn" style={{ width: "100%" }} type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Log in"}
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ width: "100%", marginTop: 10 }}
            onClick={onGoogle}
          >
            Continue with Google
          </button>

          <p className="mut" style={{ fontSize: 13, marginTop: 22 }}>
            No account? <Link href="/signup" style={{ textDecoration: "underline" }}>Create one</Link>.
          </p>
          <p className="mut" style={{ fontSize: 13, marginTop: 8 }}>
            <Link href="/">← Back to the site</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-rule)",
  background: "var(--color-surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--color-ink)",
};
