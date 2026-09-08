import type { CSSProperties } from 'react';

/**
 * Inline styles for Confetti, including its `--confetti-*` knobs.
 *
 * One interface per component that publishes scoped properties: the design tokens plus
 * that component's own knobs, and nothing from any other component.
 *
 * Generated from the token and component CSS by `scripts/gen-theme.mjs` - `pnpm sync` rebuilds it.
 */
export interface ConfettiStyle extends CSSProperties {
  /** `--confetti-paper-1` - The five papers a burst draws from; a slot set to a role follows the theme. Default: `oklch(0.53 0.2 288)`. */
  '--confetti-paper-1'?: string | number;
  /** `--confetti-paper-2` - The five papers a burst draws from; a slot set to a role follows the theme. Default: `var(--accent)`. */
  '--confetti-paper-2'?: string | number;
  /** `--confetti-paper-3` - The five papers a burst draws from; a slot set to a role follows the theme. Default: `oklch(0.78 0.115 62)`. */
  '--confetti-paper-3'?: string | number;
  /** `--confetti-paper-4` - The five papers a burst draws from; a slot set to a role follows the theme. Default: `oklch(0.67 0.18 12)`. */
  '--confetti-paper-4'?: string | number;
  /** `--confetti-paper-5` - The five papers a burst draws from; a slot set to a role follows the theme. Default: `var(--text-strong)`. */
  '--confetti-paper-5'?: string | number;
  /** `--confetti-weights` - How often each paper appears - five weights, in slot order. Default: `1 1 1 1 0.45`. */
  '--confetti-weights'?: string | number;
  /** `--confetti-ink` - What the reverse side of a piece darkens toward. Default: `var(--text-strong)`. */
  '--confetti-ink'?: string | number;
  /** `--confetti-light` - What the glossy face of a piece brightens toward. Default: `var(--bg-surface)`. */
  '--confetti-light'?: string | number;
  /** `--confetti-shade` - How far the reverse side leans toward the ink. Default: `42%`. */
  '--confetti-shade'?: string | number;
  /** `--confetti-gloss` - How far the glossy face leans toward the light. Default: `66%`. */
  '--confetti-gloss'?: string | number;
  /** `--confetti-layer` - The z-index of a viewport-field burst. Default: `var(--layer-toast)`. */
  '--confetti-layer'?: string | number;
}

/** Inline styles for FlowField, including its `--flow-field-*` knobs. */
export interface FlowFieldStyle extends CSSProperties {
  /** `--flow-field-ink` - The particle colour at rest - the ramp's cold end. Default: `var(--text-subtle)`. */
  '--flow-field-ink'?: string | number;
  /** `--flow-field-accent` - The particle colour at full speed - the ramp's hot end. Default: `var(--accent)`. */
  '--flow-field-accent'?: string | number;
  /** `--flow-field-min-height` - The field's minimum height before content sizes it. Default: `var(--space-10)`. */
  '--flow-field-min-height'?: string | number;
  /** `--flow-field-ramp-0` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `var(--flow-field-ink)`. */
  '--flow-field-ramp-0'?: string | number;
  /** `--flow-field-ramp-1` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 9%, var(--flow-field-ink))`. */
  '--flow-field-ramp-1'?: string | number;
  /** `--flow-field-ramp-2` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 18%, var(--flow-field-ink))`. */
  '--flow-field-ramp-2'?: string | number;
  /** `--flow-field-ramp-3` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 27%, var(--flow-field-ink))`. */
  '--flow-field-ramp-3'?: string | number;
  /** `--flow-field-ramp-4` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 36%, var(--flow-field-ink))`. */
  '--flow-field-ramp-4'?: string | number;
  /** `--flow-field-ramp-5` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 45%, var(--flow-field-ink))`. */
  '--flow-field-ramp-5'?: string | number;
  /** `--flow-field-ramp-6` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 55%, var(--flow-field-ink))`. */
  '--flow-field-ramp-6'?: string | number;
  /** `--flow-field-ramp-7` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 64%, var(--flow-field-ink))`. */
  '--flow-field-ramp-7'?: string | number;
  /** `--flow-field-ramp-8` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 73%, var(--flow-field-ink))`. */
  '--flow-field-ramp-8'?: string | number;
  /** `--flow-field-ramp-9` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 82%, var(--flow-field-ink))`. */
  '--flow-field-ramp-9'?: string | number;
  /** `--flow-field-ramp-10` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `color-mix(in oklab, var(--flow-field-accent) 91%, var(--flow-field-ink))`. */
  '--flow-field-ramp-10'?: string | number;
  /** `--flow-field-ramp-11` - The twelve stops from ink to accent, sampled at the next measure; set all twelve for a ramp of your own. Default: `var(--flow-field-accent)`. */
  '--flow-field-ramp-11'?: string | number;
}

