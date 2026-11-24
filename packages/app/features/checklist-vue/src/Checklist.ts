/**
 * Vue onboarding checklist: checkable items + optional title + overall
 * progress bar.
 *
 * Vue counterpart of `@molecule/app-checklist-react`'s `Checklist` — the same
 * props (React names), the same DOM for the same input, and the same
 * `onToggle(id, next)` calls.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Checkbox } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { ChecklistItem } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The title node, or undefined.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | undefined,
): VNodeChild | undefined => {
  const value: VNodeChild = slot ? slot() : prop
  // A slot or prop that renders nothing is absent (React's `slot()`).
  if (toChildArray(value).length === 0) return undefined
  return Array.isArray(value) && value.length === 1 ? value[0] : value
}

/**
 * Onboarding-style checklist with checkboxes, optional descriptions, and an
 * overall progress bar derived from `items`.
 *
 * Fully controlled: it never mutates `completed`; the caller persists the
 * toggle in `onToggle(id, next)` and passes updated `items` again.
 *
 * @param props - Component props (see {@link ChecklistProps}).
 * @returns The checklist component.
 */
export const Checklist = defineComponent({
  name: 'Checklist',
  props: {
    items: {
      type: Array as PropType<ChecklistItem[]>,
      default: () => [],
    },
    onToggle: {
      type: Function as PropType<(id: string, next: boolean) => void>,
      default: undefined,
    },
    showProgress: {
      type: Boolean,
      default: true,
    },
    // Node-valued (a VNode or text): `null` accepts any runtime type, the way
    // Vue declares a slot-ish prop.
    title: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const total = props.items.length
      const done = props.items.filter((item) => item.completed).length
      const pct = total === 0 ? 0 : Math.round((done / total) * 100)
      const title = slotOrProp(slots.title, props.title)

      return h('div', { class: cm.cn(cm.stack(3), props.className) }, [
        title
          ? h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, [title])
          : null,
        props.showProgress
          ? h('div', { class: cm.stack(1) }, [
              h('div', { class: cm.flex({ justify: 'between', align: 'center' }) }, [
                h('span', { class: cm.textSize('xs') }, [
                  t(
                    'checklist.progress',
                    { done, total },
                    { defaultValue: '{{done}} of {{total}} complete' },
                  ),
                ]),
                h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                  `${pct}%`,
                ]),
              ]),
              h('div', { class: cm.cn(cm.progress(), cm.progressHeight('sm')) }, [
                h('div', {
                  class: cm.cn(cm.progressBar(), cm.progressColor('primary')),
                  style: { width: `${pct}%` },
                }),
              ]),
            ])
          : null,
        h(
          'ul',
          { class: cm.stack(2) },
          props.items.map((item) =>
            h('li', { key: item.id, class: cm.flex({ align: 'start', gap: 'sm' }) }, [
              h('span', { class: cm.shrink0 }, [
                h(Checkbox, {
                  checked: item.completed,
                  disabled: item.disabled,
                  onChange: (event: Event) => {
                    const target = event.target as HTMLInputElement
                    props.onToggle?.(item.id, target.checked)
                  },
                  'aria-label': typeof item.label === 'string' ? item.label : item.id,
                }),
              ]),
              h('div', { class: cm.cn(cm.flex1, cm.stack(0)) }, [
                h(
                  'span',
                  {
                    class: cm.cn(
                      cm.textSize('sm'),
                      item.completed ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                    ),
                    style: item.completed
                      ? { textDecoration: 'line-through', opacity: 0.6 }
                      : undefined,
                  },
                  [item.label],
                ),
                item.description
                  ? h('span', { class: cm.textSize('xs') }, [item.description])
                  : null,
              ]),
            ]),
          ),
        ),
      ])
    }
  },
})
