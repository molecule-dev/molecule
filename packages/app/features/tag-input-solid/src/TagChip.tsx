/**
 * Solid tag chip: a small labeled chip with an optional remove button.
 *
 * Solid counterpart of `@molecule/app-tag-input-react`'s `TagChip` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { TagChipProps } from './types.js'

/** The chip body's action, on a native button whose chrome is reset inline so it reads as the label text. */
const labelButtonReset = {
  background: 'transparent',
  border: 'none',
  padding: '0',
  font: 'inherit',
  color: 'inherit',
}

/**
 * Small labeled chip with an optional close button. Used inside `<TagInput>`
 * but also usable standalone as a label display element.
 *
 * The chip body action is keyboard-operable. With no remove button the chip
 * itself is the control: `role="button"`, tabbable, and Enter / Space fire
 * `onClick`. With a remove button the action lives on a native button around
 * the label text instead, since a button may not contain another control — the
 * native button carries its own Enter / Space activation.
 *
 * @param props - Component props (see {@link TagChipProps}).
 * @returns The rendered chip.
 */
export const TagChip: Component<TagChipProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /**
   * The chip's size/shape tokens plus the caller's classes.
   * @returns The class string.
   */
  const chipClass = (): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 2),
      cm.sp('py', 1),
      cm.textSize('xs'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      props.className,
    )

  /**
   * Keyboard activation for the chip body — the same handler the mouse click
   * runs. `preventDefault()` suppresses Space's page scroll and Enter's form
   * submission when a chip sits inside a form.
   * @param e - DOM keyboard event.
   */
  const handleBodyKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    props.onClick?.()
  }

  return (
    <Show
      when={!!props.onClick && !props.onRemove}
      fallback={
        <span class={chipClass()}>
          <Show when={props.onClick} fallback={<span>{props.children}</span>}>
            <button
              type="button"
              onClick={props.onClick}
              class={cm.cn(cm.cursorPointer)}
              style={labelButtonReset}
            >
              <span>{props.children}</span>
            </button>
          </Show>
          <Show when={props.onRemove}>
            <button
              type="button"
              onClick={props.onRemove}
              aria-label={t('tagChip.remove', {}, { defaultValue: 'Remove' })}
              class={cm.cn(cm.w(4), cm.h(4), cm.flex({ align: 'center', justify: 'center' }))}
            >
              {t('tagChip.removeGlyph', undefined, { defaultValue: '×' })}
            </button>
          </Show>
        </span>
      }
    >
      <span
        class={cm.cn(chipClass(), cm.cursorPointer)}
        role="button"
        tabindex={0}
        onClick={props.onClick}
        onKeyDown={handleBodyKeyDown}
      >
        <span>{props.children}</span>
      </span>
    </Show>
  )
}
