import type { ComponentType } from 'react';

import * as C from '../components/pages/compound';
import * as D from '../components/pages/data';
import * as T from '../components/pages/datetime';
import * as E from '../components/pages/expressive';
import * as FB from '../components/pages/facebook-feed';
import * as F from '../components/pages/forms';
import * as IG from '../components/pages/instagram-feed';
import { InstallationDoc } from '../components/pages/installation';
import { IntroductionDoc } from '../components/pages/introduction';
import { McpDoc } from '../components/pages/mcp';
import * as O from '../components/pages/overlays';
import * as P from '../components/pages/primitives';
import { ThemingDoc } from '../components/pages/theming';
import * as TT from '../components/pages/tiktok';
import * as YT from '../components/pages/youtube';
import type { PropRow } from '../components/PropsTable';
import { CONTENT } from './content';
import { GENERATED_PROPS, GENERATED_TYPES, type NestedType } from './props.generated';

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export const NEW_SLUGS = new Set(['count-badge', 'emoji-picker', 'date-range', 'multi-select']);

export interface Doc {
  slug: string;
  label: string;
  headline?: string;
  blurb: string;
  HeroComponent?: ComponentType;
  Playground?: ComponentType;
  heroCode?: string;
  props?: PropRow[];
  types?: NestedType[];
  Content?: ComponentType;
  toc?: TocItem[];
}

export interface DocGroup {
  id: string;
  title: string;
  docs: Doc[];
}

