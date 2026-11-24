/**
 * Vue wiki / docs page header — breadcrumb + title + meta row + Edit/History
 * actions.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when given, otherwise the slot, otherwise nothing. `null` contributes
 * nothing (React renders `{null}` the same way).
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  value: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false) return [value]
  if (slot) return slot()
  return []
}

/**
 * Wiki / docs / knowledge-base page header — breadcrumb + title + meta row
 * (version, updated time/by, tags) + Edit/History action buttons.
 *
 * Vue counterpart of `@molecule/app-wiki-page-header-react`'s
 * `WikiPageHeader` — the same props (React names), the same DOM for the same
 * input. The Edit / History buttons render only when `onEdit` / `onHistory`
 * are provided; their labels and the 'Updated' meta prefix go through
 * `useTranslation()` with React's exact keys and English defaults.
 *
 * @param props - Component props (see {@link WikiPageHeaderProps} in
 *   `./types.js`).
 * @returns The header component.
 */
export const WikiPageHeader = defineComponent({
  name: 'WikiPageHeader',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    title: { type: null, required: true },
    breadcrumb: null,
    version: null,
    updatedAt: null,
    updatedBy: null,
    tags: null,
    extraActions: null,
    onEdit: Function as PropType<() => void>,
    onHistory: Function as PropType<() => void>,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const tags = nodeOrSlot(props.tags, slots.tags)
      return h('header', { class: cm.cn(cm.stack(2), props.className) }, [
        ...nodeOrSlot(props.breadcrumb, slots.breadcrumb),
        h(
          'div',
          { class: cm.flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' }) },
          [
            h(
              'h1',
              { class: cm.cn(cm.textSize('3xl'), cm.fontWeight('bold')) },
              nodeOrSlot(props.title, slots.title),
            ),
            h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
              props.onEdit
                ? h(Button, { variant: 'ghost', size: 'sm', onClick: props.onEdit }, () =>
                    t('wiki.edit', {}, { defaultValue: 'Edit' }),
                  )
                : null,
              props.onHistory
                ? h(Button, { variant: 'ghost', size: 'sm', onClick: props.onHistory }, () =>
                    t('wiki.history', {}, { defaultValue: 'History' }),
                  )
                : null,
              ...nodeOrSlot(props.extraActions, slots.extraActions),
            ]),
          ],
        ),
        h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
          props.version
            ? h(
                'span',
                { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                nodeOrSlot(props.version, slots.version),
              )
            : null,
          props.updatedAt
            ? h('span', { class: cm.textSize('xs') }, [
                t('wiki.updatedAt', {}, { defaultValue: 'Updated' }),
                ' ',
                props.updatedAt,
              ])
            : null,
          props.updatedBy ? h('span', { class: cm.textSize('xs') }, ['· ', props.updatedBy]) : null,
          toChildArray(tags).length > 0
            ? h('span', { class: cm.flex({ align: 'center', gap: 'xs' }) }, tags)
            : null,
        ]),
      ])
    }
  },
})
