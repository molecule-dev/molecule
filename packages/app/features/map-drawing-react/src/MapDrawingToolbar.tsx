import type { ReactElement } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

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
 * All button labels route through `t()` so the toolbar translates via
 * the companion `@molecule/app-locales-feature-map-drawing` bond.
 *
 * @param props - Toolbar props.
 * @returns Toolbar element.
 */
export function MapDrawingToolbar(props: MapDrawingToolbarProps): ReactElement {
  const {
    tools,
    activeTool,
    onActiveToolChange,
    onDeleteSelected,
    hasSelection,
    hasDraft,
    onCancelDraft,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

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

  return (
    <Box
      as="div"
      role="toolbar"
      aria-label={ariaLabel}
      data-mol-id="map-drawing-toolbar"
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('p', 1))}
    >
      {tools.map((tool) => {
        const active = activeTool === tool
        return (
          <Pressable
            as="button"
            key={tool}
            type="button"
            aria-pressed={active}
            data-mol-id={`map-drawing-tool-${tool}`}
            data-active={active ? 'true' : 'false'}
            onClick={() => onActiveToolChange(tool)}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
          >
            {labels[tool]}
          </Pressable>
        )
      })}
      <Pressable
        as="button"
        type="button"
        aria-pressed={activeTool === 'select'}
        data-mol-id="map-drawing-tool-select"
        data-active={activeTool === 'select' ? 'true' : 'false'}
        onClick={() => onActiveToolChange('select')}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
      >
        {labels.select}
      </Pressable>
      <Pressable
        as="button"
        type="button"
        data-mol-id="map-drawing-tool-cancel-draft"
        disabled={!hasDraft}
        aria-disabled={!hasDraft}
        onClick={onCancelDraft}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
      >
        {labels.cancelDraft}
      </Pressable>
      <Pressable
        as="button"
        type="button"
        data-mol-id="map-drawing-tool-delete"
        disabled={!hasSelection}
        aria-disabled={!hasSelection}
        onClick={onDeleteSelected}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
      >
        {labels.delete}
      </Pressable>
    </Box>
  )
}
