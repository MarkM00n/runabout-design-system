// POST /api/subscribe — the Vines & Vinyl landing page's sign-up endpoint.
//
// The page (src/examples/submitSignup.ts) POSTs JSON `{ "email": "…" }` here
// when VITE_SIGNUP_ENDPOINT=/api/subscribe (set for the Netlify build only;
// Storybook, Chromatic and local checkouts keep the built-in mock). This
// forwards it server-side to Kit form 10061069, which has double opt-in on:
// Kit emails a confirmation link, and the visitor is on the list once they
// click it. The page's Success copy says exactly that.
//
// Kit endpoint: its public form-subscription URL — the one Kit's own HTML
// form embeds post to — https://app.kit.com/forms/<form id>/subscriptions,
// form-encoded, email in `email_address`. No API key: it's the same request a
// visitor's browser makes from an embedded Kit form. Kit's API reference
// documents only the keyed v4 API, not this endpoint, so it was confirmed
// against the live form on 2026-10-18 (an empty email_address returned
// {"status":"failed","errors":{"fields":[…,"email_address"],…}}). Note Kit
// answers HTTP 200 even when it rejects a submission; the outcome is in the
// JSON `status` field ("success" / "failed"), which is what's checked here.
//
// Responses the page sees: 200 on success; 400 for a missing or implausible
// email (validated here with SignupForm's own rule, and again if Kit rejects
// the address); 405 for anything but POST; 502 if Kit is unreachable or
// fails for any other reason. The page shows its retry message for any
// non-2xx, so it never needs to tell these apart.

import { isPlausibleEmail } from '../../src/components/SignupForm/email.ts';

const KIT_FORM_ID = '10061069';
const KIT_ENDPOINT = `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`;
const KIT_TIMEOUT_MS = 8000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

interface KitResponse {
  status?: string;
  errors?: { fields?: string[]; messages?: string[] };
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }

  let email: string;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim() : '';
  } catch {
    return json(400, { error: 'invalid_body' });
  }
  if (!isPlausibleEmail(email)) {
    return json(400, { error: 'invalid_email' });
  }

  let kit: KitResponse;
  try {
    const response = await fetch(KIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ email_address: email }),
      signal: AbortSignal.timeout(KIT_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Kit responded HTTP ${response.status}`);
      return json(502, { error: 'upstream' });
    }
    kit = (await response.json()) as KitResponse;
  } catch (error) {
    console.error('Kit request failed', error);
    return json(502, { error: 'upstream' });
  }

  if (kit.status === 'success') {
    return json(200, { ok: true });
  }
  if (kit.errors?.fields?.includes('email_address')) {
    return json(400, { error: 'invalid_email' });
  }
  console.error('Kit rejected the submission', JSON.stringify(kit.errors ?? kit));
  return json(502, { error: 'upstream' });
};

// Netlify Functions v2 routing: serves this at /api/subscribe directly, so
// netlify.toml needs no redirect for it.
export const config = { path: '/api/subscribe' };
