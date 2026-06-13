/**
 * Top-level workspace layout with resizable panels.
 *
 * @module
 */

import type { JSX } from 'react'
import { Children, Fragment, isValidElement, useCallback } from 'react'

import { useWorkspace } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { WorkspaceLayoutProps } from '../types.js'
import { ResizeHandle } from './ResizeHandle.js'
import { clampPanelSize, livePanelSize } from './workspace-layout-utilities.js'

/**
 * Top-level workspace layout that arranges child panels in a row with draggable
 * vertical dividers between them. Each divider resizes its left panel; the new
 * size is written back through `resizePanel`, so it persists in workspace state.
 * @param root0 - The component props.
 * @param root0.children - The panel components to render in the layout.
 * @param root0.className - Optional CSS class name for the layout container.
 * @returns The rendered workspace layout element.
 */
export function WorkspaceLayout({ children, className }: WorkspaceLayoutProps): JSX.Element {
  const cm = getClassMap()
  const { layout, resizePanel } = useWorkspace()

  // Collect children into an array
  const panels = Children.toArray(children).filter(isValidElement)

  // Map panel positions from layout
  const panelConfigs = layout.panels.filter((p) => p.visible !== false)

  const handleResize = useCallback(
    (index: number, delta: number) => {
      const config = panelConfigs[index]
      if (!config) return
      const containerWidth = document.querySelector('[data-workspace-layout]')?.clientWidth || 1000
      const currentSize = livePanelSize(layout, panelConfigs, index)
      const newSize = clampPanelSize(currentSize, delta, containerWidth)
      resizePanel(config.id, newSize)
    },
    [layout, panelConfigs, resizePanel],
  )

  return (
    <div
      data-workspace-layout=""
      className={cm.cn(cm.flex({ direction: 'row' }), cm.w('full'), cm.h('full'), className)}
      style={{
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {panels.map((panel, i) => (
        <Fragment key={i}>
          <div
            className={cm.flex({ direction: 'col' })}
            style={{
              flexBasis: `${livePanelSize(layout, panelConfigs, i)}%`,
              flexShrink: 1,
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {panel}
          </div>
          {/* Draggable vertical divider between this panel and the next. As a
              direct flex-row sibling it spans the full height (a real vertical
              divider) instead of being clipped inside a panel's column. */}
          {i < panels.length - 1 && (
            <ResizeHandle direction="horizontal" onResize={(delta) => handleResize(i, delta)} />
          )}
        </Fragment>
      ))}
    </div>
  )
}

WorkspaceLayout.displayName = 'WorkspaceLayout'
