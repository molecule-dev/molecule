import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { EmptyStateProps } from './types.js'

/** Selected-view content stays together, without changing the extendable public interface. */
type SelectedViewEmptyStateProps = Omit<
  EmptyStateProps,
  'title' | 'description' | 'action' | 'view'
> & {
  /** The selected view's translated message and required recovery element. */
  view: {
    /** The selected view's translated heading. */
    title: EmptyStateProps['title']
    /** The selected view's supporting description. */
    description?: EmptyStateProps['description']
    /** The selected view's recovery element — a router link or a button. */
    action: EmptyStateProps['action']
  }
  /** A selected view has no generic title beside it. */
  title?: never
  /** A selected view has no generic description beside it. */
  description?: never
  /** A selected view has no generic action beside it. */
  action?: never
}

/**
 * Generic centred empty-state panel for lists, feeds, boards, and tables.
 *
 * Renders a vertical stack of [icon, title, description, action]. Typography
 * and spacing come from the wired ClassMap; per-app accent chrome (dashed
 * borders, tinted backgrounds, gradient CTAs) is passed via `className` on the
 * outer element.
 *
 * This is the Solid counterpart of `@molecule/app-empty-state-react`'s
 * `EmptyState`: the same props (React names), the same ClassMap tokens, and the
 * same DOM for the same input.
 *
 * @param props - Component props (see {@link EmptyStateProps}).
 * @returns The rendered empty state.
 */
export const EmptyState: Component<EmptyStateProps | SelectedViewEmptyStateProps> = (props) => {
  const cm = getClassMap()
  /** The message to render: the selected view, or the general props. */
  const content = (): {
    title?: JSX.Element
    description?: JSX.Element
    action?: JSX.Element
  } => props.view ?? { title: props.title, description: props.description, action: props.action }
  return (
    <section
      data-mol-id={props.dataMolId}
      class={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.textCenter,
        cm.sp('p', 12),
        props.className,
      )}
    >
      {props.icon && (
        <div
          class={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mb', 6),
            props.iconWrapperClassName,
          )}
        >
          {props.icon}
        </div>
      )}
      <h3 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {content().title}
      </h3>
      {content().description && (
        <p class={cm.cn(cm.maxW('md'), cm.sp('mb', content().action ? 6 : 0))}>
          {content().description}
        </p>
      )}
      {content().action}
    </section>
  )
}
