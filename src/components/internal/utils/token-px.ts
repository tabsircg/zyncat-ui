export function tokenPx(token: string, fallback = 0, scope?: Element | null): number {
  if (typeof document === 'undefined') return fallback;
  const el = scope ?? document.documentElement;
  const v = getComputedStyle(el).getPropertyValue(token).trim();
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return v.endsWith('rem') ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n;
}
