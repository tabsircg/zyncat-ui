# MotionDevtools - @zyncat/ui/motion-devtools

Group: dev

Dev-only floating panel that slows or freezes EVERY animation at once (CSS and WAAPI) for motion debugging.

Mount once at the app root behind a dev check: no provider, no wrapper, and no effect on any other
component. `placement` top-left|top-right|bottom-left|bottom-right, `offset`, `presets`, `maxFactor`,
`defaultFactor`, `defaultOpen`, `scaleTimers`, `hotkeys`, `draggable`, `persist`, `className` (extra
class on the panel root, e.g. a host token scope). While `hotkeys` is on, Alt chords reach it from
anywhere on the page: Alt P freezes or resumes, Alt , and Alt . step down and up the `presets` ladder,
Alt 0 returns to real time, Alt M shows or hides the panel. They match the physical key, so a layout
where Option+P types another character still fires them, they want Alt alone, and they stay quiet
while you are typing in a field. The open panel lists them under Shortcuts at its foot, closed until
you ask for it, with the note on what timer scaling buys you. With `draggable` on the header is a drag
handle: the panel goes anywhere in the viewport and snaps to nothing, held inside the edges as you
drag, as the window resizes, and as it widens on open. `persist` remembers where you dropped it
alongside the chosen factor. `motionSlowmo` is exported too, to drive the same state from the console.

```tsx
{
  import.meta.env.DEV && <MotionDevtools placement="bottom-right" />;
}
```
