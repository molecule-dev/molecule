// @vitest-environment jsdom

/**
 * Everything about the work in flight shares ONE card: the plan, background tasks
 * and (given by the host) tests and files are sections of the same frame.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../components/BackgroundTasksStrip.js'
import { DockStrip } from '../components/DockStrip.js'
import { latestPlan, PlanCard } from '../components/PlanCard.js'
import { EMPTY_RUN_STATE, type TestsRunState } from '../components/tests-card-utilities.js'
import { TestStatusBar } from '../components/TestStatusBar.js'
import { WorkCard } from '../components/WorkCard.js'
import type { TestItem } from '../types.js'

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  return {
    getTheme: () => lightTheme,
    getThemes: () => [lightTheme],
    setTheme: () => {},
    toggleMode: () => {},
    subscribe: () => () => {},
  }
}

const plan = latestPlan([
  {
    toolCalls: [
      {
        name: 'update_task_list',
        input: { todos: [{ content: 'Fix it', status: 'in_progress' }] },
      },
    ],
  },
])

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('WorkCard', () => {
  it('keeps keyboard events on an action from also toggling the file disclosure', () => {
    const onToggle = vi.fn()
    const { getByText, container } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          <DockStrip
            molId="files"
            toggleMolId="files-toggle"
            expanded={false}
            onToggle={onToggle}
            label="Files"
            hideLabel
            actions={<button type="button">Commit 2 files</button>}
          />
        </ThemeProvider>
      </I18nProvider>,
    )
    fireEvent.keyDown(getByText('Commit 2 files'), { key: 'Enter' })
    expect(onToggle).not.toHaveBeenCalled()
    fireEvent.keyDown(container.querySelector('[data-mol-id="files-toggle"]')!, { key: 'Enter' })
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('gives info disclosures a clickable hover recipe (tray=%s)', (tray) => {
    const section = (
      <DockStrip
        molId="info"
        toggleMolId="info-toggle"
        expanded={false}
        onToggle={() => {}}
        label="Info"
      />
    )
    const { container } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          {tray ? <WorkCard>{section}</WorkCard> : section}
        </ThemeProvider>
      </I18nProvider>,
    )
    const toggle = container.querySelector<HTMLElement>('[data-mol-id="info-toggle"]')!
    const recipe = classMap.button({ variant: 'ghost', color: 'secondary', size: 'xs' })
    for (const token of recipe.split(/\s+/).filter(Boolean)) {
      expect(toggle.classList.contains(token)).toBe(true)
    }
    // Inline backgrounds would override the design system's hover background.
    expect(toggle.style.background).toBe('')
    expect(toggle.style.backgroundColor).toBe('')
  })

  it('holds the plan and the background tasks in one frame', () => {
    const { container } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          <WorkCard>
            <PlanCard todos={plan} />
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
        </ThemeProvider>
      </I18nProvider>,
    )
    const frames = container.querySelectorAll('[data-mol-id="work-card"]')
    expect(frames).toHaveLength(1)
    expect(frames[0].querySelector('[data-mol-id="task-list-card"]')).not.toBeNull()
    expect(frames[0].querySelector('[data-mol-id="chat-background-tasks"]')).not.toBeNull()
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
      const { container } = render(
        <I18nProvider provider={createSimpleI18nProvider('en')}>
          <ThemeProvider provider={buildThemeProvider()}>
            <WorkCard>
              <TestStatusBar run={run} tests={tests} onOpen={onOpen} onStop={onStop} />
            </WorkCard>
          </ThemeProvider>
        </I18nProvider>,
      )
      const summary = container.querySelector('[data-mol-id="tests-bar-toggle"]')!
      expect(summary.hasAttribute('aria-expanded')).toBe(false)
      expect(container.querySelector('[data-mol-id="tests-bar-counts"]')).toBeNull()
      expect(container.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      fireEvent.click(summary)
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(container.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      expect(container.querySelector('[data-mol-id="tests-bar-detail"]')).toBeNull()
      fireEvent.keyDown(summary, { key: 'Enter' })
      expect(onOpen).toHaveBeenCalledTimes(2)
      if (state === 'running') {
        fireEvent.click(container.querySelector('[data-mol-id="tests-bar-stop"]')!)
        expect(onStop).toHaveBeenCalledTimes(1)
        expect(onOpen).toHaveBeenCalledTimes(2)
      }
    },
  )
})
