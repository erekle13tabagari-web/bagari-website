# BAGARI — full project context

One self-contained handover. Everything a fresh session needs: what the site
is, what was decided and why, what has already gone wrong, and what is still
open.

This is a distillation of a long working session, not a transcript of it.
Decisions and reasoning are recorded faithfully; nothing here is a quote.

---

## 1. What this is

Bilingual (Georgian / English) site for **BAGARI**, a one-person design and
development studio in Tbilisi. Owner: **Erekle Tabagari** — designer,
developer and illustrator. The five ink drawings on the site are his own.

Static: no build step, no framework, no package manager. Plain HTML, one
stylesheet, one script. Deploys from `main` to GitHub Pages at
<https://bagari.studio/> (formerly erekle13tabagari-web.github.io/bagari-website).

**How Erekle works:** he reviews visually and sends annotated screenshots.
Read the annotation as the spec. He is a designer, so he spots real problems
(he caught a dither artefact and a floating drawing fragment that measurement
then confirmed). When he circles something, measure before arguing.

---

## 2. Current state

| Branch | What |
|---|---|
| `main` | v2, live |
| `archive/v1-black-label` | v1 exactly as it was deployed, kept for reference |
| `claude/brandbook-fav52f` | working branch |

Files: `index.html`, `work/biomi.html`, `css/style.css`, `js/main.js`,
`brand/` (art, logo, og, type), `CLAUDE.md`, `docs/`, plus Erekle's Windows
publish scripts.

---

## 3. The arc, and why v2 exists

**v1** was a competent editorial-brutalist site built from his Brandbook 03.0:
Futura 100 GEO, Stone/Ink editions, three service tiers with published prices
($600 / $1,800 / $5,000), the drawings used as decorative accents.

He then asked for an honest comparison against real studios. The critique that
produced v2:

- **The look was well executed but not distinctive.** Giant grotesque caps,
  hairline rules, one accent colour: the default studio dialect since about
  2020. Nothing identified it as his without the wordmark.
- **The pricing contradicted the presentation.** The site was dressed for a
  bracket three to five times above what it printed. Publishing prices also
  caps the ceiling.
- **There was no evidence.** Two cases, zero numbers. Every studio claims to
  turn attention into bookings; without a measured figure it is a claim, not
  proof. This remains the single biggest gap.
- **The drawings were the one uncopyable asset and were being wasted** as
  decoration.

He gave four references — Koto, Instrument, Pentagram, Studio Freight — all
work-led, image-dense, no prices. Then a fifth, **Hermes Agent**
(hermes-agent.nousresearch.com), which turned out to be the most useful.

### Decisions taken

| Question | Decision |
|---|---|
| Direction | **Studio Freight.** For a solo designer-developer, the site itself is the proof of craft. |
| Pricing | **Removed.** Blueprint / Redprint / Blackprint survive as capability levels, no numbers. |
| Imagery | He was going to supply photography; the plate treatment made it unnecessary. |
| Ground | **Redprint**, flooded. (Was briefly Ink; see §5.) |

---

## 4. The Hermes insight, and the plates

Hermes Agent's whole identity is antique engravings duotoned into one
saturated colour. That treatment, not their typeface or layout, is what makes
their cards read as expensive. **They had to license the engravings. Erekle
draws them.** Hand-hatched ink already carries the texture their dither
manufactures.

So a **plate** is: one of his drawings masked in Stone over a flooded brand
ground. All five drawings were tested in the treatment and all five hold.

**This unblocked the rebuild.** The work cards had been hatched placeholders
waiting on a photographer. Photography is now an upgrade, not a dependency.

**What was deliberately NOT taken from Hermes:**

- *Their condensed display face.* Futura 100 GEO is what gives Georgian and
  Latin one voice, and that parity is the actual differentiator. Chasing their
  type would cost the thing no competitor in Tbilisi can match.
- *Their electric blue.* That is their identity. Redprint and Blueprint are
  BAGARI's.
- *Their product chrome* — install tabs, terminal command, download buttons,
  app screenshots, pixel dingbats. That belongs to software, not a studio.
- *Their published prices.* Self-serve SaaS at $20/month and commissioned
  studio work are different businesses.

Also taken, with the brand's own values: numbered tics on the capability
columns, and the wordmark set enormous and nearly invisible behind the footer.

---

