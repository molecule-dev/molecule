/**
 * Solid job-board listing row.
 *
 * Solid counterpart of `@molecule/app-job-listing-row-react`'s `JobListingRow`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { JobListingRowProps } from './types.js'

/**
 * Job-board row — title + company + location + type + salary + posted date
 * with optional leading logo, tag chips, and right-side actions.
 *
 * The location value is prefixed with the same hardcoded 📍 glyph React
 * renders, and the meta fields carry the same literal middle-dot separators
 * (there is no prop to change or localise them). `onClick` makes the whole
 * row clickable but renders no button semantics — supply your own
 * focus/keyboard affordance (or wrap the row in a button/link) when
 * click-to-open matters for a11y.
 *
 * @param props - Component props (see {@link JobListingRowProps}).
 * @returns The rendered job listing row.
 */
export const JobListingRow: Component<JobListingRowProps> = (props) => {
  const cm = getClassMap()
  return (
    <div
      onClick={(event) => props.onClick?.(event)}
      class={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 3),
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
    >
      {props.leading ? <div class={cm.shrink0}>{props.leading}</div> : null}
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
        {props.company ? <span class={cm.textSize('sm')}>{props.company}</span> : null}
        <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {props.location ? (
            <span class={cm.textSize('xs')}>
              {'📍 '}
              {props.location}
            </span>
          ) : null}
          {props.type ? (
            <span class={cm.textSize('xs')}>
              {'· '}
              {props.type}
            </span>
          ) : null}
          {props.salary ? (
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {'· '}
              {props.salary}
            </span>
          ) : null}
          {props.postedAt ? (
            <span class={cm.textSize('xs')}>
              {'· '}
              {props.postedAt}
            </span>
          ) : null}
        </div>
        {props.tags ? (
          <div class={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>{props.tags}</div>
        ) : null}
      </div>
      {props.actions ? (
        <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>
          {props.actions}
        </div>
      ) : null}
    </div>
  )
}
