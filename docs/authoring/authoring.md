# Adding a component

- Read design-system.md first. Confirm build-new over compose. Pick the tier and contract.
- Follow this checklist top to bottom. `pnpm verify` runs every check.

## 1. Place the file

```
src/components/<tier>/<component>/<Component>.tsx
```

- Directory kebab-case. File PascalCase.
- Scanned tiers: `primitives`, `composites`, `compound`, `expressive`.
- tsup derives the entry: `TextField.tsx` becomes `@zyncat/ui/text-field`. Nothing to register.
- Wrong derived name: add to `NAME_OVERRIDES` in `scripts/lib/entries.mjs`. Never rename the file.
- Helpers live in the same directory. Only PascalCase `.tsx` files become entries.
- Start with `'use client'` if it uses state, effects, refs or events.

## 2. Sync the manifests

- Run `pnpm sync`. Every generator reads `scripts/lib/entries.mjs`.
- `pnpm sync exports` writes `package.json` `exports`. Subpaths are the only public API.
- `pnpm sync tsconfig` writes `apps/docs/tsconfig.json` `paths`.
- `pnpm sync props` writes `apps/docs/content/props.generated.ts` from `dist/*.d.ts`.
- No barrel entry. One import never pulls in code or CSS the app did not ask for.

## 3. Give it its own stylesheet

```
src/components/<tier>/<component>/<component>.css
```

- Import it at the top of the `.tsx`, above everything else.
- Every rendered class must resolve through the module's own import graph (`pnpm check css`).
- Classes under `src/tokens` are always satisfied. They ship in `styles.css`.
- System contract: tokens, not literals.
- Expressive contract: name every value.
- A named value is a module constant, a public `--<component>-<name>` knob with a doc line, or a private `--_<component>-<name>` property on the root class.
- Nothing on `:root`.
- No `font-family` stacks. Type reads `--font-body` / `--font-code` and the `--size-*` scale.
- A property animated from JS never appears in a CSS `transition` (motion.md).
- Start the stylesheet with the layer order statement and wrap its rules in the components layer.
- Hoist `@property` registrations above the layer block.
- Never `@import` with `layer()`. Bundler css-loaders rewrite it into a dead `@media`.
- Custom-property prefixes are registered in `scripts/check-contracts.mjs`.

## 4. Document the props where they live

- JSDoc on the public props interface feeds the tooltip, the docs table and the MCP.
- Export the interface the JSDoc sits on. `check contracts` counts JSDoc on an unexported type as comment debt.
- Put `@default` on every defaulted prop.

```tsx
/** Preferred side of the trigger; flips when cramped. @default 'bottom' */
side?: 'top' | 'bottom';
```

- `pnpm sync props` fails on any public prop with no JSDoc.
- Referenced shapes (`DropdownItem`, `TableColumn`, `SelectOption`) document themselves.
- Never hand-write a prop table. `apps/docs/content/*.ts` carries only the `example` string.

## 5. Write the usage doc

- Every exported subpath ships a usage doc next to its source: `Thing.usage.md` beside `Thing.tsx`.
- The MCP get_component tool serves it verbatim above the prop types; the skill index is generated
  from its summary line. Parsed by `scripts/lib/usage-format.mjs`; the shape is load-bearing:

````
# Thing - @zyncat/ui/thing

Group: primitives
Docs: https://ui.zyncat.app/thing

One line: what it is, and when to pick it over the neighbour it is confused with.

Prop vocabulary as prose. Sixteen prose lines, hard cap - per-prop detail lives in the props JSDoc.

```tsx
<Thing prop="value">...</Thing>
```
````

- The Group line takes one of the ids in `usage-format.mjs`; the Docs line is the live docs page,
  omitted only when the component has no page.
- `pnpm check usage` verifies coverage, the format, the caps and every example prop against the
  built types. Run `pnpm build` first.
- `pnpm sync skill` regenerates the skill's component index from the summaries. Never edit
  `components.md` by hand.

## 6. Add it to the docs application

- The demo page in `apps/docs/components/pages/` is yours. Exercise the real states.
- For an expressive component the demo is the polish proof.
- Show every state, interruption mid-flight, and reduced motion.
- Registry row, blurb and canonical example live in `apps/docs/content/`.

## 7. Run the checks

- `pnpm format`, then `pnpm sync`, then `pnpm verify`.
- `pnpm verify` runs everything in parallel lanes; `check usage` and `check props` wait on the build.
- `check contracts` enforces the mechanical contract rules and ratchets legacy debt via `scripts/contracts-baseline.json`.

## Conventions the linters do not catch

- No comments in source. Exceptions: public-props JSDoc, the token `.css` files, and a choice that
  reads as a mistake - code that deliberately goes against the standard, where the constraint forcing
  it cannot live in a name. Rare, and `check contracts --write` has to accept the raised count.
- Sequence motion with `Playback.finished` only.
- `pnpm`, never `npm`.
- Named constants, not magic numbers.
- Reuse the internal machinery. design-system.md has the list.
- The repo map lives in `CLAUDE.md`.
