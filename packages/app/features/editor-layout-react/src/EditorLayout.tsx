import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/** Props for {@link EditorLayout}. */
export interface EditorLayoutProps {
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
 * @param props - Component props (see {@link EditorLayoutProps}).
 */
export function EditorLayout({
  topBar,
  canvas,
  sidePanel: sidePanelProp,
  sidePanelPosition = 'right',
  sidePanelOpen = true,
  className,
  dataMolId,
}: EditorLayoutProps): JSX.Element {
  const sidePanel = slot(sidePanelProp)
  const cm = getClassMap()
  const showPanel = sidePanel && sidePanelOpen
  return (
    <Box
      as="div"
      data-mol-id={dataMolId}
      className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), className)}
    >
      <Box as="div" webStyle={{ position: 'sticky', top: 0, zIndex: 10 }}>
        {topBar}
      </Box>
      <Box as="div" className={cm.cn(cm.flex({ align: 'stretch' }), cm.flex1)}>
        {showPanel && sidePanelPosition === 'left' && (
          <Box as="aside" className={cm.shrink0}>
            {sidePanel}
          </Box>
        )}
        <Box as="main" className={cm.flex1}>
          {canvas}
        </Box>
        {showPanel && sidePanelPosition === 'right' && (
          <Box as="aside" className={cm.shrink0}>
            {sidePanel}
          </Box>
        )}
      </Box>
    </Box>
  )
}
