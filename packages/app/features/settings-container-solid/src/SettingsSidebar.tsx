/**
 * Solid controlled settings side-nav.
 *
 * Solid counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsSidebar` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { SettingsSidebarItem, SettingsSidebarProps } from './types.js'

/** A row identity record: created once per item id and reused while the id is present. */
interface Row {
  id: string
}

/**
 * Vertical side-nav for Settings pages. Controlled — the caller owns
 * `activeId`; every item calls `onSelect` with its id.
 *
 * The nav region's accessible name resolves through `t()` with the
 * `settingsContainer.aria.settings` key, so it follows the active locale;
 * `ariaLabel` overrides it.
 *
 * React keys each row by the item's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so
 * the rows are keyed through stable per-id records: the record for an id is
 * created once and reused, while the row's content reads the CURRENT item for
 * that id reactively.
 *
 * @param props - Component props (see {@link SettingsSidebarProps}).
 * @returns The rendered settings sidebar.
 */
export const SettingsSidebar: Component<SettingsSidebarProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  /** One stable record per item id, created on first sight. */
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.items.map((item) => {
      seen.add(item.id)
      let row = records.get(item.id)
      if (!row) {
        row = { id: item.id }
        records.set(item.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const itemFor = (id: string): SettingsSidebarItem =>
    props.items.find((item) => item.id === id) as SettingsSidebarItem

  /**
   * One item's button classes (React's active/inactive weight branch).
   *
   * @param item - The item.
   * @returns The class string.
   */
  const itemClasses = (item: SettingsSidebarItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      item.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  return (
    <nav
      class={cm.cn(cm.stack(1), props.className)}
      aria-label={
        props.ariaLabel ??
        t('settingsContainer.aria.settings', undefined, { defaultValue: 'Settings' })
      }
    >
      <For each={keyedRows()}>
        {(row) => (
          <button
            type="button"
            onClick={() => props.onSelect?.(row.id)}
            aria-current={row.id === props.activeId ? 'page' : undefined}
            class={itemClasses(itemFor(row.id))}
          >
            {itemFor(row.id).icon}
            <span>{itemFor(row.id).label}</span>
          </button>
        )}
      </For>
      <Show when={props.footer}>{(footer) => <div class={cm.sp('mt', 4)}>{footer()}</div>}</Show>
    </nav>
  )
}
