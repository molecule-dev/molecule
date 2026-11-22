// @vitest-environment jsdom
/**
 * WorkCard — the work tray — rendered for real: a port of the
 * `@molecule/app-ide-react/src/__tests__/WorkCard.test.tsx` cases whose other
 * components are ported, with the same test names and the same behavioral
 * assertions, mounted through Angular's own `createApplication` with zoneless
 * change detection. The tray variant wraps the strip in the Angular
 * `WorkCard` (React's test wraps it in the React one); the plan rows are
 * passed as `PlanCard` takes them (`latestPlan`, the transcript scanner that
 * builds them in React's test, is panel-logic's and not exported yet).
 * React's fourth case holds `TestStatusBar`, rendered here as the Angular
 * part.
 *
 * Every interaction flushes zoneless change detection where React's test reads
 * the DOM synchronously; the assertions are the React ones verbatim.
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
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TestItem, TestsRunState } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../parts/background-tasks-strip.component.js'
import { DockStrip } from '../parts/dock-strip.component.js'
import { PlanCard } from '../parts/plan-card.component.js'
import { TestStatusBar } from '../parts/test-status-bar.component.js'
import { WorkCard } from '../parts/work-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The plan rows React's third case builds through `latestPlan`. */
const todos = [{ content: 'Fix it', status: 'in_progress', priority: 'high' }]

/**
 * The JIT hosts: the strip alone (with the action button React's first case
 * passes, when asked), the strip inside the work tray, and the full frame
 * holding the plan and the background tasks.
 */
const makeHost = (template: string, imports: unknown[]): Type<{ p: Record<string, unknown> }> =>
  Component({
    selector: 'mol-work-card-host',
    standalone: true,
    imports: imports as never[],
    changeDetection: ChangeDetectionStrategy.Default,
    // prettier-ignore
    template,
  })(
    class WorkCardHost {
      /** The props the current mount renders with. */
      p: Record<string, unknown> = {}

      /** The commit action template, when the host renders one. */
      commitAction!: HTMLTemplateElement

      /** A no-op toggle for sections that toggle through the tray. */
      noop = (): void => {}
    },
  )

const StripHost = makeHost(
  `<ng-template #commitAction><button type="button">Commit 2 files</button></ng-template><div mol-dock-strip
      molId="files"
      toggleMolId="files-toggle"
      [expanded]="false"
      label="Files"
      [hideLabel]="true"
      [onToggle]="p['onToggle']"
      [actions]="p['withAction'] ? commitAction : null"></div>`,
  [DockStrip],
)

const TrayHost = makeHost(
  `@if (p['tray']) {<div mol-work-card><div mol-dock-strip
        molId="info"
        toggleMolId="info-toggle"
        [expanded]="false"
        label="Info"
        [onToggle]="noop"></div></div>} @else {<div mol-dock-strip
      molId="info"
      toggleMolId="info-toggle"
      [expanded]="false"
      label="Info"
      [onToggle]="noop"></div>}`,
  [WorkCard, DockStrip],
)

const FrameHost = makeHost(
  `<div mol-work-card><div mol-plan-card [todos]="p['todos']"></div><div mol-background-tasks-strip [tasks]="p['tasks']"></div></div>`,
  [WorkCard, PlanCard, BackgroundTasksStrip],
)

const BarHost = makeHost(
  `<div mol-work-card><div mol-test-status-bar [run]="p['run']" [tests]="p['tests']" [onOpen]="p['onOpen']" [onStop]="p['onStop']"></div></div>`,
  [WorkCard, TestStatusBar],
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<{ p: Record<string, unknown> }>
  container: HTMLElement
} | null = null

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
 * Mounts one host with the given props.
 *
 * @param hostType - The host component.
 * @param props - The props the host renders with.
 */
async function mountHost(
  hostType: Type<{ p: Record<string, unknown> }>,
  props: Record<string, unknown> = {},
): Promise<void> {
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
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(hostType, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  current.appRef.tick()
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
  it('keeps an action click from also toggling the file disclosure', async () => {
    const onToggle = vi.fn()
    await mountHost(StripHost, { onToggle, withAction: true })
    // The action is the overlay button's sibling, so its click never toggles.
    buttonByText('Commit 2 files').click()
    await flush()
    expect(onToggle).not.toHaveBeenCalled()
    document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')?.click()
    await flush()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])(
    'gives info disclosures a clickable hover recipe (tray=%s)',
    async (tray) => {
      await mountHost(TrayHost, { tray })
      const control = document.querySelector<HTMLElement>(
        tray
          ? 'div[role="button"][data-mol-id="info-toggle"]'
          : 'button[data-mol-id="info-toggle"]',
      )
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
    },
  )

  it('holds the plan and the background tasks in one frame', async () => {
    await mountHost(FrameHost, {
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
    })
    const frames = document.querySelectorAll('[data-mol-id="work-card"]')
    expect(frames).toHaveLength(1)
    expect(frames[0]!.querySelector('[data-mol-id="task-list-card"]')).not.toBeNull()
    expect(frames[0]!.querySelector('[data-mol-id="chat-background-tasks"]')).not.toBeNull()
  })

  it.each(['idle', 'running', 'finished'] as const)(
    'opens the tests view directly from the %s summary',
    async (state) => {
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
      await mountHost(BarHost, { run, tests, onOpen, onStop })
      const summary = document.querySelector<HTMLElement>('[data-mol-id="tests-bar-toggle"]')!
      expect(summary.hasAttribute('aria-expanded')).toBe(false)
      expect(document.querySelector('[data-mol-id="tests-bar-counts"]')).toBeNull()
      expect(document.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      summary.click()
      await flush()
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(document.querySelector('[data-mol-id="tests-bar-open"]')).toBeNull()
      expect(document.querySelector('[data-mol-id="tests-bar-detail"]')).toBeNull()
      summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await flush()
      expect(onOpen).toHaveBeenCalledTimes(2)
      if (state === 'running') {
        ;(document.querySelector('[data-mol-id="tests-bar-stop"]') as HTMLElement).click()
        await flush()
        expect(onStop).toHaveBeenCalledTimes(1)
        expect(onOpen).toHaveBeenCalledTimes(2)
      }
    },
  )
})
