import { defineTheme, type ThemeSet } from '@zyncat/ui/theme';

export const DOCS_THEMES: ThemeSet = {
  default: { name: 'Zyncat' },
  ember: {
    name: 'Ember',
    light: defineTheme({ color: { accent: 'oklch(0.61 0.16 42)' } }),
    dark: defineTheme({ color: { accent: 'oklch(0.73 0.15 48)' } }),
  },
  iris: {
    name: 'Iris',
    light: defineTheme({ color: { accent: 'oklch(0.58 0.19 292)' } }),
    dark: defineTheme({ color: { accent: 'oklch(0.72 0.14 292)' } }),
  },
};
