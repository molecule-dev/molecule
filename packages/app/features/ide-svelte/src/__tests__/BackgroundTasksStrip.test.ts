// @vitest-environment jsdom
/**
 * BackgroundTasksStrip — the detached-command strip — rendered for real: a
 * port of `@molecule/app-ide-react/src/__tests__/BackgroundTasksStrip.test.tsx`
 * with the same test name and the same assertions, mounted through Svelte 5's
 * own `mount`/`unmount` and re-rendered by reassigning the `tasks` prop the
 * way React's `rerender` does.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import BackgroundTasksStripHost from './BackgroundTasksStripHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
})

/**
 * Renders the strip with the given tasks.
 *
 * @param initial - The first `tasks` prop.
 * @returns The mounted host element.
 */
function renderStrip(initial: BackgroundTaskState[]): HTMLElement {
  for (const { instance, container } of mounted.splice(0)) {
    void unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(BackgroundTasksStripHost, {
    target: container,
    props: { theme: buildThemeProvider(), tasks: initial },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

/**
 * Re-renders the strip with a new `tasks` prop, through the host's exported
 * setter — the same instance keeps rendering, the way React's `rerender` does.
 *
 * @param instance - The mount instance.
 * @param next - The next `tasks` prop.
 */
function rerender(instance: Record<string, unknown>, next: BackgroundTaskState[]): void {
  const setTasks = instance.setTasks as (next: BackgroundTaskState[]) => void
  setTasks(next)
  flushSync()
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
    flushSync()
    expect(container.textContent).toContain('1,024 characters produced')
    const { instance } = mounted[mounted.length - 1] as {
      instance: Record<string, unknown>
    }
    rerender(instance, [
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
