import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  Browsers,
  Bug,
  CaretDown,
  Check,
  Code,
  Copy,
  Cpu,
  Hash,
  Heart,
  Lightbulb,
  Lightning,
  List,
  MagnifyingGlass,
  Moon,
  Package,
  Plus,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
  Star,
  Sun,
  TerminalWindow,
  X,
} from '@phosphor-icons/react';
import type { IconWeight } from '@phosphor-icons/react';

type Glyph = typeof Check;

const REGISTRY = {
  'arrow-counter-clockwise': ArrowCounterClockwise,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrows-out': ArrowsOut,
  browsers: Browsers,
  bug: Bug,
  'caret-down': CaretDown,
  check: Check,
  code: Code,
  copy: Copy,
  cpu: Cpu,
  hash: Hash,
  heart: Heart,
  lightbulb: Lightbulb,
  lightning: Lightning,
  list: List,
  'magnifying-glass': MagnifyingGlass,
  moon: Moon,
  package: Package,
  plus: Plus,
  rocket: RocketLaunch,
  'shield-check': ShieldCheck,
  sparkle: Sparkle,
  star: Star,
  sun: Sun,
  terminal: TerminalWindow,
  x: X,
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof REGISTRY;

type IconSize = 'sm' | 'md' | 'lg';
const SIZE_PX: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

export interface IconProps {
  name: IconName;
  size?: IconSize;
  weight?: IconWeight;
}

export function Icon({ name, size = 'md', weight = 'regular' }: IconProps) {
  const Glyph = REGISTRY[name];
  return <Glyph size={SIZE_PX[size]} weight={weight} aria-hidden />;
}
