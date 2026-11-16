import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { CtaCardProps } from './types.js'

/**
 * A "soft sell" card used to promote a next-step action inside a page body
 * (e.g., "Connect your bank", "Invite teammates").
 *
 * Differs from `<EmptyState>` in being positioned in a list of cards rather
 * than filling the void. Supports a horizontal layout with the media slot
 * beside the text.
 *
 * This is the Solid counterpart of `@molecule/app-empty-state-react`'s
 * `CtaCard`: the same props (React names), the same ClassMap tokens, and the
 * same DOM for the same input.
 *
 * @param props - Component props (see {@link CtaCardProps}).
 * @returns The rendered CTA card.
 */
export const CtaCard: Component<CtaCardProps> = (props) => {
  const cm = getClassMap()
  /** The layout direction (React's `layout === 'horizontal' ? 'row' : 'col'`). */
  const horizontal = (): boolean => (props.layout ?? 'vertical') === 'horizontal'
  return (
    <section
      data-mol-id={props.dataMolId}
      class={cm.cn(
        cm.flex({
          direction: horizontal() ? 'row' : 'col',
          align: horizontal() ? 'center' : 'stretch',
          gap: 'md',
        }),
        cm.sp('p', 6),
        props.className,
      )}
    >
      {props.media && <div class={cm.shrink0}>{props.media}</div>}
      <div class={cm.cn(cm.flex1, cm.stack(2))}>
        {props.eyebrow && (
          <div class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.eyebrow}</div>
        )}
        <h3 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{props.title}</h3>
        {props.description && <p>{props.description}</p>}
        {props.action && <div class={cm.sp('mt', 2)}>{props.action}</div>}
      </div>
    </section>
  )
}
