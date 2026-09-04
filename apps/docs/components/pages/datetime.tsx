'use client';

import { useState } from 'react';

import { DateField } from '@zyncat/ui/date-field';
import { DateRangeField } from '@zyncat/ui/date-range-field';
import { DateTimeField, type DateTimeFieldProps } from '@zyncat/ui/datetime-field';
import { TabPanel, Tabs, type TabsProps } from '@zyncat/ui/tabs';
import { TimeField } from '@zyncat/ui/time-field';

import { KnobSegment, Playground } from '../playground';

const W = 320;

export function DateFieldHero() {
  const [val, setVal] = useState<string | null>('2026-08-21');
  return (
    <div style={{ width: '100%', maxWidth: W }}>
      <DateField label="Publish date" value={val} onChange={setVal} />
    </div>
  );
}

type TimeFormat = NonNullable<DateTimeFieldProps['format']>;
type MinuteStep = '1' | '5' | '15';

export function DateTimeFieldPlayground() {
  const [val, setVal] = useState<string | null>('2026-08-21T14:30');
  const [format, setFormat] = useState<TimeFormat>('24h');
  const [minuteStep, setMinuteStep] = useState<MinuteStep>('5');

  const code = `<DateTimeField
  label="Publish timestamp"
  format="${format}"
  minuteStep={${minuteStep}}
  value={value}
  onChange={setValue}
/>`;

  return (
    <Playground
      code={code}
      note="Type into the segments or spin them with the arrow keys - the calendar and the clock commit live."
      rail={
        <>
          <KnobSegment label="format" value={format} onChange={setFormat} options={['24h', '12h']} />
          <KnobSegment label="minute step" value={minuteStep} onChange={setMinuteStep} options={['1', '5', '15']} />
        </>
      }
    >
      <div style={{ width: '100%', maxWidth: W }}>
        <DateTimeField
          label="Publish timestamp"
          format={format}
          minuteStep={Number(minuteStep)}
          value={val}
          onChange={setVal}
        />
      </div>
    </Playground>
  );
}

export function DateRangeFieldHero() {
  const [range, setRange] = useState<{ start: string; end: string } | null>({ start: '2026-08-10', end: '2026-08-24' });
  return (
    <div style={{ width: '100%', maxWidth: W }}>
      <DateRangeField label="Campaign duration" value={range} onChange={setRange} />
    </div>
  );
}

export function TimeFieldPlayground() {
  const [format, setFormat] = useState<TimeFormat>('24h');
  const [time, setTime] = useState<string | null>('09:00');

  const code = `<TimeField label="Broadcast time" format="${format}" value={time} onChange={setTime} />`;

  return (
    <Playground
      code={code}
      note="Display only - the committed value stays canonical 24h 'HH:mm' either way."
      rail={<KnobSegment label="format" value={format} onChange={setFormat} options={['24h', '12h']} />}
    >
      <div style={{ width: '100%', maxWidth: W }}>
        <TimeField label="Broadcast time" format={format} value={time} onChange={setTime} />
      </div>
    </Playground>
  );
}

const TAB_ITEMS = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'settings', label: 'Settings' },
];

const TAB_COPY: Record<string, string> = {
  overview:
    'Panels enter from the side you moved toward - go Overview to Settings and back, and watch the direction flip.',
  activity: '14 posts published this week across 3 channels; engagement is up 12% on the last cycle.',
  settings: 'Workspace defaults: UTC schedule display, auto-retry on failed publishes, weekly digest on.',
};

type TabsVariant = NonNullable<TabsProps['variant']>;

export function TabsPlayground() {
  const [variant, setVariant] = useState<TabsVariant>('underline');
  const [active, setActive] = useState('overview');
  const [dir, setDir] = useState<1 | -1 | 0>(0);

  const code = `<Tabs
  items={items}
  value={active}
  variant="${variant}"
  onChange={(next, d) => { setActive(next); setDir(d); }}
  name="views"
  ariaLabel="Workspace sections"
/>
<TabPanel name="views" tab={active} dir={dir}>
  {panels[active]}
</TabPanel>`;

  return (
    <Playground
      code={code}
      note="The ink reaches then releases either way - an underline that spans the tab, or a pill riding an inset track."
      rail={<KnobSegment label="variant" value={variant} onChange={setVariant} options={['underline', 'pill']} />}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Tabs
          items={TAB_ITEMS}
          value={active}
          variant={variant}
          onChange={(v, d) => {
            setActive(v);
            setDir(d);
          }}
          name="tabs-playground"
          ariaLabel="Workspace sections"
        />
        <TabPanel name="tabs-playground" tab={active} dir={dir} style={{ paddingTop: 'var(--space-4)' }}>
          <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-muted)', minHeight: 'var(--space-8)' }}>
            {TAB_COPY[active]}
          </p>
        </TabPanel>
      </div>
    </Playground>
  );
}
