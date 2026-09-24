/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real default timeline bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-timeline-default'

import type { TimelineItem } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('sorts by date, adds and removes items and yields a newest-first feed', () => {
    setProvider(provider)

    const rows = [
      { id: 'a2', at: '2026-09-02T10:00:00Z', title: 'Invited teammate' },
      { id: 'a1', at: '2026-09-01T09:00:00Z', title: 'Created project' },
    ]
    const toItem = (row: (typeof rows)[number]): TimelineItem => ({
      id: row.id,
      date: new Date(row.at),
      title: row.title,
    })

    const timeline = requireProvider().createTimeline({ items: rows.map(toItem) })
    expect(timeline.getItems().map((item) => item.id)).toEqual(['a1', 'a2'])

    timeline.addItem({ id: 'a3', date: new Date('2026-09-03T08:30:00Z'), title: 'Deployed v1' })
    expect(timeline.removeItem('a2')).toBe(true)

    const newestFirst = timeline.getItems().reverse()
    expect(newestFirst.map((item) => item.title)).toEqual(['Deployed v1', 'Created project'])

    timeline.destroy()
    expect(timeline.getItems()).toEqual([])
  })
})
