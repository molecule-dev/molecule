import { type Component, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
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
      <PresentWhileNode node={props.icon}>
        {(icon) => (
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
            {icon()}
          </div>
        )}
      </PresentWhileNode>
      <h3 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {props.view ? props.view.title : props.title}
      </h3>
      {props.view ? (
        <>
          {props.view.description && (
            <p class={cm.cn(cm.maxW('md'), cm.sp('mb', props.view.action ? 6 : 0))}>
              {props.view.description}
            </p>
          )}
          {props.view.action}
        </>
      ) : (
        <ResolveNode node={props.description}>
          {(description, hasDescription) => (
            <ResolveNode node={props.action}>
              {(action, hasAction) => (
                <>
                  <Show when={hasDescription()}>
                    <p class={cm.cn(cm.maxW('md'), cm.sp('mb', hasAction() ? 6 : 0))}>
                      {description()}
                    </p>
                  </Show>
                  {action()}
                </>
              )}
            </ResolveNode>
          )}
        </ResolveNode>
      )}
    </section>
  )
}
