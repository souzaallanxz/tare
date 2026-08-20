export type EmailMessage = {
  to: readonly string[];
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type EmailSender = (msg: EmailMessage) => Promise<{ id: string }>;

/** Provider is chosen in phase 1d (Resend / Postmark / SES-EU). This is the shape it must satisfy. */
export function resendSender(apiKey: string): EmailSender {
  return async (msg) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        reply_to: msg.replyTo,
      }),
    });
    if (!res.ok) throw new Error(`Email provider returned ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { id: string };
    return { id: json.id };
  };
}

/** In-memory sender for tests and local dev. Logs a short summary + full HTML. */
export function fakeSender(sink: EmailMessage[] = []): EmailSender & { sink: EmailMessage[] } {
  const send = async (msg: EmailMessage) => {
    sink.push(msg);
    // eslint-disable-next-line no-console
    console.log(
      `\n[fake mail] → ${msg.to.join(", ")}\n[fake mail] subject: ${msg.subject}\n[fake mail] from: ${msg.from}\n[fake mail] html (${msg.html.length} chars):\n${msg.html}\n`,
    );
    return { id: `fake-${sink.length}` };
  };
  return Object.assign(send, { sink });
}
