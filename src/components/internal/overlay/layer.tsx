'use client';

import './trigger.css';

import {
  cloneElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { sharedSlot } from '../../../shared-slot';
import { activationProps, type ActivateOn } from '../utils/activation';

interface OverlayEntry {
  contains: (t: EventTarget | null) => boolean;
  isDismissible: () => boolean;
  requestClose: () => void;
  _dismissible?: boolean;
  _close?: () => void;
}

const ovStack = sharedSlot('overlay.stack@1', () => [] as OverlayEntry[]);

function ovOnDocKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || ovStack.length === 0) return;
  const top = ovStack[ovStack.length - 1];
  if (!top.isDismissible()) return;
  e.preventDefault();
  top.requestClose();
}

function ovIsTop(entry: OverlayEntry) {
  return ovStack[ovStack.length - 1] === entry;
}

function ovInOverlayAbove(entry: OverlayEntry, target: EventTarget | null) {
  const i = ovStack.indexOf(entry);
  return i >= 0 && ovStack.slice(i + 1).some((e) => e.contains(target));
}

function useOverlayEntry({
  nodeRef,
  dismissible,
  requestClose,
}: {
  nodeRef: RefObject<HTMLElement>;
  dismissible: boolean;
  requestClose: () => void;
}): OverlayEntry {
  const ref = useRef<OverlayEntry>(null);
  if (!ref.current) {
    ref.current = {
      contains: (t) => Boolean(nodeRef.current && nodeRef.current.contains(t as Node)),
      isDismissible: () => ref.current._dismissible,
      requestClose: () => ref.current._close(),
    };
  }
  ref.current._dismissible = dismissible;
  ref.current._close = requestClose;

  useLayoutEffect(() => {
    const entry = ref.current;
    if (ovStack.length === 0) document.addEventListener('keydown', ovOnDocKeyDown);
    ovStack.push(entry);
    if (nodeRef.current) nodeRef.current.style.zIndex = 'calc(var(--layer-overlay) + ' + (ovStack.length - 1) + ')';
    return () => {
      const i = ovStack.indexOf(entry);
      if (i >= 0) ovStack.splice(i, 1);
      if (ovStack.length === 0) document.removeEventListener('keydown', ovOnDocKeyDown);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return ref.current;
}

function useOutsidePress({
  entry,
  refs,
  enabled,
  onPress,
}: {
  entry: OverlayEntry;
  refs: RefObject<HTMLElement>[];
  enabled: boolean;
  onPress: () => void;
}) {
  const latest = useRef<{ enabled: boolean; onPress: () => void }>(null);
  latest.current = { enabled, onPress };
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!latest.current.enabled) return;
      const t = e.target;
      if (refs.some((r) => r.current && r.current.contains(t as Node))) return;
      if (ovInOverlayAbove(entry, t)) return;
      latest.current.onPress();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

function ovCloneTrigger(
  trigger: ReactElement | null,
  {
    open,
    onPress,
    onKeyDown,
    panelId,
    haspopup,
    triggerRef,
    activateOn,
  }: {
    open: boolean;
    onPress: () => void;
    onKeyDown?: (e: ReactKeyboardEvent<HTMLElement>) => void;
    panelId: string;
    haspopup: string;
    triggerRef: RefObject<HTMLElement>;
    activateOn?: ActivateOn;
  },
): ReactElement | null {
  if (!trigger) return null;
  const own = trigger.props as {
    onClick?: (e: ReactMouseEvent<HTMLElement>) => void;
    onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
    onKeyDown?: (e: ReactKeyboardEvent<HTMLElement>) => void;
  };
  const ownRef = (trigger as ReactElement & { ref?: Ref<HTMLElement> }).ref;
  const keys = onKeyDown && {
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      own.onKeyDown?.(e);
      onKeyDown(e);
    },
  };
  return cloneElement(trigger, {
    'aria-haspopup': haspopup,
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
    'data-activate': activateOn === 'pointerdown' ? 'pointerdown' : undefined,
    ...activationProps<HTMLElement>(() => onPress(), {
      on: activateOn,
      onPointerDown: own.onPointerDown,
      onClick: own.onClick,
    }),
    ...keys,
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof ownRef === 'function') ownRef(node);
      else if (ownRef) ownRef.current = node;
    },
  } as Partial<typeof trigger.props>);
}

const subscribeToNothing = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

const ovNearestTheme = (el: Element | null | undefined, attr: string): string | null =>
  el?.closest(`[${attr}]`)?.getAttribute(attr) ?? null;

const ovThemeDifferingFromPage = (scope: Element | null | undefined, attr: string): string | undefined => {
  const own = ovNearestTheme(scope, attr);
  return own !== null && own !== ovNearestTheme(document.body, attr) ? own : undefined;
};

export interface InheritedThemeAttrs {
  'data-theme'?: string;
  'data-polarity'?: string;
}

export function inheritedThemeAttrs(scope: Element | null | undefined): InheritedThemeAttrs {
  return {
    'data-theme': ovThemeDifferingFromPage(scope, 'data-theme'),
    'data-polarity': ovThemeDifferingFromPage(scope, 'data-polarity'),
  };
}

function OverlayPortal({
  container,
  scope,
  children,
}: {
  container?: HTMLElement | null;
  scope?: Element | null;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(
    <div data-overlay-root="" {...inheritedThemeAttrs(scope)}>
      {children}
    </div>,
    container ?? document.body,
  );
}

export { ovIsTop, ovInOverlayAbove, useOverlayEntry, useOutsidePress, ovCloneTrigger, OverlayPortal };
export type { OverlayEntry };
