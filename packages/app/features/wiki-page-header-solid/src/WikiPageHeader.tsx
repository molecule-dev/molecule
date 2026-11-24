/**
 * Solid wiki / docs page header — breadcrumb + title + meta row + Edit/History
 * actions.
 *
 * Solid counterpart of `@molecule/app-wiki-page-header-react`'s
 * `WikiPageHeader` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { WikiPageHeaderProps } from './types.js'

/**
 * Wiki / docs / knowledge-base page header — breadcrumb + title + meta row
 * (version, updated time/by, tags) + Edit/History action buttons.
 *
 * The Edit / History buttons render only when `onEdit` / `onHistory` are
 * provided; their labels and the 'Updated' meta prefix go through
 * `useTranslation()` with React's exact keys and English defaults.
 *
 * @param props - Component props (see {@link WikiPageHeaderProps}).
 * @returns The rendered header.
 */
export const WikiPageHeader: Component<WikiPageHeaderProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header class={cm.cn(cm.stack(2), props.className)}>
      {props.breadcrumb}
      <div class={cm.flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' })}>
        <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{props.title}</h1>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {props.onEdit && (
            <Button variant="ghost" size="sm" onClick={props.onEdit}>
              {t('wiki.edit', {}, { defaultValue: 'Edit' })}
            </Button>
          )}
          {props.onHistory && (
            <Button variant="ghost" size="sm" onClick={props.onHistory}>
              {t('wiki.history', {}, { defaultValue: 'History' })}
            </Button>
          )}
          {props.extraActions}
        </div>
      </div>
      <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {props.version && (
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.version}</span>
        )}
        {props.updatedAt && (
          <span class={cm.textSize('xs')}>
            {t('wiki.updatedAt', {}, { defaultValue: 'Updated' })} {props.updatedAt}
          </span>
        )}
        {props.updatedBy && <span class={cm.textSize('xs')}>· {props.updatedBy}</span>}
        <PresentWhileNode node={props.tags}>
          {(tags) => <span class={cm.flex({ align: 'center', gap: 'xs' })}>{tags()}</span>}
        </PresentWhileNode>
      </div>
    </header>
  )
}