/** Inline styles for Lens, including its `--lens-*` knobs. */
export interface LensStyle extends CSSProperties {
  /** `--lens-ink` - The ink of the glass's edge, vignette and shadow. Default: `var(--text-strong)`. */
  '--lens-ink'?: string | number;
  /** `--lens-surface` - The surface behind the glass. Default: `var(--bg-surface)`. */
  '--lens-surface'?: string | number;
  /** `--lens-fringe-warm` - The chromatic fringe on the warm edge of the glass. Default: `oklch(0.72 0.16 12 / 0.3)`. */
  '--lens-fringe-warm'?: string | number;
  /** `--lens-fringe-cool` - The chromatic fringe on the cool edge of the glass. Default: `oklch(0.7 0.15 265 / 0.34)`. */
  '--lens-fringe-cool'?: string | number;
}

/** Inline styles for MorphingText, including its `--morphing-text-*` knobs. */
export interface MorphingTextStyle extends CSSProperties {
  /** `--morphing-text-ink` - Letter ink. Default: `var(--text-strong)`. */
  '--morphing-text-ink'?: string | number;
  /** `--morphing-text-size` - Letter size. Default: `var(--size-display-lg)`. */
  '--morphing-text-size'?: string | number;
  /** `--morphing-text-weight` - Letter weight. Default: `var(--weight-medium)`. */
  '--morphing-text-weight'?: string | number;
  /** `--morphing-text-leading` - Line height, unitless. Default: `1.2`. */
  '--morphing-text-leading'?: string | number;
  /** `--morphing-text-tracking` - Letter spacing. Default: `var(--tracking-display)`. */
  '--morphing-text-tracking'?: string | number;
  /** `--morphing-text-smear` - How much letters blur on the way between words; 0 cuts clean. Default: `1`. */
  '--morphing-text-smear'?: string | number;
  /** `--morphing-text-rule-ink` - The rule at rest. Default: `var(--text-strong)`. */
  '--morphing-text-rule-ink'?: string | number;
  /** `--morphing-text-rule-accent` - The rule while a morph heats it. Default: `var(--accent)`. */
  '--morphing-text-rule-accent'?: string | number;
  /** `--morphing-text-rule-height` - The rule's thickness. Default: `1px`. */
  '--morphing-text-rule-height'?: string | number;
  /** `--morphing-text-rule-gap` - Space between the word and the rule. Default: `var(--space-3)`. */
  '--morphing-text-rule-gap'?: string | number;
}

/** Inline styles for Odometer, including its `--odometer-*` knobs. */
export interface OdometerStyle extends CSSProperties {
  /** `--odometer-gap` - Space between digit columns. Default: `0.02em`. */
  '--odometer-gap'?: string | number;
  /** `--odometer-ink` - Digit ink. Default: `var(--text-strong)`. */
  '--odometer-ink'?: string | number;
  /** `--odometer-accent` - The tint digits take while they roll fast. Default: `var(--accent)`. */
  '--odometer-accent'?: string | number;
  /** `--odometer-separator-ink` - The thousands separator. Default: `var(--text-muted)`. */
  '--odometer-separator-ink'?: string | number;
  /** `--odometer-size` - Digit size. Default: `var(--size-display)`. */
  '--odometer-size'?: string | number;
  /** `--odometer-weight` - Digit weight. Default: `var(--weight-medium)`. */
  '--odometer-weight'?: string | number;
}

/** Inline styles for ThemeTransition, including its `--theme-transition-*` knobs. */
export interface ThemeTransitionStyle extends CSSProperties {
  /** `--theme-transition-layer` - The z-index the arriving page paints at; it has to clear every panel it covers. Default: `var(--layer-tooltip)`. */
  '--theme-transition-layer'?: string | number;
}

