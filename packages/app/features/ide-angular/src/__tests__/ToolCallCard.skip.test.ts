// @vitest-environment jsdom

/**
 * Skipping the executor's in-flight tool call, and saying so honestly.
 *
 * Measured on production: the person watches a command run for minutes with
 * nothing to do but wait. The Skip drops THAT call without ending the turn —
 * and the result it produces must never read as a success, because a command
 * that did not run is not a command that worked.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/ToolCallCard.skip.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
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
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import type { TranslateFunction } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { isSkippedByUser, toolSummary } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
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

/**
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input the card takes.
 */
const ToolCallCardHost = Component({
  selector: 'mol-tool-call-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']" [fileDiff]="p['fileDiff']" [isUndone]="p['isUndone']" [onUndoToggle]="p['onUndoToggle']" [onFileOpen]="p['onFileOpen']" [onFileDoubleClick]="p['onFileDoubleClick']" [onFileDiff]="p['onFileDiff']" [onFileRevert]="p['onFileRevert']" [onAskUserResponse]="p['onAskUserResponse']" [onSkip]="p['onSkip']" [skipDisabledReason]="p['skipDisabledReason']" [className]="p['className']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ToolCallCardHost>>
  container: HTMLElement
} | null = null

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Render one tool call.
 *
 * @param overrides - Inputs to override.
 * @returns The container.
 */
async function renderCall(overrides: Record<string, unknown> = {}): Promise<HTMLElement> {
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
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    id: 'tc-1',
    name: 'exec_command',
    input: { command: 'npx playwright test' },
    status: 'running',
    ...overrides,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

/** Destroys the live mount, the way the React suite's `cleanup()` does. */
async function cleanup(): Promise<void> {
  if (!current) return
  current.appRef.destroy()
  current.container.remove()
  current = null
  document.body.innerHTML = ''
}

/**
 * Clicks like a user and lets Angular settle.
 * @param el - The element to click.
 */
async function click(el: HTMLElement | null): Promise<void> {
  el?.click()
  await flush()
}

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

// The first mount in a worker pays Angular's JIT compilation of the card's
// large template; warm it up outside a test so no assertion carries that cost.
beforeAll(async () => {
  await renderCall({
    id: 'warmup',
    name: 'read_file',
    input: { path: 'warmup.ts' },
    status: 'done',
  })
  await cleanup()
}, 120_000)

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  await cleanup()
  setProvider(createSimpleI18nProvider())
})

describe('ToolCallCard — Skip on a running call', () => {
  it('offers Skip while the call is running, and hands the host its id', async () => {
    const skipped: string[] = []
    const container = await renderCall({
      onSkip: (id: string) => {
        skipped.push(id)
      },
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('Skip')
    await click(skip)
    expect(skipped).toEqual(['tc-1'])
  })

  it('is a real button, not a control nested inside the row button', async () => {
    const container = await renderCall({ onSkip: () => {} })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip.tagName).toBe('BUTTON')
    expect(skip.closest('button')).toBe(skip)
  })

  it('renders as a filled button, never as a text link', async () => {
    const container = await renderCall({ onSkip: () => {} })
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
    const container = await renderCall({
      onSkip: () => {
        calls += 1
      },
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    await click(skip)
    expect(skip.textContent).toBe('Skipping…')
    expect(skip.disabled).toBe(true)
    await click(skip)
    expect(calls).toBe(1)
  })

  it('returns to rest when the host says nothing was in flight', async () => {
    const container = await renderCall({ onSkip: () => Promise.resolve(false) })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    await click(skip)
    // The stale-button race is not an error — the control simply comes back.
    expect(skip.textContent).toBe('Skip')
    expect(skip.disabled).toBe(false)
  })

  it('returns to rest when the request throws, rather than sticking on Skipping…', async () => {
    const container = await renderCall({ onSkip: () => Promise.reject(new Error('offline')) })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    await click(skip)
    expect(skip.textContent).toBe('Skip')
  })

  it('a viewer sees it disabled with the reason, not missing', async () => {
    let calls = 0
    const container = await renderCall({
      onSkip: () => {
        calls += 1
      },
      skipDisabledReason: 'Only editors can skip this.',
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip.disabled).toBe(true)
    expect(skip.getAttribute('title')).toBe('Only editors can skip this.')
    await click(skip)
    expect(calls).toBe(0)
  })

  it('offers nothing when the call is not running, or when no host serves it', async () => {
    expect(
      molId(await renderCall({ onSkip: () => {}, status: 'done' }), 'tool-call-skip-tc-1'),
    ).toBeNull()
    await cleanup()
    expect(molId(await renderCall({}), 'tool-call-skip-tc-1')).toBeNull()
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

  it('shows Skipped on the row and does not colour it as a pass or a failure', async () => {
    const container = await renderCall({ status: 'done', output: SKIPPED_OUTPUT })
    expect(container.textContent).toContain('Skipped')
    const dots = [...container.querySelectorAll('circle')].map((c) => c.getAttribute('fill'))
    // Gray: it did not happen. Never the success green or the failure red.
    expect(dots).toContain('#888888')
    expect(dots).not.toContain('#3fb950')
    expect(dots).not.toContain('#f04040')
  })
})
