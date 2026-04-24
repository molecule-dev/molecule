import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface EditorLayoutProps {
  /** Sticky top bar — typically title + save/publish buttons + status indicator. */
  topBar: ReactNode
  /** Main editing canvas (wysiwyg, drawable area, form, code editor). */
  canvas: ReactNode
  /** Optional right-side settings / metadata panel. */
  sidePanel?: ReactNode
  /** Side-panel position — defaults to `'right'`. */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible. */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Three-region editor scaffold: sticky top bar + main canvas + optional
 * collapsible side panel.
 *
 * Used by blog post editors, product-listing editors, chatbot flow
 * editors, design canvases, etc.
 * @param root0
 * @param root0.topBar
 * @param root0.canvas
 * @param root0.sidePanel
 * @param root0.sidePanelPosition
 * @param root0.sidePanelOpen
 * @param root0.className
 * @param root0.dataMolId
 */
export function EditorLayout({
  topBar,
  canvas,
  sidePanel,
  sidePanelPosition = 'right',
  sidePanelOpen = true,
  className,
  dataMolId,
}: EditorLayoutProps) {
  const cm = getClassMap()
  const showPanel = sidePanel && sidePanelOpen
  return (
    <div
      data-mol-id={dataMolId}
      className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), className)}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>{topBar}</div>
      <div className={cm.cn(cm.flex({ align: 'stretch' }), cm.flex1)}>
        {showPanel && sidePanelPosition === 'left' && (
          <aside className={cm.shrink0}>{sidePanel}</aside>
        )}
        <main className={cm.flex1}>{canvas}</main>
        {showPanel && sidePanelPosition === 'right' && (
          <aside className={cm.shrink0}>{sidePanel}</aside>
        )}
      </div>
    </div>
  )
}
