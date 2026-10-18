# Vines & Vinyl — email template (Kit)

Branded template for every Vines & Vinyl email sent from Kit. Design source:
[Figma — Email template (600)](https://www.figma.com/design/JpFA7KtVlSOrM9fIYYgOsn/Design-System?node-id=1535-167).

| File | What it is |
|---|---|
| `template.html` | The Kit HTML template: header art (one image), the content slot, gold footer with the required unsubscribe link and address. |
| `snippets/hero-copy.html` | Headline, paragraph and cream button on the ink hero surface. Goes first. |
| `snippets/info-section.html` | Cream section: illustration, heading, paragraph, optional dark button. Repeat as needed. |
| `snippets/full-width-image.html` | Edge-to-edge 600px photo. |
| `../../landing/public/email/` | The images, served via jsDelivr from `main` (and from the landing site once it's live). |

## Set up once in Kit

1. **Email Templates → + New Email Template → Create HTML Template.** Paste all of `template.html`, name it *Vines & Vinyl*, save.
2. Three dots next to it → **Set as default**.
3. **Snippets → New → Inline snippet**, one per file in `snippets/`, pasting the HTML. Name them *V&V Hero*, *V&V Info*, *V&V Image*.
4. Check **Settings → Email** has the right postal address — the footer pulls it in.

## Writing an email

Start a broadcast, then add snippets top to bottom (`+` → Snippet, or type `/snippet`):
**Hero** → any number of **Info** sections → **Image** (optional). Edit the words, the
button link (`https://YOUR-…`), and in Info swap `vv-icon-grapes.png` for
`vv-icon-seal.png` or `vv-icon-vinyl.png`. Delete an Info button between
`BUTTON START` and `BUTTON END`.

Plain text typed outside a snippet still works — it's styled for the ink hero surface.

Send yourself a test every time: Gmail (web + app), Apple Mail and Outlook all render email differently.

## Why it's built this way

- **Header is one image.** The Lock-up, the overlapping grapes, the seal and rotated
  sparkles can't be built reliably in email HTML. Everything else is live text, so the
  email still reads with images blocked; the header has descriptive alt text.
- **Colours are hex, not variables.** Email clients can't read CSS custom properties.
  Values are the Vines & Vinyl tokens resolved per section mode — the mapping is in the
  comment at the top of `template.html`. If a token changes, update both.
- **Fonts fall back.** Recoleta can't be web-loaded in email; headings use Georgia.
  Manrope loads in Apple Mail and falls back to Helvetica/Arial elsewhere.
- **Kit renders Liquid inside HTML comments**, so the template's comments never spell
  out its own tags.

## Updating the art

The header, wordmark and icons are exported from the Figma frame above at
2×. Re-export the changed piece, replace the file in `landing/public/email/` with the same
name, merge to `main`. jsDelivr caches `@main` for up to a day; purge at
`https://purge.jsdelivr.net/gh/MarkM00n/runabout-design-system@main/landing/public/email/<file>`.
