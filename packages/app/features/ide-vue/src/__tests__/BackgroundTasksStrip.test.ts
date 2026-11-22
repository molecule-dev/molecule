// @vitest-environment jsdom
/**
 * BackgroundTasksStrip — the detached-command strip — rendered for real: a
 * port of `@molecule/app-ide-react/src/__tests__/BackgroundTasksStrip.test.tsx`
 * with the same test name and the same assertions, mounted through Vue's own
 * `createApp` and re-rendered by reassigning the `tasks` prop the way React's
 * `rerender` does.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { BackgroundTasksStrip } from '../parts/BackgroundTasksStrip.js'
import { buildThemeProvider } from './theme-test-provider.js'

const mounted: { app?: ReturnType<typeof createApp> } = {}
/** The prop the host passes down; reassigning it is the test's `rerender`. */
const tasks = ref<BackgroundTaskState[]>([])

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
 * Renders the strip with the given tasks.
 *
 * @param initial - The first `tasks` prop.
 * @returns The mounted host element.
 */
function renderStrip(initial: BackgroundTaskState[]): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  tasks.value = initial
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(BackgroundTasksStrip, { tasks: tasks.value }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * Re-renders the strip with a new `tasks` prop.
 *
 * @param next - The next `tasks` prop.
 */
async function rerender(next: BackgroundTaskState[]): Promise<void> {
  tasks.value = next
  await nextTick()
}

describe('background progress', () => {
  it('shows measured output in collapsed and expanded states without inventing a percentage', async () => {
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
    await rerender([
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
