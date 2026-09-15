// @vitest-environment jsdom

/**
 * The Tests bar, rendered for real: what it lists, what a Run sends to the
 * host, what streamed events do to the rows, and what a viewer (or a stopped
 * project) is shown instead of a dead button.
 *
 * @module
 */

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TestsBar } from '../components/TestsBar.js'
import type { TestList, TestRunEvent, TestRunHandle, TestSelection } from '../types.js'

const LIST: TestList = {
  tests: [
    {
      id: 'app:e2e/home.spec.ts',
      file: 'e2e/home.spec.ts',
      kind: 'e2e',
      workspace: 'app',
      title: 'home',
    },
    {
      id: 'app:e2e/about.spec.ts',
      file: 'e2e/about.spec.ts',
      kind: 'e2e',
      workspace: 'app',
      title: 'about',
    },
    {
      id: 'api:src/routes.test.ts',
      file: 'src/routes.test.ts',
      kind: 'unit',
      workspace: 'api',
      title: 'routes',
    },
  ],
  runners: { app: { e2e: 'playwright', unit: 'vitest' }, api: { e2e: null, unit: 'vitest' } },
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Render the bar with a resolved list and a controllable run.
 *
 * @param overrides - Props to override.
 * @returns The RTL result plus the recorded host calls.
 */
async function renderBar(overrides: Partial<ComponentProps<typeof TestsBar>> = {}): Promise<{
  container: HTMLElement
  selections: TestSelection[]
  emit: (event: TestRunEvent) => void
  cancels: number
}> {
  const selections: TestSelection[] = []
  const state = { emit: (_event: TestRunEvent): void => {}, cancels: 0 }
  const runTests = (
    selection: TestSelection,
    onEvent: (event: TestRunEvent) => void,
  ): TestRunHandle => {
    selections.push(selection)
    state.emit = onEvent
    return {
      cancel: () => {
        state.cancels += 1
      },
    }
  }
  const result = render(
    <TestsBar listTests={async () => LIST} runTests={runTests} canRun available {...overrides} />,
  )
  await waitFor(() => {
    expect(molId(result.container, 'tests-bar')).not.toBeNull()
  })
  return {
    container: result.container,
    selections,
    emit: (event) => act(() => state.emit(event)),
    get cancels() {
      return state.cancels
    },
  }
}

describe('TestsBar — listing', () => {
  it('renders nothing at all until the host lists at least one test', async () => {
    const { container } = render(
      <TestsBar
        listTests={async () => ({ tests: [], runners: {} })}
        runTests={() => ({ cancel: () => {} })}
        canRun
        available
      />,
    )
    await waitFor(() => {
      expect(molId(container, 'tests-bar')).toBeNull()
    })
  })

  it('shows the count collapsed, and the grouped rows once expanded', async () => {
    const { container } = await renderBar()
    expect(molId(container, 'tests-bar-toggle')?.textContent).toContain('3 tests')
    expect(molId(container, 'tests-bar-list')).toBeNull()

    fireEvent.click(molId(container, 'tests-bar-toggle') as HTMLElement)
    expect(molId(container, 'tests-bar-list')).not.toBeNull()
    expect(molId(container, 'tests-bar-group-e2e-app')?.textContent).toContain('End-to-end')
    expect(molId(container, 'tests-bar-group-unit-api')?.textContent).toContain('Unit')
    expect(molId(container, 'tests-bar-row-app:e2e/home.spec.ts')).not.toBeNull()
    expect(molId(container, 'tests-bar-row-api:src/routes.test.ts')).not.toBeNull()
  })

  it('collapses again on a second toggle, and is keyboard operable', async () => {
    const { container } = await renderBar()
    const toggle = molId(container, 'tests-bar-toggle') as HTMLElement
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(molId(container, 'tests-bar-list')).not.toBeNull()
    fireEvent.keyDown(toggle, { key: ' ' })
    expect(molId(container, 'tests-bar-list')).toBeNull()
    expect(toggle.getAttribute('tabindex')).toBe('0')
  })

  it('says so in the bar (never a toast) when the list cannot be read', async () => {
    const { container } = render(
      <TestsBar
        listTests={async () => {
          throw new Error('nope')
        }}
        runTests={() => ({ cancel: () => {} })}
        canRun
        available
      />,
    )
    await waitFor(() => {
      expect(molId(container, 'tests-bar-list-error')?.textContent).toContain('Could not list')
    })
  })

  it('tells e2e readers the specs drive the live preview', async () => {
    const { container } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-toggle') as HTMLElement)
    expect(molId(container, 'tests-bar-e2e-hint')?.textContent).toContain('live preview')
  })
})

describe('TestsBar — dispatching runs', () => {
  it('Run all asks the host for the whole selection', async () => {
    const { container, selections } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-run-all') as HTMLElement)
    expect(selections).toEqual([{ kind: 'all' }])
  })

  it('the per-kind buttons ask for that kind only', async () => {
    const { container, selections } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-run-e2e') as HTMLElement)
    fireEvent.click(molId(container, 'tests-bar-cancel') as HTMLElement)
    fireEvent.click(molId(container, 'tests-bar-run-unit') as HTMLElement)
    expect(selections).toEqual([{ kind: 'e2e' }, { kind: 'unit' }])
  })

  it('a single row’s Run asks for exactly that one id', async () => {
    const { container, selections } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-toggle') as HTMLElement)
    fireEvent.click(molId(container, 'tests-bar-run-app:e2e/about.spec.ts') as HTMLElement)
    expect(selections).toEqual([{ ids: ['app:e2e/about.spec.ts'] }])
  })

  it('a group’s Run asks for every id in that group', async () => {
    const { container, selections } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-toggle') as HTMLElement)
    fireEvent.click(molId(container, 'tests-bar-run-group-e2e-app') as HTMLElement)
    expect(selections).toEqual([{ ids: ['app:e2e/about.spec.ts', 'app:e2e/home.spec.ts'] }])
  })

  it('expands itself on a run so the rows and output are visible', async () => {
    const { container } = await renderBar()
    expect(molId(container, 'tests-bar-list')).toBeNull()
    fireEvent.click(molId(container, 'tests-bar-run-all') as HTMLElement)
    expect(molId(container, 'tests-bar-list')).not.toBeNull()
  })
})

describe('TestsBar — a live run', () => {
  it('shows a spinner row, streams output, then marks each row from its result', async () => {
    const { container, emit } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-run-all') as HTMLElement)
    expect(molId(container, 'tests-bar-running')?.textContent).toContain('Running')

    emit({
      type: 'start',
      runId: 'r1',
      ids: ['app:e2e/home.spec.ts', 'app:e2e/about.spec.ts'],
    })
    expect(molId(container, 'tests-bar-status-app:e2e/home.spec.ts')?.textContent).toContain(
      'Running',
    )

    emit({ type: 'output', id: 'app:e2e/home.spec.ts', chunk: 'Running 1 test using 1 worker' })
    expect(molId(container, 'tests-bar-output')?.textContent).toContain('Running 1 test')

    emit({
      type: 'result',
      id: 'app:e2e/home.spec.ts',
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
    })
    emit({
      type: 'result',
      id: 'app:e2e/about.spec.ts',
      status: 'failed',
      passed: 0,
      failed: 1,
      skipped: 0,
      output: 'Error: expect(received).toBe(expected)',
    })
    emit({ type: 'done', outcome: 'completed', passed: 1, failed: 1, skipped: 0 })

    expect(molId(container, 'tests-bar-status-app:e2e/home.spec.ts')?.textContent).toBe('Passed')
    expect(molId(container, 'tests-bar-status-app:e2e/about.spec.ts')?.textContent).toBe('Failed')
    expect(molId(container, 'tests-bar-summary')?.textContent).toContain('1 passed')
    expect(molId(container, 'tests-bar-summary')?.textContent).toContain('1 failed')
  })

  it('keeps a failure’s output under its row after the run ends', async () => {
    const { container, emit } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-run-all') as HTMLElement)
    emit({ type: 'start', runId: 'r1', ids: ['app:e2e/about.spec.ts'] })
    emit({
      type: 'result',
      id: 'app:e2e/about.spec.ts',
      status: 'failed',
      passed: 0,
      failed: 1,
      skipped: 0,
      output: 'Error: expect(received).toBe(expected)\n  Expected: 2\n  Received: 1',
    })
    emit({ type: 'done', outcome: 'completed', passed: 0, failed: 1, skipped: 0 })

    const failure = molId(container, 'tests-bar-failure-app:e2e/about.spec.ts')
    expect(failure?.textContent).toContain('Expected: 2')
    // A passing row never grows an output block.
    expect(molId(container, 'tests-bar-failure-app:e2e/home.spec.ts')).toBeNull()
  })

  it('surfaces a run error in the bar rather than a toast', async () => {
    const { container, emit } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-run-all') as HTMLElement)
    emit({ type: 'start', runId: 'r1', ids: ['app:e2e/home.spec.ts'] })
    emit({
      type: 'done',
      outcome: 'timeout',
      error: 'The run passed its 10-minute budget and was stopped.',
    })
    expect(molId(container, 'tests-bar-run-error')?.textContent).toContain('10-minute budget')
  })

  it('Stop cancels the host handle and says the run was stopped', async () => {
    const bar = await renderBar()
    fireEvent.click(molId(bar.container, 'tests-bar-run-all') as HTMLElement)
    bar.emit({ type: 'start', runId: 'r1', ids: ['app:e2e/home.spec.ts'] })
    fireEvent.click(molId(bar.container, 'tests-bar-cancel') as HTMLElement)
    expect(bar.cancels).toBe(1)
    expect(molId(bar.container, 'tests-bar-cancelled')?.textContent).toContain('stopped')
    expect(molId(bar.container, 'tests-bar-run-all')).not.toBeNull()
  })

  it('does not start a second run while one is live', async () => {
    const { container, selections, emit } = await renderBar()
    fireEvent.click(molId(container, 'tests-bar-run-all') as HTMLElement)
    emit({ type: 'start', runId: 'r1', ids: ['app:e2e/home.spec.ts'] })
    fireEvent.click(molId(container, 'tests-bar-run-e2e') as HTMLElement)
    expect(selections).toHaveLength(1)
  })
})

describe('TestsBar — who may run', () => {
  it('a VIEWER still sees the tests, with every run control disabled and the reason shown', async () => {
    const { container, selections } = await renderBar({ canRun: false })
    expect(molId(container, 'tests-bar-disabled-reason')?.textContent).toContain(
      'Only editors can run',
    )
    const runAll = molId(container, 'tests-bar-run-all') as HTMLButtonElement
    expect(runAll.disabled).toBe(true)
    fireEvent.click(runAll)
    expect(selections).toHaveLength(0)

    fireEvent.click(molId(container, 'tests-bar-toggle') as HTMLElement)
    expect(
      (molId(container, 'tests-bar-run-app:e2e/home.spec.ts') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('stays silent when the project has never been up, rather than showing an empty strip', async () => {
    const listTests = vi.fn(async () => LIST)
    const { container } = render(
      <TestsBar
        listTests={listTests}
        runTests={() => ({ cancel: () => {} })}
        canRun
        available={false}
      />,
    )
    await waitFor(() => {
      expect(molId(container, 'tests-bar')).toBeNull()
    })
    // Nothing can be discovered in a stopped project, so the host is not asked.
    expect(listTests).not.toHaveBeenCalled()
  })

  it('keeps the previously listed tests, disabled, when the project goes down', async () => {
    const { container, rerender } = render(
      <TestsBar
        listTests={async () => LIST}
        runTests={() => ({ cancel: () => {} })}
        canRun
        available
      />,
    )
    await waitFor(() => {
      expect(molId(container, 'tests-bar')).not.toBeNull()
    })
    rerender(
      <TestsBar
        listTests={async () => {
          throw new Error('sandbox is gone')
        }}
        runTests={() => ({ cancel: () => {} })}
        canRun
        available={false}
      />,
    )
    expect(molId(container, 'tests-bar-toggle')?.textContent).toContain('3 tests')
    expect(molId(container, 'tests-bar-disabled-reason')?.textContent).toContain(
      'Start the project',
    )
    expect((molId(container, 'tests-bar-run-all') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('TestsBar — refreshing', () => {
  it('re-lists when the host bumps its file-change key, so a new spec appears', async () => {
    const listTests = vi.fn(async () => LIST)
    const { container, rerender } = render(
      <TestsBar listTests={listTests} runTests={() => ({ cancel: () => {} })} canRun available />,
    )
    await waitFor(() => {
      expect(molId(container, 'tests-bar')).not.toBeNull()
    })
    const before = listTests.mock.calls.length
    rerender(
      <TestsBar
        listTests={listTests}
        runTests={() => ({ cancel: () => {} })}
        canRun
        available
        refreshKey={1}
      />,
    )
    await waitFor(() => {
      expect(listTests.mock.calls.length).toBeGreaterThan(before)
    })
  })
})
