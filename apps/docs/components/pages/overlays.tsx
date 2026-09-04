'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { Alert, type AlertTone } from '@zyncat/ui/alert';
import { Button } from '@zyncat/ui/button';
import { Dialog, type DialogProps } from '@zyncat/ui/dialog';
import { Dropdown, type DropdownProps } from '@zyncat/ui/dropdown';
import { EmojiPickerPanel, getEmojiUrl, loadEmojiData } from '@zyncat/ui/emoji-picker';
import { Popover, type PopoverProps } from '@zyncat/ui/popover';
import { Sheet, type SheetProps } from '@zyncat/ui/sheet';
import { toast } from '@zyncat/ui/toast';
import { Tooltip, type TooltipProps } from '@zyncat/ui/tooltip';

import { KnobSegment, KnobSwitch, Playground } from '../playground';

type DialogTone = NonNullable<DialogProps['tone']>;
type DialogSize = NonNullable<DialogProps['size']>;
type PopoverSide = NonNullable<PopoverProps['side']>;
type PopoverAlign = NonNullable<PopoverProps['align']>;
type DropdownSide = NonNullable<DropdownProps['side']>;
type DropdownAlign = NonNullable<DropdownProps['align']>;
type DropdownHighlight = NonNullable<DropdownProps['highlight']>;
type SheetSide = NonNullable<SheetProps['side']>;
type TooltipPlacement = NonNullable<TooltipProps['placement']>;
type ToastTone = 'default' | 'success' | 'info' | 'warning' | 'error' | 'loading';

const ALERT_TONES: readonly AlertTone[] = ['info', 'success', 'warning', 'danger'];
const DIALOG_SIZES: readonly DialogSize[] = ['sm', 'md', 'lg'];
const SIDES: readonly DropdownSide[] = ['top', 'bottom', 'left', 'right'];
const ALIGNS: readonly DropdownAlign[] = ['start', 'center', 'end'];
const HIGHLIGHTS: readonly DropdownHighlight[] = ['neutral', 'accent'];
const TOAST_TONES: readonly ToastTone[] = ['default', 'success', 'info', 'warning', 'error', 'loading'];

const ALERT_COPY: Record<AlertTone, { title: string; body: string }> = {
  info: { title: 'System update available', body: 'A new version of Zyncat UI is ready to download.' },
  success: { title: 'Draft published', body: 'All 8 queued items have been sent successfully.' },
  warning: { title: 'Subscription renewal', body: 'Your workspace trial will expire in 3 days.' },
  danger: { title: 'Payment declined', body: 'Please check your billing details to prevent suspension.' },
};

const SNOOZE_SLOTS = [
  { id: 'later', label: 'Later', when: 'today at 17:00' },
  { id: 'evening', label: 'Tonight', when: 'today at 20:00' },
  { id: 'tomorrow', label: 'Tomorrow', when: 'tomorrow at 09:00' },
  { id: 'week', label: 'Monday', when: 'Monday at 09:00' },
] as const;

type SnoozeId = (typeof SNOOZE_SLOTS)[number]['id'];

const SNOOZE_PANEL: CSSProperties = {
  width: 212,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  padding: 'var(--space-3)',
  background: 'var(--bg-surface-raised)',
  border: 'var(--border-hairline) solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  color: 'var(--text-body)',
};
const SNOOZE_EYEBROW: CSSProperties = {
  margin: 0,
  font: 'var(--type-micro)',
  letterSpacing: 'var(--tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--text-subtle)',
};
const SNOOZE_SUBJECT: CSSProperties = {
  margin: 'var(--space-1) 0 0',
  font: 'var(--type-body)',
  color: 'var(--text-strong)',
};
const SNOOZE_GRID: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' };
const SNOOZE_READOUT: CSSProperties = {
  margin: 0,
  minHeight: 'var(--space-5)',
  font: 'var(--type-caption)',
  color: 'var(--text-muted)',
};
const SNOOZE_FOOT: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
  paddingTop: 'var(--space-3)',
  borderTop: 'var(--border-hairline) solid var(--border-subtle)',
};

