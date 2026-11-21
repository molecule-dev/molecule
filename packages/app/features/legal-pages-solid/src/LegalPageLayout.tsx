/**
 * Solid canonical Terms / Privacy layout shell.
 *
 * @module
 */

import type { Component } from 'solid-js'

import type { SpacingScale } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { LegalPageLayoutProps } from './types.js'

/**
 * Canonical Terms / Privacy layout shell.
 *
 * `<main data-mol-id={...} class="container py-12">
 *    <h1>{title}</h1>
 *    <div class="prose stack">{children}</div>
 *  </main>`
 *
 * Use this as the content shell for legal pages. Custom chrome (landing
 * top-nav, admin sidebar, etc.) should wrap the shell at the call site.
 *
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `LegalPageLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link LegalPageLayoutProps}).
 * @returns The rendered legal page layout.
 */
export const LegalPageLayout: Component<LegalPageLayoutProps> = (props) => {
  const cm = getClassMap()
  const containerSize = (): 'sm' | 'md' | 'lg' | 'xl' => props.containerSize ?? 'md'
  const stackGap = (): SpacingScale => props.stackGap ?? 4

  return (
    <main
      data-mol-id={props.dataMolId}
      class={props.mainClassName ?? cm.cn(cm.container({ size: containerSize() }), cm.sp('py', 12))}
    >
      <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {props.title}
      </h1>
      <div class={props.bodyClassName ?? cm.cn(cm.prose, cm.stack(stackGap()))}>
        {props.children}
      </div>
    </main>
  )
}
