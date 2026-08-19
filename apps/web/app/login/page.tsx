import Link from "next/link";
import { Lockup } from "../../components/logo";

export default function LoginPage() {
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
        <div>
          <h2 style={{ fontSize: 25, fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1.24, maxWidth: "20ch", color: "#fff", margin: 0 }}>
            Know what you spent. Know what you only think you spent.
          </h2>
        </div>
        <div />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 44 }}>
        <form
          style={{ width: "100%", maxWidth: 344 }}
          action="/api/auth/sign-in/email"
          method="POST"
        >
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>Log in</h1>
          <p className="mut" style={{ fontSize: 13, margin: "6px 0 26px" }}>
            Skeleton screen. Wire up Better Auth in phase 1a.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" required autoComplete="username"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-rule)", background: "var(--color-surface)", fontFamily: "var(--font-mono)", fontSize: 13 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={12} required autoComplete="current-password"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-rule)", background: "var(--color-surface)", fontFamily: "var(--font-mono)", fontSize: 13 }} />
          </div>
          <button className="btn" style={{ width: "100%" }} type="submit">Log in</button>
          <Link className="btn ghost" style={{ width: "100%", marginTop: 10 }} href="/api/auth/sign-in/google">
            Continue with Google
          </Link>
          <p className="mut" style={{ fontSize: 13, marginTop: 22 }}>
            <Link href="/">← Back to the site</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
