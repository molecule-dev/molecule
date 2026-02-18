/**
 * Top-level workspace layout with resizable panels.
 *
 * @module
 */

import type { JSX } from 'react'
import { Children, isValidElement,useCallback } from 'react'

import { useWorkspace } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { WorkspaceLayoutProps } from '../types.js'
import { ResizeHandle } from './ResizeHandle.js'

/**
 * Top-level workspace layout that arranges child panels with resize handles.
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

  // Calculate flex values from panel configs
  const getFlexBasis = (index: number): string => {
    const config = panelConfigs[index]
    if (config) {
      return `${config.defaultSize || Math.floor(100 / panelConfigs.length)}%`
    }
    return `${Math.floor(100 / panels.length)}%`
  }

  const handleResize = useCallback(
    (index: number, delta: number) => {
      const config = panelConfigs[index]
      if (config) {
        const currentSize = config.defaultSize || Math.floor(100 / panelConfigs.length)
        const containerWidth = document.querySelector('[data-workspace-layout]')?.clientWidth || 1000
        const percentDelta = (delta / containerWidth) * 100
        const newSize = Math.max(10, Math.min(80, currentSize + percentDelta))
        resizePanel(config.id, newSize)
      }
    },
    [panelConfigs, resizePanel],
  )

  return (
    <div
      data-workspace-layout=""
      className={cm.cn(
        cm.flex({ direction: 'row' }),
        cm.w('full'),
        cm.h('full'),
        className,
      )}
      style={{
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {panels.map((panel, i) => (
        <div
          key={i}
          className={cm.flex({ direction: 'col' })}
          style={{
            flexBasis: getFlexBasis(i),
            flexShrink: 1,
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {panel}
          {i < panels.length - 1 && (
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) => handleResize(i, delta)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

WorkspaceLayout.displayName = 'WorkspaceLayout'
