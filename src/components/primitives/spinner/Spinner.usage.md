# Spinner - @zyncat/ui/spinner

Group: primitives
Docs: https://ui.zyncat.app/spinner

Indeterminate loader; three looks, no JavaScript, no layout of its own.

Sizing is type-relative: the default `size="inherit"` draws at 1em, so a spinner beside a label
matches it without being told to, and `style={{ fontSize }}` sets any other diameter. thickness
scales with the diameter, so a large spinner is not a hairline. It announces itself as
`role="status"` labelled "Loading" by default; pass `label={null}` where something nearby already
announces the wait, as Button does through `aria-busy`. delay holds it invisible for a beat, so work
that finishes quickly never flashes a spinner.

```tsx
<Spinner />
<Spinner variant="dots" size="lg" thickness="bold" />
<Spinner label={null} delay />
```
