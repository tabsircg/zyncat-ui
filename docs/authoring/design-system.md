# The design system

## Goal

- Ship a premium, motion-first React 19 design system.
- Modern CSS, a closed token vocabulary, a small WAAPI engine, zero runtime dependencies.
- Be both: a complete system to build products on, and expressive components with real motion.
- Design every state. Make every motion interruptible.

## The two contracts

- The tier decides which contract binds a component.
- The invariants below bind every tier.

### System contract

- Applies to `src/components/primitives/` and `src/components/composites/`.
- Every value is a named token. No literals.
- No component-local fonts. No filters. No canvas. No per-frame JS.
- Motion comes from the engine presets and duration bands only.
- Prefer fewer variants and fewer props.
- Pick the nearest token step. Never invent a value.

### Expressive contract

- Applies to `src/components/expressive/` and opted-in `src/components/compound/` patterns.
- Open axes: geometry, filters, canvas, variable fonts, particles, simulation, physics.
- Also open: colour ramps and lighting models - gradient stops, specular bands, shading curves.
- Freedom props are allowed: accent, speed, intensity.
- Name every arbitrary value.
- A value used once becomes a named module constant.
- A value a consumer may tune is a `--<component>-<name>` property on the root class with a doc line above it; a constant, a derivation or per-frame state is `--_<component>-<name>`, private and untyped.
- Scoped custom properties are the component's public theming contract.
- Default scoped properties from semantic tokens where a semantic exists.
- Never declare anything on `:root`.
- Never leak into another component's stylesheet.
- Ink, surface and accent as roles resolve from semantic tokens: `--text-strong`, `--bg-surface`, `--accent`.
- Ink as material does not. A ramp's stops are a lighting model, not nine ink roles.
- Snapping a material to the nearest token is a system-tier habit and it deletes the component.
- A material is still named: module constants, or scoped properties a theme opts into.
- A freedom prop defaults from a token, never a hex.
- Type reads `--font-body` / `--font-code` and the `--size-*` scale.
- No bundled font faces. No local font stacks.
- Run simulations only on the engine `loop` primitive (motion.md).
- A compound component declares its contract in its registry row. Undeclared means system.

### Replica addendum

- A replica reproduces an external platform's surface. Fidelity is the contract.
- Pin platform metrics as named constants, not tokens.
- Consumer theming must not move replica metrics.
- Replicas live in the expressive tier, marked as replicas in their docs.
- A11y, focus, reduced motion and zero dependencies still bind.

### The focus ring

- A ring is an `outline`, never a `box-shadow`: `outline: var(--ring-accent)` (or `--ring-danger`,
  `--ring-warning`, `--ring-success`, `--focus-ring`). Never re-list elevation in a focus rule -
  `box-shadow` stays the base rule's, and the two never share a property.
- A control whose base rule transitions with `var(--transition-control)` adds
  `outline: var(--ring-rest)` so the ring fades in instead of snapping.
- A ring reaches `--ring-width` past the border box. Any container in the component that clips -
  `overflow` other than `visible`, or a mask - has to leave that room, or the ring is cut:
  - a scroller adds `scroll-padding: var(--ring-width)` so sequential focus never lands flush;
  - a scroller whose children sit flush to its content edge also adds `padding` of
    `var(--ring-width)` with a matching negative `margin`, but only when no clipping ancestor
    would swallow it again;
  - `overflow: clip` plus `overflow-clip-margin: var(--ring-width)` works only where the clip is
    not decorative - it defeats a rounded corner, and it needs `clip` on both axes.
- A control that is flush with a clipping edge by design - a full-bleed panel, region or row -
  turns its ring inward with `outline-offset: var(--ring-inset)` instead of reserving room.
- Collapse is the one place a ring can still be cut: clipping the collapsing axis is how it
  collapses, so content flush to its edge loses the outer part of its ring.

### Invariants

