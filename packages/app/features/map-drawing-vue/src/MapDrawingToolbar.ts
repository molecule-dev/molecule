/**
 * Vue map-drawing toolbar: one button per drawing tool plus the select,
 * cancel-draft and delete actions.
 *
 * Vue counterpart of `@molecule/app-map-drawing-react`'s
 * `MapDrawingToolbar` — the same props (React names), the same ClassMap
 * classes, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { ActiveTool, DrawingTool } from './types.js'

/** MapDrawingToolbar component props. */
export interface MapDrawingToolbarProps {
  /** Drawing tools to expose (in declaration order). */
  tools: DrawingTool[]
  /** Currently active tool. */
  activeTool: ActiveTool
  /** Called when the user clicks a tool button. */
  onActiveToolChange: (tool: ActiveTool) => void
  /** Called when the user clicks the delete-selected button. */
  onDeleteSelected: () => void
  /** Whether anything is currently selected (drives delete-button enabled state). */
  hasSelection: boolean
  /** Whether a draft (path vertices, circle or marquee) is in progress (drives cancel-button enabled state). */
  hasDraft: boolean
  /** Called when the user clicks the cancel-draft button. */
  onCancelDraft: () => void
}

/**
 * Toolbar with one button per drawing tool plus `select` and `delete`.
 * All button labels route through `t()` so the toolbar translates via the
 * companion `@molecule/app-locales-feature-map-drawing` bond.
 *
 * @param props - Toolbar props (see {@link MapDrawingToolbarProps}).
 * @returns The toolbar component.
 */
export const MapDrawingToolbar = defineComponent({
  name: 'MapDrawingToolbar',
  props: {
    /** Drawing tools to expose (in declaration order). */
    tools: { type: Array as PropType<DrawingTool[]>, required: true },
    /** Currently active tool. */
    activeTool: { type: String as PropType<ActiveTool>, required: true },
    /** Called when the user clicks a tool button. */
    onActiveToolChange: {
      type: Function as PropType<MapDrawingToolbarProps['onActiveToolChange']>,
      required: true,
    },
    /** Called when the user clicks the delete-selected button. */
    onDeleteSelected: {
      type: Function as PropType<MapDrawingToolbarProps['onDeleteSelected']>,
      required: true,
    },
    /** Whether anything is currently selected. */
    hasSelection: { type: Boolean, required: true },
    /** Whether a draft is in progress. */
    hasDraft: { type: Boolean, required: true },
    /** Called when the user clicks the cancel-draft button. */
    onCancelDraft: {
      type: Function as PropType<MapDrawingToolbarProps['onCancelDraft']>,
      required: true,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const labels: Record<ActiveTool | 'cancelDraft' | 'delete', string> = {
        polygon: t('mapDrawing.tool.polygon', {}, { defaultValue: 'Polygon' }),
        circle: t('mapDrawing.tool.circle', {}, { defaultValue: 'Circle' }),
        pin: t('mapDrawing.tool.pin', {}, { defaultValue: 'Pin' }),
        line: t('mapDrawing.tool.line', {}, { defaultValue: 'Line' }),
        select: t('mapDrawing.tool.select', {}, { defaultValue: 'Select' }),
        cancelDraft: t('mapDrawing.tool.cancelDraft', {}, { defaultValue: 'Cancel draft' }),
        delete: t('mapDrawing.tool.delete', {}, { defaultValue: 'Delete' }),
      }

      const ariaLabel = t('mapDrawing.toolbar.aria', {}, { defaultValue: 'Map drawing tools' })
      const buttonClass = cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))

      return h(
        'div',
        {
          role: 'toolbar',
          'aria-label': ariaLabel,
          'data-mol-id': 'map-drawing-toolbar',
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('p', 1)),
        },
        [
          ...props.tools.map((tool) => {
            const active = props.activeTool === tool
            return h(
              'button',
              {
                key: tool,
                type: 'button',
                'aria-pressed': active,
                'data-mol-id': `map-drawing-tool-${tool}`,
                'data-active': active ? 'true' : 'false',
                onClick: () => props.onActiveToolChange(tool),
                class: buttonClass,
              },
              labels[tool],
            )
          }),
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': props.activeTool === 'select',
              'data-mol-id': 'map-drawing-tool-select',
              'data-active': props.activeTool === 'select' ? 'true' : 'false',
              onClick: () => props.onActiveToolChange('select'),
              class: buttonClass,
            },
            labels.select,
          ),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'map-drawing-tool-cancel-draft',
              disabled: !props.hasDraft,
              'aria-disabled': !props.hasDraft,
              onClick: props.onCancelDraft,
              class: buttonClass,
            },
            labels.cancelDraft,
          ),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'map-drawing-tool-delete',
              disabled: !props.hasSelection,
              'aria-disabled': !props.hasSelection,
              onClick: props.onDeleteSelected,
              class: buttonClass,
            },
            labels.delete,
          ),
        ],
      )
    }
  },
})
