/**
 * Solid onboarding checklist: checkable items + optional title + overall
 * progress bar.
 *
 * Solid counterpart of `@molecule/app-checklist-react`'s `Checklist` — the
 * same props (React names), the same DOM for the same input, and the same
 * `onToggle(id, next)` calls.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Checkbox } from '@molecule/app-ui-solid'

import type { ChecklistItem, ChecklistProps } from './types.js'

/**
 * Onboarding-style checklist with checkboxes, optional descriptions, and an
 * overall progress bar derived from `items`.
 *
 * Fully controlled: it never mutates `completed`; the caller persists the
 * toggle in `onToggle(id, next)` and passes updated `items` again.
 *
 * @param props - Component props (see {@link ChecklistProps}).
 * @returns The rendered checklist.
 */
export const Checklist: Component<ChecklistProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = (): number => props.items.length
  const done = (): number => props.items.filter((item) => item.completed).length
  const pct = (): number => (total() === 0 ? 0 : Math.round((done() / total()) * 100))

  // One stable record per item id, so `<For>` (which keys by reference) keeps
  // a row's DOM when the caller passes equal items as new objects — React's
  // `key={item.id}`. A re-created row would re-write its checkbox `checked`
  // attribute, which React only writes at mount.
  interface Row {
    id: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = props.items.map((item) => {
      seen.add(item.id)
      let row = rows.get(item.id)
      if (!row) {
        row = { id: item.id }
        rows.set(item.id, row)
      }
      return row
    })
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id)
    return list
  }
  const itemFor = (id: string): ChecklistItem | undefined =>
    props.items.find((item) => item.id === id)

  /**
   * React's `aria-label`: the label text when it is a plain string, else the item id.
   * @param item - The checklist item.
   * @returns The accessible name.
   */
  const ariaLabel = (item: ChecklistItem): string =>
    typeof item.label === 'string' ? item.label : item.id

  return (
    <div class={cm.cn(cm.stack(3), props.className)}>
      <Show when={props.title}>
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
      </Show>
      <Show when={props.showProgress ?? true}>
        <div class={cm.stack(1)}>
          <div class={cm.flex({ justify: 'between', align: 'center' })}>
            <span class={cm.textSize('xs')}>
              {t(
                'checklist.progress',
                { done: done(), total: total() },
                { defaultValue: '{{done}} of {{total}} complete' },
              )}
            </span>
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{pct()}%</span>
          </div>
          <div class={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
            <div
              class={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
              style={{ width: `${pct()}%` }}
            />
          </div>
        </div>
      </Show>
      <ul class={cm.stack(2)}>
        <For each={keyedRows()}>
          {(row) => {
            const item = (): ChecklistItem => itemFor(row.id) as ChecklistItem
            return (
              <li class={cm.flex({ align: 'start', gap: 'sm' })}>
                <span class={cm.shrink0}>
                  <Checkbox
                    checked={item().completed}
                    disabled={item().disabled}
                    onChange={(event) => {
                      const target = event.target as HTMLInputElement
                      props.onToggle?.(item().id, target.checked)
                    }}
                    aria-label={ariaLabel(item())}
                  />
                </span>
                <div class={cm.cn(cm.flex1, cm.stack(0))}>
                  <span
                    class={cm.cn(
                      cm.textSize('sm'),
                      item().completed ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                    )}
                    style={
                      item().completed
                        ? { 'text-decoration': 'line-through', opacity: 0.6 }
                        : undefined
                    }
                  >
                    {item().label}
                  </span>
                  <Show when={item().description}>
                    <span class={cm.textSize('xs')}>{item().description}</span>
                  </Show>
                </div>
              </li>
            )
          }}
        </For>
      </ul>
    </div>
  )
}
