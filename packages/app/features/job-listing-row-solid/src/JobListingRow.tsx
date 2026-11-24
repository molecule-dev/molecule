/**
 * Solid job-board listing row.
 *
 * Solid counterpart of `@molecule/app-job-listing-row-react`'s `JobListingRow`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import { type Component, createUniqueId } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { JobListingRowProps } from './types.js'

/**
 * Job-board row — title + company + location + type + salary + posted date
 * with optional leading logo, tag chips, and right-side actions.
 *
 * The location value is prefixed with the same hardcoded 📍 glyph React
 * renders, and the meta fields carry the same literal middle-dot separators
 * (there is no prop to change or localise them). `onClick` covers the whole
 * row with an empty, transparent native button that activates it — the whole
 * row is the click target, named by the title (the `<h3>` itself takes the id
 * the button points at with `aria-labelledby`), with the inner controls above
 * it keeping their own clicks.
 *
 * @param props - Component props (see {@link JobListingRowProps}).
 * @returns The rendered job listing row.
 */
export const JobListingRow: Component<JobListingRowProps> = (props) => {
  const cm = getClassMap()
  // The row's accessible name lives on the title, the way React's useId()
  // names it: the open button points at the `<h3>` with aria-labelledby.
  const nameId = createUniqueId()
  // The row's open control: an empty, transparent native button over the
  // whole row (Enter / Space activate it natively), a SIBLING of the slot
  // wrappers rather than their parent.
  const openButton = props.onClick ? (
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="job-listing-row-open"
      onClick={() => props.onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      // mol-bespoke-button: the whole row is the hit area, not a CTA — an
      // empty, transparent button over the row; the inline background/border/
      // padding are native resets. Solid writes the style attribute raw (no
      // CSSOM expansion), so the values carry the form React's attribute
      // shows after CSSOM: the border is its initial `none` style at
      // `medium` width, padding the pixel form of 0 — visually identical,
      // textually equal to React.
      style={{ background: 'transparent', border: 'medium', padding: '0px' }}
    />
  ) : null
  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 3),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
    >
      {openButton}
      <PresentWhileNode node={props.leading}>
        {(leading) => <div class={cm.shrink0}>{leading()}</div>}
      </PresentWhileNode>
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        <h3 id={nameId} class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {props.title}
        </h3>
        <PresentWhileNode node={props.company}>
          {(company) => <span class={cm.textSize('sm')}>{company()}</span>}
        </PresentWhileNode>
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
        <PresentWhileNode node={props.tags}>
          {(tags) => (
            <div
              class={cm.cn(
                cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                cm.position('relative'),
              )}
            >
              {tags()}
            </div>
          )}
        </PresentWhileNode>
      </div>
      <PresentWhileNode node={props.actions}>
        {(actions) => (
          <div
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.shrink0,
              cm.position('relative'),
            )}
          >
            {actions()}
          </div>
        )}
      </PresentWhileNode>
    </div>
  )
}