- Focus-visible treatment is the system's, everywhere.
- Never trade roles, keyboard contracts or aria for looks.
- Reduced motion collapses transitions and snaps simulations to their settled state.
- Every motion is interruptible. One writer owns a property (motion.md).
- Keep perceived settle inside the `--duration-*` bands.
- Zero runtime dependencies.
- Every component ships its own subpath, stylesheet, props JSDoc and usage doc.

## Tokens

- Tokens are custom properties on `:root` in `src/tokens/*.css`, served verbatim by `get_tokens`.
- The `.css` file is the source of truth and the documentation.
- A token file starts with the layer order statement and wraps its rules in `@layer zyncat.tokens`.
- Eight values are decisions, in `decisions.css`: `--accent`, `--success`, `--warning`, `--danger`,
  `--neutral`, `--radius`, `--font-body`, `--font-code`. Everything else derives from them: colour with
  relative colour syntax, the `--radius-*` steps as fixed ratios, the `--type-*` bundles from the faces.
  A new colour token derives; it never pins a hue. `--radius-full` is a shape, not a step, and stays literal.
- The `--duration-*` tokens stay literal: `UIMotion` and the slow-mo devtool read them off the DOM as
  numbers, and an unregistered `calc()` never resolves in a computed value. `UIMotion` reads them at
  `<body>` once at load and again, in place, when `data-theme` changes on any element,
  `prefers-reduced-motion` flips or `ZyncatTheme` renders; a theme on a subtree retimes CSS only.
- A decision sits on `:root` alone, never on the theme-root block; `gen-theme` fails on one there. `init`
  copies the `:root` block of `decisions.css` into the consumer's `zyncat.theme.css`.
- Three blocks per file, by how a theme reaches a token. Literal, polarity-free values sit on `:root`.
  A polarity - a value the dark theme changes: the neutral roles, the shadow ink, the three
  strengths - sits on `:root, [data-theme='light']`, and `dark.css` sets the same name on
  `[data-theme='dark']`, so either attribute works on `<html>` or on any subtree root. Tokens that
  derive from another token sit on `:root, [data-theme]`, so an element carrying a theme attribute
  re-derives them from its own decisions. A custom property is substituted where it is declared, so a
  derived token on `:root` alone inherits already resolved to the root's decision.
- `gen-theme` holds the two sides together: every light-block token has a dark value, and `dark.css`
  sets only polarities and derived tokens - a `:root`-only token it changes is a polarity and moves.
- The dark theme is the same decisions on dark surfaces: it never sets a decision, and a hue step it
  re-derives still follows its decision. Surfaces step lighter as they rise, ink steps down from
  near-white, and the lighting model scales by number - `--shadow-strength` up, `--sheen-strength`
  down, `--glow-strength` on - so no shadow, highlight or glow is restated.
- A filled face is its own role - `--accent-fill`, `--danger-fill` - never the decision: the dark
  theme drops it a step, since the light face reads as a light source on a dark canvas, and leaves
  `--accent-lift` where it is, so a hover on dark travels further. A control that paints a hue face
  reads the fill; a hairline or a marker reads the decision.
- Never put a literal on the theme-root block: it resets the consumer's `:root` decision inside every
  themed subtree. `gen-theme` fails the build on one.
- Never `@import` with `layer()`. Bundler css-loaders rewrite it into a dead `@media`. Files wrap their own rules.
- `decisions.css`: the eight decisions. `color.css`: the neutral ramp, the shadow ink. `semantic.css`: the roles, derived.
- `dark.css`: the dark polarity. `base.css`: the `zyncat.base` layer that paints `body` in the app
  surface, the body ink and the body type - after the other layers, under any unlayered body rule.
- `spacing.css`: one 4px base, a short scale, the control and icon sizes.
- `typography.css`, `fonts.css`: the type scale and the font faces.
- `radius.css`, `elevation.css`: radii; shadows, rings, the lighting strengths and the `z-index` bands.
- `motion.css`: durations, easings, distances, rest scales.
- `glass.css`: the frosted-surface pieces.
- A component-owned palette - the avatar's six identity hues - is declared on the component's root
  class and flips polarity with `light-dark()`, keyed on the `color-scheme` the polarity blocks set;
  the token layer holds no per-component values. `light-dark()` sets the browser floor: Chrome 123,
  Safari 17.5, Firefox 120.