## 5. Colour, and two rules that are measurements

**Redprint `#CB3534` is the ground.** Stone is reached by the switch only; the
OS preference is deliberately not consulted, because the site commits to one
look the way the reference studios do. A `.relief` section (Capabilities)
drops to the opposite ground so the page alternates rather than running one
colour end to end.

The reference blue is far darker than this red — white clears 7.97:1 on
theirs, only 5.12:1 here. Two rules follow, and they are not taste:

1. **Text on Redprint is pure white, never Stone.** Stone reaches only 4.30:1,
   below AA for small text.
2. **Nothing on red is dimmed.** No tint of white on that ground clears AA at
   a small size. Hierarchy comes from size and weight instead.

**Blueprint measures 1.69:1 on Redprint and is unusable there.** That is why
the Varazi plate is Ink and only Biomi keeps Blueprint.

Measured for reference: Stone 4.30:1, white 5.12:1, Ink 3.58:1, Blackprint
3.50:1, Blueprint 1.69:1 — all against Redprint.

Brand colours: Redprint `#CB3534`, Blueprint `#1F4E79`, Blackprint `#171717`,
Ink `#131512`, Stone `#EDEBE4`, `--blue-lift` `#5497D3` (Blueprint lifted to
carry text on ink).

**Components never reference a raw colour.** They use surface roles
(`--surface`, `--text`, `--muted`, `--line`, `--kicker`, `--mark`, `--link`,
`--primary-*`, `--band-*`), redefined per edition.

*History worth knowing:* v2 first made **Ink** the default ground. Erekle then
asked for Redprint. If anything still reads as if Ink were the default, that
is the residue.

---

## 6. Motion

**Scroll-driven, never scroll-hijacked.** No smooth-scroll library; native
scrolling untouched, so trackpad, keyboard, scrollbar and assistive tech all
behave. On a site selling craft, that restraint *is* the craft.

One rAF loop serves the whole page and runs only while something is on screen.
It writes two values and decides nothing else:

- `--p` — 0 to 1 scroll progress, onto each `[data-scrub]` element
- `--vel` — scroll velocity, onto the root (the marquee leans with it)

CSS decides what those mean. All of it is inert without JS and under
`prefers-reduced-motion`.

**The signature move: the scroll draws the ink.** The studio drawing is drawn
on by scrolling — a clip-path wipe scrubbed to scroll progress. This is the
one thing on the site that belongs to BAGARI rather than the reference set:
the hand-made asset coupled to the machine.

It happens in exactly **one** place on purpose: the studio drawing. The plates
do not scrub at all. Do not spray this effect around; it stops being a move
and becomes a tic.

**The hero drawing no longer scrubs; it is alive** (since 2026-09-24, see
§13). Erekle separated "the look" into layers in Illustrator and `js/look.js`
assembles them: the iris follows the pointer and glances on its own, the head
leans a little, and the eye blinks by swapping in his closed-eye drawing. The
old CSS-mask version stays as the no-JS fallback.

---

## 7. Traps that have already cost real time

**Georgian caps.** Mtavruli (U+1C90–1CBF) is written directly into the markup,
never produced with `text-transform`. Chrome resolves `text-transform:
uppercase` on Mtavruli by mapping it *back down* to Mkhedruli, so any element
that uppercases its whole box silently un-capitalises Georgian. Every such
rule must be paired with:

```css
.l.ka, .lt-opt[data-lang-opt="ka"] { text-transform: none; }
```

This was reported three times before it was found, and twice wrongly explained
away by citing code points and font metrics. If Georgian looks lowercase, this
is why — not the font, not the code points.

**Preview over HTTP, never `file://`.** The drawings are CSS `mask-image` and
masks are CORS-checked. Over `file://` they are blocked and render as blank
boxes, which looks exactly like a broken layout. `python -m http.server`
before judging anything visually. The same trap catches Playwright
`setContent`, which runs on `about:blank` and so loads masks cross-origin.

**`url()` in a custom property resolves against the stylesheet that
*substitutes* it**, not the document. So `--art:url('../brand/...')` in a
style attribute is correct, because `css/style.css` consumes it. This was
"fixed" to `brand/...` once and broke everything.

**Grid auto-placement will not backtrack.** Placing only the hero drawing at
row 1 pushed the auto-placed copy to row 2 and opened a third implicit row.
All three hero items are placed explicitly now.

