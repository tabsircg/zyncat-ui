import type { PageSeo } from './types';

const seo: PageSeo = {
  title: 'React Support Rail Component',
  description:
    'A React support rail - an edge tab that expands into an action panel with a scrolling row list and a pinned footer, without covering the screen.',
  keywords: [
    'support rail',
    'react support rail',
    'support rail component',
    'react support rail component',
    'support panel',
    'edge tab',
  ],
  lede: 'An edge tab that grows a support panel from its measured box - use it over Sheet when the tab must stay visible.',
  faq: [
    {
      q: 'How do I add rows to the SupportRail panel?',
      a: 'Pass actions - each item renders a row with a label, an optional description line and optional meta text. Selecting one calls onSelect(id, action) and the panel stays open, so you render what happens next - a form, a confirmation - in children rather than the rail navigating away for you.',
    },
    {
      q: 'How do I dismiss the panel?',
      a: 'Escape closes it, so does the visible close button, and so does a press anywhere outside the panel. It folds back into the tab it grew out of.',
    },
    {
      q: 'Can I use my own trigger instead of the default tab icon?',
      a: 'trigger takes any node - an icon, a word, an avatar - and the rail renders it inside the tab it owns, keeping the edge, the ARIA and the fold-back animation. Leave it out and you get a chat glyph; title names the tab either way.',
    },
    {
      q: 'Which edge does the rail pin to?',
      a: 'side is "right" (the default) or "left", and it flips more than which edge the needle sits on - the collapse origin and the panel\'s border all mirror with it, so a left rail isn\'t just a right rail nudged over.',
    },
  ],
};

export default seo;
