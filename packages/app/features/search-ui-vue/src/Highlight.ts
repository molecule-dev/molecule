/**
 * Vue marked text — the counterpart of `@molecule/app-search-ui-react`'s
 * `Highlight`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { highlightMatches } from '@molecule/app-client-search'
import { getClassMap } from '@molecule/app-ui'

/**
 * Text with the matched terms marked: each term is marked where it starts a
 * word, case-insensitively, through the ClassMap's `resultMark`.
 *
 * @param props - See {@link HighlightProps}.
 * @returns The marked text component.
 */
export const Highlight = defineComponent({
  name: 'Highlight',
  props: {
    text: { type: String, required: true },
    terms: { type: Array as PropType<string[]>, required: true },
  },
  setup(props) {
    return (): VNodeChild[] => {
      const cm = getClassMap()
      return highlightMatches(props.text, props.terms).map((seg) =>
        seg.hit ? h('mark', { class: cm.resultMark }, [seg.text]) : seg.text,
      )
    }
  },
})