/** Inline styles for TypingLines, including its `--typing-lines-*` knobs. */
export interface TypingLinesStyle extends CSSProperties {
  /** `--typing-lines-ink` - Letter ink. Default: `var(--text-strong)`. */
  '--typing-lines-ink'?: string | number;
  /** `--typing-lines-caret-ink` - The caret. Default: `var(--accent)`. */
  '--typing-lines-caret-ink'?: string | number;
  /** `--typing-lines-size` - Letter size. Default: `var(--size-title)`. */
  '--typing-lines-size'?: string | number;
  /** `--typing-lines-weight` - Letter weight. Default: `var(--weight-regular)`. */
  '--typing-lines-weight'?: string | number;
  /** `--typing-lines-leading` - Line height, unitless. Default: `1.4`. */
  '--typing-lines-leading'?: string | number;
  /** `--typing-lines-blink` - The caret's blink period. Default: `1080ms`. */
  '--typing-lines-blink'?: string | number;
  /** `--typing-lines-caret-gap` - Space between the last glyph and the caret. Default: `0.12em`. */
  '--typing-lines-caret-gap'?: string | number;
}

/** Inline styles for WeightField, including its `--weight-field-*` knobs. */
export interface WeightFieldStyle extends CSSProperties {
  /** `--weight-field-ink` - Letter ink. Default: `var(--text-strong)`. */
  '--weight-field-ink'?: string | number;
  /** `--weight-field-size` - Letter size. Default: `6rem`. */
  '--weight-field-size'?: string | number;
  /** `--weight-field-leading` - Line height, unitless. Default: `1`. */
  '--weight-field-leading'?: string | number;
  /** `--weight-field-align` - Where the units sit on the line - center, start or end. Default: `center`. */
  '--weight-field-align'?: string | number;
  /** `--weight-field-pad` - Padding around the field. Default: `var(--space-6) var(--space-4)`. */
  '--weight-field-pad'?: string | number;
  /** `--weight-field-tracking` - Letter spacing. Default: `-0.05em`. */
  '--weight-field-tracking'?: string | number;
  /** `--weight-field-rest-weight` - A unit's weight at rest. Default: `300`. */
  '--weight-field-rest-weight'?: string | number;
  /** `--weight-field-far-weight` - The weight two units from the pointer. Default: `400`. */
  '--weight-field-far-weight'?: string | number;
  /** `--weight-field-near-weight` - The weight next to the pointer. Default: `600`. */
  '--weight-field-near-weight'?: string | number;
  /** `--weight-field-peak-weight` - The weight under the pointer. Default: `900`. */
  '--weight-field-peak-weight'?: string | number;
  /** `--weight-field-hover-padding` - How much a unit widens under the pointer. Default: `calc(1em / 12)`. */
  '--weight-field-hover-padding'?: string | number;
  /** `--weight-field-stroke` - The text stroke every unit carries; the peak letter doubles it. Default: `calc(1em * 125 / 6000)`. */
  '--weight-field-stroke'?: string | number;
  /** `--weight-field-duration` - How long a unit takes to settle at a new weight. Default: `400ms`. */
  '--weight-field-duration'?: string | number;
  /** `--weight-field-ease` - The settle curve. Default: `ease`. */
  '--weight-field-ease'?: string | number;
}

/** Inline styles for SupportRail, including its `--support-rail-*` knobs. */
export interface SupportRailStyle extends CSSProperties {
  /** `--support-rail-width` - Panel width; the rail never exceeds its container. Default: `318px`. */
  '--support-rail-width'?: string | number;
  /** `--support-rail-row-pad-block` - Row padding on the block axis - the density knob. Default: `var(--space-3)`. */
  '--support-rail-row-pad-block'?: string | number;
  /** `--support-rail-row-pad-inline` - Row padding on the inline axis - the density knob. Default: `var(--space-4)`. */
  '--support-rail-row-pad-inline'?: string | number;
  /** `--support-rail-surface` - The one surface: the tab, and the panel it morphs into. Default: `var(--bg-subtle)`. */
  '--support-rail-surface'?: string | number;
  /** `--support-rail-surface-raised` - The tab while hovered. Default: `var(--bg-surface)`. */
  '--support-rail-surface-raised'?: string | number;
  /** `--support-rail-line` - The surface's edge. Default: `var(--border-default)`. */
  '--support-rail-line'?: string | number;
  /** `--support-rail-line-soft` - Row dividers. Default: `var(--border-subtle)`. */
  '--support-rail-line-soft'?: string | number;
  /** `--support-rail-radius` - The tab's outer corners. Default: `var(--radius-2xl)`. */
  '--support-rail-radius'?: string | number;
}
