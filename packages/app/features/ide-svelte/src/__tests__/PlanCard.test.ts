// @vitest-environment jsdom
/**
 * The working plan is one card pinned above the composer: it shows the LATEST
 * `update_task_list` call (a check circle when done, the molecule spinner while
 * in progress, an empty ring to do — no text glyphs, no "!" marker), and the
 * transcript no longer repeats it on every update. A port of
 * `@molecule/app-ide-react/src/__tests__/PlanCard.test.tsx` with the same test
 * names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * The tray's chips draw after the tray's `bind:this` refs fire, so every
 * render and click flushes with `flushSync` where React's test reads the DOM
 * synchronously; the assertions are the React ones verbatim.
 *
 * React's `latestPlan` describe block is not ported: `latestPlan` is the
 * transcript scanner of `PlanCard.tsx` (`ide-react` lines 111–131), non-view
 * logic `@molecule/app-ide-panel-logic` does not export yet, and the brief
 * forbids copying it into four packages. The ToolCallCard test ports as it
 * is. The "opening another section" test mounts a bare `DockStrip` as the
 * second section: React's second strip is `BackgroundTasksStrip`, whose port
 * has not landed in this package yet.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { latestPlan } from '../parts/plan-card.js'
import PlanCardHost from './PlanCardHost.svelte'
import ToolCallCardHost from './ToolCallCardHost.svelte'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (instance) unmount(instance as never)
  instance = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const todos: TaskListRow[] = [
  { content: 'Write tests', status: 'completed', priority: 'high' },
  { content: 'Fix the card', status: 'in_progress', priority: 'high' },
  { content: 'Ship it', status: 'pending', priority: 'high' },
]

/** The plan most tests render. */
const plan = todos

/**
 * Finds the deepest element whose whole text is the given text (React's
 * `getByText`).
 *
 * @param text - The text to find.
 * @returns The element.
 */
function getByText(text: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
    (element) => element.textContent === text,
  )
  const deepest = matches.filter((element) =>
    matches.every((other) => other === element || !element.contains(other)),
  )
  const found = deepest[0]
  if (!found) throw new Error(`no element with text: ${text}`)
  return found
}

/**
 * Renders PlanCard in the work tray, the way ChatPanel does.
 *
 * @param props - The card's props, plus `withOther` for the second section.
 */
function renderInTray(props: Record<string, unknown>): void {
  document.body.innerHTML = ''
  const target = document.createElement('div')
  document.body.appendChild(target)
  instance = mount(PlanCardHost, {
    target,
    props: {
      theme: createFakeThemeProvider('light', sink),
      todos: plan,
      ...props,
    },
  }) as Record<string, unknown>
  flushSync()
}

/**
 * Clicks the chip with the given text, then lets the tray's re-render flush.
 *
 * @param text - The chip's text.
 */
function clickChip(text: string): void {
  getByText(text).click()
  flushSync()
}

describe('latestPlan', () => {
  it('returns the most recent update_task_list call, not the first', () => {
    const messages = [
      {
        toolCalls: [
          { name: 'update_task_list', input: { todos: [{ content: 'Old', status: 'pending' }] } },
        ],
      },
      { toolCalls: [{ name: 'read_file', input: { path: 'a.ts' } }] },
      { toolCalls: [{ name: 'update_task_list', input: { todos } }] },
    ]
    expect(latestPlan(messages).map((r) => r.content)).toEqual([
      'Write tests',
      'Fix the card',
      'Ship it',
    ])
  })

  it('is empty when the transcript has no plan', () => {
    expect(latestPlan([{ toolCalls: [{ name: 'read_file', input: {} }] }, {}])).toEqual([])
  })
})

describe('PlanCard in the work tray', () => {
  it('is one chip with progress, and opens to list every task with no text glyphs or priority marker', () => {
    renderInTray({})
    expect(document.body.textContent).toContain('Plan 1/3')
    expect(document.body.textContent).not.toContain('Ship it')
    clickChip('Plan 1/3')
    const text = document.body.textContent ?? ''
    for (const label of ['Write tests', 'Fix the card', 'Ship it']) expect(text).toContain(label)
    for (const glyph of ['✓', '◐', '○', '!']) expect(text).not.toContain(glyph)
  })

  it('marks done with a tick, in progress with the spinner, to do with an empty ring', () => {
    renderInTray({})
    clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].querySelector('svg path')?.getAttribute('d')).toBe('M2 5.2 4 7.2 8 3')
    expect(rows[1].querySelector('svg')).not.toBeNull()
    expect(rows[1].querySelector('svg path')?.getAttribute('d')).not.toBe('M2 5.2 4 7.2 8 3')
    expect(rows[2].querySelector('svg')).toBeNull()
  })

  it('closes again when its chip is clicked a second time', () => {
    renderInTray({})
    clickChip('Plan 1/3')
    clickChip('Plan 1/3')
    expect(document.body.textContent).not.toContain('Ship it')
    expect(document.body.textContent).toContain('Plan 1/3')
  })

  it('opening another section closes this one', () => {
    renderInTray({ withOther: true })
    clickChip('Plan 1/3')
    expect(document.body.textContent).toContain('Ship it')
    clickChip('1 running')
    expect(document.body.textContent).not.toContain('Ship it')
    expect(document.body.textContent).toContain('npm test')
  })

  it('does not spin a step when no turn is running: it says the work stopped', () => {
    renderInTray({ live: false })
    clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Stopped before finishing')
    expect(rows[1].textContent).not.toContain('Waiting for your answer')
    // The stopped mark is plain text in a ring, not the spinner's svg.
    expect(rows[1].querySelector('svg')).toBeNull()
  })

  it('says it is waiting for the person when the turn is paused on a question', () => {
    renderInTray({ live: false, awaitingUser: true })
    clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Waiting for your answer')
  })

  it('draws nothing for an empty plan', () => {
    renderInTray({ todos: [] })
    // Svelte's template whitespace stays in the frame; the plan itself must not render.
    expect(document.body.textContent?.trim() ?? '').toBe('')
  })
})

describe('ToolCallCard — update_task_list', () => {
  it('adds nothing to the transcript (the pinned plan card carries it)', () => {
    document.body.innerHTML = ''
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(ToolCallCardHost, {
      target,
      props: {
        theme: createFakeThemeProvider('light', sink),
        id: 'tc-plan',
        name: 'update_task_list',
        status: 'done',
        input: { todos },
      },
    }) as Record<string, unknown>
    flushSync()
    expect(target.textContent).toBe('')
  })
})
