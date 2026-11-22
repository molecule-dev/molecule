// @vitest-environment jsdom
/**
 * WorkCard — the work tray — rendered for real: a port of the
 * `@molecule/app-ide-react/src/__tests__/WorkCard.test.tsx` cases whose other
 * components are ported, with the same test names and the same behavioral
 * assertions, mounted as a real Solid root. The tray variant wraps the strip
 * in the Solid `WorkCard` (React's test wraps it in the React one); the plan
 * rows are passed as `PlanCard` takes them (`latestPlan`, the transcript
 * scanner that builds them in React's test, is panel-logic's and not exported
 * yet). React's fourth case holds `TestStatusBar`, rendered here as the Solid
 * part.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import type { TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.jsx'
import { DockStrip } from '../parts/DockStrip.jsx'
import { PlanCard } from '../parts/PlanCard.jsx'
import { TestStatusBar } from '../parts/TestStatusBar.jsx'
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

/**
 * Renders the strip, alone or inside the work tray.
 *
 * @param options.tray - Wrap the strip in the work tray.
 */
function renderStrip({ tray = false }: { tray?: boolean } = {}): void {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const section = (): JSX.Element => (
    <DockStrip
      molId="info"
      toggleMolId="info-toggle"
      expanded={false}
      label="Info"
      onToggle={() => {}}
    />
  )
  dispose = render(
    () =>
      tray ? (
        <ThemeContext.Provider value={themeProvider}>
          <WorkCard>{section()}</WorkCard>
        </ThemeContext.Provider>
      ) : (
        section()
      ),
    host,
  )
}

/**
 * Finds a rendered button by its text.
 * @param text - The button's text.
 * @returns The button.
 */
function buttonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  ) as HTMLButtonElement | undefined
  if (!button) throw new Error(`missing button ${text}`)
  return button
}

describe('WorkCard', () => {
  it('keeps an action click from also toggling the file disclosure', () => {
    const onToggle = vi.fn()
    document.body.innerHTML = ''
    const host = document.createElement('div')
    document.body.appendChild(host)
    dispose = render(
      () => (
        <DockStrip
          molId="files"
          toggleMolId="files-toggle"
          expanded={false}
          label="Files"
          hideLabel={true}
          onToggle={onToggle}
          actions={<button type="button">Commit 2 files</button>}
        />
      ),
      host,
    )
    // The action is the overlay button's sibling, so its click never toggles.
    buttonByText('Commit 2 files').click()
    expect(onToggle).not.toHaveBeenCalled()
    document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')?.click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('gives info disclosures a clickable hover recipe (tray=%s)', (tray) => {
    renderStrip({ tray })
    const control = document.querySelector<HTMLElement>('[data-mol-id="info-toggle"]')
    if (!control) throw new Error('missing info-toggle element')
    // The standalone row's visual chrome is the overlay button's parent; the
    // tray chip itself is the control.
    const chrome = control.tagName === 'BUTTON' ? control.parentElement! : control
    const recipe = classMap.button({ variant: 'ghost', color: 'secondary', size: 'xs' })
    for (const token of recipe.split(/\s+/).filter(Boolean)) {
      expect(chrome.classList.contains(token)).toBe(true)
    }
    // Inline backgrounds would override the design system's hover background.
    expect(chrome.style.background).toBe('')
    expect(chrome.style.backgroundColor).toBe('')
  })

  it('holds the plan and the background tasks in one frame', () => {
    const todos: TaskListRow[] = [{ content: 'Fix it', status: 'in_progress' }]
    document.body.innerHTML = ''
    const host = document.createElement('div')
    document.body.appendChild(host)
    dispose = render(
      () => (
        <ThemeContext.Provider value={themeProvider}>
          <WorkCard>
            <PlanCard todos={todos} />
            <BackgroundTasksStrip
              tasks={[
                {
                  id: 'mol-bg-1',
                  command: 'npm test',
                  description: 'Run the tests',
                  status: 'running',
                  startedAt: Date.now(),
                },
              ]}
            />
          </WorkCard>
        </ThemeContext.Provider>
      ),
      host,
    )
    const frames = document.querySelectorAll('[data-mol-id="work-card"]')
    expect(frames).toHaveLength(1)
    expect(frames[0]!.querySelector('[data-mol-id="task-list-card"]')).not.toBeNull()
    expect(frames[0]!.querySelector('[data-mol-id="chat-background-tasks"]')).not.toBeNull()
  })

  it.each(['idle', 'running', 'finished'] as const)(
    'opens the tests view directly from the %s summary',
    (state) => {
      const run: TestsRunState = {
        ...EMPTY_RUN_STATE,
        runId: 'r1',
        running: state === 'running',
        queued: ['a', 'b'],
        currentId: null,
        output: [],
        results:
          state === 'finished'
            ? {
                a: {
                  status: 'passed',
                  durationMs: 1,
                  passed: 3,
                  failed: 0,
                  skipped: 0,
                  output: '',
                },
                b: {
                  status: 'failed',
                  durationMs: 1,
                  passed: 0,
                  failed: 1,
                  skipped: 0,
                  output: '',
                },
              }
            : {},
        cases: {},
        skipPending: false,
        skipUnavailable: false,
        outcome: state === 'finished' ? 'completed' : null,
        error: null,
        startedAt: 0,
        durationMs: 5,
      }
      const tests: TestItem[] = [
        { id: 'a', file: 'a.test.ts', kind: 'unit', workspace: '.' },
        { id: 'b', file: 'e2e/b.spec.ts', kind: 'e2e', workspace: '.' },
      ]
      const onOpen = vi.fn()
      const onStop = vi.fn()
      document.body.innerHTML = ''
      const host = document.createElement('div')
      document.body.appendChild(host)
      dispose = render(
        () => (
          <ThemeContext.Provider value={themeProvider}>
            <WorkCard>
              <TestStatusBar run={run} tests={tests} onOpen={onOpen} onStop={onStop} />
            </WorkCard>
          </ThemeContext.Provider>
        ),
        host,
      )
      const summary = document.querySelector<HTMLElement>('[data-mol-id="tests-bar-toggle"]')!
      expect(summary.hasAttribute('aria-expanded')).toBe(false)
      expect(document.querySelector('[data-mol-id="tests-bar-counts"]')).toBeNull()
      expect(document.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      summary.click()
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(document.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      expect(document.querySelector('[data-mol-id="tests-bar-detail"]')).toBeNull()
      summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(onOpen).toHaveBeenCalledTimes(2)
      if (state === 'running') {
        ;(document.querySelector('[data-mol-id="tests-bar-stop"]') as HTMLElement).click()
        expect(onStop).toHaveBeenCalledTimes(1)
        expect(onOpen).toHaveBeenCalledTimes(2)
      }
    },
  )
})
