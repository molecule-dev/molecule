// @vitest-environment jsdom
/**
 * The working plan is one card pinned above the composer: it shows the LATEST
 * `update_task_list` call (a check circle when done, the molecule spinner while
 * in progress, an empty ring to do — no text glyphs, no "!" marker), and the
 * transcript no longer repeats it on every update. A port of
 * `@molecule/app-ide-react/src/__tests__/PlanCard.test.tsx` with the same test
 * names and the same assertions, mounted through Vue's own `createApp`.
 *
 * The tray's chips draw after the tray's template refs bind (post-mount), so
 * the renders and clicks here await Vue's `nextTick` where React's test reads
 * the DOM synchronously; the assertions are the React ones verbatim.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.js'
import type { PlanCardProps } from '../parts/PlanCard.js'
import { latestPlan, PlanCard } from '../parts/PlanCard.js'
import { WorkCard } from '../parts/WorkCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

const todos: TaskListRow[] = [
  { content: 'Write tests', status: 'completed', priority: 'high' },
  { content: 'Fix the card', status: 'in_progress', priority: 'high' },
  { content: 'Ship it', status: 'pending', priority: 'high' },
]

/** The plan most tests render. */
const plan = todos

const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
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
 * Renders strips inside the work tray, the way ChatPanel does.
 *
 * @param strips - The strips to render (PlanCard and friends).
 * @returns The host element.
 */
async function renderInTray(strips: VNodeChild[]): Promise<HTMLElement> {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(WorkCard, null, { default: () => strips }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  // The strips draw their chips into the tray header after the tray's own
  // template refs bind (post-mount), so let the follow-up render flush.
  await nextTick()
  return host
}

/**
 * Renders PlanCard alone in the tray.
 *
 * @param list - The plan's rows.
 * @param props - Extra PlanCard props (`live`, `awaitingUser`).
 * @returns The host element.
 */
async function inTray(list: typeof plan, props: Partial<PlanCardProps> = {}): Promise<HTMLElement> {
  return renderInTray([h(PlanCard, { todos: list, ...props })])
}

/**
 * Clicks the chip with the given text, then lets the tray's re-render flush.
 *
 * @param text - The chip's text.
 */
async function clickChip(text: string): Promise<void> {
  getByText(text).click()
  await nextTick()
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
  it('is one chip with progress, and opens to list every task with no text glyphs or priority marker', async () => {
    const container = await inTray(plan)
    expect(container.textContent).toContain('Plan 1/3')
    expect(container.textContent).not.toContain('Ship it')
    await clickChip('Plan 1/3')
    const text = container.textContent ?? ''
    for (const label of ['Write tests', 'Fix the card', 'Ship it']) expect(text).toContain(label)
    for (const glyph of ['✓', '◐', '○', '!']) expect(text).not.toContain(glyph)
  })

  it('marks done with a tick, in progress with the spinner, to do with an empty ring', async () => {
    const container = await inTray(plan)
    await clickChip('Plan 1/3')
    const rows = container.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].querySelector('svg path')?.getAttribute('d')).toBe('M2 5.2 4 7.2 8 3')
    expect(rows[1].querySelector('svg')).not.toBeNull()
    // The spinner draws no tick.
    expect(rows[1].querySelector('svg path[d="M2 5.2 4 7.2 8 3"]')).toBeNull()
    expect(rows[2].querySelector('svg')).toBeNull()
  })

  it('closes again when its chip is clicked a second time', async () => {
    const container = await inTray(plan)
    await clickChip('Plan 1/3')
    await clickChip('Plan 1/3')
    expect(container.textContent).not.toContain('Ship it')
    expect(container.textContent).toContain('Plan 1/3')
  })

  it('opening another section closes this one', async () => {
    const container = await renderInTray([
      h(PlanCard, { todos: plan }),
      h(BackgroundTasksStrip, {
        tasks: [{ id: 'mol-bg-1', command: 'npm test', status: 'running', startedAt: Date.now() }],
      }),
    ])
    await clickChip('Plan 1/3')
    expect(container.textContent).toContain('Ship it')
    await clickChip('1 running')
    expect(container.textContent).not.toContain('Ship it')
    expect(container.textContent).toContain('npm test')
  })

  it('does not spin a step when no turn is running: it says the work stopped', async () => {
    const container = await renderInTray([h(PlanCard, { todos: plan, live: false })])
    await clickChip('Plan 1/3')
    const rows = container.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Stopped before finishing')
    expect(rows[1].textContent).not.toContain('Waiting for your answer')
    // The stopped mark is plain text in a ring, not the spinner's svg.
    expect(rows[1].querySelector('svg')).toBeNull()
  })

  it('says it is waiting for the person when the turn is paused on a question', async () => {
    const container = await renderInTray([
      h(PlanCard, { todos: plan, live: false, awaitingUser: true }),
    ])
    await clickChip('Plan 1/3')
    const rows = container.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Waiting for your answer')
  })

  it('draws nothing for an empty plan', async () => {
    const container = await inTray([])
    expect(container.textContent).toBe('')
  })
})

describe('ToolCallCard — update_task_list', () => {
  it('adds nothing to the transcript (the pinned plan card carries it)', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: (): VNodeChild =>
          h(ToolCallCard, {
            id: 'tc-plan',
            name: 'update_task_list',
            status: 'done',
            input: { todos },
          }),
      }),
    )
    app.use(createThemePlugin(buildThemeProvider()))
    mounted.app = app
    app.mount(host)
    expect(host.textContent).toBe('')
  })
})
