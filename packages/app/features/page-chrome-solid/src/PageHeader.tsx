/**
 * Solid page-top header: breadcrumbs, icon, title/subtitle pair, right-aligned
 * actions and a meta row.
 *
 * Solid counterpart of `@molecule/app-page-chrome-react`'s `PageHeader` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { PageHeaderProps } from './types.js'

/**
 * Standard page-top header with optional breadcrumbs, leading icon,
 * title / subtitle pair, meta row, and right-aligned actions.
 *
 * Layout: breadcrumbs, then a two-column row with title+subtitle on the
 * left and actions on the right, then optional meta.
 *
 * @param props - Component props (see {@link PageHeaderProps}).
 * @returns The rendered page header.
 */
export const PageHeader: Component<PageHeaderProps> = (props) => {
  const cm = getClassMap()
  const titleClass = (): string =>
    props.emphasis === 'extrabold'
      ? cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'))
      : cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))
  return (
    <header class={cm.cn(cm.stack(3), props.className)} data-mol-id={props.dataMolId}>
      {props.breadcrumbs}
      <div class={cm.flex({ justify: 'between', align: 'start', gap: 'md' })}>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {props.icon}
          <div class={cm.stack(1)}>
            <h1 class={titleClass()}>{props.title}</h1>
            <PresentWhileNode node={props.subtitle}>
              {(subtitle) => <p class={cm.textSize('base')}>{subtitle()}</p>}
            </PresentWhileNode>
          </div>
        </div>
        <PresentWhileNode node={props.actions}>
          {(actions) => <div class={cm.flex({ align: 'center', gap: 'sm' })}>{actions()}</div>}
        </PresentWhileNode>
      </div>
      <PresentWhileNode node={props.meta}>
        {(meta) => (
          <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta()}</div>
        )}
      </PresentWhileNode>
    </header>
  )
}
