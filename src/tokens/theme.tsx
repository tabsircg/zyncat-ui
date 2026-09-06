import { ThemeSync } from './theme-sync';
import { reducedMotionTokens, type ThemePalette, type ThemeSet, type ThemeTokens } from './theme-tokens.generated';

export type * from './theme-tokens.generated';

export interface ZyncatThemeProps {
  /**
   * The app's palettes. `default` lands on `:root`; every other key becomes a
   * `[data-theme='<key>']` block that layers over it, activated by setting that attribute on
   * `<html>` or any subtree root. Each palette carries a `light` and a `dark` side, selected by
   * `data-polarity`, and `dark` is a delta - what `light` sets and `dark` leaves out carries over.
   */
  themes?: ThemeSet;
}

type TokenTree = { [key: string]: string | number | TokenTree | undefined };
type Declaration = [string, string];
type Polarity = 'light' | 'dark';

const DEFAULT = 'default';
const POLARITIES: Polarity[] = ['light', 'dark'];

const kebabize = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

const resolveDeclarations = (tokens?: ThemeTokens): Declaration[] => {
  const declarations: Declaration[] = [];
  const walk = (value: TokenTree[string], path: string[]) => {
    if (value == null) return;
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, [...path, kebabize(key)]);
    } else {
      declarations.push([`--${path.join('-')}`, String(value)]);
    }
  };
  for (const [category, value] of Object.entries(tokens ?? {})) {
    if (value == null) continue;
    if (category === 'custom') {
      for (const [property, custom] of Object.entries(value as TokenTree))
        if (custom != null) declarations.push([property, String(custom)]);
    } else {
      walk(value as TokenTree, []);
    }
  }
  return declarations;
};

const cssBlock = (selectors: string[], declarations: Declaration[], indent = ''): string => {
  const head = selectors.map((selector) => `${indent}${selector}`).join(',\n');
  const body = declarations.map(([name, value]) => `${indent}  ${name}: ${value};`).join('\n');
  return `${head} {\n${body}\n${indent}}`;
};

const selectorsFor = (palette: string, polarity: Polarity): string[] => {
  if (palette !== DEFAULT) return [`[data-theme='${palette}'][data-polarity='${polarity}']`];
  return polarity === 'light' ? [':root', "[data-polarity='light']"] : ["[data-polarity='dark']"];
};

const inheritLight = (light: Declaration[], dark: Declaration[]): Declaration[] => {
  const overridden = new Set(dark.map(([name]) => name));
  return [...light.filter(([name]) => !overridden.has(name)), ...dark];
};

const paletteBlocks = (palette: string, tokens: ThemePalette) => {
  const light = resolveDeclarations(tokens.light);
  const dark = inheritLight(light, resolveDeclarations(tokens.dark));
  const sides: Record<Polarity, Declaration[]> = { light, dark };
  return POLARITIES.map((polarity) => ({
    selectors: selectorsFor(palette, polarity),
    declarations: sides[polarity],
  })).filter((block) => block.declarations.length);
};

const renderThemeCss = (themes?: ThemeSet): string => {
  const blocks = Object.entries(themes ?? {})
    .sort(([a], [b]) => Number(b === DEFAULT) - Number(a === DEFAULT))
    .flatMap(([palette, tokens]) => (tokens ? paletteBlocks(palette, tokens) : []));
  if (!blocks.length) return '';

  const collapsed: Declaration[] = [];
  const seen = new Set<string>();
  for (const [cssName] of blocks.flatMap((block) => block.declarations)) {
    const collapseValue = reducedMotionTokens[cssName];
    if (collapseValue && !seen.has(cssName)) {
      seen.add(cssName);
      collapsed.push([cssName, collapseValue]);
    }
  }

  const parts = blocks.map((block) => cssBlock(block.selectors, block.declarations));
  if (collapsed.length) {
    const scopes = blocks.flatMap((block) => block.selectors);
    parts.push(`@media (prefers-reduced-motion: reduce) {\n${cssBlock(scopes, collapsed, '  ')}\n}`);
  }
  return parts.join('\n');
};

export function defineTheme(tokens: ThemeTokens): ThemeTokens {
  return tokens;
}

export function ZyncatTheme({ themes }: ZyncatThemeProps) {
  const css = renderThemeCss(themes);
  if (!css) return null;
  return (
    <>
      <style data-zyncat-theme="">{css}</style>
      <ThemeSync css={css} />
    </>
  );
}