const SWATCH_TOKENS = ['accent', 'success', 'warning', 'danger', 'info', 'text-strong', 'bg-muted', 'bg-inset'];
const SWATCH_COLUMNS = 4;
const SWATCH_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: SWATCH_COLUMNS,
  ArrowUp: -SWATCH_COLUMNS,
};
const SWATCH_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${SWATCH_COLUMNS}, var(--space-6))`,
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
};
const SWATCH: CSSProperties = {
  width: 'var(--space-6)',
  height: 'var(--space-6)',
  padding: 0,
  border: 'var(--border-hairline) solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

function SwatchGrid({ onPick }: { onPick: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const swatches = () => Array.from(ref.current?.querySelectorAll('button') ?? []);

  useEffect(() => {
    if (ref.current?.parentElement === document.activeElement) swatches()[0]?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = swatches();
    const from = all.indexOf(e.target as HTMLButtonElement);
    const next = from >= 0 && SWATCH_STEP[e.key] ? all[from + SWATCH_STEP[e.key]] : undefined;
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    next.focus();
  };

  return (
    <div ref={ref} role="group" aria-label="Label colour" style={SWATCH_GRID} onKeyDown={onKeyDown}>
      {SWATCH_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          aria-label={token}
          style={{ ...SWATCH, background: `var(--${token})` }}
          onClick={() => onPick(token)}
        />
      ))}
    </div>
  );
}

export function AlertPlayground() {
  const [tone, setTone] = useState<AlertTone>('warning');
  const copy = ALERT_COPY[tone];

  const code = `<Alert
  tone="${tone}"
  title="${copy.title}"
  action={{ label: 'Manage plan', onClick: openBilling }}
>
  ${copy.body}
</Alert>`;

  return (
    <Playground
      code={code}
      note="info and success announce politely; warning and danger announce assertively."
      rail={<KnobSegment label="tone" value={tone} onChange={setTone} options={ALERT_TONES} />}
    >
      <div style={{ width: '100%', maxWidth: 500 }}>
        <Alert
          tone={tone}
          title={copy.title}
          action={{ label: 'Manage plan', onClick: () => toast.info('Navigating to billing...') }}
        >
          {copy.body}
        </Alert>
      </div>
    </Playground>
  );
}

const TOAST_COPY: Record<ToastTone, { message: string; description?: string }> = {
  default: { message: 'Draft saved locally' },
  success: { message: 'Changes saved', description: 'Updated across all workspaces.' },
  info: { message: 'New message received' },
  warning: { message: 'Queue is nearly full', description: '92 of 100 slots used this cycle.' },
  error: { message: 'Connection lost', description: 'Retrying in 5 seconds...' },
  loading: { message: 'Publishing 8 queued posts...' },
};

export function ToastPlayground() {
  const [tone, setTone] = useState<ToastTone>('success');
  const copy = TOAST_COPY[tone];

  const call = tone === 'default' ? 'toast' : `toast.${tone}`;
  const code = `${call}('${copy.message}'${copy.description ? `, { description: '${copy.description}' }` : ''});`;

  const fire = () => {
    const opts = copy.description ? { description: copy.description } : undefined;
    if (tone === 'default') toast(copy.message, opts);
    else toast[tone](copy.message, opts);
  };

  return (
    <Playground
      code={code}
      note="loading never expires on its own - toast.promise settles it into success or danger."
      rail={<KnobSegment label="tone" value={tone} onChange={setTone} options={TOAST_TONES} />}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <Button variant="secondary" onClick={fire}>
          Fire {tone} toast
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.promise(new Promise((resolve) => setTimeout(resolve, 2200)), {
              loading: 'Publishing 8 queued posts...',
              success: 'Queue published',
              error: 'Queue failed',
            })
          }
        >
          Promise toast
        </Button>
      </div>
    </Playground>
  );
}

export function TooltipPlayground() {
  const [placement, setPlacement] = useState<TooltipPlacement>('top');
  const [shortcut, setShortcut] = useState(true);
  const [pinned, setPinned] = useState(false);

  const code = `<Tooltip content="Schedule post to queue"${shortcut ? ' shortcut="⌘S"' : ''} placement="${placement}"${pinned ? ' open' : ''}>
  <Button variant="secondary">Schedule</Button>
</Tooltip>`;

  return (
    <Playground
      code={code}
      note="One bubble travels between triggers - hover the pair and watch it glide. Pin the first one and it holds with no pointer on it."
      rail={
        <>
          <KnobSegment
            label="placement"
            value={placement}
            onChange={setPlacement}
            options={['top', 'bottom', 'left', 'right']}
          />
          <KnobSwitch label="shortcut" checked={shortcut} onChange={setShortcut} />
          <KnobSwitch label="pinned" checked={pinned} onChange={setPinned} />
        </>
      }
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: 'var(--space-7) 0' }}>
        <Tooltip
          content="Schedule post to queue"
          shortcut={shortcut ? '⌘S' : undefined}
          placement={placement}
          open={pinned || undefined}
        >
          <Button variant="secondary">Schedule</Button>
        </Tooltip>
        <Tooltip content="Delete permanently" shortcut={shortcut ? '⌫' : undefined} placement={placement}>
          <Button variant="danger">Delete</Button>
        </Tooltip>
      </div>
    </Playground>
  );
}

export function DialogPlayground() {
  const [tone, setTone] = useState<DialogTone>('danger');
  const [size, setSize] = useState<DialogSize>('md');
  const [dismissible, setDismissible] = useState(true);
  const [open, setOpen] = useState(false);

  const code = `<Dialog
  open={open}
  onOpenChange={setOpen}
  tone="${tone}"
  size="${size}"
  dismissible={${dismissible}}
  title="${tone === 'danger' ? 'Delete project permanently?' : 'Rename this project?'}"
  footer={(close) => (
    <>
      <Button variant="secondary" onClick={close}>Cancel</Button>
      <Button variant="${tone === 'danger' ? 'danger' : 'primary'}" onClick={confirm}>
        ${tone === 'danger' ? 'Delete' : 'Save'}
      </Button>
    </>
  )}
