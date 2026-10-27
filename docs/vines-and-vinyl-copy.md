# Vines & Vinyl — copy sheet

The agreed wording for every Vines & Vinyl surface: the landing page
(Figma 1336:396 and `src/examples/VinesAndVinylLanding.tsx`), the sign-up
form, the email template and snippets (Figma 1535:167 and
`email/vines-and-vinyl/`), and the emails set up in Kit (the form's
confirmation email, broadcasts).

**Change copy here first**, then carry it to each surface. Never write an
event line fresh for one surface. Rule: `docs/design-system-rules.md` §5,
"Event copy comes from one sheet".

## Facts (must match everywhere)

| | Wording |
|---|---|
| Date | Saturday 24 April 2027 |
| Time | 12–4:30pm (en dash, no spaces). It's an **afternoon**: never "all day". |
| Venue | The Dorian LeGallienne Room and Atrium, Eltham Community & Reception Centre (ampersand — the venue’s own styling) |
| Address | 801 Main Road, Eltham |
| Short venue | Eltham |
| Tickets | Capped at 150 (internal: public copy says "numbers are capped", never the number). Every tasting included. Tickets drop in the new year; the list hears a day before everyone else. |
| Makers | Fourteen confirmed (internal: public copy names the categories, not the count). |
| Presented by | Runabout |
| Website | vinesandvinyl.runaboutwine.com.au (always https; share this, not the netlify.app address) |

The maker mix is still settling (seven winemakers, Eltham locals, cheese
and possibly olive oil), so public copy names the categories only.

## What makers get

| | Wording |
|---|---|
| We supply | A table with a black cloth, a power point, access to the kitchen, an A5 table card with the maker’s name, and the keepsake glass every guest tastes from. |
| Makers bring | Their own signage and whatever else is in their kit for pouring, serving and selling. |
| Maker form | https://tally.so/r/X5lyrL (Tally, free plan: 10 MB per upload) |
| Winery licence guide | https://vinesandvinyl.runaboutwine.com.au/winery-licence-guide.pdf (one page, both paths: producer's licence → promotional event authorisation, apply before Christmas; any other licence → temporary limited licence, by end of February) |

Table size is still to confirm; state it once known.

### Maker form — structure (Tally X5lyrL, v2, 19 Oct 2026)

Branching keeps it short: a winery sees about 22 questions, a food maker
about 18. Everything marked *conditional* is hidden until its trigger.

| Question | Type | Shown when | Required |
|---|---|---|---|
| What kind of maker are you? (Winery · Cheesemaker · Olive oil · Non-alc drinks · Food maker · Coffee · Other) | Multiple choice | always | yes |
| Which licence does your business hold? (Producer’s licence / General or other licence) | Multiple choice | Winery | yes |
| Does it have a promotional event authorisation? (Yes / No; “Not sure?” in the description points at the guide and LCV 1300 182 457) | Multiple choice | licence type = Producer’s | yes |
| A copy of your licence or permit | File | authorisation = Yes | yes |
| You’ll need to apply (Applied / Not yet; producer’s option 8 $172.70 before Christmas, other licences temporary limited licence $259.10 by end of February; “keep going with the rest of the form — email a copy to hello@ once approved”) | Multiple choice | authorisation = No, or licence type = General/other | yes |
| When did you apply? | Date | started = Applied | yes |
| RSA certificates (one per person pouring; check each is current — three-year refresher) | File (multiple) | Winery | no |
| Business name · Your name · Email · Main contact number | Short / email / phone | always | yes |
| Who will be attending? | Long answer | always | yes |
| Tell us about your business (50–80 words) | Long answer | always | yes |
| What will you be pouring or serving? | Long answer | always | yes |
| Do you need anything at your table? (Power / Water / Neither) | Checkboxes | Cheesemaker, Olive oil, Food maker, Coffee | yes |
| How many wines will you pour? (asking for 3–4; one flight each, then by the glass) | Number | Winery | yes |
| FoodTrader registration number | Short answer | Cheesemaker, Olive oil, Food maker, Coffee | yes |
| Want a 15-minute masterclass slot? (an offer — slots confirmed with makers directly; nothing public until they’re taken) | Yes / No | always | yes |
| What would you do with it? | Short answer | masterclass = Yes | no |
| Could you donate something for the prize draw? | Yes / No | always | no |
| What would you put in? | Short answer | prize = Yes | no |
| Website · Instagram handle | Link / short | always | no |
| Your logo · Photos (3–6, up to 10 each) | File | always | yes |
| Using your photos and details (consent) | Checkbox | always | yes |
| Anything else we should know? | Long answer | always | no |

