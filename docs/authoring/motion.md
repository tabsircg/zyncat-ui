# Motion

- One small WAAPI engine in `src/engine` drives everything. No animation dependency.
- Transitions are destination-driven. They run on the engine.
- Simulations are input-coupled or endless. They run on the engine `loop` primitive.

## Transitions versus simulations

- Has a destination: use the engine (`animate`, `flip`, `set`) or a CSS transition.
- Input-coupled or endless: use the engine `loop` primitive.
- Simulations are things like cursor magnetism, flow fields, particles, sprung counters.
- Never hand-roll a rAF loop.
- `loop(frame, options?)` runs the simulation. It returns a `Playback`; `finished` resolves on stop.
- `frame(k, dt, now)`: `k` is the 60fps-normalised step, `dt` is milliseconds.
- `k` and `dt` are speed- and clock-scaled. `dt` is clamped to 34ms.
- `options.speed` is sampled every frame. Feed it the live prop.
- A speed of `0` idles the frame. An invalid speed runs at `1`.
- `options.el` plus `options.claims` claim css properties. One writer still holds.
- `animate()` on a claimed property stops the loop. Stopping releases the claim.
- The loop pauses while the document is hidden or `options.el` is off-screen.
- Under `UIMotion.reduced`, `loop` calls `options.snap` once and never starts.
- Physics constants are named module constants.
- Keep perceived settle inside the `--duration-*` bands.

## Which layer do I reach for

- Work down this list. Stop at the first match.
- Paint on hover / press / focus / disabled: a CSS `transition`.
- Use `--transition-control` or `--transition-colors` for it. Never animate paint from JS.
- An element enters or leaves the React tree: `<Presence>` around it, `<Motion exit={…}>` on it.
- Move, scale or fade a mounted element you render: `<Motion animate={…}>`.
- Same, but you do not render the node: `animate(el, layer)` or `useMotion(ref, specs)`.
- The box changed because layout changed: `<Motion layout>` or `<Motion layoutId="…">`.
- An indicator following the hovered or active child: `useGlide(containerRef)` + `<GlidePill>`. The pill travels on `t.glide`.
- Height from zero to content: `<Collapse>`, or `height: [0, 'auto']`.
- Input-coupled or endless motion: the engine `loop` primitive.
- Nothing fits: the answer is still one of these.
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
- Giving only `x` or `y` holds the other at `0`.
- Bare numbers are px. `Size` adds `'auto'`.
- A percentage on `x` / `y` resolves against the element's own box.
- A percentage on `width` / `height` resolves against the containing block.
- `radius` is the corner half of a size morph. Animate it with `width` / `height`, never alone.
- `'auto'` measures, animates to the pixel value, then restores `auto` on finish.
- `animate()` takes any number of layers and runs them as one `Playback`.
- Split layers only when parts need different timing.

## `[to]` versus `[from, to]`

- Every value is a keyframe list. The length changes the meaning.
- One frame (`x: [120]`): from the current computed value. Use for exits and interruptions.
- Two or more (`x: [0, 120]`): an explicit path.
- A two-frame exit teleports to `from` before playing. Most common motion bug here.
- Lists of different lengths are allowed. The shorter holds its last value.

## Timing

- Durations are in seconds, not milliseconds.
- `Timing` fields: `duration`, `ease`, `delay`, `times`, `type`, `fill`, `release`.
- Springs: `type: 'spring'` with `visualDuration` and `bounce`.
- `fill` defaults to `'both'`. `release` defaults to `false`.
- Prefer `UIMotion.t`: `t.enter`, `t.exit`, `t.layout`, `t.settle`, `t.glide`.
- Read `UIMotion` at call time, never into a module constant. It re-reads in place when `data-theme` changes, when `prefers-reduced-motion` flips and after `ZyncatTheme` renders; a subtree theme retimes CSS only, and a stylesheet injected by hand needs `refreshMotionTokens()`.
- A component with an `animation` prop never reads `UIMotion` directly.
- Declare defaults and resolve them: `resolveMotionTiming(animation, defaults)`.

