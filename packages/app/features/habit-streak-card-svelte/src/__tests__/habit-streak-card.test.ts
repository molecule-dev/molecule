// @vitest-environment jsdom
/**
 * Unit tests for `HabitStreakCard`, ported from
 * `@molecule/app-habit-streak-card-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { describe, expect, it } from 'vitest'

import HabitStreakCard from '../HabitStreakCard.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Renders a `HabitStreakCard` with the given props, returning the host markup.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(HabitStreakCard, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

describe('HabitStreakCard', () => {
  it('renders the habit name in an <h3> and the current streak', () => {
    const markup = render({ name: 'Meditate', currentStreak: 7 })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Meditate')
    expect(markup).toContain('7')
    expect(markup).toContain('day streak')
  })

  it('renders the icon slot', () => {
    const markup = render({
      name: 'M',
      currentStreak: 1,
      icon: raw('<span data-icon=""></span>'),
    })
    expect(markup).toContain('data-icon=""')
  })

  it('renders best streak and total completions when present and omits them otherwise', () => {
    const full = render({ name: 'M', currentStreak: 5, bestStreak: 30, totalCompletions: 120 })
    expect(full).toContain('30')
    expect(full).toContain('best')
    expect(full).toContain('120')
    expect(full).toContain('total')
    const bare = render({ name: 'M', currentStreak: 5 })
    expect(bare).not.toContain('best')
    expect(bare).not.toContain('total')
  })

  it('renders a heatmap square per day when a heatmap is supplied', () => {
    const markup = render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    expect(markup).toContain('aria-label="2026-05-01: 0"')
    expect(markup).toContain('aria-label="2026-05-02: 3"')
  })

  it('truncates the heatmap to the heatmapDays window from the end', () => {
    const markup = render({
      name: 'M',
      currentStreak: 1,
      heatmapDays: 2,
      heatmap: [
        { date: 'd1', count: 1 },
        { date: 'd2', count: 1 },
        { date: 'd3', count: 1 },
      ],
    })
    expect(markup).not.toContain('aria-label="d1')
    expect(markup).toContain('aria-label="d2: 1"')
    expect(markup).toContain('aria-label="d3: 1"')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'M', currentStreak: 1, className: 'hsc-cls' })
    expect(markup).toContain('hsc-cls')
  })
})
