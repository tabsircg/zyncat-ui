'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

import { Badge } from '@zyncat/ui/badge';
import { Button } from '@zyncat/ui/button';
import { Odometer } from '@zyncat/ui/odometer';
import { StatusBadge } from '@zyncat/ui/status-badge';
import { Table, type TableColumn } from '@zyncat/ui/table';
import { TextField } from '@zyncat/ui/text-field';
import { defineTheme, ZyncatTheme } from '@zyncat/ui/theme';

import { Callout, CodeBlock, FeatureCard, FeatureGrid, TabGroup } from '../kit';
import { KnobRange, KnobSegment, Playground } from '../playground';

function Code({ children }: { children: string }) {
  return <code className="doc-inline-code">{children}</code>;
}

interface OverrideLevelRow {
  level: string;
  mechanism: ReactNode;
  reaches: string;
  when: string;
}

const OVERRIDE_LEVEL_COLUMNS: TableColumn<OverrideLevelRow>[] = [
  { key: 'level', label: 'Level', mono: true, strong: true },
  { key: 'mechanism', label: 'Mechanism', render: (r) => r.mechanism },
  { key: 'reaches', label: 'Reaches' },
  { key: 'when', label: 'Use it for', grow: true },
];

const OVERRIDE_LEVEL_ROWS: OverrideLevelRow[] = [
  { level: '0', mechanism: 'Your own CSS', reaches: 'Every instance', when: 'A rule the tokens have no name for.' },
  {
    level: '1',
    mechanism: (
      <>
        <Code>zyncat.theme.css</Code> or <Code>defineTheme</Code>
      </>
    ),
    reaches: 'The whole system',
    when: 'A rebrand, dark mode, retiming motion.',
  },
  {
    level: '2',
    mechanism: (
      <>
        <Code>--component-*</Code> properties
      </>
    ),
    reaches: 'One component',
    when: 'Retuning an expressive component.',
  },
  {
    level: '3',
    mechanism: (
      <>
        <Code>className</Code>, <Code>style</Code>, <Code>htmlProps</Code>
      </>
    ),
    reaches: 'One instance',
    when: 'This one, in this one place.',
  },
];

interface DecisionRow {
  token: string;
  moves: string;
}

const DECISION_COLUMNS: TableColumn<DecisionRow>[] = [
  { key: 'token', label: 'Decision', mono: true, strong: true },
  { key: 'moves', label: 'What follows it', grow: true },
];

const DECISION_ROWS: DecisionRow[] = [
  { token: '--accent', moves: 'Hover, active, wash, border, the focus ring, info.' },
  { token: '--success', moves: 'Its subtle, text and wash.' },
  { token: '--warning', moves: 'Its subtle, text and wash.' },
  { token: '--danger', moves: 'The danger button, its ring, subtle, text and wash.' },
  { token: '--neutral', moves: 'The gray ramp. The accent by default, so chrome shares its temperature.' },
  { token: '--radius', moves: 'Every corner step. 0 squares everything.' },
  { token: '--font-body', moves: 'Every type role.' },
  { token: '--font-code', moves: 'The code role.' },
];

interface VocabularyRow {
  family: string;
  tokens: string;
  pick: string;
}

const VOCABULARY_COLUMNS: TableColumn<VocabularyRow>[] = [
  { key: 'family', label: 'Family', strong: true },
  { key: 'tokens', label: 'Tokens', render: (r) => <Code>{r.tokens}</Code> },
  { key: 'pick', label: 'Pick it for', grow: true },
];