export const GROUPS: DocGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    docs: [
      {
        slug: 'introduction',
        label: 'Introduction',
        headline: 'A catalogue of moving parts.',
        blurb:
          'React 19 components on a closed token vocabulary, animated by a house-built WAAPI engine — no Tailwind, no CSS-in-JS, no animation library underneath.',
        Content: IntroductionDoc,
        toc: [
          { id: 'overview', title: 'Overview', level: 2 },
          { id: 'philosophy', title: 'Philosophy & Craft', level: 2 },
          { id: 'core-pillars', title: 'Core Pillars', level: 2 },
          { id: 'architecture', title: 'Design Architecture', level: 2 },
          { id: 'next-steps', title: 'Next Steps', level: 2 },
        ],
      },
      {
        slug: 'installation',
        label: 'Installation',
        blurb: 'One command sets up everything: the package, the stylesheet, the agent skill and the MCP server.',
        Content: InstallationDoc,
        toc: [
          { id: 'quick-start', title: 'One command', level: 2 },
          { id: 'what-it-does', title: 'What init does', level: 2 },
          { id: 'after-init', title: 'After init', level: 2 },
          { id: 'requirements', title: 'Requirements & CI', level: 2 },
        ],
      },
      {
        slug: 'theming',
        label: 'Theming & Overrides',
        blurb:
          'The four ways to override Zyncat UI: cascade layers, tokens, scoped custom properties, and props - ' +
          'with a typed theme file behind the token layer.',
        Content: ThemingDoc,
        toc: [
          { id: 'override-levels', title: 'The four override levels', level: 2 },
          { id: 'level-0', title: 'Level 0 — Cascade layers', level: 2 },
          { id: 'level-1', title: 'Level 1 — Tokens', level: 2 },
          { id: 'vocabulary', title: 'The vocabulary you use', level: 2 },
          { id: 'typed-theme', title: 'The typed theme', level: 2 },
          { id: 'level-2', title: 'Level 2 — Scoped properties', level: 2 },
          { id: 'level-3', title: 'Level 3 — Instance props', level: 2 },
          { id: 'replicas', title: 'Replicas', level: 2 },
        ],
      },
      {
        slug: 'mcp',
        label: 'MCP Server',
        blurb: 'Connect AI-assisted coding agents and IDEs directly to Zyncat UI via Model Context Protocol.',
        Content: McpDoc,
        toc: [
          { id: 'overview', title: 'Overview', level: 2 },
          { id: 'what-is-mcp', title: 'What is MCP?', level: 2 },
          { id: 'ide-configuration', title: 'Setup', level: 2 },
          { id: 'tools-reference', title: 'Tools Reference', level: 2 },
          { id: 'sample-prompts', title: 'Sample AI Prompts', level: 2 },
        ],
      },
    ],
  },
  {
    id: 'primitives',
    title: 'Primitives',
    docs: [
      {
        slug: 'button',
        label: 'Button',
        blurb: 'One control for every click action. Exactly one primary per view.',
        Playground: P.ButtonPlayground,
        heroCode: `import { Button } from '@zyncat/ui/button';\n\n<Button variant="primary" onClick={schedulePost}>Schedule post</Button>`,
      },
      {
        slug: 'icon',
        label: 'Icon',
        blurb: 'Any Phosphor glyph by name or semantic alias; fill marks active.',
        Playground: P.IconPlayground,
        heroCode: `import { Icon } from './icon';\n\n<Icon name="lightning" size="lg" />`,
      },
      {
        slug: 'collapse',
        label: 'Collapse',
        blurb: 'Layout-transition primitive - grid-fr open/close, never touches auto.',
        Playground: P.CollapsePlayground,
        heroCode: `import { Collapse } from '@zyncat/ui/collapse';\n\n<Collapse open={open}>\n  <div>Collapsing region content.</div>\n</Collapse>`,
      },
      {
        slug: 'badge',
        label: 'Badge',
        blurb: 'Glass or outline. Status hues reserved for genuine status.',
        Playground: P.BadgePlayground,
        heroCode: `import { Badge } from '@zyncat/ui/badge';\n\n<Badge tone="info" pill>New Release</Badge>`,
      },
      {
        slug: 'status-badge',
        label: 'StatusBadge',
        blurb: 'Canonical status - tone + one-word label; morph animates in place.',
        Playground: P.StatusBadgePlayground,
        heroCode: `import { StatusBadge } from '@zyncat/ui/status-badge';\n\n<StatusBadge status="scheduled" morph />`,
      },
      {
        slug: 'count-badge',
        label: 'CountBadge',
        blurb: 'Mono, tabular counts; roll animates digits like an odometer.',
        Playground: P.CountBadgePlayground,
        heroCode: `import { CountBadge } from '@zyncat/ui/count-badge';\n\n<CountBadge value={count} roll tone="info" />`,
      },
    ],
  },
  {
    id: 'expressive',
    title: 'Expressive',
    docs: [
      {
        slug: 'odometer',
        label: 'Odometer',
        blurb: 'Rolling figures at display size; every digit column carries its own spring.',
        Playground: E.OdometerPlayground,
        heroCode: `import { Odometer } from '@zyncat/ui/odometer';\n\n<Odometer value={count} format={(v) => v.toLocaleString('en-US')} />`,
      },
      {
        slug: 'typing-lines',
        label: 'TypingLines',
        blurb: 'A line types itself, holds, deletes, and moves to the next one.',
        Playground: E.TypingLinesPlayground,
        heroCode: `import { TypingLines } from '@zyncat/ui/typing-lines';\n\n<TypingLines lines={['Design every state.', 'Make every motion interruptible.']} />`,
      },
      {
        slug: 'lens',
        label: 'Lens',
        blurb: 'An optical loupe over live DOM - magnified type is re-rasterised, never upscaled.',
        Playground: E.LensPlayground,
        heroCode: `import { Lens } from '@zyncat/ui/lens';\n\n<Lens magnification={2.6} radius={132}>\n  <TypeSpecimen />\n</Lens>`,
      },
      {
        slug: 'weight-field',
        label: 'WeightField',
        blurb:
          'A display headline where hovering one letter ramps its weight to the peak and spills a share onto its neighbours.',
        Playground: E.WeightFieldPlayground,
        heroCode: `import { WeightField } from '@zyncat/ui/weight-field';\n\n<WeightField text="Nostalgia" />`,
      },
      {
        slug: 'morphing-text',
        label: 'MorphingText',
        blurb: 'A word list that morphs word into word through one alpha threshold, so letterforms pool like liquid.',
        Playground: E.MorphingTextPlayground,
        heroCode: `import { MorphingText } from '@zyncat/ui/morphing-text';\n\n<MorphingText words={['Weight', 'Timing', 'Ease', 'Rest']} />`,
      },
      {
        slug: 'flow-field',
        label: 'FlowField',
        blurb: 'A canvas needle field that breathes on a noise loop and swings away from the pointer.',
        Playground: E.FlowFieldPlayground,
        heroCode: `import { FlowField } from '@zyncat/ui/flow-field';\n\n<FlowField spacing={26} radius={210}>\n  <Hero />\n</FlowField>`,
      },
      {
        slug: 'confetti',
        label: 'Confetti',
        blurb: 'A canvas burst you fire yourself - paper, curls, ribbons and foil on real drag, lift and tumble.',
        Playground: E.ConfettiPlayground,
        heroCode: `import { Confetti, type ConfettiHandle } from '@zyncat/ui/confetti';\n\nconst confetti = useRef<ConfettiHandle>(null);\n\n<Confetti ref={confetti} field="viewport" />\n<Button onClick={() => confetti.current?.fire()}>Celebrate</Button>`,
      },
    ],
  },
  {
    id: 'compound',
    title: 'Compound',
    docs: [
      {
        slug: 'support-rail',
        label: 'SupportRail',
        blurb:
          'Expressive contract. An edge tab that grows a support panel out of its own measured box, and folds back into it.',
        Playground: C.SupportRailPlayground,
        heroCode: `import { SupportRail } from '@zyncat/ui/support-rail';\n\n<SupportRail actions={actions} status="Open · closes 20:00" onSelect={route} />`,
      },
    ],
  },
  {
    id: 'replicas',
    title: 'Replicas',
    docs: [
      {
        slug: 'instagram-feed',
        label: 'InstagramFeed',
        blurb:
          'Replica. An Instagram post, image or video, at both column widths. Fidelity is the contract - no theming knobs.',
        Playground: IG.InstagramPlayground,
        heroCode: `import { InstagramFeed } from '@zyncat/ui/instagram-feed';\n\n<InstagramFeed handle="studio.zyncat" caption="Shot on the roof." media={<img src={photo} alt="" />} likes={2600} />`,
      },
      {
        slug: 'facebook-feed',
        label: 'FacebookFeed',
        blurb: 'Replica. Three Facebook surfaces - feed post, reel and story - behind one surface prop.',
        Playground: FB.FacebookPlayground,
        heroCode: `import { FacebookFeed } from '@zyncat/ui/facebook-feed';\n\n<FacebookFeed surface="post" name="Zyncat Studio" caption="New build is live." media={photo} likes={1240} />`,
      },
      {
        slug: 'tiktok',
        label: 'TikTok',
        blurb: 'Replica. The TikTok post surface, desktop and mobile, with the photo carousel.',
        Playground: TT.TikTokPlayground,
        heroCode: `import { TikTok } from '@zyncat/ui/tiktok';\n\n<TikTok surface="desktop" name="zyncat.studio" caption="Build log 04" media={clip} likes={187000} />`,
      },
      {
        slug: 'youtube',
        label: 'YouTube',
        blurb: 'Replica. Three YouTube surfaces - feed card, Short and community post - behind one surface prop.',
        Playground: YT.YouTubePlayground,
        heroCode: `import { YouTube } from '@zyncat/ui/youtube';\n\n<YouTube surface="video" title="Building a design system from zero" channel="Zyncat" views="184K views" age="3 weeks ago" duration="14:22" media={photo} />`,
      },
    ],
  },
  {
    id: 'forms',
    title: 'Forms',
    docs: [
      {
        slug: 'text-field',
        label: 'TextField',
        blurb: 'The base text input - states disclose via Collapse, never jump.',
        Playground: F.TextFieldPlayground,
        heroCode: `import { TextField } from '@zyncat/ui/text-field';\n\n<TextField label="Search projects" leadingIcon={<SearchIcon />} clearable />`,
      },
      {
        slug: 'number-field',
        label: 'NumberField',
        blurb: 'Tabular figures, caret steppers, unit suffix, clamp to bounds.',
        Playground: F.NumberFieldPlayground,
        heroCode: `import { NumberField } from '@zyncat/ui/number-field';\n\n<NumberField label="Seats" unit="users" min={1} max={50} value={seats} onChange={setSeats} />`,
      },
      {
        slug: 'otp-field',
        label: 'OtpField',
        blurb: 'Segmented one-time-code - auto-advance, paste-to-fill.',
        Playground: F.OtpFieldPlayground,
        heroCode: `import { OtpField } from '@zyncat/ui/otp-field';\n\n<OtpField length={6} group={3} value={code} onChange={setCode} />`,
      },
      {
        slug: 'textarea',
        label: 'Textarea',
        blurb: 'Auto-grow, character meter, over-limit highlight, ⌘/Ctrl+↵ submit.',
        Playground: F.TextareaPlayground,
        heroCode: `import { Textarea } from '@zyncat/ui/textarea';\n\n<Textarea label="Announcement" max={280} minRows={3} onSubmit={handleSubmit} hint="Cmd+Enter to submit" />`,
      },
      {
        slug: 'checkbox',
        label: 'Checkbox',
        blurb: 'Stages a choice you submit later - fill springs in, then the tick draws on.',
        Playground: F.CheckboxPlayground,
        heroCode: `import { Checkbox } from '@zyncat/ui/checkbox';\n\n<Checkbox label="Pin post to queue" description="Published before any other scheduled items." />`,
      },
      {
        slug: 'toggle',
        label: 'Toggle',
        blurb: 'Actuates a setting on the spot - the thumb travels on a real spring.',
        Playground: F.TogglePlayground,
        heroCode: `import { Toggle } from '@zyncat/ui/toggle';\n\n<Toggle label="Auto-save drafts" description="Changes sync automatically as you type." checked={toggled} onChange={setToggled} />`,
      },
      {
        slug: 'radio-group',
        label: 'RadioGroup',
        blurb: 'Pick exactly one - quiet rows or selectable cards; the marker glides.',
        Playground: F.RadioGroupPlayground,
        heroCode: `import { RadioGroup } from '@zyncat/ui/radio-group';\n\n<RadioGroup name="plan" label="Select a plan" value={plan} onChange={setPlan} options={PLAN_OPTIONS} />`,
      },
      {
        slug: 'select',
        label: 'Select',
        blurb: 'Custom single-select listbox - committing closes and returns focus.',
        Playground: F.SelectPlayground,
        heroCode: `import { Select } from '@zyncat/ui/select';\n\n<Select ariaLabel="Timezone" value={tz} onChange={setTz} options={TIMEZONES} searchable />`,
      },
      {
        slug: 'multi-select',
        label: 'MultiSelect',
        blurb: 'Many-of listbox - toggling keeps the menu open; trigger summarises as first +N.',
        Playground: F.MultiSelectPlayground,
        heroCode: `import { MultiSelect } from '@zyncat/ui/multi-select';\n\n<MultiSelect ariaLabel="Channels" value={channels} onChange={setChannels} options={CHANNELS} searchable />`,
      },
    ],
  },
  {
    id: 'data',
    title: 'Data display',
    docs: [
      {
        slug: 'avatar',
        label: 'Avatar',
        blurb: 'Identity mark - image, initials, or silhouette, with presence.',
        Playground: D.AvatarPlayground,
        heroCode: `import { Avatar } from '@zyncat/ui/avatar';\n\n<Avatar src="https://i.pravatar.cc/96?img=47" name="Ana Ng" status="online" size="lg" />`,
      },
      {
        slug: 'tag',
        label: 'Tag',
        blurb: 'User-owned label - removable entries, applied filters. A control, not a status.',
        Playground: D.TagPlayground,
        heroCode: `import { Tag, TagGroup } from '@zyncat/ui/tag';\n\n<TagGroup ariaLabel="Labels">\n  <Tag icon={<HashIcon />} onRemove={handleRemove}>design</Tag>\n</TagGroup>`,
      },
      {
        slug: 'table',
        label: 'Table',
        blurb: 'Declare columns + rows; it owns sort, selection, stickiness, overflow.',
        Playground: D.TablePlayground,
        heroCode: `import { Table } from '@zyncat/ui/table';\n\n<Table rows={rows} columns={columns} rowKey="id" selectable />`,
      },
      {
        slug: 'pagination',
        label: 'Pagination',
        blurb: 'Honest cursor strip - a mono range readout and a prev/next pair.',
        HeroComponent: D.PaginationHero,
        heroCode: `import { Pagination } from '@zyncat/ui/pagination';\n\n<Pagination\n  range={[offset + 1, Math.min(offset + pageSize, total)]}\n  total={total}\n  hasPrev={offset > 0}\n  hasNext={offset + pageSize < total}\n  onPrev={() => setOffset(offset - pageSize)}\n  onNext={() => setOffset(offset + pageSize)}\n/>`,
      },
    ],
  },
  {
    id: 'datetime',
    title: 'Date, time & tabs',
    docs: [
      {
        slug: 'date-field',
        label: 'DateField',
        blurb: "A month calendar in a popover; commit is live, value is 'YYYY-MM-DD'.",
        HeroComponent: T.DateFieldHero,
        heroCode: `import { DateField } from '@zyncat/ui/date-field';\n\n<DateField label="Publish date" value={date} onChange={setDate} />`,
      },
      {
        slug: 'datetime-field',
        label: 'DateTimeField',
        blurb: "Calendar plus the segmented HH:MM machine; value is 'YYYY-MM-DDTHH:mm'.",
        Playground: T.DateTimeFieldPlayground,
        heroCode: `import { DateTimeField } from '@zyncat/ui/datetime-field';\n\n<DateTimeField label="Publish timestamp" value={datetime} onChange={setDatetime} />`,
      },
      {
        slug: 'date-range',
        label: 'DateRangeField',
        blurb: 'Two-tap auto-ordering window; commits only when both ends exist.',
        HeroComponent: T.DateRangeFieldHero,
        heroCode: `import { DateRangeField } from '@zyncat/ui/date-range-field';\n\n<DateRangeField label="Campaign duration" value={range} onChange={setRange} />`,
      },
      {
        slug: 'time-field',
        label: 'TimeField',
        blurb: "The standalone segmented time machine; value is 'HH:mm', bounds saturate.",
        Playground: T.TimeFieldPlayground,
        heroCode: `import { TimeField } from '@zyncat/ui/time-field';\n\n<TimeField label="Broadcast time" value={time} onChange={setTime} />`,
      },
      {
        slug: 'tabs',
        label: 'Tabs',
        blurb: 'Underline or segmented pill - ink reaches then releases; panels enter from the side you moved toward.',
        Playground: T.TabsPlayground,
        heroCode: `import { Tabs, TabPanel } from '@zyncat/ui/tabs';\n\n<Tabs\n  items={items}\n  value={active}\n  onChange={(next, d) => { setActive(next); setDir(d); }}\n  name="views"\n  ariaLabel="Workspace sections"\n/>\n<TabPanel name="views" tab={active} dir={dir}>\n  {panels[active]}\n</TabPanel>`,
      },
    ],
  },
  {
    id: 'overlays',
    title: 'Overlays & feedback',
    docs: [
      {
        slug: 'alert',
        label: 'Alert',
        blurb: 'Persistent, in-flow status. Existence is the only motion - dismissal eases shut.',
        Playground: O.AlertPlayground,
        heroCode: `import { Alert } from '@zyncat/ui/alert';\n\n<Alert tone="warning" title="Subscription renewal" action={{ label: 'Manage plan', onClick: handlePlan }}>\n  Your workspace trial will expire in 3 days.\n</Alert>`,
      },
      {
        slug: 'toast',
        label: 'Toast',
        blurb: 'Imperative toast() API. Mount <Toaster /> once at the root, then fire one from anywhere.',
        Playground: O.ToastPlayground,
        heroCode: `import { toast, Toaster } from '@zyncat/ui/toast';\n\ntoast.success('Changes saved', { description: 'Updated across all workspaces.' });`,
      },
      {
        slug: 'tooltip',
        label: 'Tooltip',
        blurb:
          'Transient hint on hover/focus. One bubble travels between triggers and sticks to its anchor through scroll.',
        Playground: O.TooltipPlayground,
        heroCode: `import { Tooltip } from '@zyncat/ui/tooltip';\n\n<Tooltip content="Schedule post to queue" shortcut="⌘S">\n  <Button variant="secondary">Schedule</Button>\n</Tooltip>`,
      },
      {
        slug: 'dialog',
        label: 'Dialog',
        blurb: 'Styled modal over the headless overlay - scrim, focus trap, scroll lock.',
        Playground: O.DialogPlayground,
        heroCode: `import { Dialog } from '@zyncat/ui/dialog';\n\n<Dialog trigger={<Button variant="danger">Delete project</Button>} title="Delete project permanently?" tone="danger">\n  This action cannot be undone.\n</Dialog>`,
      },
      {
        slug: 'popover',
        label: 'Popover',
        blurb:
          'Headless anchored panel, non-modal - flips and clamps to the viewport. You own the surface; drive dismissal with open/onOpenChange.',
        Playground: O.PopoverPlayground,
        heroCode: `import { Popover } from '@zyncat/ui/popover';\n\n<Popover trigger={<Button variant="secondary">Snooze</Button>} side="bottom" align="start" open={open} onOpenChange={setOpen}>\n  <div className="snooze-panel">...</div>\n</Popover>`,
      },
      {
        slug: 'dropdown',
        label: 'Dropdown',
        blurb: 'Menu button for actions - grouped rows, shortcuts, and submenus that nest as deep as you like.',
        Playground: O.DropdownPlayground,
        heroCode: `import { Dropdown } from '@zyncat/ui/dropdown';\n\n<Dropdown ariaLabel="Post options" trigger={<Button>Options</Button>} items={items} />`,
      },
      {
        slug: 'sheet',
        label: 'Sheet',
        blurb: 'Modal panel docked to an edge - drag-to-dismiss, coupled scrim, scroll handoff.',
        Playground: O.SheetPlayground,
        heroCode: `import { Sheet } from '@zyncat/ui/sheet';\n\n<Sheet side="right" open={open} onOpenChange={setOpen}>\n  <div>Panel content</div>\n</Sheet>`,
      },
      {
        slug: 'emoji-picker',
        label: 'EmojiPicker',
        blurb: 'Searchable emoji grid with a scrollspy category rail - a popover on desktop, a bottom sheet on phones.',
        HeroComponent: O.EmojiPickerHero,
        heroCode: `import { EmojiPickerPanel, loadEmojiData, getEmojiUrl } from '@zyncat/ui/emoji-picker';\n\n<EmojiPickerPanel open={open} onOpenChange={setOpen} onSelect={handleSelect} getEmojiUrl={getEmojiUrl} search trigger={<Button>Add reaction</Button>} />`,
      },
    ],
  },
];

export const DOCS: Doc[] = GROUPS.flatMap((g) => g.docs).map((d) => ({
  ...d,
  props: GENERATED_PROPS[d.slug] ?? [],
  types: GENERATED_TYPES[d.slug] ?? [],
  ...CONTENT[d.slug],
}));
