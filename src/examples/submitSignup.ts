// Mailing-list submission for the Vines & Vinyl landing page's sign-up form.
//
// Provider-agnostic on purpose: the page POSTs `{ "email": "…" }` as JSON to
// whatever URL VITE_SIGNUP_ENDPOINT holds (see .env.example), and treats any
// 2xx as success. Adapting to a particular list provider — its field names,
// auth, double opt-in — belongs behind that URL, never hardcoded here.
//
// Live, that URL is /api/subscribe: the Netlify Function in
// netlify/functions/subscribe.ts, which forwards to Kit form 10061069 (double
// opt-in). VITE_SIGNUP_ENDPOINT is set to it in the Netlify UI only.
//
// With the variable unset — Storybook, Chromatic, a local checkout — it
// resolves after 800ms instead, so every state can be exercised without a
// real list. That mock also runs in any build deployed without the variable,
// where it reports success without storing anything: set the variable before
// pointing real visitors at the page.

const MOCK_DELAY_MS = 800;

export class SignupError extends Error {}

export async function submitSignup(email: string): Promise<void> {
  const endpoint = import.meta.env.VITE_SIGNUP_ENDPOINT as string | undefined;

  if (!endpoint) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch (cause) {
    // Network failure, CORS rejection, offline.
    throw new SignupError('Sign-up request did not reach the endpoint', { cause });
  }
  if (!response.ok) {
    // 4xx and 5xx alike: the visitor sees the same retry message either way.
    throw new SignupError(`Sign-up endpoint responded ${response.status}`);
  }
}
