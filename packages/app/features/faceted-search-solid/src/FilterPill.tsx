/**
 * Solid outlined filter pill with a dropdown panel.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { children, createEffect, createSignal, onCleanup, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { FilterPillProps } from './types.js'

/**
 * The nodes a React `ReactNode` children prop renders, as a list: Solid's
 * `children` is the single node it was given, or the array of nodes.
 *
 * @param value - The resolved children value.
 * @returns The nodes, in order.
 */
const nodeList = (value: JSX.Element): JSX.Element[] => {
  if (value === undefined || value === null || value === false) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Outlined filter pill with an optional `expand_more` chevron and a dropdown
 * panel that opens beneath it. The pill is the trigger; the dropdown content is
 * supplied as children so consumers compose arbitrary filter UIs (range
 * sliders, checkbox lists, etc.).
 *
 * Solid counterpart of `@molecule/app-faceted-search-react`'s `FilterPill` —
 * the same props (React names), the same ClassMap tokens, the same DOM for the
 * same input, and the same outside-mousedown close.
 *
 * @param props - Component props (see {@link FilterPillProps}).
 * @returns The rendered filter pill.
 */
export const FilterPill: Component<FilterPillProps> = (props) => {
  const cm = getClassMap()
  const [open, setOpen] = createSignal(false)

  /** The wrapper element the outside-mousedown check tests against. */
  let wrapper: HTMLDivElement | undefined

  /** React's `panelAlign = 'left'` default parameter. */
  const panelAlign = (): 'left' | 'right' => props.panelAlign ?? 'left'

  // React's children prop, resolved once so checking it does not build its
  // nodes a second time.
  const content = children(() => props.children)

  // As in React's effect: the listener exists only while the panel is open.
  createEffect(() => {
    if (!open()) return
    /**
     * Closes the panel when a mousedown occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (wrapper?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    onCleanup(() => {
      document.removeEventListener('mousedown', onDoc)
    })
  })

  return (
    <div
      ref={(element) => {
        wrapper = element
      }}
      class={cm.cn(cm.position('relative'))}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open() ? 'true' : 'false'}
        data-mol-id={props.dataMolId}
        onClick={() => setOpen((value) => !value)}
        // A filter chip is a pill-shaped selectable trigger, so it takes the
        // design system's soft-rounded tab trigger: the applied/open state is
        // carried by `data-state`.
        data-state={props.active || open() ? 'active' : 'inactive'}
        class={cm.cn(
          cm.tabsTrigger({ variant: 'soft-rounded', size: 'sm' }),
          cm.fontWeight('medium'),
          cm.touchTargetCompact,
        )}
      >
        <span class={cm.flex({ align: 'center', gap: 'sm' })}>
          {/* Icon-font ligature names are decoration: the pill's own label names
            the filter, so screen readers must not read them out. */}
          <Show when={props.leadingIcon}>
            <span aria-hidden="true" class={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>
              {props.leadingIcon}
            </span>
          </Show>
          {props.label}
          <Show when={!props.hideChevron}>
            <span aria-hidden="true" class={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>
              expand_more
            </span>
          </Show>
        </span>
      </button>
      <Show when={open() && nodeList(content()).length > 0}>
        <div
          class={cm.cn(
            cm.sp('mt', 2),
            cm.sp('p', 4),
            cm.facetedSearchPillPanel,
            panelAlign() === 'right'
              ? cm.facetedSearchPillPanelRight
              : cm.facetedSearchPillPanelLeft,
          )}
        >
          {content()}
        </div>
      </Show>
    </div>
  )
}
