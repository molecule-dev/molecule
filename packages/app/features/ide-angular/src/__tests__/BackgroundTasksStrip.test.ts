// @vitest-environment jsdom
/**
 * BackgroundTasksStrip — the detached-command strip — rendered for real: a
 * port of `@molecule/app-ide-react/src/__tests__/BackgroundTasksStrip.test.tsx`
 * with the same test name and the same assertions, mounted through Angular's
 * own `createApplication` (zoneless) and re-rendered by reassigning the
 * `tasks` input the way React's `rerender` does — the same instance keeps its
 * internal state.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BackgroundTaskState } from '@molecule/app-ai-chat'
import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../parts/background-tasks-strip.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The host the tests mount: passes the props the current mount renders with. */
const BackgroundTasksStripHost = Component({
  selector: 'mol-background-tasks-strip-host',
  standalone: true,
  imports: [BackgroundTasksStrip],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-background-tasks-strip [tasks]="p['tasks']"></div>`,
})(
  class BackgroundTasksStripHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted strip, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof BackgroundTasksStripHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
  document.body.innerHTML = ''
})

/**
 * Renders the strip with the given tasks.
 *
 * @param initial - The first `tasks` prop.
 * @returns The mounted host element.
 */
async function renderStrip(initial: BackgroundTaskState[]): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof BackgroundTasksStripHost>> = createComponent(
    BackgroundTasksStripHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { tasks: initial }
  ref.changeDetectorRef.detectChanges()
  current = { appRef, ref, container }
  return container
}

/**
 * Re-renders the strip with a new `tasks` prop — the same instance keeps
 * rendering, the way React's `rerender` does.
 *
 * @param next - The next `tasks` prop.
 */
function rerender(next: BackgroundTaskState[]): void {
  if (!current) throw new Error('nothing mounted')
  current.ref.instance.p = { tasks: next }
  current.ref.changeDetectorRef.detectChanges()
}

describe('background progress', () => {
  it('shows measured output in collapsed and expanded states without inventing a percentage', async () => {
    const container = await renderStrip([
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
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
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
