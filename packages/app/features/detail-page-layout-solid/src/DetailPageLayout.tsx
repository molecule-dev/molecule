/**
 * Solid two- or three-row detail-page scaffold.
 *
 * Solid counterpart of `@molecule/app-detail-page-layout-react`'s
 * `DetailPageLayout` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { DetailPageLayoutProps } from './types.js'

const SIDEBAR_WIDTH = { sm: 64, md: 80, lg: 96 } as const

/**
 * Two- or three-row detail-page scaffold.
 *
 * Layout: breadcrumb (optional), top bar (optional sticky), two-column
 * body with a main region and an optional sidebar on either side.
 * Apps fill the slots with their own cards/sections.
 *
 * @param props - Component props (see {@link DetailPageLayoutProps}).
 * @returns The rendered detail page layout.
 */
export const DetailPageLayout: Component<DetailPageLayoutProps> = (props) => {
  const cm = getClassMap()
  const position = (): 'left' | 'right' => props.sidebarPosition ?? 'right'
  const sidebarStyle = (): Record<string, string | number> => ({
    'flex-basis': `${SIDEBAR_WIDTH[props.sidebarWidth ?? 'md'] * 4}px`,
    'flex-shrink': 0,
  })
  return (
    <div class={cm.cn(cm.stack(4), props.className)} data-mol-id={props.dataMolId}>
      {props.breadcrumb}
      {props.topBar}
      <div
        class={cm.cn(
          cm.flex({
            align: 'start',
            gap: 'lg',
            direction: position() === 'left' ? 'row' : 'row',
          }),
        )}
      >
        {position() === 'left' && (
          <PresentWhileNode node={props.sidebar}>
            {(sidebar) => <aside style={sidebarStyle()}>{sidebar()}</aside>}
          </PresentWhileNode>
        )}
        <main class={cm.flex1}>
          <div class={cm.stack(4)}>{props.main}</div>
        </main>
        {position() === 'right' && (
          <PresentWhileNode node={props.sidebar}>
            {(sidebar) => <aside style={sidebarStyle()}>{sidebar()}</aside>}
          </PresentWhileNode>
        )}
      </div>
    </div>
  )
}