>
  ...
</Dialog>`;

  return (
    <Playground
      code={code}
      note={
        dismissible
          ? 'Esc, the scrim and the close button all dismiss it.'
          : 'Only the footer actions close it - Esc and the scrim are inert.'
      }
      rail={
        <>
          <KnobSegment label="tone" value={tone} onChange={setTone} options={['default', 'danger']} />
          <KnobSegment label="size" value={size} onChange={setSize} options={DIALOG_SIZES} />
          <KnobSwitch label="dismissible" checked={dismissible} onChange={setDismissible} />
        </>
      }
    >
      <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => setOpen(true)}>
        {tone === 'danger' ? 'Delete project' : 'Rename project'}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        tone={tone}
        size={size}
        dismissible={dismissible}
        title={tone === 'danger' ? 'Delete project permanently?' : 'Rename this project?'}
        footer={(close) => (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => {
                toast.success(tone === 'danger' ? 'Project deleted' : 'Project renamed');
                close();
              }}
            >
              {tone === 'danger' ? 'Delete' : 'Save'}
            </Button>
          </div>
        )}
      >
        {tone === 'danger'
          ? 'This action cannot be undone. All queued posts and analytics history will be removed.'
          : 'The new name is applied everywhere immediately, including shared links.'}
      </Dialog>
    </Playground>
  );
}

export function PopoverPlayground() {
  const [side, setSide] = useState<PopoverSide>('bottom');
  const [align, setAlign] = useState<PopoverAlign>('start');
  const [arrow, setArrow] = useState(false);
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<SnoozeId | null>(null);

  const chosen = SNOOZE_SLOTS.find((s) => s.id === slot);

  const code = `<Popover
  trigger={<Button variant="secondary">Snooze</Button>}
  side="${side}"
  align="${align}"
  arrow={${arrow}}
  open={open}
  onOpenChange={setOpen}
>
  <div className="snooze-panel">
    <p className="snooze-panel__eyebrow">Snooze thread</p>
    <div className="snooze-panel__grid">
      {slots.map((s) => (
        <Button key={s.id} size="sm" variant={s.id === slot ? 'primary' : 'secondary'} onClick={() => setSlot(s.id)}>
          {s.label}
        </Button>
      ))}
    </div>
    <Button size="sm" onClick={confirm}>Confirm</Button>
  </div>
</Popover>`;

  const confirm = () => {
    if (chosen) toast.success(`Snoozed until ${chosen.when}`);
    setOpen(false);
    setSlot(null);
  };

  return (
    <Playground
      code={code}
      note="Popover ships placement only - the surface is yours to paint. Picking a slot leaves the panel open; dismissal is on you."
      stageStyle={{ minHeight: '34rem' }}
      rail={
        <>
          <KnobSegment label="side" value={side} onChange={setSide} options={['top', 'bottom', 'left', 'right']} />
          <KnobSegment label="align" value={align} onChange={setAlign} options={['start', 'center', 'end']} />
          <KnobSwitch label="arrow" checked={arrow} onChange={setArrow} />
        </>
      }
    >
      <div>
        <Popover
          key={`${side}-${align}-${arrow}`}
          trigger={<Button variant="secondary">Snooze</Button>}
          side={side}
          align={align}
          arrow={arrow}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setSlot(null);
          }}
        >
          <div style={SNOOZE_PANEL}>
            <div>
              <p style={SNOOZE_EYEBROW}>Snooze thread</p>
              <p style={SNOOZE_SUBJECT}>Q3 launch retro</p>
            </div>

            <div style={SNOOZE_GRID}>
              {SNOOZE_SLOTS.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={s.id === slot ? 'primary' : 'secondary'}
                  onClick={() => setSlot(s.id)}
                  htmlProps={{ 'aria-pressed': s.id === slot }}
                >
                  {s.label}
                </Button>
              ))}
            </div>

            <p style={SNOOZE_READOUT}>
              {chosen ? (
                <>
                  Returns <strong style={{ color: 'var(--text-strong)' }}>{chosen.when}</strong>.
                </>
              ) : (
                'Choose when it comes back.'
              )}
            </p>

            <div style={SNOOZE_FOOT}>
              <Button variant="ghost" size="sm" disabled={!chosen} onClick={() => setSlot(null)}>
                Clear
              </Button>
              <Button size="sm" disabled={!chosen} onClick={confirm}>
                Confirm
              </Button>
            </div>
          </div>
        </Popover>
      </div>
    </Playground>
  );
}

export function DropdownPlayground() {
  const [side, setSide] = useState<DropdownSide>('bottom');
  const [align, setAlign] = useState<DropdownAlign>('start');
  const [highlight, setHighlight] = useState<DropdownHighlight>('neutral');
  const [rail, setRail] = useState(false);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState('public');

  const code = `<Dropdown
  ariaLabel="Post options"
  trigger={<Button variant="secondary">Options</Button>}
  side="${side}"
  align="${align}"
  highlight="${highlight}"
  rail={${rail}}
  onSelect={route}
  items={items}
