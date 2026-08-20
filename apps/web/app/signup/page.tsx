"use client";

import { useState } from "react";
import Link from "next/link";
import { Lockup } from "../../components/logo";
import { authClient } from "../../lib/auth-client";

export default function SignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    const res = await authClient.signUp.email({ email, password, name });
    setSubmitting(false);
    if (res.error) {
      // No user enumeration — Better Auth returns the same shape for
      // "already registered" and generic errors. Surface it as-is.
      setError(res.error.message ?? "Could not create the account.");
      return;
    }
    setDone(email);
  }

  if (done) {
    return (
      <Layout>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Check your email</h1>
        <p className="mut" style={{ fontSize: 13, margin: "12px 0 0", maxWidth: 40 * 8 }}>
          We sent a verification link to <span className="data">{done}</span>. Follow it to finish creating
          your account.
        </p>
        <p className="mut" style={{ fontSize: 12, marginTop: 20 }}>
          No provider is wired yet in phase 1a — the link is logged to the server console.
        </p>
        <p style={{ marginTop: 22 }}>
          <Link href="/login" className="mut">← Back to log in</Link>
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 500 }}>Create your account</h1>
      <p className="mut" style={{ fontSize: 13, margin: "6px 0 26px" }}>
        One account, one tenant to start. You can invite people once you are in.
      </p>

      <form onSubmit={onSubmit}>
        <Field label="Name" name="name" type="text" required autoComplete="name" />
        <Field label="Work email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          minLength={12}
          required
          autoComplete="new-password"
          hint="Twelve characters or more. No composition rules."
        />

        {error ? (
          <p style={{ color: "var(--color-overrun)", fontSize: 13, marginBottom: 12 }}>{error}</p>
        ) : null}

        <button className="btn" style={{ width: "100%" }} type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mut" style={{ fontSize: 13, marginTop: 22 }}>
        Already have an account? <Link href="/login" style={{ textDecoration: "underline" }}>Log in</Link>.
      </p>
    </Layout>
  );
}

function Field(props: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label" htmlFor={props.name}>{props.label}</label>
      <input
        id={props.name}
        name={props.name}
        type={props.type}
        required={props.required}
        minLength={props.minLength}
        autoComplete={props.autoComplete}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid var(--color-rule)",
          background: "var(--color-surface)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--color-ink)",
        }}
      />
      {props.hint ? (
        <p className="mut" style={{ fontSize: 12, margin: "6px 0 0" }}>{props.hint}</p>
      ) : null}
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
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
          A recommendation is a suggestion. A saving is a fact with a date.
        </h2>
        <div />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 44 }}>
        <div style={{ width: "100%", maxWidth: 344 }}>{children}</div>
      </div>
    </div>
  );
}