**A dither over a flat colour is noise.** An ordered dither approximates tones
a palette cannot hit, so it belongs on photographs and gradients. Applied
across a flat brand ground it turned one solid blue into 65 distinct colours
in a visible grid. The reference only dithers its photographic images. The
drawings' own hatching already is the texture. Removed entirely.

**Full-page screenshots need the reveals disabled.** Sections below the fold
sit at `opacity: 0`. Inject `.rv { opacity: 1 !important; transform: none
!important }` before capturing. Programmatic `window.scrollTo` also confuses
viewport captures — drive with `mouse.wheel`.

**Never commit the font sources.** `brand/type/` ships subsetted `.woff2`
only. The 26 licensed `.otf` / `.ttf` originals were once tracked and served
publicly from the live site. They are out of the tree and `.gitignore`d, but
**they remain in history at `28596c8`** — unresolved.

**Cache tags matter more than usual.** A returning visitor holding a cached v1
stylesheet against v2 markup sees neither design. `Update Website.bat` stamps
`?v=` automatically; any other publish route must stamp it by hand.

---

## 8. Conventions

**Bilingual.** Every string is two spans: `<span class="l en">…</span><span
class="l ka">…</span>`, with `html[data-lang]` deciding. **A change to
Georgian copy must be made to English too, and the reverse.** Standing
instruction. Georgian runs roughly 12% longer and is what breaks layouts.

**No em dashes in the copy**, either language. Standing instruction.

**Type.** Futura 100 GEO covers Latin, Mkhedruli and Mtavruli in one family.
Display cut for headings, Text cut for body.

**Spacing.** 8-pt scale, `--s-1` … `--s-8`. No arbitrary values.

**Never invent a metric, a client quote, or a result.** Placeholder rows were
deliberately removed rather than shipped, because on a public studio page they
read as unfinished and, worse, as a note about fabricating numbers.

---

## 9. Publishing

`Update Website.bat` does the whole flow from `main`: stamps a fresh `?v=`
cache tag, commits, pulls with rebase, pushes. Pages goes live about a minute
later. It refuses to run from any other branch, on purpose.

The site is edited from more than one machine. Pull before starting.

---

## 10. Verifying a change

No tests. Verification is visual and measured:

- Serve over HTTP; check 360 / 390 / 430 / 768 / 1024 / 1440 / 1920.
- Both languages, both editions.
- Nothing overflows horizontally (`scrollWidth` vs viewport); console clean.
- Measure before claiming. Several fixes this session came from counting
  pixels or colours rather than eyeballing.

---

## 11. Open items

**The measured result per project.** The biggest gap by far, and the reason
the critique said the site was outclassed. One real number each — reservations
up N% in a quarter for Varazi; tender enquiries per month, or the share
arriving with documentation attached, for Biomi. Slots are marked in the
markup. Biomi going live is the moment to ask them.

**The Instagram URL.** Buttons removed from the contact band and the footer
until it exists; a link pointing nowhere is worse than no button.

**Biomi case study copy is unverified.** `work/biomi.html` was written from
copy Erekle had already approved for the work card. biomi.ge is blocked by the
cloud session's egress proxy, so the live site was never read. A local session
can fetch it and make the description specific.

**The Varazi case study** does not exist yet. `work/varazi.html`.

**Font licence.** Futura 100 GEO web-embedding rights unconfirmed. See
`brand/type/licence.txt`.

**OTFs in git history** at `28596c8`. Either make the repo private or purge
history with a force-push. Erekle's call.

**Possible refinements he has been offered and not taken up:** cropping the
hero eye's viewBox to close the void between eye and chin; pushing the contact
drawing louder than 16%.

**Reverted deliberately:** the contact drawing was full-bled across the band
at 28% and he asked for it back as the right-hand panel at 16%. Do not
re-apply it.

---

## 12. Note on the cloud session

Outbound HTTPS from a cloud session goes through a policy-enforcing egress
proxy. `biomi.ge` and `hermes-agent.nousresearch.com` are both blocked (403 on
CONNECT). This is an organisation egress policy, not a fault, and must not be
routed around. A local session has no such proxy and can fetch either.

---

## 13. State as of 2026-09-24 (infrastructure, forms, the living hero)

Everything below is live. Nothing here is a secret; secrets live only in the
Cloudflare dashboard and are pasted by Erekle himself.

