/**
 * The motion tokens as numbers, for the readers that need a value before a stylesheet answers:
 * durations in milliseconds, distances in pixels at a 16px root, easings as cubic-bezier points.
 *
 * Generated from the token and component CSS by `scripts/gen-theme.mjs` - `pnpm sync` rebuilds it.
 */
export const motionDefaults = {
  duration: { fast: 140, base: 200, slow: 300, slower: 450, slowest: 900, spin: 1000, pulse: 1600 } satisfies Record<
    string,
    number
  >,
  ease: {
    standard: [0.2, 0, 0, 1],
    entrance: [0.25, 1, 0.4, 1],
    exit: [0.4, 0, 1, 1],
    spring: [0.34, 1.4, 0.5, 1],
    glide: [0.32, 0.55, 0, 1],
  } satisfies Record<string, [number, number, number, number]>,
  distance: { sm: 8, md: 16, lg: 24 } satisfies Record<string, number>,
  scale: { panel: 0.98, floating: 0.96, chip: 0.9 } satisfies Record<string, number>,
};
