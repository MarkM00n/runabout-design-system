// POST /api/subscribe — the Vines & Vinyl landing page's sign-up endpoint.
//
// The page (src/examples/submitSignup.ts) POSTs JSON `{ "email": "…" }` here
// when VITE_SIGNUP_ENDPOINT=/api/subscribe (set for the Netlify build only;
// Storybook, Chromatic and local checkouts keep the built-in mock). This
// forwards it server-side to Kit form 10061069, which auto-confirms: the
// visitor is on the list straight away and Kit sends its (branded) welcome
// email. The page's Success copy says exactly that.
//
// Kit API: v4, authenticated with KIT_API_KEY (a v4 key from Kit → Settings
// → Developer, set as a secret environment variable in Netlify; never in the
// repo). Two calls, as v4 requires: create (or match) the subscriber, then add
// them to the form — the form add is what applies the form's settings
// (auto-confirm, welcome email). Docs:
// https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address
//
// Why not Kit's public form URL (app.kit.com/forms/<id>/subscriptions), which
// this used to post to: that endpoint is built for browsers, and Kit's bot
// guard quarantines server-side submissions to it — live on 2026-10-18 every
// sign-up came back {"status":"quarantined", url: …/forms/guards/…} and was
// never added. The keyed API has no such guard.
//
// Responses the page sees: 200 on success; 400 for a missing or implausible
// email (validated here with SignupForm's own rule, and again if Kit rejects
// the address with 422); 405 for anything but POST; 502 if the key is
// missing, Kit is unreachable, or it fails for any other reason. The page
// shows its retry message for any non-2xx, so it never needs to tell these
// apart. Failures log Kit's actual reply (Netlify → Logs → Functions).

import { isPlausibleEmail } from '../../src/components/SignupForm/email.ts';

const KIT_FORM_ID = '10061069';
const KIT_API = 'https://api.kit.com/v4';
const KIT_TIMEOUT_MS = 8000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const kitPost = (path: string, apiKey: string, body: Record<string, unknown>) =>
  fetch(`${KIT_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Kit-Api-Key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(KIT_TIMEOUT_MS),
  });

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

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.error('KIT_API_KEY is not set in Netlify environment variables');
    return json(502, { error: 'not_configured' });
  }

  try {
    const created = await kitPost('/subscribers', apiKey, { email_address: email });
    if (created.status === 422) return json(400, { error: 'invalid_email' });
    if (!created.ok) {
      console.error(`Kit create subscriber: HTTP ${created.status}`, await created.text());
      return json(502, { error: 'upstream' });
    }
    const added = await kitPost(`/forms/${KIT_FORM_ID}/subscribers`, apiKey, {
      email_address: email,
      referrer: request.headers.get('referer') ?? undefined,
    });
    if (added.status === 422) return json(400, { error: 'invalid_email' });
    if (!added.ok) {
      console.error(`Kit add to form: HTTP ${added.status}`, await added.text());
      return json(502, { error: 'upstream' });
    }
  } catch (error) {
    console.error('Kit request failed', error);
    return json(502, { error: 'upstream' });
  }

  return json(200, { ok: true });
};

// Netlify Functions v2 routing: serves this at /api/subscribe directly, so
// netlify.toml needs no redirect for it.
export const config = { path: '/api/subscribe' };
