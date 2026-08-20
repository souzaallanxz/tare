"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      style={{
        background: "none",
        border: "none",
        color: "inherit",
        cursor: "pointer",
        padding: 0,
        font: "inherit",
        textDecoration: "underline",
      }}
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
