# ThemeGrid - @zyncat/ui/theme-grid

Group: overlays
Docs: https://ui.zyncat.app/theme-switcher

The theme picker without a surface: a radio grid of miniatures, one card per palette and side plus a split System card, each drawn from that theme's real tokens.

This is what `ThemeSwitcher` puts in its popover, exported on its own so it can sit in a settings page,
a `Sheet`, a `Dialog` or a preferences panel. It imports no overlay, paints no background, and needs no
props: mount `ZyncatTheme` once and the grid lists every palette it declared, `default` first. A click
applies the theme live. Arrow keys move as a radio group and select as they go - left and right change
the side, up and down the palette. Each palette shows its own `name`; `labels` overrides that per key,
for names that come from a translation. `label` is the accessible name of the group, and `autoFocus`
puts focus on the selected card at mount, for a grid
that opens inside an overlay; leave it off inline. `onDismiss` fires on Enter or Tab, for the surface
around it to close - without it both keys stay inert.

```tsx
<ThemeGrid />
```
