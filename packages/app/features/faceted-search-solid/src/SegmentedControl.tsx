/**
 * Solid pill-shaped segmented control.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { SegmentedControlProps } from './types.js'

/** A segment's row identity record: created once per value and reused while the value is present. */
interface Segment {
  /** The value this row reports, and the identity React keys the row by. */
  value: string
}

/**
 * Pill-shaped segmented control. Two or more options; the active option gets
 * the primary fill, inactive ones get a subtle hover.
 *
 * Solid counterpart of `@molecule/app-faceted-search-react`'s
 * `SegmentedControl` — the same props (React names), the same ClassMap tokens,
 * the same DOM for the same input, and the same `onChange` calls.
 *
 * React keys each segment by the option's `value`, so a re-passed or re-ordered
 * array keeps the rendered rows per value. Solid's `For` keys by reference, so
 * the rows are keyed through stable per-value records: the record for a value
 * is created once and reused, while the row's content reads the CURRENT option
 * for that value reactively.
 *
 * @param props - Component props (see {@link SegmentedControlProps}).
 * @returns The rendered segmented control.
 */
export const SegmentedControl: Component<SegmentedControlProps> = (props) => {
  const cm = getClassMap()

  /** One stable record per option value, created on first sight. */
  const records = new Map<string, Segment>()

  /**
   * The rows to render, one per distinct current option value, each with its
   * stable identity record (React's `key={opt.value}`).
   * @returns The rows, in the options' current order.
   */
  const rows = (): Segment[] => {
    const seen = new Set<string>()
    const out: Segment[] = []
    for (const opt of props.options) {
      if (seen.has(opt.value)) continue
      seen.add(opt.value)
      let row = records.get(opt.value)
      if (!row) {
        row = { value: opt.value }
        records.set(opt.value, row)
      }
      out.push(row)
    }
    return out
  }

  /**
   * The current option for a value.
   * @param value - The option's value.
   * @returns The option, when it is still present.
   */
  const optionFor = (value: string): SegmentedControlProps['options'][number] | undefined =>
    props.options.find((opt) => opt.value === value)

  return (
    <div
      role="tablist"
      class={cm.cn(cm.tabsList({ variant: 'solid-rounded', size: 'sm' }), props.className)}
    >
      <For each={rows()}>
        {(row) => {
          /** The current option for this row. */
          const opt = (): SegmentedControlProps['options'][number] => optionFor(row.value)!
          return (
            <button
              type="button"
              role="tab"
              aria-selected={opt().value === props.value ? 'true' : 'false'}
              // `tabsTrigger` keys its selected styling off `data-state`.
              data-state={opt().value === props.value ? 'active' : 'inactive'}
              data-mol-id={opt().dataMolId}
              onClick={() => {
                props.onChange(opt().value)
              }}
              class={cm.cn(
                cm.tabsTrigger({ variant: 'solid-rounded', size: 'sm' }),
                cm.fontWeight('semibold'),
                cm.touchTargetCompact,
              )}
            >
              {opt().label}
            </button>
          )
        }}
      </For>
    </div>
  )
}
