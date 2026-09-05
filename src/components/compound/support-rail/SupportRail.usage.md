# SupportRail - @zyncat/ui/support-rail

Group: compound
Docs: https://ui.zyncat.app/support-rail

An edge tab that grows a support panel out of its own measured box.

Pick it over Sheet when the affordance must stay visible and the panel must not take the screen
over. actions renders the rows; selecting one fires onSelect and leaves the rail open, so render
what happens next in children. title names the panel and the tab, status is the mono line under it,
footer pins a bottom strip. trigger is what sits inside the tab - an icon, a word, an avatar; the
rail keeps the tab's edge, ARIA and fold, and falls back to a chat glyph. side right|left flips the
tab, the collapse origin and the panel's border. Escape, the close button and a press outside all
dismiss. The rows and children share one scroll region between the pinned header and footer. Row
padding is --support-rail-row-pad-block/-inline, not a density prop.

```tsx
<SupportRail actions={actions} status="Open - closes 20:00" onSelect={route} />
```
