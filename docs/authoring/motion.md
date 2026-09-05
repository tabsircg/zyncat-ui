# Motion

- One small WAAPI engine in `src/engine` drives everything. No animation dependency.
- Transitions are destination-driven and run on the engine. Simulations are input-coupled or endless and run on the engine `loop` primitive.

## Transitions versus simulations

- Has a destination: `animate`, `flip`, `set`, or a CSS transition.
- Input-coupled or endless - cursor magnetism, flow fields, particles, sprung counters: `loop`. Never hand-roll a rAF loop.
- `loop(frame, options?)` returns a `Playback`; `finished` resolves on stop.
- `frame(k, dt, now)`: `k` is the 60fps-normalised step, `dt` is milliseconds. Both are speed- and clock-scaled; `dt` is clamped to 34ms.
- `options.speed` is sampled every frame; feed it the live prop. `0` idles the frame, an invalid speed runs at `1`.
- `options.el` plus `options.claims` claim css properties under the one-writer rule. `animate()` on a claimed property stops the loop; stopping releases the claim.
- The loop pauses while the document is hidden or `options.el` is off-screen.
- Under `UIMotion.reduced`, `loop` calls `options.snap` once and never starts.
- Physics constants are named module constants. Perceived settle stays inside the `--duration-*` bands.

## Which layer do I reach for

- Work down the list; stop at the first match. Nothing fits: it is still one of these.
- Paint on hover / press / focus / disabled: a CSS `transition` on `--transition-control` or `--transition-colors`. Never animate paint from JS.
- Enters or leaves the React tree: `<Presence>` around it, `<Motion exit={…}>` on it.
- Move, scale or fade a mounted element you render: `<Motion animate={…}>`. You do not render the node: `animate(el, layer)` or `useMotion(ref, specs)`.
- The box changed because layout changed: `<Motion layout>` or `<Motion layoutId="…">`.
- An indicator following the hovered or active child: `useGlide(containerRef)` + `<GlidePill>`, travelling on `t.glide`.
- Height from zero to content: `<Collapse>`, or `height: [0, 'auto']`.
- Input-coupled or endless: `loop`.
- Never sequence with `setTimeout`, `requestAnimationFrame`, `transitionend` or `animationend`.

## The Layer vocabulary

- A `Layer` is a plain object. These are all the animatable keys:
- `x`, `y` — `Length[]`; compiled into one CSS `translate`.
- `scale` — `number[]`, or per-axis pairs.
- `opacity` — `number[]`.
- `width`, `height` — `Size[]`.
- `radius` — `string[]`; whole `border-radius` shorthands, one per keyframe.
- `timing` — a `Timing`.
- `composite` — `CompositeOperation`; almost always omitted.
- Only `x` or `y` holds the other at `0`. Bare numbers are px; `Size` adds `'auto'`.
- A percentage on `x` / `y` resolves against the element's own box, on `width` / `height` against the containing block.
- `radius` is the corner half of a size morph: animate it with `width` / `height`, never alone.
- `'auto'` measures, animates to the pixel value, then restores `auto` on finish.
- `animate()` takes any number of layers as one `Playback`. Split layers only when parts need different timing.

## `[to]` versus `[from, to]`

- Every value is a keyframe list; the length changes the meaning.
- One frame (`x: [120]`): from the current computed value. Use for exits and interruptions.
- Two or more (`x: [0, 120]`): an explicit path. A two-frame exit teleports to `from` before playing, the most common motion bug here.
- Lists of different lengths are allowed; the shorter holds its last value.

## Timing

- Durations are seconds, not milliseconds.
- `Timing` fields: `duration`, `ease`, `delay`, `times`, `type`, `fill`, `release`. Springs: `type: 'spring'` with `visualDuration` and `bounce`. `fill` defaults to `'both'`, `release` to `false`.
- Prefer `UIMotion.t`: `t.enter`, `t.exit`, `t.layout`, `t.settle`, `t.glide`.
- Read `UIMotion` at call time, never into a module constant. It re-reads when `data-theme` changes, `prefers-reduced-motion` flips and after `ZyncatTheme` renders; a subtree theme retimes CSS only, and a hand-injected stylesheet needs `refreshMotionTokens()`.
- A component with an `animation` prop never reads `UIMotion` directly: `resolveMotionTiming(animation, defaults)`.

