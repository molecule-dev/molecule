import { type Component, For } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { StatusTimelineProps, StatusTimelineStep } from './types.js'

/**
 * Vertical ordered-step status timeline.
 *
 * Each step renders as a colored dot + label. Steps at or before the
 * current one are "reached" (filled dot); the current step's label is
 * bolded; steps after the current one are dimmed via `cm.textMuted`.
 *
 * React keys each row by the step's `key` value, so a re-ordered or
 * re-passed array moves/keeps the rendered rows per key. Solid's `For`
 * keys by reference, so the rows are keyed through stable per-key records:
 * the record for a key is created once and reused (a re-pass or reversal
 * moves/keeps the rendered row, like React), while the row's content reads
 * the CURRENT step for its key reactively (a changed label updates in
 * place).
 *
 * This is the Solid counterpart of `@molecule/app-status-timeline-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @param props - Component props (see {@link StatusTimelineProps}).
 * @returns The rendered status timeline.
 */
export const StatusTimeline: Component<StatusTimelineProps> = (props) => {
  const cm = getClassMap()
  /** One stable record per step key, created on first sight. */
  interface Row {
    key: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = props.steps.map((s) => {
      seen.add(s.key)
      let row = rows.get(s.key)
      if (!row) {
        row = { key: s.key }
        rows.set(s.key, row)
      }
      return row
    })
    for (const key of [...rows.keys()]) if (!seen.has(key)) rows.delete(key)
    return list
  }
  const currentIdx = (): number => props.steps.findIndex((s) => s.key === props.currentKey)
  const stepFor = (key: string): StatusTimelineStep | undefined =>
    props.steps.find((s) => s.key === key)
  return (
    <ol
      class={cm.cn(cm.statusTimelineList, cm.textSize('sm'), props.className)}
      aria-label={props.ariaLabel}
      data-mol-id={props.dataMolId}
    >
      <For each={keyedRows()}>
        {(row, i) => {
          const reached = (): boolean => currentIdx() >= 0 && i() <= currentIdx()
          const isCurrent = (): boolean => i() === currentIdx()
          return (
            <li class={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                class={cm.cn(
                  cm.roundedFull,
                  cm.statusTimelineDot,
                  reached() ? cm.bgPrimary : cm.statusTimelineDotIdle,
                )}
                aria-hidden="true"
              />
              <span
                class={cm.cn(
                  reached() ? '' : cm.textMuted,
                  isCurrent() ? cm.fontWeight('semibold') : '',
                )}
              >
                {stepFor(row.key)?.label}
              </span>
            </li>
          )
        }}
      </For>
    </ol>
  )
}
