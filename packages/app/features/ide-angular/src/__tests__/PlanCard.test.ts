// @vitest-environment jsdom
/**
 * The working plan is one card pinned above the composer: it shows the LATEST
 * `update_task_list` call (a check circle when done, the molecule spinner while
 * in progress, an empty ring to do — no text glyphs, no "!" marker), and the
 * transcript no longer repeats it on every update. A port of
 * `@molecule/app-ide-react/src/__tests__/PlanCard.test.tsx` with the same test
 * names and the same assertions, mounted through Angular's own
 * `createApplication` with zoneless change detection.
 *
 * Every interaction flushes zoneless change detection where React's test reads
 * the DOM synchronously; the assertions are the React ones verbatim.
 *
 * The `latestPlan` describe block is ported against the scanner this package
 * now exports from its own `parts/plan-card.component.ts` (React's
 * `latestPlan`), so a transcript's most recent `update_task_list` call resolves
 * to the pinned card's rows here too. The "opening another section" test mounts
 * a bare `DockStrip` as the second section: React's second strip is
 * `BackgroundTasksStrip`, whose port has not landed in this package yet.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { DockStrip } from '../parts/dock-strip.component.js'
import { latestPlan, PlanCard } from '../parts/plan-card.component.js'
import { WorkCard } from '../parts/work-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

const todos = [
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
 * The JIT host the way the conformance kit mounts the component: the work
 * tray with the plan inside it, and — with `withOther` — the second section
 * the React test's BackgroundTasksStrip provides (the strip's port has not
 * landed here yet).
 */
const PlanCardHost = Component({
  selector: 'mol-plan-card-host',
  standalone: true,
  imports: [WorkCard, PlanCard, DockStrip],
  changeDetection: ChangeDetectionStrategy.Default,
  // prettier-ignore
  template: `<div mol-work-card><div mol-plan-card [todos]="p['todos']" [live]="p['live']" [awaitingUser]="p['awaitingUser']"></div>@if (p['withOther']) {<div mol-dock-strip molId="chat-background-tasks" toggleMolId="chat-background-tasks-toggle" [expanded]="false" [onToggle]="noop" label="1 running"><div>npm test</div></div>}</div>`,
})(
  class PlanCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}

    /** The second section's toggle (it opens through the tray, not this). */
    noop = (): void => {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<unknown>
  container: HTMLElement
} | null = null

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

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Renders PlanCard in the work tray, the way ChatPanel does.
 *
 * @param props - The card's props, plus `withOther` for the second section.
 */
async function renderInTray(props: Record<string, unknown>): Promise<void> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideTheme(buildThemeProvider())],
  })
  const ref: ComponentRef<InstanceType<typeof PlanCardHost>> = createComponent(PlanCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { todos: plan, live: true, awaitingUser: false, ...props }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
  // The strips draw their chips into the tray header on the pass after the
  // tray's own view init, so one more settle makes the chip deterministic.
  await flush()
}

/**
 * Clicks the chip with the given text, then lets the tray's re-render flush.
 *
 * @param text - The chip's text.
 */
async function clickChip(text: string): Promise<void> {
  getByText(text).click()
  await flush()
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('PlanCard in the work tray', () => {
  it('is one chip with progress, and opens to list every task with no text glyphs or priority marker', async () => {
    await renderInTray({})
    expect(document.body.textContent).toContain('Plan 1/3')
    expect(document.body.textContent).not.toContain('Ship it')
    await clickChip('Plan 1/3')
    const text = document.body.textContent ?? ''
    for (const label of ['Write tests', 'Fix the card', 'Ship it']) expect(text).toContain(label)
    for (const glyph of ['✓', '◐', '○', '!']) expect(text).not.toContain(glyph)
  })

  it('marks done with a tick, in progress with the spinner, to do with an empty ring', async () => {
    await renderInTray({})
    await clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].querySelector('svg path')?.getAttribute('d')).toBe('M2 5.2 4 7.2 8 3')
    expect(rows[1].querySelector('svg')).not.toBeNull()
    expect(rows[1].querySelector('svg path')?.getAttribute('d')).not.toBe('M2 5.2 4 7.2 8 3')
    expect(rows[2].querySelector('svg')).toBeNull()
  })

  it('closes again when its chip is clicked a second time', async () => {
    await renderInTray({})
    await clickChip('Plan 1/3')
    await clickChip('Plan 1/3')
    expect(document.body.textContent).not.toContain('Ship it')
    expect(document.body.textContent).toContain('Plan 1/3')
  })

  it('opening another section closes this one', async () => {
    await renderInTray({ withOther: true })
    await clickChip('Plan 1/3')
    expect(document.body.textContent).toContain('Ship it')
    await clickChip('1 running')
    expect(document.body.textContent).not.toContain('Ship it')
    expect(document.body.textContent).toContain('npm test')
  })

  it('does not spin a step when no turn is running: it says the work stopped', async () => {
    await renderInTray({ live: false })
    await clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Stopped before finishing')
    expect(rows[1].textContent).not.toContain('Waiting for your answer')
    // The stopped mark is plain text in a ring, not the spinner's svg.
    expect(rows[1].querySelector('svg')).toBeNull()
  })

  it('says it is waiting for the person when the turn is paused on a question', async () => {
    await renderInTray({ live: false, awaitingUser: true })
    await clickChip('Plan 1/3')
    const rows = document.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Waiting for your answer')
  })

  it('draws nothing for an empty plan', async () => {
    await renderInTray({ todos: [] })
    expect(document.body.textContent?.trim() ?? '').toBe('')
  })
})

describe('ToolCallCard — update_task_list', () => {
  it('adds nothing to the transcript (the pinned plan card carries it)', async () => {
    if (current) {
      current.appRef.destroy()
      current.container.remove()
      current = null
    }
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideTheme(buildThemeProvider())],
    })
    const ref: ComponentRef<ToolCallCard> = createComponent(ToolCallCard, {
      environmentInjector: appRef.injector,
    })
    ref.setInput('id', 'tc-plan')
    ref.setInput('name', 'update_task_list')
    ref.setInput('status', 'done')
    ref.setInput('input', { todos })
    container.appendChild(ref.location.nativeElement as HTMLElement)
    appRef.attachView(ref.hostView)
    ref.changeDetectorRef.markForCheck()
    current = {
      appRef,
      ref,
      container,
    }
    current.appRef.tick()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    current.appRef.tick()
    expect(container.textContent).toBe('')
  })
})
