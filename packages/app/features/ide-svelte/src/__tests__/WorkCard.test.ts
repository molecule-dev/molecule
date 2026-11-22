// @vitest-environment jsdom
/**
 * WorkCard — the work tray — rendered for real: a port of the
 * `@molecule/app-ide-react/src/__tests__/WorkCard.test.tsx` cases whose other
 * components are ported, with the same test names and the same behavioral
 * assertions, mounted through Svelte 5's own `mount`/`flushSync`. The tray
 * variant wraps the strip in the Svelte `WorkCard` (React's test wraps it in
 * the React one); the plan rows are passed as `PlanCard` takes them
 * (`latestPlan`, the transcript scanner that builds them in React's test, is
 * panel-logic's and not exported yet). React's fourth case holds
 * `TestStatusBar`, rendered here as the Svelte part.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import WorkCardHost from './WorkCardHost.svelte'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The bonded i18n provider from {@link beforeEach}. */
let provider: I18nProviderType

/** The light theme the tray renders under. */
const theme = createFakeThemeProvider('light', sink)

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null

beforeEach(() => {
  setClassMap(classMap)
  provider = createSimpleI18nProvider('en')
  setProvider(provider)
})

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

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
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(WorkCardHost, {
      target,
      props: { theme, mode: 'action', withAction: true, onToggle },
    }) as Record<string, unknown>
    // The action is the overlay button's sibling, so its click never toggles.
    buttonByText('Commit 2 files').click()
    flushSync()
    expect(onToggle).not.toHaveBeenCalled()
    document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')?.click()
    flushSync()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('gives info disclosures a clickable hover recipe (tray=%s)', (tray) => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(WorkCardHost, {
      target,
      props: { theme, mode: tray ? 'tray' : 'strip' },
    }) as Record<string, unknown>
    flushSync()
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
    const todos = [{ content: 'Fix it', status: 'in_progress' } as const]
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(WorkCardHost, {
      target,
      props: {
        theme,
        mode: 'frame',
        todos,
        tasks: [
          {
            id: 'mol-bg-1',
            command: 'npm test',
            description: 'Run the tests',
            status: 'running',
            startedAt: Date.now(),
          },
        ],
      },
    }) as Record<string, unknown>
    flushSync()
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
      const target = document.createElement('div')
      document.body.appendChild(target)
      instance = mount(WorkCardHost, {
        target,
        props: { theme, mode: 'bar', run, tests, onOpen, onStop },
      }) as Record<string, unknown>
      flushSync()
      const summary = document.querySelector<HTMLElement>('[data-mol-id="tests-bar-toggle"]')!
      expect(summary.hasAttribute('aria-expanded')).toBe(false)
      expect(document.querySelector('[data-mol-id="tests-bar-counts"]')).toBeNull()
      expect(document.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      summary.click()
      flushSync()
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(document.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      expect(document.querySelector('[data-mol-id="tests-bar-detail"]')).toBeNull()
      summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      flushSync()
      expect(onOpen).toHaveBeenCalledTimes(2)
      if (state === 'running') {
        ;(document.querySelector('[data-mol-id="tests-bar-stop"]') as HTMLElement).click()
        flushSync()
        expect(onStop).toHaveBeenCalledTimes(1)
        expect(onOpen).toHaveBeenCalledTimes(2)
      }
    },
  )
})