## Ownership: one writer per property

- The engine tracks which animation owns each property, per element.
- Starting a new animation on a property cancels the holder.
- CSS must not transition a property the engine writes.
- The engine writes `translate`, `scale`, `opacity`, `width`, `height`, `border-radius`.
- A layer that stacks instead of replacing uses `composite: 'add'`.
- An `'add'` layer does not claim the property. Pair it with `fill: 'none'`.
- Hand-written styles lose while an animation holds the property.
- `set(el, { x: [120] })` writes immediately and drops the claim.
- `timing: { release: true }` commits, cancels, and hands the property back on finish.

## Sequencing

- `animate()` returns a `Playback`: `stop()` and `finished`.
- `finished` resolves. It never rejects, even detached or hidden mid-flight.
- Chain follow-up motion off `finished`.
- Never decide motion ended with a timer, rAF, `transitionend` or `animationend`.
- `clock.scale` scales playback. Reduced motion collapses durations.
- `Presence` already waits on `finished` for exits.

## Reduced motion is global and automatic

- `motion.css` collapses every `--duration-*` to `1ms` under `prefers-reduced-motion: reduce`.
- `UIMotion` reads the same properties, so CSS and JS shrink together.
- A per-component reduced-motion query may only disable or zero motion (`transition: none`, `animation: none`, a dropped stagger). Never introduce alternative motion in one.
- Never branch on `matchMedia` in a component.
- `UIMotion.reduced` is only for when fast is still wrong.
- Under it: skip FLIP entirely, `t.settle` becomes `{ duration: 0 }`, simulations snap.

## Layout animation

- `<Motion layout>` FLIPs from the previous box on every render. That box is read as the render begins, so a box an effect moved after the last commit (an overlay placing itself) starts the next FLIP where it truly is.
- `<Motion layoutId="x">` FLIPs from wherever any element last held the id.
- Tune with `layoutTransition`: `size` is `'scale'`, `'morph'` or `'none'`, plus a `timing`.
- `'scale'` is cheap but distorts borders and radii.
- `'morph'` animates real `width` / `height`. Use it with a visible border or radius.
- Below components: `flip(el, from, options)` and `measure(el)`.

## Focus and the first frame

- Focus directly in an effect. Never defer it.
- By effect time the element is in the document with layout.
- An in-flight entrance does not make an element unfocusable.
- A timeout that makes focus "work" means the bug is elsewhere.

## Named presets and space tokens

- `src/motion/presets.ts`: `popIn(scale, timing)`, `popOut(scale, timing)`, `slideIn(x, timing)`.
- Presets take numbers. Feed them from tokens, never literals.
- `UIMotion.scale`: `panel` 0.98, `floating` 0.96, `chip` 0.9.
- Pick the scale token by surface size, not taste.
- `UIMotion.dist`: `sm` 8px, `md` 16px, `lg` 24px.
- Pick the distance token by how far the thing conceptually came.

## Canonical recipes

- Use these. Never invent a variant.

```tsx
// floating surface — popover, menu, tooltip
animate={popIn(UIMotion.scale.floating, timings.open)}
exit={popOut(UIMotion.scale.floating, timings.close)}
// takeover panel — modal
animate={popIn(UIMotion.scale.panel, timings.open)}
exit={popOut(UIMotion.scale.panel, timings.close)}
// dialog also rises: y: [UIMotion.dist.sm, 0] on enter, y: [UIMotion.dist.sm] on exit
// chip inside a group — tag
animate={popIn(UIMotion.scale.chip, step.open)}
exit={popOut(UIMotion.scale.chip, step.close)}
// edge sheet — slides its own size in, then releases the property
animate={{ [axis]: ['100%', 0], timing: { ...timings.open, release: true } }}
exit={{ [axis]: ['100%'], timing: timings.close }}
// paged content swapping in a direction — calendar month, pagination range
animate(el, slideIn(dir * UIMotion.dist.md, UIMotion.t.enter));
```
