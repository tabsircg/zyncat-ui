import { animate, flip, measure, set } from '../../../engine';
import { motionFor } from '../../../tokens/motion-tokens';
import type { EmojiData } from './data';
import { el } from './dom';
import type { GetEmojiUrl } from './types';

const IDLE_CAPTION = 'Pick an emoji…';
const MARKER_OPACITY = 0.6;

export function createScaffold(root: HTMLElement, emojiData: EmojiData, getEmojiUrl: GetEmojiUrl, listboxId: string) {
  const scroll = el('div', 'zc-on-emoji-scroll');
  const marker = el('span', 'zc-on-emoji-marker');
  const caption = el('div', 'zc-on-emoji-caption');

  scroll.id = listboxId;
  scroll.setAttribute('role', 'listbox');
  scroll.setAttribute('aria-label', 'Emoji');

  caption.innerHTML =
    '<img class="zc-on-emoji-caption-img" alt="" draggable="false" hidden>' +
    '<span class="zc-on-emoji-caption-name"></span><span class="zc-on-emoji-caption-code"></span>';
  const [captionImg, captionName, captionCode] = caption.children as unknown as [
    HTMLImageElement,
    HTMLElement,
    HTMLElement,
  ];

  root.className = 'zc-on-emoji-body';
  root.append(scroll, caption);

  const setCaption = (btn: HTMLButtonElement | null) => {
    const emoji = btn?.dataset.id ? emojiData.emojis[btn.dataset.id] : null;
    caption.classList.toggle('zc-is-idle', !emoji);
    captionImg.hidden = !emoji;
    captionName.textContent = emoji ? emoji.name : IDLE_CAPTION;
    captionCode.textContent = emoji ? `:${emoji.shortcodes[0] ?? emoji.id}:` : '';
    if (emoji) captionImg.src = getEmojiUrl(emoji.id, 'picker-grid');
  };
  setCaption(null);

  const offsetWithinScroll = (node: HTMLElement) => {
    let left = 0;
    let top = 0;
    for (let box: HTMLElement | null = node; box && box !== scroll; box = box.offsetParent as HTMLElement | null) {
      left += box.offsetLeft;
      top += box.offsetTop;
    }
    return { left, top };
  };

  let hadFocus = false;
  const positionMarker = (btn: HTMLButtonElement | null) => {
    const motion = motionFor(scroll);
    if (!btn?.offsetHeight) {
      animate(marker, { opacity: [0], timing: motion.t.exit });
      hadFocus = false;
      return;
    }
    const from = hadFocus ? measure(marker) : null;
    const tile = offsetWithinScroll(btn);
    set(marker, { x: [tile.left], y: [tile.top], width: [btn.offsetWidth], height: [btn.offsetHeight] });
    animate(marker, { opacity: [MARKER_OPACITY], timing: { duration: motion.dur.fast, ease: motion.ease.standard } });
    hadFocus = true;
    if (from && !motion.reduced)
      flip(marker, from, { size: 'none', timing: { duration: motion.dur.base, ease: motion.ease.standard } });
  };

  const mountMarker = () => {
    hadFocus = false;
    set(marker, { opacity: [0] });
    scroll.appendChild(marker);
  };

  return { scroll, setCaption, positionMarker, mountMarker };
}
