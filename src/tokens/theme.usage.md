# Theme - @zyncat/ui/theme

Group: dev

Typed theming and the theme state: defineTheme shapes a theme, ZyncatTheme emits the CSS and the pre-paint boot script, useTheme reads and sets the choice.

`themes` is keyed by palette: `default` lands on `:root` and every other key becomes a
`[data-theme='<key>']` block over it; each palette carries a `light` and a `dark` side, and `dark` is a
delta over `light`. A palette also carries `name`, how a picker shows it, defaulting to its key
title-cased. The type is the shape of a theme, not a list of every token: `color` holds the five
hue decisions and the neutral roles (`bg`, `text`, `border`), `type.font` the faces, `shape` the radius,
`motion` the bands, `components` each expressive component's knobs, and any other token goes under
`custom` by its CSS name. The path is the CSS name, every key completes with its default, a typo is a
type error. Mount `ZyncatTheme` first in `<body>`: it renders the `<style>` and an inline script that
writes the stored choice onto `<html>` as `data-theme` and `data-polarity` before first paint, resolving
`system` through the OS, so there is no flash and no provider. `defaultTheme`, `defaultPolarity` and
`storageKey` set what a first visit gets; add `suppressHydrationWarning` to `<html>` under SSR. A
second `ZyncatTheme` scoped to a subtree takes `boot={false}`. `useTheme()` returns `theme`, `polarity`
(`light`, `dark` or `system`), `resolvedPolarity`, the declared `themes` and their `themeNames`,
`setTheme` and `setPolarity`;
it follows the OS under `system` and hears other tabs. `ThemeSwitcher` is the shipped control on top of it.

```tsx
import { defineTheme, useTheme, ZyncatTheme } from '@zyncat/ui/theme';

const light = defineTheme({ color: { accent: 'oklch(0.58 0.19 292)' }, shape: { radius: '0.75rem' } });
const dark = defineTheme({ color: { accent: 'oklch(0.72 0.14 292)' }, custom: { '--shadow-strength': 2.5 } });
const ocean = { name: 'Ocean', light: defineTheme({ color: { accent: 'oklch(0.6 0.12 230)' } }), dark: {} };

export function AppRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ZyncatTheme themes={{ default: { light, dark }, ocean }} defaultPolarity="system" />
      {children}
    </>
  );
}

function PolarityMenu() {
  const { polarity, resolvedPolarity, setPolarity } = useTheme();
  return <button onClick={() => setPolarity(resolvedPolarity === 'dark' ? 'light' : 'dark')}>{polarity}</button>;
}
```
