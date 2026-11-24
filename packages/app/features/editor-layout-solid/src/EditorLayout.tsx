/**
 * Solid editor layout: sticky top bar → main canvas → optional side panel.
 *
 * Solid counterpart of `@molecule/app-editor-layout-react`'s `EditorLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { EditorLayoutProps } from './types.js'

/**
 * Three-region editor scaffold: sticky top bar + main canvas + optional
 * collapsible side panel.
 *
 * Used by blog post editors, product-listing editors, chatbot flow editors,
 * design canvases, etc.
 *
 * @param props - Component props (see {@link EditorLayoutProps}).
 * @returns The rendered editor layout.
 */
export const EditorLayout: Component<EditorLayoutProps> = (props) => {
  const cm = getClassMap()
  const position = (): 'left' | 'right' => props.sidePanelPosition ?? 'right'
  const panelOpen = (): boolean => props.sidePanelOpen ?? true
  return (
    <div
      data-mol-id={props.dataMolId}
      class={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), props.className)}
    >
      <div style={{ position: 'sticky', top: '0px', 'z-index': 10 }}>{props.topBar}</div>
      <div class={cm.cn(cm.flex({ align: 'stretch' }), cm.flex1)}>
        {panelOpen() && position() === 'left' && (
          <PresentWhileNode node={props.sidePanel}>
            {(sidePanel) => <aside class={cm.shrink0}>{sidePanel()}</aside>}
          </PresentWhileNode>
        )}
        <main class={cm.flex1}>{props.canvas}</main>
        {panelOpen() && position() === 'right' && (
          <PresentWhileNode node={props.sidePanel}>
            {(sidePanel) => <aside class={cm.shrink0}>{sidePanel()}</aside>}
          </PresentWhileNode>
        )}
      </div>
    </div>
  )
}
