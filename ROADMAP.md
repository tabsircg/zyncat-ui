# Zyncat UI Development Roadmap

## Phases and Tasks

### Phase 1: Ground Rules ✓ COMPLETED

**Objective:** Reformat docs and CLAUDE.md with clear, pure-list instructions (no prose).

- Rewrite `docs/authoring/` files (design-system.md, motion.md, authoring.md) as atomic rule lists
- Update CLAUDE.md with layout tree and non-negotiables
- Commit: `2fbce65 feat(ground-rules): restructure authoring docs and guidelines`

**Status:** Completed and committed.

---

### Phase 2: Override Machinery ✓ COMPLETED

**Objective:** Implement cascade-layer delivery and verify className/style universal access.

#### Deliverables

- Emit declarations via `tsc --emitDeclarationOnly` into `dist/types`, dropping rollup-dts (23s → 1.9s)
- Add `check:contracts` linter with ratcheted baseline (469 debt items)
- Wrap all 30 component stylesheets in `@layer zyncat.components`
- Wrap all 11 token files in `@layer zyncat.tokens`
- Isolate docs app dev server (turbopack + `.next-dev`) from production builds
- Verify className/style universal access via override levels 0–3

#### Commits

1. `f7cedcb build(pipeline): emit declarations via tsc and run verify in parallel lanes`
2. `303146f feat(contracts): add check:contracts with a ratcheted debt baseline`
3. `0f34a8f feat(css): ship every stylesheet inside the zyncat cascade layers`
4. `f5667a3 fix(docs): isolate the dev server from production builds`
5. `7b49988 docs(authoring): encode the layer delivery and contracts ratchet rules`
6. `191f72e fix(select): render the trigger value at medium weight`

**Status:** Completed and pushed. `pnpm verify` runs in 7.95s (all green). Phase 2 is closed.

---

### Phase 3: Engine loop Primitive ✓ COMPLETED

**Objective:** Implement the `loop()` simulation primitive for endless/input-coupled motion.

#### Deliverables

- `loop(frame, { el?, claims?, speed?, snap? }?) → Playback`
  - `frame(k, dt, now)`: 60fps-normalised step, speed/clock-scaled, dt clamped to 34ms
  - `speed()` sampled every frame (live prop coupling)
  - `claims`: register in one-writer ownership map alongside WAAPI
  - `el` + IntersectionObserver: auto-pause off-screen
  - Auto-pause when document is hidden (visibilitychange)
  - Under `UIMotion.reduced`: snap once, never start
- Generalize claim/release in animate.ts to `PropertyHolder` interface
- Proven with 17 live assertions (off-screen pause/resume, hidden pause/resume, speed scaling, clock scaling, animate-cancels-loop, loop-cancels-waapi, reduced-motion snap)
- Engine size claims carry no number. The figure moved twice, no gate can catch it going
  stale, and it was wrong in three files at once; "small" stays true on its own.

#### Commit

`dc3477d feat(engine): add the loop simulation primitive`

**Status:** Completed, committed, and pushed. 17/17 runtime assertions pass. Phase 3 is closed.

---

### Phase 4: Port Motion Primitives ✓ COMPLETED

**Objective:** Wire `src/components/expressive/` into tsup and port 7 motion primitives.

#### What a component port includes

Every component ships complete in its own task. `authoring_checklist` step 6 and CLAUDE.md
both put the demo page on the component author, not in a later batch:

- The component, its stylesheet, its prop JSDoc
- Its demo page in `apps/docs/components/pages/expressive.tsx` and its registry row
- A live-browser proof, because a green build proves nothing about CSS delivery

The prop JSDoc must sit on an **exported** interface. `check-contracts.mjs:112` only legalises
JSDoc on exported types, so the repo's non-exported `XOwnProps` idiom counts as comment debt
(Badge.tsx carries 10 that way). Existing components are baselined; new files start at 0.

Only the `llms.txt` entries stay batched — one file, shared format, generated footers.

#### Scope

- Tier wiring: `'expressive'` added to `TIERS` in `scripts/lib/entries.mjs`. `check:contracts`
  already covered the tier (hex ban, prefix registration, `systemTier` exclusion), so no
  linter work was needed.
- 7 motion primitives from `temp/Motion showcase components.zip`:
  - ✓ **Odometer** — sprung digit columns, velocity blur and accent tint
  - ✓ **Typing Lines** (04 — four caret variants)
  - ✓ **Lens** (cursor magnetism)
  - ✓ **Morphing Text** (02 — gooey threshold word morph)
  - ✓ **Weight Field** (01 — variable-axis magnetism)
  - ✓ **Flow Field** (05 — needle field)
  - ✓ **Confetti** (particle burst)
