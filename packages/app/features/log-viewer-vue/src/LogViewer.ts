/**
 * Vue structured log viewer: one expandable `<details>` row per entry —
 * timestamp + colored severity badge + optional service label + single-line
 * message, expanding to a trace id and a JSON-formatted structured-data panel.
 *
 * Vue counterpart of `@molecule/app-log-viewer-react`'s `LogViewer` — the same
 * props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, Fragment, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { LogEntry, LogLevel } from './types.js'

/** Severity badge colors: trace grey → fatal dark red (fixed, not themed). */
const LEVEL_COLOR: Record<LogLevel, string> = {
  trace: '#94a3b8',
  debug: '#60a5fa',
  info: '#22c55e',
  warn: '#eab308',
  error: '#ef4444',
  fatal: '#b91c1c',
}

/**
 * Structured log list — one `<details>` per entry with timestamp + level badge
 * + service label + single-line message, expanding to show trace id +
 * JSON-formatted structured data.
 *
 * Use for operational tooling, admin dashboards, debug views.
 *
 * @param props - Component props (see the `LogViewerProps` type in `./types.js`).
 * @returns The rendered log viewer.
 */
export const LogViewer = defineComponent({
  name: 'LogViewer',
  props: {
    entries: { type: Array as PropType<LogEntry[]>, required: true },
    onToggle: {
      type: Function as PropType<(id: string, expanded: boolean) => void>,
      default: undefined,
    },
    className: { type: String, default: undefined },
    emptyState: null,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const openIds = ref<Set<string>>(new Set())

    /**
     * Toggles the expanded state of the entry with the given id, then
     * notifies `onToggle` with the new state (React's `toggle`).
     *
     * @param id - The entry id.
     */
    const toggle = (id: string): void => {
      const next = new Set(openIds.value)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      openIds.value = next
      props.onToggle?.(id, next.has(id))
    }

    /**
     * The empty-state children: the `emptyState` slot wins over the prop, and
     * an absent pair contributes nothing.
     *
     * @returns The children React renders for `emptyState`.
     */
    const emptyChildren = (): VNodeChild[] => {
      if (slots.emptyState) return slots.emptyState()
      return props.emptyState != null ? [props.emptyState] : []
    }

    /**
     * The text a structured-data panel renders: strings verbatim, anything
     * else pretty-printed with `JSON.stringify(…, null, 2)` (React's shape).
     *
     * @param data - The entry's structured data.
     * @returns The panel text.
     */
    const dataText = (data: unknown): string =>
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    /**
     * One entry's `<details>` row.
     *
     * @param entry - The log entry.
     * @returns The row.
     */
    const row = (entry: LogEntry): VNode => {
      const open = openIds.value.has(entry.id)
      return h(
        'details',
        {
          key: entry.id,
          open,
          onToggle: (event: Event): void => {
            const nowOpen = (event.target as HTMLDetailsElement).open
            if (nowOpen !== open) toggle(entry.id)
          },
        },
        [
          h(
            'summary',
            {
              class: cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('py', 1),
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.cursorPointer,
              ),
            },
            [
              h('span', { style: { width: '48px', textAlign: 'right', opacity: 0.7 } }, [
                entry.timestamp,
              ]),
              h(
                'span',
                {
                  style: {
                    display: 'inline-block',
                    minWidth: '48px',
                    textAlign: 'center',
                    padding: '0 6px',
                    borderRadius: '4px',
                    background: LEVEL_COLOR[entry.level],
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  },
                },
                [entry.level],
              ),
              entry.service
                ? h('span', { class: cm.fontWeight('semibold') }, [entry.service])
                : null,
              h('span', { class: cm.flex1 }, [entry.message]),
              entry.traceId ? h('span', { style: { opacity: 0.6 } }, [entry.traceId]) : null,
            ],
          ),
          entry.data !== undefined
            ? h(
                'pre',
                {
                  class: cm.cn(cm.sp('p', 3), cm.textSize('xs')),
                  style: { overflowX: 'auto' },
                },
                // React renders `{''}` as no text node at all; an empty string
                // child would add one, which the DOM snapshot distinguishes.
                dataText(entry.data) === '' ? [] : [dataText(entry.data)],
              )
            : null,
        ],
      )
    }

    return (): VNode => {
      const empty = emptyChildren()
      if (props.entries.length === 0 && empty.length > 0) return h(Fragment, empty)
      return h(
        'div',
        { class: cm.cn(cm.stack(1), props.className), role: 'log' },
        props.entries.map(row),
      )
    }
  },
})
