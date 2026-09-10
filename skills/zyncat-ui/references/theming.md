# Theming @zyncat/ui - the four override levels

Load your own stylesheet after `@zyncat/ui/styles.css`, then reach for the LOWEST level that does
the job. Never fork the source. The `get_tokens` MCP tool prints the whole vocabulary with real
values.

## Level 0 - your plain CSS already wins

Every shipped rule lives inside `@layer zyncat.tokens` or `@layer zyncat.components`, and unlayered
CSS beats every layer however specific the layered rule is. `.zc-btn { border-radius: 0 }` in your
sheet lands: no `!important`, no specificity ladder, no parent selector. Even `:where(.zc-btn)` at
specificity (0,0,0) wins. Every class is BEM off a short base behind the `zc-` namespace, so nothing
in your sheet collides with one - `.zc-btn`, `.zc-btn--primary`,
`.zc-btn__label`; `.zc-fld`, `.zc-fld__input`; `.zc-dialog__body`.

## Level 1 - retheme the whole system

Eight values are decisions and everything else derives from them: `--accent`, `--success`,
`--warning`, `--danger`, `--neutral` (the gray ramp's hue, the accent by default, read on `:root` only), `--radius`,
`--font-body`, `--font-code`. `zyncat-ui init` writes them at their defaults into `zyncat.theme.css`
beside the app entry, imported right after `@zyncat/ui/styles.css`; a retheme is editing a value
there. VS Code's built-in CSS completion only sees variables declared in the file being edited; a
workspace-indexing extension such as CSS Variable Autocomplete picks this file up. Setting
`--accent` moves `--accent-hover/-active/-lift/-subtle/-border/-disabled/-wash`, `--text-accent`,
`--ring-accent`, `--focus-ring` and `--info`; `--success`, `--warning` and `--danger` each carry their
own `-subtle`, `-text` and `-wash`; the `--radius-*` steps are fixed ratios of `--radius`, so
`--radius: 0` squares every corner (`--radius-full` is a shape and stays put); the `--type-*` bundles
follow the faces. Set a derived token only to break it away from its decision.

Palette and polarity are two attributes. `data-theme='<name>'` picks the palette, `data-polarity='light|dark'`
picks the side, and they are independent - a palette carries both sides.

Dark ships in the package. `data-polarity="dark"` on `<html>` turns the page - the base layer paints
`body` in `--bg-app`, `--text-body` and `--type-body`, so there is no wrapper to add - and on any
element it turns that subtree, where `data-polarity="light"` makes a light island. The dark polarity
sets the neutral roles (`--bg-*`, `--text-*`, `--border-*`), the shadow ink, `--shadow-strength` (how
much shadow the surfaces cast), `--sheen-strength` (how bright the white top-light highlights render)
and `--glow-strength` (how much light a hovered hue fill casts on the canvas around it), drops the
filled faces (`--accent-fill`, `--danger-fill`) a step, and re-derives the hue steps whose light
values pin a lightness near white; the decisions cascade in, so the accent a project sets is the dark
side's accent too. Extend it in the same block -
`[data-polarity='dark'] { --accent: oklch(0.72 0.14 292); --shadow-strength: 2.5; }` - and whatever is
left out keeps the shipped dark value. The derived tokens are declared on every theme root (`:root`
and any element with `data-theme` or `data-polarity`), so a subtree that repoints `--accent`
re-derives all of them; the neutral roles cascade like any property, so a theme of your own that sets
`--bg-app` and `--text-body` keeps them without restating the rest. Overlays portal to `<body>` but
carry their trigger's palette and polarity onto their own panel, so a Dropdown, Select, Popover,
Tooltip, Dialog, Modal or Sheet opened from inside a themed island paints as the island does.
Components read the tokens live, and the WAAPI engine reads them off the element it is animating -
overlays off their trigger - so a subtree theme retimes motion as well as colour, and a page with no
subtree theme reads `<body>` as before. The read refreshes whenever `data-theme` or `data-polarity`
changes anywhere, `prefers-reduced-motion` flips or `ZyncatTheme` renders. Reduced motion is handled
here - every `--duration-*` collapses to 1ms under `prefers-reduced-motion` - so derive your own
delays from a duration token, and repoint durations on `:root` for the collapse to reach the whole
page.

`@zyncat/ui/theme` is the same level with a type on it, for a theme that is data - several named
themes, or values computed at build time. `defineTheme` takes one object shaped like a theme: four
categories - `color` (the five hues, then `bg`, `text` and `border`), `type.font` (`body`, `code`),
`shape.radius`, `motion` (`duration`, `ease`, `distance`, `scale`) - then `components` for the scoped
knobs and `custom` for any other token by its CSS name - a ramp stop, a size, a spacing step, a
derived hover - or a property of your own. The path is the CSS name: `color.bg.app` is `--bg-app`,
`type.font.body` is `--font-body`, `motion.duration.base` is `--duration-base`. Values are any CSS
including `var()` references, every level completes with its default on hover, and a typo is a
compile error. `ZyncatTheme` renders the set once at the app root; it is a plain component with no
hooks, so it server-renders and needs no build configuration. Keep one writer per decision: a project
on `defineTheme` drops those lines from `zyncat.theme.css`.

```tsx
import { defineTheme, ZyncatTheme } from '@zyncat/ui/theme';

const light = defineTheme({
  color: { accent: 'oklch(0.58 0.19 292)' },
  shape: { radius: '0.75rem' },
  components: { odometer: { accent: 'var(--warning)' } },
});
const dark = defineTheme({ color: { accent: 'oklch(0.72 0.14 292)' }, custom: { '--shadow-strength': 2.5 } });

<ZyncatTheme themes={{ default: { light, dark } }} />;
```

Every key is a palette carrying a `light` and a `dark` side, and `dark` is a delta - what `light`
sets and `dark` leaves out carries over. `default` lands on `:root`; every other key becomes
`[data-theme='<key>']`, so both extend the shipped polarities rather than starting them. Durations
you repoint keep their reduced-motion collapse automatically.

The vocabulary a page reads is the roles, never the plumbing:
`--bg-app/-surface/-surface-raised/-subtle/-muted/-inset/-overlay`,
`--text-strong/-body/-secondary/-muted/-subtle/-disabled/-accent/-on-accent/-inverse`,
`--border-subtle/-default/-strong`, the four status hues and `--info` with `-subtle` and `-text`, the
`--type-*` bundles (one `font:` shorthand per role), `--space-px` and `--space-1..10` (a 4px grid),
`--radius-sm..2xl/-full`, `--shadow-xs..xl`, `--focus-ring`, `--duration-*`, `--ease-*`,
`--transition-control/-colors/-opacity`. `get_tokens` prints all of it with real values.

`--focus-ring` and `--ring-accent/-danger/-warning/-success` are `outline` values, so they go on
`outline`, not `box-shadow`: `outline: var(--focus-ring)`. `--ring-color-*` is the hue alone,
`--ring-width` the reach past the border box. A ring is an outline so it never collides with a
component's elevation, and a container that clips can reserve exactly `--ring-width` for it - give
your own scrollers `scroll-padding: var(--ring-width)` and anything flush with a clipping edge
`outline-offset: var(--ring-inset)`.

## Level 2 - retune one component

Expressive and compound components publish scoped `--<component>-<name>` properties as their public
contract, each with a doc line: `--odometer-size/-accent/-gap`, `--typing-lines-caret-ink/-blink`,
`--lens-surface/-fringe-warm`, `--morphing-text-size/-smear`, `--weight-field-peak-weight/-hover-padding`,
`--flow-field-ramp-0..11`, `--confetti-paper-1..5`, `--support-rail-width/-accent/-row-pad-block`. Set
them on any ancestor or inline via `style`. The canvas simulations sample theirs at their next measure -
FlowField on resize and on a theme attribute change, Confetti on the next `fire()`.

Both reaches are typed. In a theme they are `components`, grouped like the theme:
`components.odometer.accent` is `--odometer-accent`, `components.typingLines.caret.ink` is
`--typing-lines-caret-ink`, `components.confetti.paper[3]` is `--confetti-paper-3`. On one instance
they are the component's own `style` prop, which accepts the design tokens plus that component's knobs
and nothing from another component - `<Odometer style={{ '--odometer-size': '3rem' }} />`.

Everything else a component declares - its constants, its derivations, the per-frame state it writes
to itself - is a private `--_<component>-*` property: not a contract, and absent from the types, so
setting one is a compile error.

System primitives and composites publish none by design - retheme those at level 1.

## Level 3 - restyle one instance

Primitives and fields take `className` and `style` directly; on a field they land on the wrapper,
and `htmlProps` reaches the native `<input>`. Overlays (Dialog, Modal, Sheet, Popover, Tooltip,
Dropdown) have no `className` prop - pass `htmlProps={{ className }}` and it lands on the panel
itself. Importing `@zyncat/ui/theme` anywhere in the app types every design token in `style`, so
`style={{ '--accent': 'red' }}` completes and checks like any other property.

## Replicas answer to none of this, on purpose

FacebookFeed, InstagramFeed, TikTok and YouTube pin platform metrics as constants; only
`--font-body`, `--focus-ring` and the duration tokens reach them, and there are no scoped
properties to set. Fidelity is the contract. If you want a card that follows your theme, build one
from primitives instead.

## With Tailwind v4 - the vocabulary as utilities

`@zyncat/ui/tailwind.css` is the token vocabulary as Tailwind v4 utilities, generated from the token
CSS, and Tailwind IntelliSense completes them. It goes on the first line of the stylesheet Tailwind
compiles, above `@import 'tailwindcss'`; `init` writes it there. The base stylesheet stays on its JS
import at the app root - only the bridge goes through Tailwind.

Every role is a utility named after its token: surfaces `bg-app`, `bg-surface`, `bg-surface-raised`,
`bg-subtle`, `bg-muted`, `bg-inset`, `bg-overlay`; ink `text-strong`, `text-default` (the body ink -
`text-body` is the type role), `text-secondary`, `text-muted`, `text-subtle`, `text-disabled`,
`text-accent`, `text-on-accent`, `text-inverse`, and the legible hue inks `text-success`,
`text-warning`, `text-danger`, `text-info`; hairlines `border-subtle`, `border-default`,
`border-strong`; the hues on every colour utility with `/opacity` - `bg-accent`, `bg-accent-fill`,
`hover:bg-accent-hover`, `bg-accent-wash`, `ring-accent`, `bg-danger/10`; the type roles
`text-micro` … `text-display-lg`, `text-label`, `text-code` (size and leading - add `font-code` for
the face), with `font-body`, `leading-<role>`, `tracking-caps`, `tracking-display`; `rounded-sm` …
`rounded-2xl`, `shadow-xs` … `shadow-xl`, `shadow-glow-<hue>`, `outline-ring-<hue>` (and every other
colour utility on `ring-<hue>`);
`duration-fast` … `duration-slowest`, `ease-standard`, `ease-entrance`, `ease-exit`, `ease-spring`,
`ease-glide`; `max-w-prose`, `max-w-floating`. Each utility reads the token itself, so a themed
subtree and the dark polarity reach it, and `dark:` follows `data-polarity` rather than the OS. The names
Tailwind also ships - `rounded-md`, `shadow-md`, `tracking-tight` - read the zyncat token of the same
name, so `--radius` in the theme file moves utilities and components together. Spacing stays
Tailwind's own scale; both sit on the 4px grid. Reach for a role utility before an arbitrary value:
`bg-surface`, not `bg-[var(--bg-surface)]`.
