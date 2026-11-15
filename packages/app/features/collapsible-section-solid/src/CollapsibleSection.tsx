/**
 * Solid collapsible section and "show more" toggle.
 *
 * Solid counterparts of `@molecule/app-collapsible-section-react`'s
 * `CollapsibleSection` and `ShowMore` — the same props (React names), the same
 * ClassMap tokens, the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { CollapsibleSectionProps, ShowMoreProps } from './types.js'

/**
 * The children of a React `ReactNode[]` prop, as a list: Solid's `children`
 * is the single node it was given, or the array of nodes.
 *
 * @param children - The `children` prop value.
 * @returns The nodes, in order.
 */
const nodeList = (children: JSX.Element): JSX.Element[] => {
  if (children === undefined || children === null || children === false) return []
  return Array.isArray(children) ? children : [children]
}

/**
 * Expandable section with a clickable heading. Lighter-weight than
 * `<Accordion>` — renders a single toggle, not a group of panels.
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); pass `expanded` to
 * control it — then update it from `onExpandedChange`. The header renders as a
 * single `<button>`, so anything passed to `actions` must NOT contain
 * buttons/links (nested interactive elements are invalid HTML).
 *
 * @param props - Component props (see {@link CollapsibleSectionProps}).
 * @returns The rendered collapsible section.
 */
export const CollapsibleSection: Component<CollapsibleSectionProps> = (props) => {
  const cm = getClassMap()
  const [internal, setInternal] = createSignal(props.defaultExpanded ?? false)

  /** React's `expanded ?? internal`. */
  const isOpen = (): boolean => props.expanded ?? internal()
  /** React's `level = 3` default parameter. */
  const heading = (): string => `h${props.level ?? 3}`

  /** Toggles expansion state, updating internal state when uncontrolled. */
  const toggle = (): void => {
    const next = !isOpen()
    if (props.expanded === undefined) setInternal(next)
    props.onExpandedChange?.(next)
  }

  return (
    <section class={cm.cn(cm.stack(2), props.className)}>
      <Dynamic component={heading()}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen() ? 'true' : 'false'}
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.w('full'),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
          )}
        >
          <span class={cm.flex({ align: 'center', gap: 'sm' })}>
            <span aria-hidden="true">{isOpen() ? '▾' : '▸'}</span>
            <span>{props.title}</span>
            {props.badge}
          </span>
          <Show when={props.actions}>
            <span onClick={(event) => event.stopPropagation()}>{props.actions}</span>
          </Show>
        </button>
      </Dynamic>
      <Show when={isOpen()}>
        <div>{props.children}</div>
      </Show>
    </section>
  )
}

/**
 * "Show N more" / "Show less" toggle. Simpler than `<CollapsibleSection>` when
 * you just want to truncate a long list.
 *
 * @param props - Component props (see {@link ShowMoreProps}).
 * @returns The rendered show-more list.
 */
export const ShowMore: Component<ShowMoreProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [expanded, setExpanded] = createSignal(false)

  /** React's `initialCount = 3` default parameter. */
  const initialCount = (): number => props.initialCount ?? 3
  /** The items to render (React's `children.slice(0, initialCount)` when collapsed). */
  const visible = (): JSX.Element[] => {
    const all = nodeList(props.children)
    return expanded() ? all : all.slice(0, initialCount())
  }
  /** How many items the toggle reveals (React's `Math.max(0, children.length - initialCount)`). */
  const remaining = (): number => Math.max(0, nodeList(props.children).length - initialCount())

  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      {visible()}
      <Show when={remaining() > 0}>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)}
        >
          {expanded()
            ? t(props.lessKey ?? 'showMore.less', {}, { defaultValue: 'Show less' })
            : t(
                props.moreKey ?? 'showMore.more',
                { remaining: remaining() },
                { defaultValue: `Show ${remaining()} more` },
              )}
        </button>
      </Show>
    </div>
  )
}
