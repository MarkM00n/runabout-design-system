# Vines & Vinyl — tech stack

Everything the Vines & Vinyl event runs on, where it lives and how the pieces
connect. Copy and wording live in `docs/vines-and-vinyl-copy.md`; this file is
the plumbing. No passwords or keys belong here — only where they're kept.

Last updated: 18 October 2026.

## At a glance

| What | Tool | Where | Plan |
|---|---|---|---|
| Landing page | Netlify | project `vinesandvinyl` | Free |
| Public address | VentraIP DNS → Netlify | `vinesandvinyl.runaboutwine.com.au` | — |
| Sign-up list and emails | Kit | account "Runabout", form "Vines & Vinyl early birds" | **Free trial, ends ~1 Nov 2026** |
| Maker details form | Tally | form "Vines & Vinyl — maker details" | Free |
| Domain and email forwarding | VentraIP (VIPcontrol) | `runaboutwine.com.au` | Domain registration |
| Code | GitHub | `MarkM00n/runabout-design-system` | — |
| Design | Figma | file `JpFA7KtVlSOrM9fIYYgOsn` | — |
| Email images | jsDelivr (CDN) | served from the repo's `main` branch | Free |
| Social | Instagram | `@runabout.melbourne` | — |

## How a sign-up flows

1. A visitor enters their email on the landing page.
2. The page posts to `/api/subscribe`, a Netlify Function
   (`netlify/functions/subscribe.ts`).
3. The function adds them to Kit through the Kit v4 API (create subscriber,
   then add to form `10061069`), using the `KIT_API_KEY` secret.
4. The page shows "You're on the list." Kit auto-confirms them (no
   double opt-in) and sends the branded confirmation email.
5. The email's "Follow us on Instagram" button goes through Kit's confirm
   link, which redirects to `instagram.com/runabout.melbourne`.

A hidden "company" field on the form catches spam bots: if it's filled in,
nothing is sent.

## How a maker submission flows

1. A maker opens the Tally form (link in the makers email).
2. They answer the questions and upload a logo and up to 10 photos
   (10 MB each).
3. Tally stores the answers and files, and emails a notification to
   `markgmcmanus@gmail.com` (free plan: notifications can only go to the
   Tally account email).
4. Files are reviewed in Tally → Submissions, then copied to Google Drive
   (`Vines & Vinyl / Makers / <business name>`) by hand.

## Landing page — Netlify

