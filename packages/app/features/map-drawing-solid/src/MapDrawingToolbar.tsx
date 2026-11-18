/**
 * Solid map-drawing toolbar: one button per drawing tool plus the select,
 * cancel-draft and delete actions.
 *
 * Solid counterpart of `@molecule/app-map-drawing-react`'s `MapDrawingToolbar`
 * — the same props (React names), the same ClassMap classes, and the same DOM
 * for the same input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

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
 * @returns The rendered toolbar.
 */
export const MapDrawingToolbar: Component<MapDrawingToolbarProps> = (props): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const buttonClass = (): string => cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))

  /**
   * The translated label of one drawing tool (a literal key per tool, so the
   * i18n gate sees every key).
   *
   * @param tool - The tool.
   * @returns The translated label.
   */
  const toolLabel = (tool: DrawingTool): string => {
    switch (tool) {
      case 'polygon':
        return t('mapDrawing.tool.polygon', {}, { defaultValue: 'Polygon' })
      case 'circle':
        return t('mapDrawing.tool.circle', {}, { defaultValue: 'Circle' })
      case 'pin':
        return t('mapDrawing.tool.pin', {}, { defaultValue: 'Pin' })
      case 'line':
        return t('mapDrawing.tool.line', {}, { defaultValue: 'Line' })
    }
  }

  return (
    <div
      role="toolbar"
      aria-label={t('mapDrawing.toolbar.aria', {}, { defaultValue: 'Map drawing tools' })}
      data-mol-id="map-drawing-toolbar"
      class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('p', 1))}
    >
      <For each={props.tools}>
        {(tool) => {
          const active = (): boolean => props.activeTool === tool
          return (
            <button
              type="button"
              aria-pressed={active()}
              data-mol-id={`map-drawing-tool-${tool}`}
              data-active={active() ? 'true' : 'false'}
              onClick={() => props.onActiveToolChange(tool)}
              class={buttonClass()}
            >
              {toolLabel(tool)}
            </button>
          )
        }}
      </For>
      <button
        type="button"
        aria-pressed={props.activeTool === 'select'}
        data-mol-id="map-drawing-tool-select"
        data-active={props.activeTool === 'select' ? 'true' : 'false'}
        onClick={() => props.onActiveToolChange('select')}
        class={buttonClass()}
      >
        {t('mapDrawing.tool.select', {}, { defaultValue: 'Select' })}
      </button>
      <button
        type="button"
        data-mol-id="map-drawing-tool-cancel-draft"
        disabled={!props.hasDraft}
        aria-disabled={!props.hasDraft}
        onClick={props.onCancelDraft}
        class={buttonClass()}
      >
        {t('mapDrawing.tool.cancelDraft', {}, { defaultValue: 'Cancel draft' })}
      </button>
      <button
        type="button"
        data-mol-id="map-drawing-tool-delete"
        disabled={!props.hasSelection}
        aria-disabled={!props.hasSelection}
        onClick={props.onDeleteSelected}
        class={buttonClass()}
      >
        {t('mapDrawing.tool.delete', {}, { defaultValue: 'Delete' })}
      </button>
    </div>
  )
}