- Scoped custom props `--<component>-<name>`, defaulted from semantic tokens
- Type from `--font-body` / `--font-code` and the `--size-*` scale; weights from `--weight-*`
- Accent defaults from `var(--accent)`; no hex literals anywhere in the tier
- `llms.txt` entries for all 7, then full verify

#### Chrome Text: dropped

The deck's eighth primitive (03 — banded metal ramp) is out of scope permanently. A metallic
ramp is a fixed material, not a role: the band stops encode a specific chrome, so they cannot
resolve from `--accent` or any other semantic token, and freezing them as expressive constants
would ship a component whose entire visual identity ignores the theme it sits in. The tier's
other seven all read their colour from the token vocabulary. Removed from scope; not deferred.

#### Naming resolved

`Odometer` collided with a private CSS-strip helper in `primitives/badge/` used by CountBadge
**and** Table. The helper was renamed `DigitStrip`; the public name went to the sprung component.

**Blocking:** Phase 3 must be complete (✓ done).

---

### Phase 5: Support Widgets ✓ COMPLETED

**Objective:** Port Support Fan and Support Rail into `src/components/compound/`.

#### Scope

- Support Fan (radial menu of action buttons)
- Support Rail (vertical action strip)
- From `temp/Support Widget Deck.zip`
- `src/components/compound/` does not exist yet; the tier is already in `TIERS`
- Each declares its contract in its registry row. Undeclared means system.
- Reuse the existing machinery: `OverlayPortal`, `useOutsidePress`, `useListbox`, `useAnchorPosition`
- Each ships its own demo page and registry row, as in phase 4

**Blocking:** Phase 4 must reach first review gate.

---

### Phase 6: Platform Replicas ✓ COMPLETED

**Objective:** Port replica components under the replica addendum contract.

#### Scope

- 4 platform replicas from temp deck:
  - Facebook Feed
  - Instagram Feed
  - TikTok
  - YouTube
- All four live in the same `Motion showcase components.zip` as the primitives, alongside
  the `scraps/tt-*` and `scraps/yt-*` reference captures
- Pin platform metrics as named constants (immune to theming)
- Expressive tier, marked as replicas in docs and in their registry rows
- Motion: spring-driven scroll, feed loads, card transitions
- Each ships its own demo page and registry row, as in phase 4

**Blocking:** Phase 5 must be complete.

---

### Phase 7: Docs Site & Publish Gate ✓ COMPLETED

**Objective:** Build docs site, populate llms.txt, verify publish readiness.

#### Scope

- Docs application:
  - Demo pages and registry rows already landed with each component in phases 4-6
  - Cross-cutting sweep: override levels 0-3, reduced motion, mid-flight interruption
  - Props tables regenerate from `dist/*.d.ts`; a registry slug is what makes `gen-props`
    emit a table at all
  - A `theming` guide page under Getting Started, proving levels 0-3 with live demos.
    Content-only slugs must be listed in `HAND_WRITTEN` in `gen-props.mjs` or the generator
    tries to resolve them to an export and hard-fails.
- llms.txt registry entries for every subpath
- Consumer override documentation (levels 0–3), in the `llms.txt` THEMING section, the
  docs-site page, and the README
- Full verify gate:
  - check:contracts (468 baseline, ratchet only shrinks)
  - check:authoring (4 docs, 8 layer keys)
  - check:llms (all props documented)
  - type coverage
  - production build
- Publish gate: MIT license, GitHub release, npm registry

#### Publish gate results

- `pnpm verify` 12/12 green; `pnpm build:docs` renders 49 static routes.
- The packed tarball is 664 kB / 541 files: `dist`, `src`, `llms.txt`, `README.md`, `LICENSE`,
  `next.mjs`, `next.d.mts`. No `temp/`, `apps/` or repo config leaks.
- Installed from the tarball into a bare project with only `react` and `react-dom`: all 53
  subpaths resolve and import, 67 runtime exports, zero runtime dependencies. The only bare
  specifiers in `dist/` are `react`, `react-dom`, `react/jsx-runtime`, plus `fs`/`path`/`url`
  in `dist/mcp.js`, which is a bin and never enters a browser graph.

**Blocking:** Phase 6 must be complete (✓ done).

#### Remaining, and owned by the maintainer

