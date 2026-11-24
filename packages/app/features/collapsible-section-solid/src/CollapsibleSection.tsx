/**
 * Solid collapsible section and "show more" toggle.
 *
 * Solid counterparts of `@molecule/app-collapsible-section-react`'s
 * `CollapsibleSection` and `ShowMore` — the same props (React names), the same
 * ClassMap tokens, the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createMemo, createSignal, For, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { CollapsibleSectionProps, ShowMoreProps } from './types.js'

/**
 * Expandable section with a clickable heading. Lighter-weight than
 * `<Accordion>` — renders a single toggle, not a group of panels.
 *
 * Expansion is uncontrolled by default (`defaultExpanded`); pass `expanded` to
 * control it — then update it from `onExpandedChange`. The header renders a
 * toggle `<button>` around the label with `actions` beside it as a sibling
 * (a button may not contain other controls), so `actions` MAY contain
 * buttons/links — a click there never reaches the toggle.
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
        {/* The header row is a container, not a button: a button may not
            contain other controls, and `actions` typically holds them. The
            toggle wraps the label; `actions` sits beside it, so a click there
            never reaches the toggle (no stopPropagation needed). */}
        <span
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.w('full'),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
          )}
        >
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen() ? 'true' : 'false'}
            class={cm.flex({ align: 'center', gap: 'sm' })}
          >
            <span aria-hidden="true">{isOpen() ? '▾' : '▸'}</span>
            <span>{props.title}</span>
            {props.badge}
          </button>
          <PresentWhileNode node={props.actions}>
            {(actions) => <span>{actions()}</span>}
          </PresentWhileNode>
        </span>
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
 * Items it does not show are not created when each is written as an accessor (`() => <Row />`,
 * in an array; the prop is typed `NodeItems`): an item is created when it comes into view and
 * disposed when it leaves, as React mounts it, and keeps its state while it stays. A row may have
 * any root, a `<Show>` or a fragment included. Plain JSX children (`<Row />`) are created when
 * the list is read, which is Solid's own rule, so a row with state, effects or a fetch is written
 * as an accessor. For a list that changes, build the accessors with `mapArray`, so a row that
 * stays keeps its identity (and its state), as React keeps a keyed element; `rows().map(…)`
 * makes new accessors, so new rows, on every change. A single accessor written alone
 * (`{() => <Row />}`, no array) is read as a dynamic list and created when counted.
 *
 * @example
 * ```tsx
 * // Each row is an accessor: only the first five are created until the list expands.
 * <ShowMore initialCount={5}>{rows().map((row) => () => <Row row={row} />)}</ShowMore>
 *
 * // A list that changes: each row keeps its accessor while it stays in the list.
 * const items = mapArray(rows, (row) => () => <Row row={row} />)
 * <ShowMore initialCount={5}>{items()}</ShowMore>
 * ```
 *
 * @param props - Component props (see {@link ShowMoreProps}).
 * @returns The rendered show-more list.
 */
export const ShowMore: Component<ShowMoreProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [expanded, setExpanded] = createSignal(false)

  // React's `children` array, counted without creating it: the raw prop's top-level entries
  // (`<A />{rows.map(…)}` is two, as `children.length` is in React). Resolving the items to count
  // them would create every one, hidden ones included.
  const items = createMemo((): unknown[] => {
    let list: unknown = props.children
    // A function that takes nothing is a dynamic list (`<For>`, `{rows().map(…)}`): read it.
    while (typeof list === 'function' && list.length === 0) list = (list as () => unknown)()
    return Array.isArray(list)
      ? list
      : list === undefined || list === null || list === false
        ? []
        : [list]
  })
  /** React's `initialCount = 3` default parameter. */
  const initialCount = (): number => props.initialCount ?? 3
  /** The items to render (React's `children.slice(0, initialCount)` when collapsed). */
  const visible = (): unknown[] => (expanded() ? items() : items().slice(0, initialCount()))
  /** How many items the toggle reveals (React's `Math.max(0, children.length - initialCount)`). */
  const remaining = (): number => Math.max(0, items().length - initialCount())

  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      {/* Keyed by the item itself: expanding keeps the rows in view and creates only the rest. Each
          item is resolved once in its row, so an accessor item is created with its row and
          disposed with it (inserted bare, it would be called again whenever the list changes). The
          row is read inside JSX, so a row whose root renders something else later is updated. */}
      <For each={visible()}>
        {(item) => <ResolveNode node={item}>{(node) => <>{node()}</>}</ResolveNode>}
      </For>
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
