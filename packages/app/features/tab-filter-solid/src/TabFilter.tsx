import { type Component, For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TabFilterProps, TabFilterTab } from './types.js'

/**
 * Horizontal pill-style tab row used as a segmented filter.
 *
 * Different from a plain tabs row in surfacing inline count badges per tab
 * and scrolling horizontally on overflow. `defaultTab` stays reachable when
 * `tabs` holds only the path/query-selected filter, and a duplicate id
 * appears once (using the default tab's definition). Each enabled tab calls
 * `onChange` with its own id; `disabled` tabs are non-interactive.
 *
 * React keys each tab button by the tab's `id`, so a re-ordered or re-passed
 * array moves/keeps the rendered buttons per key. Solid's `For` keys by
 * reference, so the buttons are keyed through stable per-id records: the
 * record for an id is created once and reused, while the button reads the
 * CURRENT tab for its id reactively.
 *
 * This is the Solid counterpart of `@molecule/app-tab-filter-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link TabFilterProps}).
 * @returns The rendered tab filter.
 */
export const TabFilter: Component<TabFilterProps> = (props) => {
  const cm = getClassMap()

  /** One stable record per tab id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()

  /**
   * The tabs to render: the default tab first (its definition wins for a
   * duplicate id), then every other tab in the order given.
   * @returns The visible tabs.
   */
  const visibleTabs = (): TabFilterTab[] => {
    const defaultTab = props.defaultTab
    if (!defaultTab) return props.tabs
    return [defaultTab, ...props.tabs.filter((tab) => tab.id !== defaultTab.id)]
  }

  /**
   * One stable keyed record per visible tab id, in render order.
   * @returns The records to render.
   */
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = visibleTabs().map((tab) => {
      seen.add(tab.id)
      let row = records.get(tab.id)
      if (!row) {
        row = { id: tab.id }
        records.set(tab.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current tab for an id.
   * @param id - The tab id.
   * @returns The tab, or undefined when it vanished.
   */
  const tabFor = (id: string): TabFilterTab | undefined =>
    visibleTabs().find((tab) => tab.id === id)

  /**
   * The row's inline style: React's horizontal-scroll style while
   * `scrollable` (the default), otherwise none.
   * @returns The style object, or undefined.
   */
  const rootStyle = (): Record<string, string> | undefined =>
    (props.scrollable ?? true) ? { 'overflow-x': 'auto', 'white-space': 'nowrap' } : undefined

  return (
    <div
      role="tablist"
      class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className)}
      style={rootStyle()}
    >
      <For each={keyedRows()}>
        {(row) => {
          const tab = (): TabFilterTab => tabFor(row.id) ?? { id: row.id, label: '' }
          const active = (): boolean => tab().id === props.activeId
          const count = (): number | undefined => tab().count
          return (
            <button
              type="button"
              role="tab"
              aria-selected={active()}
              data-state={active() ? 'active' : 'inactive'}
              data-mol-id={`tab-filter-${tab().id}`}
              disabled={tab().disabled}
              onClick={() => props.onChange(tab().id)}
              class={cm.cn(
                cm.tabsTrigger({
                  variant: (props.filled ?? true) ? 'solid-rounded' : 'soft-rounded',
                  size: 'md',
                }),
                active() ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                cm.touchTargetCompact,
              )}
            >
              <span class={cm.flex({ align: 'center', gap: 'xs' })}>
                {tab().icon}
                <span>{tab().label}</span>
                {count() !== undefined && (
                  <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
                    {`(${count()!.toLocaleString()})`}
                  </span>
                )}
              </span>
            </button>
          )
        }}
      </For>
    </div>
  )
}