The npm publish and the GitHub release are the two steps left. `package.json` is at 0.11.0
while the newest tag is v0.9.0, so the release tag has not been cut. Both are deliberate
manual steps, not gate failures.

---

## Build Pipeline

### Current Performance

- `pnpm verify`: 5.6s (12 lanes, all green)
- `pnpm build`: 2.3s JS + 3.7s types
- `pnpm build:docs`: ~41s (Next.js static export)

### Key Optimizations

- tsup JS-only (`dts: false`)
- `tsc --emitDeclarationOnly` for types (also serves as src typecheck)
- Parallel verify runner (no pnpm-run overhead)
- Prettier `--cache`
- `check:contracts` ratcheted against baseline (469 items; counts can only shrink)

---

## Quality Gates

### Hard Contracts (check:contracts)

- No `transitionend`/`animationend` outside the engine
- No `matchMedia` outside engine/tokens/`use-media-query`
- No `:root` outside tokens
- `font-family: var(--font-*) or inherit` (no stacks)
- No colour/timing literals in system-tier CSS
- Custom properties carry registered prefixes
- `'use client'` where client APIs are used
- Zero runtime dependencies
- No hex literals in expressive/compound props
- Every component stylesheet layer-wrapped

### Ratcheted Debt (scripts/contracts-baseline.json)

- TS comments: 209 items / 31 files
- CSS comments: 216 items / 29 files
- px literals in system CSS: 39 items / 13 files
- rAF outside engine: 3 items / 2 files (StatusBadge, emoji-picker)
- UIMotion-coupled setTimeout: 1 item / 1 file (glint)
- **Total:** 468 baseline items; any new violations fail the gate
- Counts only ever shrink. Renaming a file orphans its baseline key, which forces that file
  to zero debt - that is how `odometer.css` lost its comment on the way to `digit-strip.css`.

---

## Session Continuity

- **Local session:** https://claude.ai/code/session_01RWnUhFv2T7EfHqPsRtpxtW
- **Auth:** admin@tabsircg.com (Anthropic account)
- **Remote:** github.com/Tabsir99/zyncat-ui (main branch, all phases pushed)
- **Memory:** `~/.claude/projects/-home-tabsir-ap-reactp-zyncat-ui/memory/` (persists across sessions)

---

## Key Patterns & Internals

### Engine Architecture

- `animate(el, ...layers) → Playback` — WAAPI destination-driven motion
- `set(el, ...placements)` — immediate placement (no animation)
- `flip(el, from, options)` — FLIP layout animation
- `loop(frame, options) → Playback` — rAF simulation with auto-pause, ownership registry, clock scaling
- `clock.scale` — global playback rate (for slow-mo / devtools)
- `UIMotion` — DOM-read token namespace (dur, ease, dist, scale, t, reduced)

### CSS Layer Architecture

```
@layer zyncat.tokens, zyncat.components;
```

- Level 0: consumer unlayered CSS wins (simplest override)
- Level 1: override `:root` tokens
- Level 2: scoped `--<component>-*` properties
- Level 3: `className`/`style` direct props
- Replicas: outside the override contract (immune by design)

### Two Contracts

- **System** (primitives/composites): closed token vocabulary, no literals
- **Expressive** (expressive/compound): named constants + scoped `--<component>-*`, freedom props

---

## Notes for Cloud Sessions

1. **The loop is the porting substrate.** `src/engine/loop.ts` is a strict superset of the deck's
   own `motion-utils.js` helper — same `k = dt/16.667`, same 34 ms clamp, same live speed
   sampling, plus clock scaling, ownership, auto-pause and reduced-motion snap. Port the deck's
   `MU.loop(...)` calls straight onto it.
2. **Follow the Odometer.** It is the worked example for the remaining ports: value-driven props
   rather than the deck's self-animating demo, physics as named module constants, JS writing
   `translate` plus custom properties while CSS derives colour through `color-mix` — the
   pattern already used at `checkbox.css:76`.
3. **Roadmap is durable:** every phase above is complete; this file is the record.
4. **Memory files:** The local memory at `~/.claude/projects/-home-tabsir-ap-reactp-zyncat-ui/memory/MEMORY.md` won't transfer to cloud. Create a new memory session by resuming the URL above.
5. **Verify always:** `pnpm verify` is the gate, and it is not sufficient. Check the component
   in a live browser too — a green build once passed while css-loader silently dropped every
   token. All phases end at a user review gate before committing and pushing.