- TypeScript reads tokens off the DOM: `UIMotion`, `tokenPx`.
- Never duplicate a token value as a TypeScript literal.

### Token, or constant?

- Ownership decides. Ask whether a theme is entitled to move this value.
- Repointing `--accent` should move it: it is a role. Use a semantic token, every tier.
- Repointing `--accent` should leave it alone: it is a material or a metric. Use a constant.
- The replica addendum is this rule, scoped. It binds outside replicas too.
- Range check before you snap: compare the range you need to the range the scale covers.
- Outside that range, "nearest" is truncation. It ships a duller version of your component.
- Substitution check after you snap: put the token in and look at it.
- If the swap turns the component into a blander thing, the value was never a role.
- Assertions cannot run this check. Screenshot before the metrics pass, not after.

### Use an existing token, or add one?

- Default to an existing token. Snap to the nearest step.
- Add a token only when all four hold:
  1. It is a new kind of thing, not a new value of an existing kind.
  2. More than one component needs it.
  3. A theme would plausibly retune it.
  4. You can write the one-line "when to pick it" comment.
- A single component's value is a constant or a scoped property, never `:root`.
- Declare new tokens in the right `src/tokens/*.css` file with that comment.
- Mirror into the TypeScript reader if code needs it.

### Naming

- CSS spells the concept out. TypeScript abbreviates it: `--duration-fast` is `dur.fast`.
- Name a scale by magnitude or by target, never both.
- Scoped properties: `--<component>-<name>` public, `--_<component>-<name>` private; kebab-case, root class only.

## Overrides

- Level 0: all shipped CSS sits in the `zyncat` cascade layers, so plain consumer CSS wins.
- Level 1: retheme in `zyncat.theme.css`, the decisions `init` writes into the project; any token on `:root` works. JS follows via the DOM readers.
- Level 1, dark: `data-theme="dark"` on `<html>` or a subtree root, `data-theme="light"` for a light island inside it. Extend the shipped dark in a `[data-theme='dark']` block of the same file.
- Level 1, typed: `defineTheme` + `ZyncatTheme` from `src/tokens/theme.tsx`, for a theme that is data. Four categories - `color`, `type`, `shape`, `motion` - each grouped by what it holds, then `components` and every other token by CSS name under `custom`; the path is the CSS name.
- Level 1, Tailwind: `tailwind.css` at the package root is the vocabulary as Tailwind v4 utilities, one per
  role, named after the token. Every entry is `inline reference`: `inline` so a utility reads the token
  itself and a themed subtree re-derives it, `reference` so Tailwind writes nothing onto `:root`, where
  its own `--radius-*`, `--shadow-*` and `--tracking-*` would overwrite the tokens the components read.
  The file opens with the layer statement that puts Tailwind's utilities above the component rules, so
  it goes above `tailwindcss` in the stylesheet Tailwind compiles; `init` writes that line.
- `scripts/gen-theme.mjs` generates the token types, the per-component `style` types and the Tailwind
  bridge from the CSS.
- Token names are derived, never tabulated: the generator fails if a name stops round-tripping.
- Level 2: retune one component through its scoped custom properties.
- Level 3: restyle with `className` and `style` - direct props on primitives and fields, `htmlProps` on an overlay's panel.
- Replicas answer to none of these, by design.

## Compose, or build new?

- Compose first. A new component is permanent public surface.
- Build new only for own semantics, an own state machine, or existing duplication.
- Never build new because a prop is missing. Add the prop if it is a real axis.

### Which tier