const VOCABULARY_ROWS: VocabularyRow[] = [
  {
    family: 'Surfaces',
    tokens: '--bg-app, --bg-surface, --bg-surface-raised, --bg-subtle, --bg-muted, --bg-inset, --bg-overlay',
    pick: 'The page, a card, a raised panel, a quiet fill, a recessed well, the scrim behind an overlay.',
  },
  {
    family: 'Ink',
    tokens:
      '--text-strong, --text-body, --text-secondary, --text-muted, --text-subtle, --text-disabled, --text-accent, --text-on-accent, --text-inverse',
    pick: 'Headings, body copy, supporting copy, hints, placeholders, a link, text on an accent fill.',
  },
  {
    family: 'Borders',
    tokens: '--border-subtle, --border-default, --border-strong',
    pick: 'A divider, a control edge, an emphasised edge.',
  },
  {
    family: 'Status',
    tokens: '--accent, --success, --warning, --danger, --info, each with -subtle and -text',
    pick: 'A status fill, its quiet background, its readable text. Status hues mark genuine status only.',
  },
  {
    family: 'Type',
    tokens: '--type-display-lg … --type-micro, --type-code, --font-body, --font-code',
    pick: 'One font shorthand per role, size and leading matched. Eleven of them.',
  },
  {
    family: 'Space',
    tokens: '--space-px, --space-1 … --space-10',
    pick: 'Padding and gaps on the 4px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.',
  },
  {
    family: 'Radius',
    tokens: '--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-2xl, --radius-full',
    pick: 'Controls take md, cards lg, sheets xl, pills full. Every step is a ratio of --radius.',
  },
  {
    family: 'Elevation',
    tokens: '--shadow-xs … --shadow-xl, --focus-ring, --shadow-strength, --sheen-strength, --glow-strength',
    pick: 'Lift, the one focus treatment every control shares, and the three numbers a theme scales the lighting with.',
  },
  {
    family: 'Motion',
    tokens:
      '--duration-fast … --duration-slowest, --ease-standard, --ease-entrance, --ease-exit, --ease-spring, --ease-glide, --transition-control, --transition-colors, --transition-opacity',
    pick: 'Your own transitions on the system’s bands. Reduced motion collapses them for you.',
  },
];

interface TailwindRow {
  family: string;
  utilities: string;
  tokens: string;
}

const TAILWIND_COLUMNS: TableColumn<TailwindRow>[] = [
  { key: 'family', label: 'Family', strong: true },
  { key: 'utilities', label: 'Utilities', render: (r) => <Code>{r.utilities}</Code>, grow: true },
  { key: 'tokens', label: 'Reads', render: (r) => <Code>{r.tokens}</Code> },
];

const TAILWIND_ROWS: TailwindRow[] = [
  {
    family: 'Surfaces',
    utilities: 'bg-app, bg-surface, bg-surface-raised, bg-subtle, bg-muted, bg-inset, bg-overlay',
    tokens: '--bg-*',
  },
  {
    family: 'Ink',
    utilities:
      'text-strong, text-default, text-secondary, text-muted, text-subtle, text-disabled, text-accent, text-on-accent, text-inverse; text-success, text-warning, text-danger, text-info',
    tokens: '--text-*, --<hue>-text',
  },
  { family: 'Hairlines', utilities: 'border-subtle, border-default, border-strong', tokens: '--border-*' },
  {
    family: 'Hues',
    utilities:
      'bg-accent, bg-accent-fill, hover:bg-accent-hover, bg-accent-wash, border-accent-border, ring-accent, bg-danger/10 … on every colour utility',
    tokens: '--accent*, --success*, --warning*, --danger*, --info*, --neutral-wash*',
  },
  {
    family: 'Type',
    utilities:
      'text-micro, text-caption, text-body, text-body-lg, text-label, text-heading, text-title, text-title-lg, text-display, text-display-lg, text-code + font-code; font-body, leading-<role>, tracking-caps, tracking-display',
    tokens: '--type-*, --font-*, --leading-*, --tracking-*',
  },
  {
    family: 'Corners, elevation',
    utilities: 'rounded-sm … rounded-2xl, rounded-full, shadow-xs … shadow-xl, shadow-glow-<hue>, outline-ring-<hue>',
    tokens: '--radius-*, --shadow-*, --focus-ring, --ring-*, --ring-color-*, --glow-*',
  },
  {
    family: 'Motion',
    utilities: 'duration-fast … duration-slowest, ease-standard, ease-entrance, ease-exit, ease-spring, ease-glide',
    tokens: '--duration-*, --ease-*',
  },
  { family: 'Measure', utilities: 'max-w-prose, max-w-floating', tokens: '--measure-*' },
];

interface ScopedPropertyRow {
  component: string;
  subpath: string;
  count: number;
  sample: string;
}

const SCOPED_PROPERTY_COLUMNS: TableColumn<ScopedPropertyRow>[] = [
  { key: 'component', label: 'Component', mono: true, strong: true },
  { key: 'count', label: 'Properties' },
  { key: 'sample', label: 'For example', grow: true, render: (r) => <Code>{r.sample}</Code> },
];

