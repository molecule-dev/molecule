/**
 * Vue read-only tag list: one list item per saved tag, chips by default.
 *
 * Vue counterpart of `@molecule/app-tag-input-react`'s `TagList` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.js'

/**
 * Display all saved tags on a detail or preview screen, without an editor or
 * remove controls. The component owns iteration. List attributes such as id
 * and aria-label are not props: Vue puts them on the list itself.
 *
 * @param props - Component props (see {@link TagListProps}).
 * @returns The tag list component.
 */
export const TagList = defineComponent({
  name: 'TagList',
  props: {
    value: { type: Array as PropType<readonly string[]>, required: true },
    className: String,
    itemClassName: String,
    renderTag: Function as PropType<(tag: string, index: number) => VNodeChild>,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNodeChild =>
      h(
        'ul',
        { class: cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), props.className) },
        props.value.map((tag, index) =>
          h('li', { key: `${tag}-${index}`, class: props.itemClassName }, [
            props.renderTag
              ? props.renderTag(tag, index)
              : h(TagChip, null, { default: () => tag }),
          ]),
        ),
      )
  },
})