- Primitive: one control or visual atom. `src/components/primitives/`.
- Composite: primitives plus behaviour and keyboard contracts. `src/components/composites/`.
- Compound: whole assembled patterns. `src/components/compound/`.
- Expressive: creative components and replicas. `src/components/expressive/`.
- Internal: shared machinery, never exported. `src/components/internal/`.
- Behaviour that outlives one event handler means composite.
- Utility belongs in composites. Delight belongs in expressive.

## Behaviour that already exists

- Controlled state: `useControllable`.
- Overlay root and stacking: `OverlayPortal`, `useOverlayEntry`, `ovIsTop`.
- Click-outside dismissal: `useOutsidePress`.
- Trigger cloning with aria: `ovCloneTrigger`.
- Floating panel anchoring: `useAnchorPosition`.
- Focus return: `useReturnFocus`. Focus trap: `useFocusTrap`.
- Scrim, scroll lock, `inert`, panel shell: `ModalShell`.
- Token as a number: `tokenPx`. Scroller edges: `useScrollEdges`. Class names: `cx`.
- Listbox keyboard navigation: `useListbox`. Generalise it for new shapes, never fork it.
- Scroll-into-view lives inline in `use-listbox.ts`. A second consumer lifts it out.
- Trigger activation: `activationProps`. Never hand-wire `onClick` on a trigger the library owns.

### Activation

A library-owned trigger fires on pointerdown, one frame ahead of click. `activationProps(activate, opts)`
returns the `onPointerDown` + `onClick` pair that makes that safe:

- Mouse and pen activate on pointerdown. Touch and keyboard fall through to click, so a tap can still
  scroll and Enter/Space still work. The two never both fire - the click handler reads the event's
  pointer type and stands down for the gesture the pointerdown already took.
- A modified or non-primary press (shift, meta, middle, right) declines the pointerdown and waits for the
  click, so modifier-aware handlers behave as before.
- `disabled` and `aria-disabled` targets never activate, on either event.
- The press takes focus itself, because focus otherwise lands on `mousedown` - one event too late for an
  overlay that reads `document.activeElement` when it mounts.
- `holdFocus: true` for a row inside a panel that places focus itself (select options, menu rows). It
  cancels the pointerdown instead, which drops the compatibility mouse events and leaves focus untouched.
- Every component exposing this takes `activateOn`, and a consumer's own `onPointerDown` cancels the
  built-in activation by calling preventDefault on the event - the click then activates as usual.

The helper defaults to click. A component opts in by defaulting its own `activateOn` to `'pointerdown'`,
which is `Select`, `MultiSelect`, `Dropdown`, `Tabs`, the date fields and `Table`'s sort headers - the
surfaces where a menu, a panel or a reorder follows the press and the wait is felt. Everywhere else the
prop is there to opt in, not opted in.

A cloned trigger that opens on pointerdown loses its press transform and takes the expanded treatment
`.zc-select__trigger` and `.zc-dtf__trigger` already carry - `trigger.css`, keyed on the `data-activate` mark
`ovCloneTrigger` sets. Those rules out-specify the primitive's own press rule on purpose; they never
touch another component's scoped custom properties, so a consumer's trigger keeps its own resting look.

A library-owned trigger keeps whatever press state it already had. A dip that lands after the surface
has already opened is a judgement call per component, not a rule - `.zc-tab` keeps its.

Out of scope by design: `Button` and anything rendered as one, native form controls, content surfaces
where a press-drag means selection or reordering, and dismiss buttons - a surface leaving the screen
gains nothing from arriving a frame early.

## Conventions

- Sentence case. No emoji. No exclamation marks in UI copy.
- One primary `Button` per view.
- Numbers, times, IDs and status read mono and tabular.
- Status hues mark genuine status only.
- Every component imports its own stylesheet. No barrel entry.

## Roadmap

- Phase 4: wire `src/components/expressive/` into the tsup scan. Port the motion primitives.
- Phase 5: support widgets into `src/components/compound/`.
- Phase 6: replicas. Phase 7: docs coverage, publish gate.
- Legacy debt (comments, px literals, rAF call sites) is ratcheted by `check contracts` against `scripts/contracts-baseline.json`.
