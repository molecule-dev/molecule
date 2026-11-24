/**
 * Solid detail-page header: leading slot + title/subtitle + status +
 * right-aligned actions, with an optional meta row and an optional search
 * slot.
 *
 * Solid counterpart of `@molecule/app-detail-header-react`'s `DetailHeader` —
 * the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { DetailHeaderProps } from './types.js'

/** The sticky header's inline style, exactly as React writes it. */
const stickyStyle = { position: 'sticky', top: '0px', 'z-index': 10 } as const

/**
 * Header row for a detail page — leading slot + title/subtitle + status +
 * actions, with optional meta row and search slot.
 *
 * Different from `<PageHeader>` (used at the top of list/index pages)
 * in prioritising status + search + stickiness.
 *
 * @param props - Component props (see {@link DetailHeaderProps}).
 * @returns The rendered detail header.
 */
export const DetailHeader: Component<DetailHeaderProps> = (props) => {
  const cm = getClassMap()
  return (
    <header
      data-mol-id={props.dataMolId}
      class={cm.cn(cm.stack(2), props.className)}
      style={props.sticky ? stickyStyle : undefined}
    >
      <div class={cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' })}>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {props.leading}
          <div class={cm.stack(1)}>
            <div class={cm.flex({ align: 'center', gap: 'sm' })}>
              <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{props.title}</h1>
              {props.status}
            </div>
            <PresentWhileNode node={props.subtitle}>
              {(subtitle) => <p class={cm.textSize('sm')}>{subtitle()}</p>}
            </PresentWhileNode>
          </div>
        </div>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {props.search}
          {props.actions}
        </div>
      </div>
      <PresentWhileNode node={props.meta}>
        {(meta) => (
          <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta()}</div>
        )}
      </PresentWhileNode>
    </header>
  )
}