Thank-you screen after submit: “Thanks — you’re in. I’ll be in touch with
the floor plan and next steps.”

Still to add: the tasting-rule checkbox (one flight then punch) — waiting
on the agreed wording. A custom share preview (OG image) is Tally
Pro-only; revisit with the trial decision.

Deliberately **not** in the form (they go in the makers email / info
sheet): bump-in time, the two-Instagram-posts ask, what to bring for your
table (the we-supply list), table size, parking. Headcount and the wines
sweet-spot line were dropped as duplicates (names give the count; the
wines question already asks 3–4).

## Lines

| Idea | Long form (landing info, email info sections) | Short form (inline, confirmation email) |
|---|---|---|
| Makers | Winemakers, cheesemakers and local food makers — every table staffed by the person who made it. | Winemakers, cheesemakers and local food makers, every tasting included. |
| Music | Crates of jazz, funk, soul and disco spinning all afternoon from some of Melbourne’s best selectors — come for a boogie. | Crates of jazz, funk, soul and disco all afternoon from some of Melbourne’s best DJs. Come thirsty, come for a boogie. |
| Room to move | Numbers are capped so every table’s within reach: a glass in your hand, every tasting included. Made for grown-ups, but kids come free with an adult. | Numbers are capped so every table’s within reach. |
| Early bird tickets | Sign up for first access to early-bird tickets in January. | Tickets drop in the new year, and you’ll hear a day before everyone else. |
| Hero intro | Winemakers, cheesemakers and local food makers pouring and plating all afternoon, while guest DJs play jazz, funk, soul and disco records on a proper vintage hi-fi. In the Dorian LeGallienne Room and Atrium, Eltham. Arrive any time from noon and stay till the last record, with a taste at every table. | — |
| Sign-up button | Sign up (submitting: Signing up…) | — |
| Sign-up success | You’re in. / We’ll email you before tickets go on sale to everyone else. | — |
| Share action (inside the success card) | Share with a friend (no share sheet: copies the link, then “Link copied” for 2s) | — |
| Share sheet / link preview title | Vines & Vinyl · Eltham · Sat 24 April 2027 | — |
| Share sheet text | A tasting afternoon with independent makers and guest DJs in Eltham. Early-bird tickets in January. | — |
| Link preview description (og:description) | A tasting afternoon with independent makers and guest DJs. Sign up for first access to early-bird tickets in January. | — |
| Instagram | Until then, follow along on Instagram for maker reveals, guest selectors and competition info. | — |

## Vocabulary

- **DJs / selectors:** interchangeable, and both are in use. Vary them
  for rhythm; don't introduce a third word (no "deejays", "spinners").
- **Winemakers**, not "wineries": we're selling the people pouring.
- **Local food makers** for the non-wine, non-cheese makers (not "good-food makers").
- **No numbers in public copy** (no "fourteen", no "150"): frame the cap as a courtesy, "numbers are capped so every table’s within reach", never defensively.
- **Early bird ticket(s)**, never "early bird" on its own: not everyone knows the jargon. **Early-bird** as an adjective is fine ("early-bird pricing").
- **Sound:** "on a proper vintage hi-fi". Don't name speaker brands in public copy until the rig is confirmed.
- **All vinyl** as a heading, **all-vinyl** before a noun ("all-vinyl DJs").
- Apostrophes and quotes are curly (’ “ ”), dashes are em dashes with
  spaces ( — ) in prose, en dash in ranges (12–4:30pm).

## No single word on a last line

Every line here obeys the rules doc's last-line rule. In email, the last
two words of each paragraph are joined with `&nbsp;`, inside a Kit HTML
block.
