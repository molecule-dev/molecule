import { useTranslation } from '@molecule/app-react'
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
}

/**
 * Toolbar with one button per drawing tool plus `select` and `delete`.
 * All button labels route through `t()` so the toolbar translates via
 * the companion `@molecule/app-locales-feature-map-drawing-react` bond.
 *
 * @param props - Toolbar props.
 * @returns Toolbar element.
 */
export function MapDrawingToolbar(props: MapDrawingToolbarProps) {
  const { tools, activeTool, onActiveToolChange, onDeleteSelected, hasSelection } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const labels: Record<ActiveTool | 'delete', string> = {
    polygon: t('mapDrawing.tool.polygon', {}, { defaultValue: 'Polygon' }),
    circle: t('mapDrawing.tool.circle', {}, { defaultValue: 'Circle' }),
    pin: t('mapDrawing.tool.pin', {}, { defaultValue: 'Pin' }),
    line: t('mapDrawing.tool.line', {}, { defaultValue: 'Line' }),
    select: t('mapDrawing.tool.select', {}, { defaultValue: 'Select' }),
    delete: t('mapDrawing.tool.delete', {}, { defaultValue: 'Delete' }),
  }

  const ariaLabel = t('mapDrawing.toolbar.aria', {}, { defaultValue: 'Map drawing tools' })

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      data-mol-id="map-drawing-toolbar"
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('p', 1))}
    >
      {tools.map((tool) => {
        const active = activeTool === tool
        return (
          <button
            key={tool}
            type="button"
            aria-pressed={active}
            data-mol-id={`map-drawing-tool-${tool}`}
            data-active={active ? 'true' : 'false'}
            onClick={() => onActiveToolChange(tool)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
          >
            {labels[tool]}
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={activeTool === 'select'}
        data-mol-id="map-drawing-tool-select"
        data-active={activeTool === 'select' ? 'true' : 'false'}
        onClick={() => onActiveToolChange('select')}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
      >
        {labels.select}
      </button>
      <button
        type="button"
        data-mol-id="map-drawing-tool-delete"
        disabled={!hasSelection}
        aria-disabled={!hasSelection}
        onClick={onDeleteSelected}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
      >
        {labels.delete}
      </button>
    </div>
  )
}
