'use client';

import { useId, useRef } from 'react';

import { Motion } from '../../../../motion/element';
import { GlidePill, useGlide, type GlideApi } from '../../../../motion/glide';
import { motionFor } from '../../../../tokens/motion-tokens';
import { activationProps, type ActivateOn } from '../../../internal/utils/activation';
import { CATEGORY_ICON_ATTRS, CATEGORY_ICONS } from '../category-icons';
import { useCategories, useIsActiveCategory, type EmojiPickerStore } from './useEmojiPicker';

const railGlide = (scope?: Element | null) => {
  const motion = motionFor(scope);
  return { timing: { duration: motion.dur.base, ease: motion.ease.standard } };
};

interface CategoryProps {
  store: EmojiPickerStore;
  categoryKey: string;
  railId: string;
  glide: GlideApi;
  activateOn?: ActivateOn;
  scope: Element | null;
}

function Category({ store, categoryKey, railId, glide, activateOn, scope }: CategoryProps) {
  const isActive = useIsActiveCategory(store, categoryKey);

  return (
    <button
      type="button"
      className={isActive ? 'zc-on-emoji-cat zc-on-emoji-cat--active' : 'zc-on-emoji-cat'}
      aria-label={categoryKey.replace(/-/g, ' ')}
      aria-current={isActive ? true : undefined}
      onPointerEnter={(e) => glide.enter(e.currentTarget)}
      {...activationProps<HTMLButtonElement>(() => store.scrollToCategory(categoryKey), {
        on: activateOn,
        holdFocus: true,
      })}
    >
      <svg
        {...CATEGORY_ICON_ATTRS}
        dangerouslySetInnerHTML={{ __html: CATEGORY_ICONS[categoryKey] ?? CATEGORY_ICONS.symbols }}
      />
      {isActive && (
        <Motion
          as="span"
          layoutId={railId}
          layoutTransition={railGlide(scope)}
          className="zc-on-emoji-cat-rail"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export function CategoryBar({ store, activateOn }: { store: EmojiPickerStore; activateOn?: ActivateOn }) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const glide = useGlide(barRef);
  const railId = useId();
  const categories = useCategories(store);

  if (!categories.length) return null;

  return (
    <div
      ref={barRef}
      className="zc-on-emoji-bar"
      onPointerLeave={glide.leave}
      onMouseDown={(e) => e.preventDefault()}
      role="group"
      aria-label="Emoji categories"
    >
      <GlidePill className="zc-on-emoji-bar-marker" glide={glide} />
      {categories.map((key) => (
        <Category
          key={key}
          store={store}
          categoryKey={key}
          railId={railId}
          glide={glide}
          activateOn={activateOn}
          scope={barRef.current}
        />
      ))}
    </div>
  );
}
