# ThemeSwitcher - @zyncat/ui/theme-switcher

Group: overlays
Docs: https://ui.zyncat.app/theme-switcher

The theme control: a chip painted in the live palette opens a grid of miniatures, one card per palette and side plus a split System card, each drawn from that theme's real tokens.

Needs no props: mount `ZyncatTheme` once for the palettes and the flash-free boot, and the grid lists
every palette it declared, `default` first. A click applies the theme live and leaves the panel open to
compare; Escape, Enter, Tab or an outside press closes it and focus returns to the chip. Arrow keys
move through the grid as a radio group and select as they go - left and right change the side, up and
down the palette. Each palette shows its own `name`; `labels` overrides that per key, for names that
come from a translation. `label` is the accessible name, `side` and `align` place the panel,
`animation` retimes it. The chip is the miniature under the
page's current tokens, so it is right before hydration and after a change made elsewhere. For the grid
on its own surface - a settings page, a `Sheet` - reach for `@zyncat/ui/theme-grid`, which is the panel
body without the popover.

```tsx
<ThemeSwitcher align="end" />
```