- **Project:** `vinesandvinyl` — app.netlify.com/projects/vinesandvinyl
- **Addresses:**
  - `vinesandvinyl.runaboutwine.com.au` — primary (HTTPS certificate
    issued automatically by Netlify / Let's Encrypt once DNS verifies)
  - `vinesandvinyl.netlify.app` — Netlify's own address, always works
- **Deploys:** automatically on every merge to `main` in GitHub.
- **Build:** `npm run build:landing` → `dist-landing/` (see `netlify.toml`).
- **Function:** `netlify/functions/subscribe.ts`, served at `/api/subscribe`.
  Logs: Netlify → Logs → Functions → subscribe.
- **Environment variables** (Netlify → Project configuration → Environment
  variables):
  - `VITE_SIGNUP_ENDPOINT` = `/api/subscribe`
  - `KIT_API_KEY` — secret, a Kit v4 API key. Never commit it.
- **Page source:** `src/examples/VinesAndVinylLanding.tsx`, mounted by
  `src/landing.tsx`, HTML shell `landing/index.html`.

## DNS — VentraIP

`runaboutwine.com.au` is registered and its DNS hosted at VentraIP
(vip.ventraip.com.au → My Services → Domains → runaboutwine.com.au →
Manage DNS). Nameservers: `ns1/ns2/ns3.nameserver.net.au`.

**There is no website on runaboutwine.com.au itself.** The domain is used
for email forwarding and the Vines & Vinyl subdomain only.

| Type | Host | Value | Purpose |
|---|---|---|---|
| CNAME | `vinesandvinyl` | `vinesandvinyl.netlify.app` | The event site (added 18 Oct 2026) |
| TXT | `subdomain-owner-verification` | (Netlify token) | Proves to Netlify we own the domain (added 18 Oct 2026) |
| A | `runaboutwine.com.au` | `103.42.108.46` | VentraIP default — don't change unless a main site is built |
| A | `www` | `103.42.108.46` | VentraIP default |
| MX | `runaboutwine.com.au` | `mx1`/`mx2.nameserver.net.au` (10), `mx3` (20) | Receives email — **don't touch** |
| TXT | `runaboutwine.com.au` | `v=spf1 +a +mx +include:spf.hostedmail.net.au ~all` | Email sending (SPF) — **don't touch** |
| NS | `runaboutwine.com.au` | `ns1`–`ns3.nameserver.net.au` | VentraIP nameservers |

**Email forwarding** (same page): `hello@runaboutwine.com.au` →
`runaboutwine.events@gmail.com`. There's no mailbox; hello@ only forwards.

**Rules**
- Never switch the nameservers to Netlify DNS: email forwarding would stop
  unless every MX/TXT record is copied across exactly.
- Change one record at a time and note it in this file.

## Email — Kit

- **Account:** "Runabout" (app.kit.com). **Free trial — 14 days left as of
  18 Oct 2026.** Check what the free plan keeps (custom HTML template,
  auto-confirm) before it ends.
- **Form:** "Vines & Vinyl early birds", id `10061069`.
  - Auto-confirm on; confirmation email on; redirect after confirming →
    `https://instagram.com/runabout.melbourne`.
  - The form's own embed isn't used; the landing page posts through the
    Netlify Function instead.
- **Confirmation email:** Form → Settings → Confirmation email → Edit Email
  Contents. Subject "You're on the Vines & Vinyl list", from
  `Runabout <hello@runaboutwine.com.au>`. The body copy is one **HTML
  block** so it can keep non-breaking spaces (see copy sheet).
- **Template:** "Vines & Vinyl" (id `5616665`), the account default.
  Settings → Email templates. Source: `email/vines-and-vinyl/template.html`.
  Sections to paste into broadcasts: `email/vines-and-vinyl/snippets/`.
- **Postal address** in the footer comes from Kit's account settings (fix
  the stray space: "1164 Main Road , Melbourne").
- **Email images** load from
  `cdn.jsdelivr.net/gh/MarkM00n/runabout-design-system@main/landing/public/email/…`,
  so a new image only appears after it's merged to `main`. jsDelivr caches
  up to a day; purge at `purge.jsdelivr.net/gh/MarkM00n/runabout-design-system@main/<path>`.

## Maker form — Tally

- **Public link:** https://tally.so/r/X5lyrL
- **Edit:** https://tally.so/forms/X5lyrL/edit (Mark's Tally account)
- **Free plan limits:** 10 MB per upload, "Made with Tally" badge, no
  confirmation email to makers, notifications only to the account email.
- **Look:** custom theme — background `#F5DEC1`, text `#1D1B19`, buttons
  `#2F2C28` / `#F7E7D2`, accent `#A34923`, Manrope.

## Code — GitHub

Repo `MarkM00n/runabout-design-system`. Mark merges PRs.

| Path | What |
|---|---|
| `src/examples/VinesAndVinylLanding.tsx` | The landing page |
| `src/components/SignupForm/` | The sign-up form component |
| `netlify/functions/subscribe.ts` | Sign-up → Kit |
| `email/vines-and-vinyl/` | Kit template, snippets, README |
| `landing/public/email/` | Email images (served via jsDelivr) |
| `docs/vines-and-vinyl-copy.md` | Agreed wording for every surface |
| `docs/vines-and-vinyl-tech.md` | This file |

Storybook and the DesignOps dashboard deploy separately to GitHub Pages
(`.github/workflows/deploy-storybook.yml`); they don't affect the event site.

## Design — Figma

File `JpFA7KtVlSOrM9fIYYgOsn` (Design System).

| Node | What |
|---|---|
| `1336:396` (page "06. Web") | Landing page — desktop, tablet, mobile |
| `1535:167` | Email template (600 wide) |
| `1490:546` | Sign-up form component (incl. success state) |
| `1519:1467` (page "00. Brand") | Logo / Event, incl. the Lock-up |

Figma is the source of truth: change it there first, then in code.

## Open items

- HTTPS on `vinesandvinyl.runaboutwine.com.au` — waiting on Netlify's DNS
  check (18 Oct 2026, evening).
- Short link `runaboutwine.com.au/vinesandvinyl` — not set up yet.
- Kit trial ends ~1 Nov 2026 — decide plan.
- Table size for makers — to confirm.
