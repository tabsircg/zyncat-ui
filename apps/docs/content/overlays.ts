import type { ComponentDoc } from './types';

export const overlays: Record<string, ComponentDoc> = {
  alert: {
    example: `import { Alert } from '@zyncat/ui/alert';

<Alert
  tone="warning"
  title="Your trial ends in 3 days"
  action={{ label: 'Upgrade now', onClick: handleUpgrade }}
  dismissible
>
  Switch to a paid plan to keep your scheduled posts running.
</Alert>`,
  },

  toast: {
    example: `import { Toaster, toast } from '@zyncat/ui/toast';

// Mount <Toaster /> once near your app root. Without it, toast() renders nothing.
function App() {
  return (
    <>
      <Toaster position="bottom-right" />
      <YourApp />
    </>
  );
}

// Then call toast() from anywhere - no context, no provider.
toast.success('Post scheduled', { description: '10 posts added to the Monday queue.' });

toast.promise(publishBatch(), {
  loading: 'Publishing batch...',
  success: (r) => 'Batch complete - ' + r.count + ' posts published',
  error: (e) => 'Batch failed: ' + e.message,
});`,
    props: [
      {
        name: '<Toaster />',
        type: 'ToasterProps',
        required: true,
        description: 'Mount once at the app root. Owns the viewport; toast() no-ops until it is mounted.',
      },
      {
        name: 'Toaster position',
        type: "'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'",
        default: "'bottom-right'",
        description: 'Corner the stack anchors to.',
      },
      {
        name: 'Toaster duration',
        type: 'number',
        default: '0',
        description: 'Default auto-dismiss in ms for timed toasts; 0 keeps the per-tone defaults.',
      },
      {
        name: 'Toaster visibleToasts',
        type: 'number',
        default: '3',
        description: 'How many cards stay visible before the rest recede behind.',
      },
      {
        name: 'Toaster expand',
        type: 'boolean',
        default: 'false',
        description: 'Start the stack fanned open instead of collapsed.',
      },
      {
        name: 'Toaster gap, offset',
        type: 'number',
        default: '0',
        description: 'Px between cards and inset from the edge; 0 uses the token defaults.',
      },
      {
        name: 'toast(msg, opts?)',
        type: '(msg: string, opts?: ToastOptions) => string',
        description: 'Show a neutral toast and return its id.',
      },
      {
        name: 'toast.success(msg, opts?)',
        type: '(msg: string, opts?: ToastOptions) => string',
        description: 'Show a success toast; auto-dismisses after 5 s.',
      },
      {
        name: 'toast.error(msg, opts?)',
        type: '(msg: string, opts?: ToastOptions) => string',
        description: 'Show an error toast; auto-dismisses after 8 s.',
      },
      {
        name: 'toast.warning(msg, opts?)',
        type: '(msg: string, opts?: ToastOptions) => string',
        description: 'Show a warning toast; auto-dismisses after 8 s.',
      },
      {
        name: 'toast.info(msg, opts?)',
        type: '(msg: string, opts?: ToastOptions) => string',
        description: 'Show an info toast; auto-dismisses after 5 s.',
      },
      {
        name: 'toast.loading(msg, opts?)',
        type: '(msg: string, opts?: ToastOptions) => string',
        description: 'Show a sticky loading toast; stays visible until updated or dismissed.',
      },
      {
        name: 'toast.dismiss(id?)',
        type: '(id?: string | null) => void',
        description: 'Dismiss a toast by id, or all toasts if id is omitted.',
      },
      {
        name: 'toast.update(id, patch?)',
        type: '(id: string, patch?: Partial<ToastRecord>) => string',
        description: 'Update a live toast in place; changing tone resets its auto-dismiss timer.',
      },
      {
        name: 'toast.promise(promise, msgs?)',
        type: '<T>(promise: Promise<T>, msgs?: { loading?: string; success?: string | ((v: T) => string); error?: string | ((e: unknown) => string) }) => Promise<T>',
        description: 'Show a loading toast that transitions to success or error when the promise settles.',
      },
      {
        name: 'toast.custom(node, opts?)',
        type: '(node: unknown, opts?: { id?: string | number; duration?: number; dismissible?: boolean }) => string',
        description: 'Show a fully custom React node toast with no built-in chrome.',
      },
      {
        name: 'opts.id',
        type: 'string | number',
        description: 'Stable key for deduplication and targeted updates via toast.update.',
      },
      { name: 'opts.duration', type: 'number', description: 'Auto-dismiss delay in ms; omit to use the tone preset.' },
      { name: 'opts.description', type: 'string | null', description: 'Secondary line shown below the message.' },
      {
        name: 'opts.action',
        type: '{ label: string; onClick: () => void }',
        description: 'Action button shown inside the toast; dismisses the toast after the click handler runs.',
      },
    ],
  },

  tooltip: {
    example: `import { Tooltip } from '@zyncat/ui/tooltip';

<Tooltip content="Schedule to queue" shortcut="S">
  <button type="button">Schedule</button>
</Tooltip>

<Tooltip
  content="Your drafts land here"
  placement="right"
  open={tour === 'drafts'}
  onOpenChange={(next) => !next && advanceTour()}
>
  <button type="button">Drafts</button>
</Tooltip>`,
  },

  dialog: {
    example: `import { Dialog } from '@zyncat/ui/dialog';

<Dialog
  trigger={<button type="button">Delete post</button>}
  title="Delete scheduled post?"
  tone="danger"
  footer={(close) => (
    <>
      <button type="button" onClick={close}>Cancel</button>
      <button type="button" onClick={() => { deletePost(); close(); }}>Delete post</button>
    </>
  )}
>
  This will remove the post from the queue permanently.
</Dialog>`,
  },

  dropdown: {
    example: `import { Dropdown } from '@zyncat/ui/dropdown';

<Dropdown
  ariaLabel="Post actions"
  trigger={<Button variant="secondary">Actions</Button>}
  onSelect={(id) => run(id)}
  items={[
    {
      label: 'Edit',
      items: [
        { id: 'rename', label: 'Rename', icon: <PencilIcon />, shortcut: 'R' },
        {
          id: 'move',
          label: 'Move to',
          items: [
            { id: 'drafts', label: 'Drafts', description: 'Not visible to anyone' },
            { id: 'campaigns', label: 'Campaigns', items: [{ id: 'launch', label: 'Product launch' }] },
          ],
        },
      ],
    },
    { items: [{ id: 'delete', label: 'Delete post', danger: true }] },
  ]}
/>`,
  },
  popover: {
    example: `import { useState } from 'react';
import { Popover } from '@zyncat/ui/popover';

const [open, setOpen] = useState(false);

<Popover
  trigger={<button type="button">Actions</button>}
  side="bottom"
  align="start"
  open={open}
  onOpenChange={setOpen}
>
  <menu>
    <li><button type="button" onClick={() => setOpen(false)}>Reschedule</button></li>
    <li><button type="button" onClick={() => setOpen(false)}>Move to drafts</button></li>
  </menu>
</Popover>`,
  },

  'theme-switcher': {
    example: `import { ZyncatTheme } from '@zyncat/ui/theme';
import { ThemeSwitcher } from '@zyncat/ui/theme-switcher';

// Once, first in <body>: the palettes, and the boot script that paints the stored choice before first paint.
<ZyncatTheme themes={{ default: { light, dark }, ocean: { light: oceanLight, dark: oceanDark } }} />

// Anywhere: the chip opens a grid with one card per palette and side, plus a split System card.
<ThemeSwitcher labels={{ default: 'Acme', ocean: 'Ocean' }} align="end" />`,
  },

  sheet: {
    example: `import { useState } from 'react';
import { Sheet } from '@zyncat/ui/sheet';

const [open, setOpen] = useState(false);

<Sheet
  side="right"
  trigger={<button type="button">Channel settings</button>}
  open={open}
  onOpenChange={setOpen}
>
  <div>
    <h2>Channel settings</h2>
    <p>Configure posting rules and scheduling limits for this channel.</p>
    <button type="button" onClick={() => setOpen(false)}>Done</button>
  </div>
</Sheet>`,
  },

  'emoji-picker': {
    example: `import { useState } from 'react';
import { EmojiPickerPanel, loadEmojiData, getEmojiUrl } from '@zyncat/ui/emoji-picker';

// The dataset is not bundled - load it once, before the panel first opens.
loadEmojiData('/emojis.json');

const [open, setOpen] = useState(false);

<EmojiPickerPanel
  open={open}
  onOpenChange={setOpen}
  onSelect={(shortcode, hexId) => {
    addReaction(shortcode, hexId);
    setOpen(false);
  }}
  getEmojiUrl={getEmojiUrl}
  search
  popoverProps={{ side: 'bottom', align: 'start' }}
  trigger={<button type="button">Add reaction</button>}
/>`,
  },
};
