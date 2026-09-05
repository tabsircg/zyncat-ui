'use client';

import { useState, type CSSProperties } from 'react';
import { ChatCircle, Clock, Envelope, Monitor, WhatsappLogo } from '@phosphor-icons/react';

import { Avatar } from '@zyncat/ui/avatar';
import { AvatarGroup } from '@zyncat/ui/avatar-group';
import { SupportRail, type SupportAction, type SupportRailProps } from '@zyncat/ui/support-rail';

import { KnobSegment, KnobSwitch, Playground } from '../playground';

const FRAME: CSSProperties = {
  position: 'relative',
  height: '26rem',
  border: 'none',
  background: 'var(--bg-app)',
  overflow: 'hidden',
  isolation: 'isolate',
};

const ACTIONS: SupportAction[] = [
  { id: 'chat', label: 'Live chat', meta: '~40s', icon: <ChatCircle /> },
  { id: 'call', label: 'Book a call', meta: '15:00', icon: <Clock /> },
  { id: 'wa', label: 'WhatsApp', meta: '~6m', icon: <WhatsappLogo /> },
  { id: 'mail', label: 'Email a ticket', meta: '~4h', icon: <Envelope /> },
  { id: 'share', label: 'Screen share', meta: 'on ask', icon: <Monitor /> },
];

function Shift() {
  return (
    <AvatarGroup size="sm" max={3}>
      <Avatar name="Mara Ellis" />
      <Avatar name="Idris Kane" />
      <Avatar name="Rae Okoro" />
      <Avatar name="Tom Vega" />
    </AvatarGroup>
  );
}

export function SupportRailPlayground() {
  const [side, setSide] = useState<NonNullable<SupportRailProps['side']>>('right');
  const [open, setOpen] = useState(true);
  const [ownTrigger, setOwnTrigger] = useState(false);

  const code = `<SupportRail
  actions={actions}
  side="${side}"
  open={open}
  onOpenChange={setOpen}
  status="Open · closes 20:00 GMT+1"${ownTrigger ? '\n  trigger={<Avatar name="Mara Ellis" size="sm" />}' : ''}
  footer={<Shift />}
/>`;

  return (
    <Playground
      code={code}
      stage="bare"
      note="The tab is the only hit target until the panel opens. Escape and the close button shut it."
      rail={
        <>
          <KnobSegment label="side" value={side} onChange={setSide} options={['right', 'left']} />
          <KnobSwitch label="open" checked={open} onChange={setOpen} />
          <KnobSwitch label="own trigger" checked={ownTrigger} onChange={setOwnTrigger} />
        </>
      }
    >
      <div style={FRAME}>
        <SupportRail
          actions={ACTIONS}
          side={side}
          open={open}
          onOpenChange={setOpen}
          status="Open · closes 20:00 GMT+1"
          trigger={ownTrigger ? <Avatar name="Mara Ellis" size="sm" /> : undefined}
          footer={<Shift />}
        />
      </div>
    </Playground>
  );
}
