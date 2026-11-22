// @vitest-environment jsdom
/**
 * Skipping the executor's in-flight tool call, and saying so honestly — a port
 * of `@molecule/app-ide-react`'s `ToolCallCard.skip.test.tsx` with the same test
 * names and the same behavioral assertions, mounted through Vue's own
 * `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { TranslateFunction } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { isSkippedByUser, toolSummary } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * English passthrough translator — the text the package's former static `t`
 * returned for `en`, so these direct-call expectations stay plain English while
 * following the caller-supplied-translate-function contract.
 */
const t: TranslateFunction = (key, values, opts) =>
  opts?.defaultValue
    ? Object.entries(values ?? {}).reduce(
        (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
        opts.defaultValue,
      )
    : key

/** The output the API sends back for a call the person skipped. */
const SKIPPED_OUTPUT = {
  status: 'skipped_by_user',
  message: 'This command did not run to completion — the person skipped it.',
}

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Render one tool call inside the contexts it mounts in.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCall(overrides: Record<string, unknown> = {}): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(ToolCallCard, {
          id: 'tc-1',
          name: 'exec_command',
          input: { command: 'npx playwright test' },
          status: 'running',
          ...overrides,
        }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('ToolCallCard — Skip on a running call', () => {
  it('offers Skip while the call is running, and hands the host its id', () => {
    const skipped: string[] = []
    const container = renderCall({
      onSkip: (id: string) => {
        skipped.push(id)
      },
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('Skip')
    skip.click()
    expect(skipped).toEqual(['tc-1'])
  })

  it('is a real button, not a control nested inside the row button', () => {
    const container = renderCall({ onSkip: () => {} })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip.tagName).toBe('BUTTON')
    expect(skip.closest('button')).toBe(skip)
  })

  it('renders as a filled button, never as a text link', () => {
    const container = renderCall({ onSkip: () => {} })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    const solid = classMap.button({ variant: 'solid', color: 'primary', size: 'xs' })
    const ghost = classMap.button({ variant: 'ghost', size: 'xs' })
    expect(solid).not.toBe(ghost)
    for (const token of solid.split(/\s+/).filter(Boolean)) {
      expect(skip.classList.contains(token), `missing ${token}`).toBe(true)
    }
    for (const token of ghost.split(/\s+/).filter(Boolean)) {
      if (solid.split(/\s+/).includes(token)) continue
      expect(skip.classList.contains(token), `ghost token ${token} present`).toBe(false)
    }
  })

  it('says Skipping… once asked, and takes no second click', async () => {
    let calls = 0
    const container = renderCall({
      onSkip: () => {
        calls += 1
      },
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    skip.click()
    await vi.waitFor(async () => {
      await nextTick()
      expect(skip.textContent).toBe('Skipping…')
    })
    expect(skip.disabled).toBe(true)
    skip.click()
    expect(calls).toBe(1)
  })

  it('returns to rest when the host says nothing was in flight', async () => {
    const container = renderCall({ onSkip: () => Promise.resolve(false) })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    skip.click()
    // The stale-button race is not an error — the control simply comes back.
    await vi.waitFor(async () => {
      await nextTick()
      expect(skip.textContent).toBe('Skip')
    })
    expect(skip.disabled).toBe(false)
  })

  it('returns to rest when the request throws, rather than sticking on Skipping…', async () => {
    const container = renderCall({ onSkip: () => Promise.reject(new Error('offline')) })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    skip.click()
    await vi.waitFor(async () => {
      await nextTick()
      expect(skip.textContent).toBe('Skip')
    })
  })

  it('a viewer sees it disabled with the reason, not missing', () => {
    let calls = 0
    const container = renderCall({
      onSkip: () => {
        calls += 1
      },
      skipDisabledReason: 'Only editors can skip this.',
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip.disabled).toBe(true)
    expect(skip.getAttribute('title')).toBe('Only editors can skip this.')
    skip.click()
    expect(calls).toBe(0)
  })

  it('offers nothing when the call is not running, or when no host serves it', () => {
    expect(
      molId(renderCall({ onSkip: () => {}, status: 'done' }), 'tool-call-skip-tc-1'),
    ).toBeNull()
    expect(molId(renderCall({}), 'tool-call-skip-tc-1')).toBeNull()
  })
})

describe('a skipped tool call reads as skipped', () => {
  it('recognises the API’s skipped result and nothing else', () => {
    expect(isSkippedByUser(SKIPPED_OUTPUT)).toBe(true)
    expect(isSkippedByUser({ status: 'ok' })).toBe(false)
    expect(isSkippedByUser({ exitCode: 0 })).toBe(false)
    expect(isSkippedByUser('skipped_by_user')).toBe(false)
    expect(isSkippedByUser(null)).toBe(false)
    expect(isSkippedByUser(undefined)).toBe(false)
  })

  it('summarises as Skipped — not the empty summary that means it worked', () => {
    expect(toolSummary(t, 'exec_command', SKIPPED_OUTPUT, 'done')).toBe('Skipped')
    expect(toolSummary(t, 'write_file', SKIPPED_OUTPUT, 'done')).toBe('Skipped')
    // A real success still summarises the way it always did.
    expect(toolSummary(t, 'exec_command', { exitCode: 0 }, 'done')).not.toBe('Skipped')
  })

  it('shows Skipped on the row and does not colour it as a pass or a failure', () => {
    const container = renderCall({ status: 'done', output: SKIPPED_OUTPUT })
    expect(container.textContent).toContain('Skipped')
    const dots = [...container.querySelectorAll('circle')].map((c) => c.getAttribute('fill'))
    // Gray: it did not happen. Never the success green or the failure red.
    expect(dots).toContain('#888888')
    expect(dots).not.toContain('#3fb950')
    expect(dots).not.toContain('#f04040')
  })
})
