/**
 * The work tray: one full-width row of chips — plan, background tasks, tests,
 * uncommitted files — that sits UNDER the composer's rounded top edge like a
 * layer behind it. The row holds the sections: each is a `DockStrip` that draws
 * its chip where it stands, so the chips keep the order the sections are given
 * in, and, when its chip is open, its detail below the row; one section is open
 * at a time. The tray has a top, left and right border and no bottom edge: the
 * composer is drawn over its lower 8px.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `WorkCard` (see that file
 * for the design notes): the same DOM for the same input, the same tray
 * state. The strips are the default slot; the tray provides
 * `WorkTrayContext` (its fields are refs, as the Vue `DockStrip` reads them)
 * and renders the header element (which holds the slot) and the detail element
 * inside one bordered frame. The component is a part (React renders it inside ChatPanel
 * without exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import { defineComponent, h, provide, ref, type VNodeChild } from 'vue'

import { useThemeMode } from '@molecule/app-vue'

import { WorkTrayContext } from './DockStrip.js'

/**
 * Renders the work tray frame.
 * @param _props - The tray takes no data props (the strips are the default slot).
 * @returns The tray.
 */
export const WorkCard = defineComponent({
  name: 'WorkCard',
  props: {},
  setup(_props, { slots }) {
    const mode = useThemeMode()
    const detailEl = ref<HTMLElement | null>(null)
    const openId = ref<string | null>(null)
    provide(WorkTrayContext, {
      detailEl,
      openId,
      toggle: (id: string): void => {
        openId.value = openId.value === id ? null : id
      },
    })

    return (): VNodeChild => {
      const isLight = mode.value === 'light'
      const border = isLight ? '#d0d7de' : '#3d444d'
      return h(
        'div',
        {
          'data-mol-id': 'work-card',
          style: {
            flexShrink: '0',
            position: 'relative',
            boxSizing: 'border-box',
            // Tucked 8px under the composer, which is drawn on top of it.
            marginBottom: '-8px',
            paddingBottom: '8px',
            borderRadius: '8px 8px 0 0',
            border: `1px solid ${border}`,
            borderBottom: 'none',
            background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
          },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
              },
            },
            slots.default?.() ?? [],
          ),
          h('div', { ref: detailEl, style: { maxHeight: '220px', overflowY: 'auto' } }),
        ],
      )
    }
  },
})
