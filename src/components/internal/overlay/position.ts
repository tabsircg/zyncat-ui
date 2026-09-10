'use client';

import { useLayoutEffect, type RefObject } from 'react';

import { tokenPx } from '../utils/token-px';

const GLIDE = 'left var(--duration-fast) var(--ease-standard), top var(--duration-fast) var(--ease-standard)';

export interface VirtualAnchor {
  getBoundingClientRect(): DOMRect;
}

interface UseAnchorPositionProps {
  side: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
  arrow: boolean;
  anchor?: VirtualAnchor | null;
  triggerRef: RefObject<HTMLElement>;
  panelRef: RefObject<HTMLElement>;
}

export function useAnchorPosition({ side, align, arrow, anchor, triggerRef, panelRef }: UseAnchorPositionProps) {
  useLayoutEffect(() => {
    const place = (moved: boolean) => {
      const t = anchor ?? triggerRef.current;
      const p = panelRef.current;
      if (!t || !p) return;

      const r = t.getBoundingClientRect();
      const pw = p.offsetWidth;
      const ph = p.offsetHeight;

      const edge = tokenPx('--space-2', 0, p);

      const gap = arrow ? tokenPx('--space-2', 0, p) + 3 : 0;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const room: Record<string, number> = { top: r.top, bottom: vh - r.bottom, left: r.left, right: vw - r.right };

      const opposite: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      };

      const vertical = side === 'top' || side === 'bottom';

      let s = side;
      if (room[s] < (vertical ? ph : pw) + gap && room[opposite[s]] > room[s]) {
        s = opposite[s];
      }

      let x: number;
      let y: number;

      if (vertical) {
        y = s === 'top' ? r.top - ph - gap : r.bottom + gap;

        x = align === 'start' ? r.left : align === 'end' ? r.right - pw : r.left + (r.width - pw) / 2;

        x = Math.min(Math.max(x, edge), vw - pw - edge);

        y = Math.max(Math.min(y, vh - ph - edge), edge);
      } else {
        x = s === 'left' ? r.left - pw - gap : r.right + gap;

        y = align === 'start' ? r.top : align === 'end' ? r.bottom - ph : r.top + (r.height - ph) / 2;

        y = Math.min(Math.max(y, edge), vh - ph - edge);
        x = Math.max(Math.min(x, vw - pw - edge), edge);
      }

      const left = Math.round(x) + 'px';
      const top = Math.round(y) + 'px';
      if (p.style.left !== left || p.style.top !== top) {
        p.style.transition = moved && p.style.left ? GLIDE : '';
        p.style.left = left;
        p.style.top = top;
      }

      p.setAttribute('data-side', s);
      p.setAttribute('data-align', align);

      if (arrow) {
        if (vertical) {
          p.style.setProperty(
            '--overlay-arrow-x',
            Math.round(Math.min(Math.max(r.left + r.width / 2 - x, 12), pw - 12)) + 'px',
          );
        } else {
          p.style.setProperty(
            '--overlay-arrow-y',
            Math.round(Math.min(Math.max(r.top + r.height / 2 - y, 12), ph - 12)) + 'px',
          );
        }
      }
    };

    place(true);

    const track = () => place(false);

    window.addEventListener('scroll', track, true);
    window.addEventListener('resize', track);

    const ro = new ResizeObserver(track);
    ro.observe(panelRef.current!);

    return () => {
      window.removeEventListener('scroll', track, true);
      window.removeEventListener('resize', track);
      ro.disconnect();
    };
  }, [side, align, arrow, anchor]); // eslint-disable-line react-hooks/exhaustive-deps
}
