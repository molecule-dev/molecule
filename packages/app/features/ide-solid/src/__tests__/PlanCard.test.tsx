// @vitest-environment jsdom
/**
 * The working plan is one card pinned above the composer: it shows the LATEST
 * `update_task_list` call (a check circle when done, the molecule spinner while
 * in progress, an empty ring to do — no text glyphs, no "!" marker), and the
 * transcript no longer repeats it on every update. A port of
 * `@molecule/app-ide-react/src/__tests__/PlanCard.test.tsx` with the same test
 * names and the same assertions, mounted as a real Solid root.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.jsx'
import { latestPlan, PlanCard } from '../parts/PlanCard.jsx'
import { WorkCard } from '../parts/WorkCard.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

/** The root this file last mounted, disposed before the next render. */
let dispose: (() => void) | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
})

const todos: TaskListRow[] = [
  { content: 'Write tests', status: 'completed', priority: 'high' },
  { content: 'Fix the card', status: 'in_progress', priority: 'high' },
  { content: 'Ship it', status: 'pending', priority: 'high' },
]

/** The plan most tests render. */
const plan = todos

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
 * Renders strips inside the work tray, the way ChatPanel does. The strips'
 * JSX is created inside the render root (Solid instantiates a component when
 * its JSX evaluates, so StatusMark's theme context needs the provider above).
 *
 * @param makeStrips - Builds the strips to render (PlanCard and friends).
 */
function renderInTray(makeStrips: () => JSX.Element[]): void {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  dispose = render(
    () => (
      <ThemeContext.Provider value={themeProvider}>
        <WorkCard>{makeStrips()}</WorkCard>
      </ThemeContext.Provider>
    ),
    host,
  )
}

/**
 * Renders PlanCard alone in the tray.
 *
 * @param list - The plan's rows.
 * @param props - Extra PlanCard props (`live`, `awaitingUser`).
 */
function inTray(list: typeof plan, props: Record<string, unknown> = {}): void {
  renderInTray(() => [<PlanCard todos={list} {...props} />])
}

/**
 * Clicks the chip with the given text.
 *
 * @param text - The chip's text.
 */
function clickChip(text: string): void {
  getByText(text).click()
}

describe('PlanCard in the work tray', () => {
  it('is one chip with progress, and opens to list every task with no text glyphs or priority marker', () => {
    inTray(plan)
    expect(document.body.textContent).toContain('Plan 1/3')
    expect(document.body.textContent).not.toContain('Ship it')
    clickChip('Plan 1/3')
    const text = document.body.textContent ?? ''
    for (const label of ['Write tests', 'Fix the card', 'Ship it']) expect(text).toContain(label)
    for (const glyph of ['✓', '◐', '○', '!']) expect(text).not.toContain(glyph)
  })

  it('marks done with a tick, in progress with the spinner, to do with an empty ring', () => {
    inTray(plan)
    clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].querySelector('svg path')?.getAttribute('d')).toBe('M2 5.2 4 7.2 8 3')
    expect(rows[1].querySelector('svg')).not.toBeNull()
    // The spinner draws no tick.
    expect(rows[1].querySelector('svg path[d="M2 5.2 4 7.2 8 3"]')).toBeNull()
    expect(rows[2].querySelector('svg')).toBeNull()
  })

  it('closes again when its chip is clicked a second time', () => {
    inTray(plan)
    clickChip('Plan 1/3')
    clickChip('Plan 1/3')
    expect(document.body.textContent).not.toContain('Ship it')
    expect(document.body.textContent).toContain('Plan 1/3')
  })

  it('opening another section closes this one', () => {
    renderInTray(() => [
      <PlanCard todos={plan} />,
      <BackgroundTasksStrip
        tasks={[{ id: 'mol-bg-1', command: 'npm test', status: 'running', startedAt: Date.now() }]}
      />,
    ])
    clickChip('Plan 1/3')
    expect(document.body.textContent).toContain('Ship it')
    clickChip('1 running')
    expect(document.body.textContent).not.toContain('Ship it')
    expect(document.body.textContent).toContain('npm test')
  })

  it('does not spin a step when no turn is running: it says the work stopped', () => {
    renderInTray(() => [<PlanCard todos={plan} live={false} />])
    clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Stopped before finishing')
    expect(rows[1].textContent).not.toContain('Waiting for your answer')
    // The stopped mark is plain text in a ring, not the spinner's svg.
    expect(rows[1].querySelector('svg')).toBeNull()
  })

  it('says it is waiting for the person when the turn is paused on a question', () => {
    renderInTray(() => [<PlanCard todos={plan} live={false} awaitingUser />])
    clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Waiting for your answer')
  })

  it('draws nothing for an empty plan', () => {
    inTray([])
    expect(document.body.textContent).toBe('')
  })
})

describe('ToolCallCard — update_task_list', () => {
  it('adds nothing to the transcript (the pinned plan card carries it)', () => {
    document.body.innerHTML = ''
    const host = document.createElement('div')
    document.body.appendChild(host)
    dispose = render(
      () => (
        <ThemeContext.Provider value={themeProvider}>
          <ToolCallCard id="tc-plan" name="update_task_list" status="done" input={{ todos }} />
        </ThemeContext.Provider>
      ),
      host,
    )
    expect(host.textContent).toBe('')
  })
})
