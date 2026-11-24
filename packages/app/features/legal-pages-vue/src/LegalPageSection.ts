/**
 * Vue one sub-section of a legal page (`h2` + body).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

import type { LegalPageSectionProps } from './types.js'
import { nodeOrSlot } from './utilities.js'

/**
 * One sub-section of a legal page (`h2` + body) styled for use inside
 * `LegalPageLayout`.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `LegalPageSection` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link LegalPageSectionProps}).
 * @returns The legal page section component.
 */
export const LegalPageSection = defineComponent({
  name: 'LegalPageSection',
  props: {
    title: null,
    stackGap: {
      type: Number as PropType<SpacingScale>,
      default: 2,
    },
  },
  setup(props: LegalPageSectionProps, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = nodeOrSlot(slots.title, props.title)
      const body: VNodeChild[] = toChildArray(slots.default?.())

      return h('section', { class: cm.stack(props.stackGap ?? 2) }, [
        h('h2', { class: cm.cn(cm.textSize('xl'), cm.fontWeight('semibold')) }, title),
        ...body,
      ])
    }
  },
})