const SCOPED_PROPERTIES: ScopedPropertyRow[] = [
  {
    component: 'Odometer',
    subpath: 'odometer',
    count: 6,
    sample: '--odometer-size, --odometer-accent, --odometer-gap',
  },
  {
    component: 'TypingLines',
    subpath: 'typing-lines',
    count: 7,
    sample: '--typing-lines-caret-ink, --typing-lines-blink',
  },
  { component: 'Lens', subpath: 'lens', count: 4, sample: '--lens-surface, --lens-fringe-warm, --lens-fringe-cool' },
  {
    component: 'MorphingText',
    subpath: 'morphing-text',
    count: 10,
    sample: '--morphing-text-size, --morphing-text-smear',
  },
  {
    component: 'WeightField',
    subpath: 'weight-field',
    count: 14,
    sample: '--weight-field-peak-weight, --weight-field-hover-padding',
  },
  {
    component: 'FlowField',
    subpath: 'flow-field',
    count: 15,
    sample: '--flow-field-ramp-0 … -11, --flow-field-accent',
  },
  { component: 'Confetti', subpath: 'confetti', count: 11, sample: '--confetti-paper-1 … -5, --confetti-weights' },
  {
    component: 'SupportRail',
    subpath: 'support-rail',
    count: 12,
    sample: '--support-rail-width, --support-rail-accent, --support-rail-row-pad-block',
  },
];

