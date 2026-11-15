/**
 * Vue whiteboard / canvas tool selector.
 *
 * Vue counterpart of `@molecule/app-drawing-toolbar-react`'s `DrawingToolbar` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { DrawingTool } from './types.js'

/** The standard tool set React renders when the `tools` prop is omitted. */
const DEFAULT_TOOLS: DrawingTool[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'sticky', label: 'Sticky', icon: '🗒' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
]

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Whiteboard / canvas / annotation tool selector. Defaults to a
 * standard set of tools (select, rectangle, ellipse, arrow, text,
 * sticky, pen, eraser) but apps can pass any list. Each tool renders as a
 * `size="sm"` button — solid/primary while selected (with `aria-pressed`),
 * ghost otherwise — labelled `aria-label`/`title` from the tool's label.
 * The toolbar's own `aria-label` resolves through `t('drawingToolbar.label')`
 * with an English fallback. Buttons are keyed by the tool's `id`, so a
 * re-passed equal array keeps the rendered buttons the way React keys its list.
 *
 * @param props - Component props (see {@link DrawingToolbarProps} in
 *   `./types.js`).
 * @returns The toolbar component.
 */
export const DrawingToolbar = defineComponent({
  name: 'DrawingToolbar',
  props: {
    tools: { type: Array as PropType<DrawingTool[]>, default: () => DEFAULT_TOOLS },
    selectedId: String,
    onSelect: Function as PropType<(id: string) => void>,
    extras: null,
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            props.orientation === 'vertical'
              ? cm.stack(1)
              : cm.flex({ align: 'center', gap: 'xs' }),
            props.className,
          ),
          role: 'toolbar',
          'aria-label': t('drawingToolbar.label', {}, { defaultValue: 'Drawing tools' }),
        },
        [
          ...props.tools.map((tl) =>
            h(
              Button,
              {
                key: tl.id,
                variant: tl.id === props.selectedId ? 'solid' : 'ghost',
                color: tl.id === props.selectedId ? 'primary' : undefined,
                size: 'sm',
                onClick: () => props.onSelect?.(tl.id),
                'aria-pressed': tl.id === props.selectedId,
                'aria-label': tl.label,
                title: tl.label,
              },
              () => tl.icon ?? tl.label[0],
            ),
          ),
          ...slotOrProp(slots.extras, props.extras),
        ],
      )
  },
})
