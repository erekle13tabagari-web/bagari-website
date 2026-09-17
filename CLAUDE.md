# BAGARI — studio site

Bilingual (Georgian / English) single-page site for a Tbilisi design and
development studio. Static: no build step, no framework, no package manager.
Plain HTML, one stylesheet, one script. Deploys from `main` to GitHub Pages.

Owner: Erekle Tabagari — designer, developer and illustrator. He works on
Windows and reviews changes visually, usually by sending an annotated
screenshot. Read the annotation as the spec.

## Current state

v2 is live. The site is Redprint-flooded and work-led, with a Stone relief
section, the drawings used as duotoned and dither-screened plates, and a
scroll-driven motion layer.

- `main` — v2, live.
- `archive/v1-black-label` — the v1 site as it was deployed, kept for reference.

`docs/v2-brief.md` records the decisions and what the build is still waiting on.

**Two slots are deliberately empty and marked in `index.html`.** Neither may
be filled with anything invented:

- The measured result under each project. One real number per case, e.g.
  reservations up N% in a quarter. The `.work-result` markup exists in the
  stylesheet and the comment marks where the row goes back.
- The Instagram URL. A link pointing nowhere is worse on a live site than no
  button, so the button is out until the address exists.

**Publishing stamps a cache tag.** `Update Website.bat` does this. If you
publish any other way, put a fresh `?v=` on the `css/style.css` and
`js/main.js` links yourself: a returning visitor holding a cached v1
stylesheet against v2 markup sees neither design.

## Traps that have already cost time

**Georgian caps.** Georgian uppercase (Mtavruli, U+1C90–1CBF) is written
directly into the markup — never produced with `text-transform`. Chrome
resolves `text-transform: uppercase` on Mtavruli by mapping it *back down*
to lowercase Mkhedruli, so any element that uppercases its whole box will
silently un-capitalise Georgian. Every such rule must be paired with:

```css
.l.ka, .lt-opt[data-lang-opt="ka"] { text-transform: none; }
```

This was reported three times before it was found. If Georgian looks
lowercase, this is why — it is not the font, and it is not the code points.

**Preview over HTTP, never `file://`.** The ink drawings are CSS
`mask-image`, and masks are CORS-checked. Over `file://` they are blocked and
render as blank boxes, which looks exactly like a broken layout. Serve the
folder (`python -m http.server`) before judging anything visually.

**Full-page screenshots need the reveals disabled.** Sections below the fold
sit at `opacity: 0` until scrolled to, so a full-page capture shows them
empty. Inject `.reveal, .rv { opacity: 1 !important; transform: none
!important }` before capturing. Programmatic `window.scrollTo` also confuses
viewport captures — drive with `mouse.wheel` instead.

**Never commit the font sources.** `brand/type/` ships subsetted `.woff2`
only. The licensed `.otf` / `.ttf` originals stay out of the tree —
`.gitignore` covers them. They were once tracked and served publicly from the
live site; they are still in history at `28596c8`, which is unresolved.

## Conventions

**Bilingual.** Every string is two spans: `<span class="l en">…</span><span
class="l ka">…</span>`. `html[data-lang]` decides which shows. A change to
Georgian copy must be made to English too, and the reverse — this is a
standing instruction from Erekle.

**Colour.** Components never reference a raw colour. They use surface roles
(`--surface`, `--text`, `--muted`, `--line`, `--kicker`, `--mark`, `--link`,
`--primary-*`, `--band-*`) which are redefined per edition, so anything works
on any ground. **Redprint is the ground in v2**; Stone is reached by the
switch only, and the OS preference is deliberately not consulted, because the
site commits to one look the way its reference studios do. A `.relief`
section drops to the opposite ground so the page alternates.

Two rules the red ground imposes, which are measurements rather than taste:
text on Redprint is **pure white, never Stone** (5.12:1 against 4.30:1), and
**nothing on red is dimmed**, because no tint of white on that ground clears
AA at a small size. Hierarchy comes from size and weight. Blueprint measures
1.69:1 on Redprint and is unusable there.

**The brand colours.** Redprint `#CB3534`, Blueprint `#1F4E79`, Blackprint
`#171717`. Blueprint is too dark to carry text on ink; `--blue-lift`
`#5497D3` is the lifted version for that ground. Redprint measures 4.30:1 on
stone, below AA for small text — Erekle has seen this and chosen to keep it.

**Type.** Futura 100 GEO covers Latin, Mkhedruli and Mtavruli in one family.
Display cut for headings, Text cut for body.

**Spacing.** 8-pt scale in `--s-1` … `--s-8`. No arbitrary values.

**No em dashes in the copy**, either language. Standing instruction.

**Motion (v2).** Scroll-*driven*, never scroll-*hijacked*: no smooth-scroll
library, native scrolling untouched. JS writes `--p` (0→1 progress) onto
`[data-scrub]` elements and `--vel` (velocity) onto the root; CSS decides
what those mean. All of it must be inert without JS and under
`prefers-reduced-motion`.

## Publishing

`Update Website.bat` does the whole flow from `main`: stamps a fresh `?v=`
cache tag on the CSS and JS links, commits, pulls with rebase, pushes.
Pages goes live about a minute later. It refuses to run from any other
branch, on purpose.

The site is edited from more than one machine, so pull before you start.

## Verifying a change

There are no tests. Verification is visual and measured:

- Serve over HTTP and check at 360 / 390 / 430 / 768 / 1024 / 1440.
- Both languages. Georgian runs roughly 12% longer and is what breaks layouts.
- Both editions.
- Check nothing overflows horizontally (`scrollWidth` vs viewport) and the
  console is clean.

Chromium for this lives at `/opt/pw-browsers/` in cloud sessions; locally,
use whatever browser is installed.
