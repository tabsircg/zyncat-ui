# Theme - @zyncat/ui/theme

Group: dev

Typed theming - defineTheme is the shape of a theme, not a list of every token; ZyncatTheme renders the set as unlayered CSS with no build step.

The type is the shape of a theme, not a list of every token. Four categories: `color` holds the five
hue decisions (`accent`, `neutral`, `success`, `warning`, `danger`) and the neutral roles a polarity
sets, grouped as `bg`, `text` and `border`; `type.font` holds the `body` and `code` faces; `shape`
holds `radius`; `motion` holds `duration`, `ease`, `distance` and `scale`. The path is the CSS name -
`color.bg.app` is `--bg-app` - and everything derives from the decisions, so a retheme is usually one
or two keys. `components` holds each expressive or compound component's public knobs, grouped the
same way (`components.typingLines.caret.ink` is `--typing-lines-caret-ink`). Every other token goes
under `custom` by its CSS name; every name completes with its default and its dark value on hover, a
typo is a type error, and values take any CSS. `themes` is the set, keyed by palette: `default` lands
on `:root` and every other key becomes `[data-theme='<key>']`, layering over it. Polarity is the
separate `data-polarity` attribute on `<html>` or any subtree root - no re-render, and duration
overrides re-collapse under prefers-reduced-motion. A palette block needs both attributes on the same
element; `data-polarity` alone flips the shipped tokens. `dark` is a delta over `light` and the rest
carries over, so polarity-free decisions are written once. This is the route for a theme that is
data; the default is the `zyncat.theme.css` file `init` writes, and a project keeps one writer per
decision. Each component's `style` prop types its own knobs and no other component's.

```tsx
import { defineTheme, ZyncatTheme } from '@zyncat/ui/theme';

const light = defineTheme({
  color: { accent: 'oklch(0.58 0.19 292)' },
  shape: { radius: '0.75rem' },
  components: { odometer: { accent: 'var(--warning)' } },
});
const dark = defineTheme({ color: { accent: 'oklch(0.72 0.14 292)' }, custom: { '--shadow-strength': 2.5 } });

export function AppRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ZyncatTheme themes={{ default: { light, dark } }} />
      {children}
    </>
  );
}
```