**Domain and edge.** `bagari.studio` bought via Cloudflare Registrar; zone
proxied (orange cloud), SSL Full (strict), GitHub Pages behind it. Cloudflare
Web Analytics (cookieless; deliberately no Google Analytics, so no cookie
banner). Search Console verified, sitemap submitted. Hardening on the zone:
DMARC (`p=none`, reports to Cloudflare), a rate limit on `/api/*` (10 requests
per 10 s per IP; the Free plan's only window), security headers via a response
transform rule (HSTS, nosniff, referrer policy, permissions policy, frame
options; no CSP on purpose), and a cache rule for `/brand/*` (edge 7 days,
browser 1 day; **purge after changing a brand asset**).

**Email.** `hello@bagari.studio` forwards to Gmail (Email Routing). Auto-replies
go out from `noreply@bagari.studio` through Resend (free tier, EU region).

**Forms.** `start.html` (project enquiry, 8 questions, Turnstile) and the
upload form on `tools/font-finder.html` (image, Turnstile) both post to one
Worker, `bagari-start`, routed on `bagari.studio/api/*`. The Worker verifies
Turnstile, writes a row to D1 (`bagari-leads`, EU: tables `leads` and
`uploads`, which double as the consent log), stores Font Finder images in R2
(`bagari-uploads`, EU) and emails the studio a branded notification (image
attached up to 8 MB plus an HMAC-signed download link), then sends the
auto-reply in the form's language. The Worker source of truth is
`worker-start.js` in Erekle's private `bagari-studio` folder (not in this
repo); deploys are a manual paste into the dashboard editor, and the dashboard
editor is a cross-origin iframe that automation cannot type into.

**Privacy.** `privacy.html` (version 2026-09-24, drafted, not lawyer-reviewed):
consent per form, separate marketing opt-in, 24-month retention, EU storage.
A retention purge Worker is still to be written once the policy is final.

**The living hero.** `brand/art/look-rest.svg`, `look-eye-open.svg`,
`look-eye-closed.svg`, `look-iris.svg` (the iris file also carries the eye
opening as a `clipPath`, cut by Erekle in the paper layer). `js/look.js`
builds one inline SVG from them: iris follows the pointer (42 units sideways,
14 up, 36 down, clipped to the opening) and glances on its own; head leans
with the pointer; blinks every 2 to 6 s in three kinds (quick, double, slow
dissolve). The brow only moves if a separate `look-brow.svg` is supplied,
because in the current file the brow edge and the profile line are one
outline. All numbers are constants at the top of `look.js`. Assets come from
`the look b&w.pdf` (six artboards) exported per artboard with Illustrator;
the "rest" artboard's content sits 93.1 units left of the others, which the
file corrects with a wrapping transform.

**Other 2026-09-24 changes.** Header carries Font Finder; mobile-menu links may
wrap; custom scrollbar (thin ink rule, louder on hover); Google-friendly
favicons (48-multiple PNGs plus `/favicon.ico`); page titles carry no dash
(Google rewrote the em dash); phone hero copy sits directly under the
drawing; hero art flush right with its plate bottom cropped by 7%.

**Open.** A human end-to-end test of the Font Finder upload (Turnstile blocks
automated browsers); measured results per case; Varazi case page; lawyer
review of the privacy text and a mention of Font Finder uploads in it; the
retention purge Worker; font licence; OTFs in history; optional brow, tear
and lower-lid artboards for more motion.

**Font Finder, live (2026-09-25).** `tools/font-finder.html` is the app's own
interface (its CSS and JS live beside it in `tools/`), not the site's layout.
"Analyze" posts to the Worker (`/api/font-finder/analyze`, v6), which checks
Turnstile and relays the image to the engine on a Hetzner CX23 in Nuremberg
(about $7 a month) through a Cloudflare Tunnel at `ff.bagari.studio`, with a
shared key. The engine accepts only analysis from outside; retraining and
feedback stay local. Results render in the app's panels in about a second.
If the engine is unreachable the page falls back to the email route. Server
details live in Erekle's private notes, not here.

**Working from more than one machine.** The site, art, scripts and this
document travel through GitHub. What does not: the private `bagari-studio`
folder (positioning, leads, the Worker source), the Illustrator sources, and
the Claude memory folder for this project. Carry those separately.
