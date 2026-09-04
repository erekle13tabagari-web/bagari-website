# BAGARI v2 — rebuild brief

Live v1 is preserved on the branch `archive/v1-black-label` (commit `f31e58c`),
which is exactly what is deployed today. Nothing in this rebuild touches it.

## Decisions taken

| Question | Decision |
|---|---|
| Direction | **Studio Freight** — motion-led, technically demonstrative. The site is the proof of craft. |
| Pricing | **Prices removed.** Blueprint / Redprint / Blackprint survive as capability levels, no numbers. |
| Imagery | **Erekle supplies art direction.** Everything is built around marked slots until it lands. |
| References | koto.com, instrument.com/work, pentagram.com, studiofreight.com |

## What carries over from v1

- Futura 100 GEO across both scripts, and the Mtavruli fix
  (`.l.ka { text-transform: none }` — Chrome maps Mtavruli *down* to
  Mkhedruli when you uppercase it, which is why v1 kept losing its caps).
- Blueprint / Redprint / Blackprint naming and colours.
- The `.l.en` / `.l.ka` bilingual system on `html[data-lang]`.
- Stone and Ink editions, on surface-role tokens.
- The five ink drawings.
- Static, no build step, deploys from `main` to Pages.

## What changes

- **Ink is now the default ground.** Stone is the alternate. Both references
  that read most expensive (Instrument, Freight) are dark.
- **Prices are gone**, and with them the coloured tier bands.
- **The drawings stop being decoration.** They are the visual system: full
  bleed, large, and drawn on by the scroll itself (`.ink[data-scrub]`, a
  clip-path wipe driven by scroll progress). This is the one move that is
  genuinely BAGARI's rather than borrowed from the references — the
  hand-made asset coupled to the machine.
- **Work becomes the site.** Case studies get real structure and, critically,
  one measured number each.
- **Motion is scroll-driven, never scroll-hijacked.** No smooth-scroll
  library. Native scrolling is left alone so the trackpad, keyboard,
  scrollbar and screen reader all still behave; the feel comes from
  scroll-*driven* animation instead. Everything is off under
  `prefers-reduced-motion` and inert without JS.

## State of the tree

- `css/style.css` — **rewritten for v2. Done.**
- `index.html` — **still v1. Next job.** The page is broken until it is
  rewritten against the new CSS. Do not deploy this branch as it stands.
- `js/main.js` — still v1. Needs the motion layer: a single rAF loop writing
  `--p` (0→1 scroll progress) onto `[data-scrub]` elements and `--vel`
  (scroll velocity) onto the root, plus reveal observers, the language and
  theme switches, and the phone menu carried over.
- `work/varazi.html`, `work/biomi.html` — not started.
- `Futura 100/` — **untracked as of this branch.** The 26 licensed OTF and
  TTF source files were being served publicly from the deployed site; they
  are now removed from the tree. They remain in git history at `28596c8`,
  which is still unresolved: either make the repo private, or purge history
  with a force-push.

## What Erekle owes the build

**Photography and art direction.** The references are carried by imagery and
BAGARI currently has none. Per project:

| Shot | Ratio | Min size | Use |
|---|---|---|---|
| Hero | 16:9 | 2400 × 1350 | Work index card, case-study header |
| Detail × 3 | 4:5 | 1600 × 2000 | Case-study body |
| In situ × 1 | 3:2 | 2400 × 1600 | The room, the site, the product in context |

For Varazi that means the room, the table, the food, the site on a phone in
someone's hand. For Biomi, the plant, the documentation, the site on a
laptop in an office. Screenshots alone will read as thin.

**One measured number per project.** This is the single biggest gap between
BAGARI and every studio in the reference set, and the cheapest to close.
Something like "reservations up N% in the first quarter" or "N tender
enquiries in the first month, from zero". Without it the work section is a
claim rather than evidence, and the placeholders in the markup must not be
allowed to go live.

**Optional but strong:** a portrait. A solo studio charging premium rates
should show who is accountable.

## Open from v1

- Instagram button is still `href="#"` — needs the URL.
- Futura 100 GEO web-embedding licence is unconfirmed (`brand/type/licence.txt`).
- The OTFs in git history, as above.