/>`;

  const pickColour = (token: string) => {
    toast.info(`Label colour: ${token}`);
    setOpen(false);
  };

  return (
    <Playground
      code={code}
      note="Submenus always align to their own row - side and align place the top-level menu only."
      rail={
        <>
          <KnobSegment label="side" value={side} onChange={setSide} options={SIDES} />
          <KnobSegment label="align" value={align} onChange={setAlign} options={ALIGNS} />
          <KnobSegment label="highlight" value={highlight} onChange={setHighlight} options={HIGHLIGHTS} />
          <KnobSwitch label="rail" checked={rail} onChange={setRail} />
        </>
      }
    >
      <div style={{ padding: 'var(--space-9) 0' }}>
        <Dropdown
          key={`${side}-${align}`}
          ariaLabel="Post options"
          trigger={<Button variant="secondary">Options</Button>}
          open={open}
          onOpenChange={setOpen}
          side={side}
          align={align}
          highlight={highlight}
          rail={rail}
          onSelect={(id) => toast.info(`Action: ${id}`)}
          items={[
            {
              label: 'Post Management',
              items: [
                { id: 'edit', label: 'Edit post', shortcut: 'E' },
                { id: 'duplicate', label: 'Duplicate', shortcut: 'D' },
                {
                  id: 'share',
                  label: 'Share to',
                  items: [
                    { id: 'share-x', label: 'Twitter / X' },
                    { id: 'share-li', label: 'LinkedIn' },
                    { id: 'share-ig', label: 'Instagram' },
                  ],
                },
                { id: 'colour', label: 'Label colour', content: <SwatchGrid onPick={pickColour} /> },
              ],
            },
            {
              label: 'Visibility',
              items: [
                {
                  id: 'public',
                  label: 'Public',
                  selected: visibility === 'public',
                  onSelect: () => setVisibility('public'),
                },
                {
                  id: 'private',
                  label: 'Private',
                  selected: visibility === 'private',
                  onSelect: () => setVisibility('private'),
                },
              ],
            },
            { items: [{ id: 'delete', label: 'Delete permanently', danger: true }] },
          ]}
        />
      </div>
    </Playground>
  );
}

export function SheetPlayground() {
  const [side, setSide] = useState<SheetSide>('right');
  const [open, setOpen] = useState(false);

  const code = `<Sheet side="${side}" open={open} onOpenChange={setOpen}>
  <div>Panel content</div>
</Sheet>`;

  return (
    <Playground
      code={code}
      note="Drag the panel toward its edge to dismiss it - the scrim fades with the travel."
      rail={<KnobSegment label="side" value={side} onChange={setSide} options={['right', 'bottom']} />}
    >
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open settings panel
      </Button>
      <Sheet side={side} open={open} onOpenChange={setOpen}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-strong)' }}>Channel Settings</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Configure rate limits, retry rules, and auto-publishing parameters for this channel.
          </p>
          <Button onClick={() => setOpen(false)} style={{ marginTop: '16px' }}>
            Save settings
          </Button>
        </div>
      </Sheet>
    </Playground>
  );
}

export function EmojiPickerHero() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState('✨');

  useEffect(() => {
    loadEmojiData('/emojis.json');
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '1.75rem' }}>{picked}</span>
      <EmojiPickerPanel
        open={open}
        onOpenChange={setOpen}
        onSelect={(shortcode) => {
          setPicked(shortcode);
          setOpen(false);
        }}
        getEmojiUrl={getEmojiUrl}
        search
        popoverProps={{ side: 'bottom', align: 'start' }}
        trigger={<Button variant="secondary">Add reaction</Button>}
      />
    </div>
  );
}
