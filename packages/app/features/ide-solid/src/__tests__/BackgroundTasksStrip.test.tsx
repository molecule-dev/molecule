// @vitest-environment jsdom
/**
 * BackgroundTasksStrip — the detached-command strip — rendered for real: a
 * port of `@molecule/app-ide-react/src/__tests__/BackgroundTasksStrip.test.tsx`
 * with the same test name and the same assertions, mounted as a real Solid
 * root under `MoleculeProvider` and re-rendered by reassigning the `tasks`
 * prop the way React's `rerender` does.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void; setTasks?: (next: BackgroundTaskState[]) => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  mounted.setTasks = undefined
  document.body.innerHTML = ''
})

/**
 * Renders the strip with the given tasks, keeping a setter for the rerender.
 *
 * @param initial - The first `tasks` prop.
 * @returns The mounted host element.
 */
function renderStrip(initial: BackgroundTaskState[]): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const [tasks, setTasks] = createSignal<BackgroundTaskState[]>(initial)
  mounted.setTasks = setTasks
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()}>
        <BackgroundTasksStrip tasks={tasks()} />
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

/**
 * Re-renders the strip with a new `tasks` prop.
 *
 * @param next - The next `tasks` prop.
 */
function rerender(next: BackgroundTaskState[]): void {
  mounted.setTasks?.(next)
}

describe('background progress', () => {
  it('shows measured output in collapsed and expanded states without inventing a percentage', () => {
    const container = renderStrip([
      {
        id: 'summary',
        kind: 'agent',
        command: 'Summarize context',
        status: 'running',
        startedAt: Date.now(),
        outputChars: 1024,
      },
    ])
    expect(container.textContent).toContain('1,024 characters produced')
    expect(container.textContent).not.toContain('%')
    const button = container.querySelector('button')
    if (!button) throw new Error('missing disclosure button')
    button.click()
    expect(container.textContent).toContain('1,024 characters produced')
    rerender([
      {
        id: 'summary',
        kind: 'agent',
        command: 'Summarize context',
        status: 'cancelled',
        startedAt: 1000,
        finishedAt: 2000,
        outputChars: 1024,
      },
    ])
    expect(container.textContent).toContain('cancelled · 1s')
    expect(container.textContent).not.toContain('failed')
    expect(container.textContent).not.toContain('done')
  })
})
