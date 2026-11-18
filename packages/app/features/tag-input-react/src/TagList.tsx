import type { ComponentPropsWithoutRef, JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.js'

/** Read-only tags from the saved record, with optional app-owned tag markup. */
export interface TagListProps extends Omit<
  ComponentPropsWithoutRef<'ul'>,
  'children' | 'dangerouslySetInnerHTML'
> {
  /** Every saved tag, in display order. Empty arrays render an empty list. */
  value: readonly string[]
  /** Additional classes for each list item. */
  itemClassName?: string
  /** Optional tag content; the component still renders every value. */
  renderTag?: (tag: string, index: number) => ReactNode
}

/**
 * Display all saved tags on a detail or preview screen, without an editor or remove controls.
 * The component owns iteration. List attributes such as id and aria-label go on the list itself.
 * @param props - Saved values and optional presentation.
 * @returns A semantic list with one item per saved tag.
 */
export function TagList({
  value,
  className,
  itemClassName,
  renderTag,
  ...listProps
}: TagListProps): JSX.Element {
  const cm = getClassMap()
  return (
    <ul
      {...listProps}
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}
    >
      {value.map((tag, index) => (
        <li key={`${tag}-${index}`} className={itemClassName}>
          {renderTag ? renderTag(tag, index) : <TagChip>{tag}</TagChip>}
        </li>
      ))}
    </ul>
  )
}
