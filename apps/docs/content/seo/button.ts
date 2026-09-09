import type { PageSeo } from './types';

const seo: PageSeo = {
  title: 'React Button Component',
  description:
    'A React button component with six variants, four sizes and a built-in loading state that overlays a spinner without shifting width or layout.',
  keywords: [
    'button',
    'react button',
    'button component',
    'react button component',
    'loading button',
    'button variants',
    'icon button',
    'primary button',
  ],
  lede: 'One control for every click action - six variants, four sizes, and a loading state that never shifts layout.',
  faq: [
    {
      q: 'What variants does the Button component support?',
      a: "Five: primary, secondary, ghost, danger and link. For chrome without a skin, call buttonClass() with no variant - it returns sizing, focus ring and layout only, which is how Alert's own action button is built.",
    },
    {
      q: 'How do I show a loading state on a button?',
      a: "Set loading - the label fades to 0 opacity so the button keeps its width, a centered spinner overlays it, aria-busy is set, and the button becomes disabled so it can't be clicked mid-request.",
    },
    {
      q: 'How do I make an icon-only button?',
      a: 'Use size="icon" - it renders a fixed square button, sized to match the small control height, with no horizontal padding. There\'s no iconLeft/iconRight prop; pass the icon directly as children, and add your own aria-label since there\'s no visible label text.',
    },
    {
      q: 'Does Button forward a ref and standard HTML attributes?',
      a: "Yes - ref is a plain prop forwarded straight to the underlying <button> (React 19's ref-as-prop), and standard attributes like onClick, name, form or aria-* pass through directly or via htmlProps, which wins if the same attribute is set both ways.",
    },
  ],
};

export default seo;
