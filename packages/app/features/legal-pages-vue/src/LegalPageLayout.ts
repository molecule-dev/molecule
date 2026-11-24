/**
 * Vue canonical Terms / Privacy layout shell.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

import type { LegalPageLayoutProps } from './types.js'
import { nodeOrSlot } from './utilities.js'

/**
 * Canonical Terms / Privacy layout shell.
 *
 * `<main data-mol-id={...} class="container py-12">
 *    <h1>{title}</h1>
 *    <div class="prose stack">{children}</div>
 *  </main>`
 *
 * Use this as the content shell for legal pages. Custom chrome (landing
 * top-nav, admin sidebar, etc.) should wrap the shell at the call site.
 *
 * Vue counterpart of `@molecule/app-legal-pages-react`'s `LegalPageLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link LegalPageLayoutProps}).
 * @returns The legal page layout component.
 */
export const LegalPageLayout = defineComponent({
  name: 'LegalPageLayout',
  props: {
    dataMolId: String,
    title: null,
    containerSize: {
      type: String as PropType<'sm' | 'md' | 'lg' | 'xl'>,
      default: 'md',
    },
    stackGap: {
      type: Number as PropType<SpacingScale>,
      default: 4,
    },
    mainClassName: String,
    bodyClassName: String,
  },
  setup(props: LegalPageLayoutProps, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = nodeOrSlot(slots.title, props.title)
      const body: VNodeChild[] = toChildArray(slots.default?.())

      return h(
        'main',
        {
          'data-mol-id': props.dataMolId,
          class:
            props.mainClassName ??
            cm.cn(cm.container({ size: props.containerSize }), cm.sp('py', 12)),
        },
        [
          h(
            'h1',
            { class: cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6)) },
            title,
          ),
          h(
            'div',
            { class: props.bodyClassName ?? cm.cn(cm.prose, cm.stack(props.stackGap ?? 4)) },
            body,
          ),
        ],
      )
    }
  },
})
