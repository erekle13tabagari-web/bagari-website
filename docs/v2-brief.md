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

v2 is live on `main`. `archive/v1-black-label` holds the v1 site as deployed.

Built: the design system, the work-led page, the motion layer, the plates,
the Redprint ground with its Stone relief section, and the reference's header
and footer shapes.

Not built: individual case-study pages at `work/varazi.html` and
`work/biomi.html`. The home page carries both projects for now.

`Futura 100/` is untracked. The 26 licensed OTF and TTF sources were being
served publicly from the deployed site and are out of the tree; they remain
in history at `28596c8`, which is still unresolved. Either make the repo
private, or purge history with a force-push.

## What Erekle owes the build

**Photography and art direction.** No longer blocking. The plate treatment
carries the work cards, so photography is now an upgrade rather than a
dependency. If it does arrive: 16:9 at 2400 x 1350 for a card or case header,
4:5 at 1600 x 2000 for detail, 3:2 at 2400 x 1600 in situ.

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
