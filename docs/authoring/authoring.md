# Adding a component

- Read design-system.md first: confirm build-new over compose, pick the tier and contract. Then this checklist, top to bottom. `pnpm verify` runs every check.

## 1. Place the file

```
src/components/<tier>/<component>/<Component>.tsx
```

- Directory kebab-case, file PascalCase. Scanned tiers: `primitives`, `composites`, `compound`, `expressive`.
- tsup derives the entry: `TextField.tsx` becomes `@zyncat/ui/text-field`. Nothing to register. A wrong derived name goes in `NAME_OVERRIDES` in `scripts/lib/entries.mjs`; never rename the file.
- Helpers live in the same directory; only PascalCase `.tsx` files become entries.
- `'use client'` first if it uses state, effects, refs or events.

## 2. Sync the manifests

- `pnpm sync`. Every generator reads `scripts/lib/entries.mjs`: `exports` writes `package.json` `exports` (subpaths are the only public API), `tsconfig` writes `apps/docs/tsconfig.json` `paths`, `props` writes `apps/docs/content/props.generated.ts` from `dist/*.d.ts`.
- No barrel entry. One import never pulls in code or CSS the app did not ask for.

## 3. Give it its own stylesheet

```
src/components/<tier>/<component>/<component>.css
```

- Import it at the top of the `.tsx`, above everything else. Every rendered class must resolve through the module's own import graph (`pnpm check css`); classes under `src/tokens` ship in `styles.css` and are always satisfied.
- System contract: tokens, not literals. Expressive contract: name every value - a module constant, a public `--<component>-<name>` knob with a doc line, or a private `--_<component>-<name>` property on the root class. Prefixes are registered in `scripts/check-contracts.mjs`.
- Nothing on `:root`. No `font-family` stacks: type reads `--font-body` / `--font-code` and the `--size-*` scale.
- A property animated from JS never appears in a CSS `transition` (motion.md).
- Open with the layer order statement, wrap the rules in the components layer, hoist `@property` registrations above the layer block. Never `@import` with `layer()`: bundler css-loaders rewrite it into a dead `@media`.

## 4. Document the props where they live

- JSDoc on the exported public props interface feeds the tooltip, the docs table and the MCP. `check contracts` counts JSDoc on an unexported type as comment debt; `pnpm sync props` fails on a public prop with none.
- `@default` on every defaulted prop:

```tsx
/** Preferred side of the trigger; flips when cramped. @default 'bottom' */
side?: 'top' | 'bottom';
```

- Referenced shapes (`DropdownItem`, `TableColumn`, `SelectOption`) document themselves.
- Never hand-write a prop table. `apps/docs/content/*.ts` carries only the `example` string.

## 5. Write the usage doc

- Every exported subpath ships `Thing.usage.md` beside `Thing.tsx`. `get_component` serves it verbatim above the prop types, and the skill index is generated from its summary line. `scripts/lib/usage-format.mjs` parses it, so the shape is load-bearing:

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

- Group is one of the ids in `usage-format.mjs`. Docs is the live page, omitted only when there is none.
- `pnpm check usage` verifies coverage, format, caps and every example prop against the built types; run `pnpm build` first. `pnpm sync skill` regenerates the skill index; never edit `components.md` by hand.

## 6. Add it to the docs application

- The demo page in `apps/docs/components/pages/` is yours: every state, interruption mid-flight, reduced motion. For an expressive component the demo is the polish proof.
- Registry row, blurb and canonical example live in `apps/docs/content/`.

## 7. Run the checks

- `pnpm format`, `pnpm sync`, `pnpm verify`. `check usage` and `check props` wait on the build.
- `check contracts` enforces the mechanical contract rules and ratchets legacy debt via `scripts/contracts-baseline.json`.

## Conventions the linters do not catch

- No comments in source. Exceptions: public-props JSDoc, the token `.css` files, and a choice that reads as a mistake - code that deliberately goes against the standard, where the constraint forcing it cannot live in a name. Rare, and `check contracts --write` has to accept the raised count.
- Sequence motion with `Playback.finished` only. `pnpm`, never `npm`. Named constants, not magic numbers.
- Reuse the internal machinery; design-system.md has the list. The repo map lives in `CLAUDE.md`.