## Ownership: one writer per property

- The engine tracks which animation owns each property, per element. Starting a new animation on a property cancels the holder.
- The engine writes `translate`, `scale`, `opacity`, `width`, `height`, `border-radius`. CSS must not transition a property the engine writes.
- A layer that stacks instead of replacing uses `composite: 'add'`. It does not claim the property; pair it with `fill: 'none'`.
- Hand-written styles lose while an animation holds the property. `set(el, { x: [120] })` writes immediately and drops the claim. `timing: { release: true }` commits, cancels and hands the property back on finish.

## Sequencing

- `animate()` returns a `Playback`: `stop()` and `finished`. `finished` resolves and never rejects, even detached or hidden mid-flight.
- Chain follow-up motion off `finished`. Never a timer, rAF, `transitionend` or `animationend`.
- `clock.scale` scales playback; reduced motion collapses durations. `Presence` already waits on `finished` for exits.

## Reduced motion is global and automatic

- `motion.css` collapses every `--duration-*` to `1ms` under `prefers-reduced-motion: reduce`. `UIMotion` reads the same properties, so CSS and JS shrink together.
- A per-component reduced-motion query may only disable or zero motion: `transition: none`, `animation: none`, a dropped stagger. Never alternative motion. Never branch on `matchMedia` in a component.
- `UIMotion.reduced` is only for when fast is still wrong. Under it: skip FLIP entirely, `t.settle` becomes `{ duration: 0 }`, simulations snap.

## Layout animation

- `<Motion layout>` FLIPs from the previous box on every render. That box is read as the render begins, so a box an effect moved after the last commit starts the next FLIP where it truly is.
- `<Motion layoutId="x">` FLIPs from wherever any element last held the id.
- `layoutTransition`: `size` is `'scale'` (cheap, distorts borders and radii), `'morph'` (real `width` / `height`, for a visible border or radius) or `'none'`, plus a `timing`.
- Below components: `flip(el, from, options)` and `measure(el)`.

## Focus and the first frame

- Focus directly in an effect, never deferred. By effect time the element is in the document with layout, and an in-flight entrance does not make it unfocusable.
- A timeout that makes focus "work" means the bug is elsewhere.

## Named presets and space tokens

- `src/motion/presets.ts`: `popIn(scale, timing)`, `popOut(scale, timing)`, `slideIn(x, timing)`. Presets take numbers fed from tokens, never literals.
- `UIMotion.scale`: `panel` 0.98, `floating` 0.96, `chip` 0.9. Pick by surface size, not taste.
- `UIMotion.dist`: `sm` 8px, `md` 16px, `lg` 24px. Pick by how far the thing conceptually came.

## Canonical recipes

- Use these. Never invent a variant.

```tsx
// floating surface — popover, menu, tooltip
animate={popIn(UIMotion.scale.floating, timings.open)}
exit={popOut(UIMotion.scale.floating, timings.close)}
// takeover panel — modal; a dialog also rises: y: [UIMotion.dist.sm, 0] on enter, y: [UIMotion.dist.sm] on exit
animate={popIn(UIMotion.scale.panel, timings.open)}
exit={popOut(UIMotion.scale.panel, timings.close)}
// chip inside a group — tag
animate={popIn(UIMotion.scale.chip, step.open)}
exit={popOut(UIMotion.scale.chip, step.close)}
// edge sheet — slides its own size in, then releases the property
animate={{ [axis]: ['100%', 0], timing: { ...timings.open, release: true } }}
exit={{ [axis]: ['100%'], timing: timings.close }}
// paged content swapping in a direction — calendar month, pagination range
animate(el, slideIn(dir * UIMotion.dist.md, UIMotion.t.enter));
```