const ROW: CSSProperties = { display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' };
const STACK: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' };

const LEVEL_0_CODE = `/* your-app.css - loaded after @zyncat/ui/styles.css */
:where(.zc-btn) {
  border-radius: 0;
  text-transform: uppercase;
}

/* specificity (0,0,0), and it still wins: every shipped rule
   sits in @layer zyncat.components, below any unlayered rule */`;

const LEVEL_1_CODE = `/* zyncat.theme.css - written by init, beside your app entry */
:root {
  --accent: oklch(0.58 0.19 292); /* hover, active, wash, ring and info follow */
  --radius: var(--radius-full); /* every corner step follows */
}`;

const REDUCED_MOTION_CODE = `/* escapes the reduced-motion collapse */
.hero {
  --duration-fast: 90ms;
}

/* covered by it */
:root {
  --duration-fast: 90ms;
}`;

const DARK_CODE = `<html lang="en" data-polarity="dark">

{/* a light island inside it */}
<section data-polarity="light">
  <Button variant="primary">Light in here</Button>
</section>`;

const DARK_EXTEND_CODE = `/* zyncat.theme.css */
[data-polarity='dark'] {
  --accent: oklch(0.72 0.14 292); /* a lighter accent for dark surfaces */
  --shadow-strength: 2.5; /* the lighting model: shadows, highlights, glow */
  --sheen-strength: 0.3;
  --glow-strength: 0.6;
}`;

const THEME_FILE_CODE = `// zyncat.theme.ts
import { defineTheme } from '@zyncat/ui/theme';

export const light = defineTheme({
  color: { accent: 'oklch(0.58 0.19 292)' },
  shape: { radius: '0.75rem' },
  type: { font: { body: "'Inter', system-ui, sans-serif" } },
  motion: { duration: { base: '180ms' } },
  components: { odometer: { accent: 'var(--warning)' }, supportRail: { width: '22rem' } },
});

// a delta over light - only what differs on dark surfaces
export const dark = defineTheme({
  color: { accent: 'oklch(0.72 0.14 292)' },
  custom: { '--shadow-strength': 2.5 },
});`;

const THEME_MOUNT_CODE = `// app/layout.tsx
import '@zyncat/ui/styles.css';

import { ZyncatTheme } from '@zyncat/ui/theme';
import { light, dark, ocean } from '../zyncat.theme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ZyncatTheme themes={{ default: { light, dark }, ocean }} />
        {children}
      </body>
    </html>
  );
}`;

const THEME_SWITCH_CODE = `document.documentElement.dataset.polarity = 'dark';
document.documentElement.dataset.theme = 'ocean';

{/* or one subtree - a palette needs both attributes on the element */}
<section data-theme="ocean" data-polarity="light">
  <Button variant="primary">Ocean accent in here only</Button>
</section>`;

const TYPED_STYLE_CODE = `{/* this component's knobs are typed on its style prop */}
<Odometer value={total} style={{ '--odometer-size': '3rem', '--odometer-accent': 'var(--danger)' }} />

{/* another component's knob: compile error */}
<Odometer value={total} style={{ '--lens-ink': 'red' }} />

{/* private state: compile error */}
<Odometer value={total} style={{ '--_odometer-velocity': '1' }} />`;

const LEVEL_2_CODE = `{/* one instance */}
<Odometer value={total} style={{ '--odometer-size': 'var(--size-display-lg)', '--odometer-accent': 'var(--danger)' }} />

{/* every instance in the app */}
defineTheme({ components: { odometer: { size: 'var(--size-display-lg)', accent: 'var(--danger)' } } });

/* every instance under one element */
.metrics-panel {
  --odometer-size: var(--size-display-lg);
  --odometer-gap: 0.12em;
}`;

const LEVEL_3_PRIMITIVE = `<Button className="checkout-cta" style={{ minWidth: '12rem' }}>
  Place order
</Button>

/* .zc-btn is still there; your class rides alongside it */
.checkout-cta {
  width: 100%;
}`;

const LEVEL_3_FIELD = `{/* className and style land on the wrapper; htmlProps reaches the <input> */}
<TextField
  label="Workspace"
  className="settings-field"
  htmlProps={{ autoComplete: 'off', spellCheck: false }}
/>`;

const LEVEL_3_OVERLAY = `{/* overlays have no className prop - htmlProps lands on the panel */}
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Delete workspace"
  htmlProps={{ className: 'danger-dialog', 'data-testid': 'delete-dialog' }}
/>`;

type Corner = 'sharp' | 'default' | 'round';
type Polarity = 'light' | 'dark';
type OdometerInk = 'accent' | 'warning';

const PREVIEW = 'zyncat-preview';

const CORNERS: Record<Corner, string> = { sharp: '0', default: '0.5rem', round: '1rem' };

const playgroundCode = (
  hue: number,
  corner: Corner,
  ink: OdometerInk,
  polarity: Polarity,
) => `import { defineTheme, ZyncatTheme } from '@zyncat/ui/theme';

const light = defineTheme({
  color: { accent: 'oklch(0.63 0.118 ${hue})' },
  shape: { radius: '${CORNERS[corner]}' },
  components: { odometer: { accent: 'var(--${ink})' } },
});

// once, at the app root
<ZyncatTheme themes={{ default: { light } }} />;

// dark ships in the package
<html lang="en" data-polarity="${polarity}">`;

export function ThemingPlayground() {
  const [hue, setHue] = useState(292);
  const [corner, setCorner] = useState<Corner>('round');
  const [polarity, setPolarity] = useState<Polarity>('light');
  const [ink, setInk] = useState<OdometerInk>('accent');
  const [total, setTotal] = useState(4820);

  const light = defineTheme({
    color: { accent: `oklch(0.63 0.118 ${hue})` },
    shape: { radius: CORNERS[corner] },
    components: { odometer: { accent: `var(--${ink})` } },
  });

  return (
    <Playground
      code={playgroundCode(hue, corner, ink, polarity)}
      note="Each knob writes one typed key. The accent's hover, wash and focus ring, and every corner step, derive from it. The preview scopes the theme to this panel; the theme switch is the shipped dark on the panel's root."
      rail={
        <>
          <KnobRange label="accent hue" value={hue} onChange={setHue} min={0} max={360} format={(v) => `${v}°`} />
          <KnobSegment label="radius" value={corner} onChange={setCorner} options={['sharp', 'default', 'round']} />
          <KnobSegment label="theme" value={polarity} onChange={setPolarity} options={['light', 'dark']} />
          <KnobSegment label="odometer.accent" value={ink} onChange={setInk} options={['accent', 'warning']} />
        </>
      }
      stage="fill"
    >
      <ZyncatTheme themes={{ default: {}, [PREVIEW]: { light } }} />
      <div>
        <div className="theming-stage" data-theme={PREVIEW} data-polarity={polarity}>
          <div className="theming-cell__row">
            <Button variant="primary">Publish</Button>
            <Button variant="secondary">Save draft</Button>
            <Button variant="ghost" onClick={() => setTotal((v) => v + 137)}>
              Add 137
            </Button>
          </div>
          <div className="theming-cell__row">
            <Badge tone="info">Draft</Badge>
            <StatusBadge status="published" />
            <Odometer value={total} style={{ '--odometer-size': 'var(--size-title-lg)' }} />
          </div>
          <TextField label="Workspace" placeholder="Acme Marketing" />
        </div>
      </div>
    </Playground>
  );
}

export function ThemingDoc() {
  const [count, setCount] = useState(4820);

  return (
    <>
      <section className="guide-section" id="override-levels">
        <h2 className="guide-section__title">Four ways in</h2>
        <p className="guide-section__p">Take the lowest level that does the job. Never fork the source.</p>

        <Table
          columns={OVERRIDE_LEVEL_COLUMNS}
          rows={OVERRIDE_LEVEL_ROWS}
          rowKey="level"
          ariaLabel="The four override levels"
          density="compact"
        />
      </section>

      <section className="guide-section" id="level-0">
        <h2 className="guide-section__title">Level 0 — Your CSS wins</h2>
        <p className="guide-section__p">
          Every shipped rule sits inside a cascade layer, and unlayered CSS beats a layer at any specificity. Write a
          normal rule and it lands. No <Code>!important</Code>, no parent selector.
        </p>

        <div className="theming-pair">
          <div className="theming-cell">
            <span className="theming-cell__label">Shipped</span>
            <div className="theming-cell__row">
              <Button variant="primary">Publish</Button>
              <Button variant="secondary">Save draft</Button>
            </div>
          </div>
          <div className="theming-cell theming-unlayered">
            <span className="theming-cell__label">One unlayered rule</span>
            <div className="theming-cell__row">
              <Button variant="primary">Publish</Button>
              <Button variant="secondary">Save draft</Button>
            </div>
          </div>
        </div>

        <CodeBlock code={LEVEL_0_CODE} language="css" />

        <p className="guide-section__p">
          Class names are stable BEM under one <Code>zc-</Code> namespace: <Code>.zc-btn</Code>,{' '}
          <Code>.zc-btn--primary</Code>, <Code>.zc-fld__input</Code>, <Code>.zc-dialog__body</Code>. These docs are a
          level 0 consumer; the buttons on the right are one such rule.
        </p>
      </section>

      <section className="guide-section" id="level-1">
        <h2 className="guide-section__title">Level 1 — Tokens</h2>
        <p className="guide-section__p">
          Eight values are decisions and everything else derives from them. <Code>init</Code> wrote them into{' '}
          <Code>zyncat.theme.css</Code> beside your app entry. A retheme is editing a value there.
        </p>

        <Table
          columns={DECISION_COLUMNS}
          rows={DECISION_ROWS}
          rowKey="token"
          ariaLabel="The eight decisions"
          density="compact"
        />

        <div className="theming-pair">
          <div className="theming-cell">
            <span className="theming-cell__label">Default tokens</span>
            <div className="theming-cell__row">
              <Button variant="primary">Publish</Button>
              <Badge tone="info">Draft</Badge>
              <StatusBadge status="published" />
            </div>
            <TextField label="Workspace" placeholder="Acme Marketing" />
          </div>
          <div className="theming-cell" data-theme="retheme">
            <span className="theming-cell__label">Two tokens repointed</span>
            <div className="theming-cell__row">
              <Button variant="primary">Publish</Button>
              <Badge tone="info">Draft</Badge>
              <StatusBadge status="published" />
            </div>
            <TextField label="Workspace" placeholder="Acme Marketing" />
          </div>
        </div>

        <CodeBlock code={LEVEL_1_CODE} language="css" />

        <p className="guide-section__p">
          Components and the motion engine read the tokens live, so animation retimes with the CSS.
        </p>

        <Callout tone="warning" title="Set durations on :root">
          Reduced motion collapses every <Code>--duration-*</Code> to 1ms, and that collapse targets <Code>:root</Code>.
          A duration set on a nested scope escapes it.
        </Callout>

        <CodeBlock code={REDUCED_MOTION_CODE} language="css" />
      </section>

      <section className="guide-section" id="dark">
        <h2 className="guide-section__title">Dark mode</h2>
        <p className="guide-section__p">
          Dark ships in the package. One attribute turns the page or any subtree, and{' '}
          <Code>data-theme=&quot;light&quot;</Code> inside it makes a light island.
        </p>

        <CodeBlock code={DARK_CODE} language="tsx" />

        <p className="guide-section__p">
          Your decisions cascade in, so your accent is the dark theme&rsquo;s accent too. To change what dark does,
          extend it in the same file. Anything you leave out keeps the shipped value.
        </p>

        <CodeBlock code={DARK_EXTEND_CODE} language="css" />
      </section>

      <section className="guide-section" id="vocabulary">
        <h2 className="guide-section__title">The tokens you use</h2>
        <p className="guide-section__p">
          Your own pages read the same tokens the components do, so what you build sits on the same surfaces, ink and
          corners, and follows a retheme.
        </p>

        <Table
          columns={VOCABULARY_COLUMNS}
          rows={VOCABULARY_ROWS}
          rowKey="family"
          ariaLabel="The token vocabulary you use"
          density="compact"
        />

        <p className="guide-section__p">
          <Code>get_tokens</Code> in the MCP server prints all of them with live values. Once{' '}
          <Code>@zyncat/ui/theme</Code> is imported anywhere, every token is typed on any component&rsquo;s{' '}
          <Code>style</Code> prop.
        </p>
      </section>

      <section className="guide-section" id="typed-theme">
        <h2 className="guide-section__title">The typed theme</h2>
        <p className="guide-section__p">
          The same tokens, with a type. Use it when a theme is data: several named themes, or values computed at build
          time.
        </p>

        <ThemingPlayground />

        <CodeBlock code={THEME_FILE_CODE} language="tsx" />

        <p className="guide-section__p">
          Render <Code>ZyncatTheme</Code> once at the root. It renders a <Code>&lt;style&gt;</Code> element on the
          server, about a kilobyte: no provider, no flash, nothing to configure. Durations you set here keep their
          reduced-motion collapse.
        </p>

        <CodeBlock code={THEME_MOUNT_CODE} language="tsx" />

        <p className="guide-section__p">
          <Code>base</Code> lands on <Code>:root</Code>. Every other key becomes a{' '}
          <Code>[data-theme=&apos;&lt;key&gt;&apos;]</Code> block, so switching is one attribute.
        </p>

        <CodeBlock code={THEME_SWITCH_CODE} language="tsx" />

        <FeatureGrid>
          <FeatureCard
            icon="sparkle"
            title="The shape of a theme"
            description="Four groups - color, type, shape, motion - then components for the per-component knobs, and custom for any other token by its CSS name."
          />
          <FeatureCard
            icon="shield-check"
            title="Generated from the CSS"
            description="The types are built from the token stylesheets. Every key completes, hover shows the default, a typo is a compile error."
          />
        </FeatureGrid>

        <p className="guide-section__p">
          One writer per decision: on this route, drop those lines from <Code>zyncat.theme.css</Code>.
        </p>
      </section>

      <section className="guide-section" id="tailwind">
        <h2 className="guide-section__title">With Tailwind</h2>
        <p className="guide-section__p">
          On Tailwind v4 the vocabulary is a set of utilities, with IntelliSense. <Code>init</Code> writes one import
          above <Code>tailwindcss</Code>; the base stylesheet stays on its JS import.
        </p>

        <CodeBlock code={TAILWIND_IMPORT_CODE} language="css" />
        <CodeBlock code={TAILWIND_CARD_CODE} language="tsx" />

        <Table
          columns={TAILWIND_COLUMNS}
          rows={TAILWIND_ROWS}
          rowKey="family"
          ariaLabel="The token vocabulary as Tailwind utilities"
          density="compact"
        />

        <p className="guide-section__p">
          Each utility reads the token itself, so themes and <Code>dark:</Code> reach it, and <Code>dark:</Code> follows{' '}
          <Code>data-theme</Code>. Tailwind&rsquo;s own <Code>rounded-md</Code> and <Code>shadow-md</Code> read the
          zyncat token of the same name. Spacing stays Tailwind&rsquo;s scale.
        </p>

        <Callout tone="warning" title="Keep it above tailwindcss">
          The first layer statement in a stylesheet fixes the layer order. Below the Tailwind import, the utilities
          still exist but lose to the component rules.
        </Callout>
      </section>

      <section className="guide-section" id="level-2">
        <h2 className="guide-section__title">Level 2 — One component</h2>
        <p className="guide-section__p">
          Expressive and compound components publish <Code>--&lt;component&gt;-&lt;name&gt;</Code> properties. Set them
          inline, or on any ancestor to reach every instance beneath it. Primitives publish none; retheme those at level
          1.
        </p>

        <div className="theming-pair">
          <div className="theming-cell">
            <span className="theming-cell__label">Default</span>
            <Odometer value={count} />
          </div>
          <div className="theming-cell">
            <span className="theming-cell__label">Three properties set</span>
            <Odometer
              value={count}
              style={{
                '--odometer-size': 'var(--size-display-lg)',
                '--odometer-accent': 'var(--danger)',
                '--odometer-gap': '0.12em',
              }}
            />
          </div>
        </div>

        <div style={{ ...ROW, marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => setCount((v) => v + 137)}>
            Add 137
          </Button>
          <Button variant="ghost" onClick={() => setCount((v) => Math.max(0, v - 209))}>
            Subtract 209
          </Button>
        </div>

        <CodeBlock code={LEVEL_2_CODE} language="tsx" />

        <Table
          columns={SCOPED_PROPERTY_COLUMNS}
          rows={SCOPED_PROPERTIES}
          rowKey="subpath"
          ariaLabel="Scoped custom properties per component"
          density="compact"
        />

        <p className="guide-section__p">
          The knobs are typed twice: as the <Code>components</Code> group of a theme, and on the component&rsquo;s own{' '}
          <Code>style</Code> prop. Private state is a <Code>--_&lt;component&gt;-*</Code> property, off the type, so
          setting one is a compile error.
        </p>

        <CodeBlock code={TYPED_STYLE_CODE} language="tsx" />

        <p className="guide-section__p">
          Canvas simulations pick a change up at their next measure: FlowField and WeightField on resize, Confetti on
          the next <Code>fire()</Code>.
        </p>
      </section>

      <section className="guide-section" id="level-3">
        <h2 className="guide-section__title">Level 3 — One instance</h2>
        <p className="guide-section__p">
          Props move one instance. What a component accepts depends on how many surfaces it renders.
        </p>

        <TabGroup
          tabs={[
            {
              id: 'primitive',
              label: 'Primitives',
              content: (
                <div style={STACK}>
                  <p className="guide-section__p">
                    One element. <Code>className</Code> and <Code>style</Code> land on it and merge with the shipped
                    classes. <Code>htmlProps</Code> carries the native attributes that would collide with a prop.
                  </p>
                  <CodeBlock code={LEVEL_3_PRIMITIVE} language="tsx" />
                </div>
              ),
            },
            {
              id: 'field',
              label: 'Fields',
              content: (
                <div style={STACK}>
                  <p className="guide-section__p">
                    A label, a control shell and an input. <Code>className</Code> and <Code>style</Code> land on the
                    wrapper; <Code>htmlProps</Code> reaches the native <Code>&lt;input&gt;</Code>.
                  </p>
                  <CodeBlock code={LEVEL_3_FIELD} language="tsx" />
                </div>
              ),
            },
            {
              id: 'overlay',
              label: 'Overlays',
              content: (
                <div style={STACK}>
                  <p className="guide-section__p">
                    Dialog, Sheet, Popover, Tooltip and Dropdown render into a portal, so there is no{' '}
                    <Code>className</Code> prop. <Code>htmlProps</Code> lands on the panel itself.
                  </p>
                  <CodeBlock code={LEVEL_3_OVERLAY} language="tsx" />
                </div>
              ),
            },
          ]}
        />
      </section>

      <section className="guide-section" id="replicas">
        <h2 className="guide-section__title">Replicas</h2>
        <p className="guide-section__p">
          <Code>FacebookFeed</Code>, <Code>InstagramFeed</Code>, <Code>TikTok</Code> and <Code>YouTube</Code> reproduce
          a real platform surface, so their metrics are pinned constants. A retheme cannot move them and there is
          nothing to set at level 2. For a card that follows your theme, build one from primitives.
        </p>
      </section>
    </>
  );
}

const TAILWIND_IMPORT_CODE = `/* app.css - the stylesheet Tailwind compiles; init writes this line */
@import '@zyncat/ui/tailwind.css';
@import 'tailwindcss';`;

const TAILWIND_CARD_CODE = `<article className="bg-surface border border-subtle rounded-lg shadow-sm p-4 max-w-prose">
  <h3 className="text-heading text-strong">Weekly digest</h3>
  <p className="text-caption text-muted">Sent every Monday at 9:00.</p>
  <button className="bg-accent-fill text-on-accent rounded-md px-3 py-2 duration-fast ease-standard hover:bg-accent-hover">
    Enable
  </button>
</article>`;
