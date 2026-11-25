/**
 * Vue tag chip: a small labeled chip with an optional remove button.
 *
 * Vue counterpart of `@molecule/app-tag-input-react`'s `TagChip` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input. The visible text arrives as the default slot.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * The chip body's action, on a native button whose chrome is reset inline so
 * it reads as the label text under any ClassMap bond.
 */
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
 * @returns The chip component.
 */
export const TagChip = defineComponent({
  name: 'TagChip',
  props: {
    // Node-valued: the caller passes the label as the default slot (a
    // `children` vnode prop arrives as that slot too).
    children: null,
    onRemove: Function as PropType<() => void>,
    onClick: Function as PropType<() => void>,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * The chips's size/shape tokens plus the caller's classes.
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
     * The visible label: the default slot, else a `children` prop.
     * @returns The label nodes.
     */
    const label = (): VNodeChild[] =>
      slots.default ? slots.default() : props.children != null ? [props.children] : []

    /**
     * Keyboard activation for the chip body — the same handler the mouse
     * click runs. `preventDefault()` suppresses Space's page scroll and
     * Enter's form submission when a chip sits inside a form.
     * @param e - DOM keyboard event.
     */
    const handleBodyKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      props.onClick?.()
    }

    return (): VNodeChild => {
      // No remove control inside — the chip is the whole control, so it
      // carries the button role, a tab stop, and the keyboard path for its
      // click.
      if (props.onClick && !props.onRemove) {
        return h(
          'span',
          {
            class: cm.cn(chipClass(), cm.cursorPointer),
            role: 'button',
            tabindex: 0,
            onClick: props.onClick,
            onKeydown: handleBodyKeyDown,
          },
          [h('span', label())],
        )
      }

      // A remove button shares the chip, so the container is not a control —
      // the body action moves onto a native button around the label text and
      // the remove button stands beside it as a sibling.
      return h('span', { class: chipClass() }, [
        props.onClick
          ? h(
              'button',
              {
                type: 'button',
                onClick: props.onClick,
                class: cm.cn(cm.cursorPointer),
                style: labelButtonReset,
              },
              [h('span', label())],
            )
          : h('span', label()),
        props.onRemove
          ? h(
              'button',
              {
                type: 'button',
                onClick: props.onRemove,
                'aria-label': t('tagChip.remove', {}, { defaultValue: 'Remove' }),
                class: cm.cn(cm.w(4), cm.h(4), cm.flex({ align: 'center', justify: 'center' })),
              },
              t('tagChip.removeGlyph', undefined, { defaultValue: '×' }),
            )
          : null,
      ])
    }
  },
})
