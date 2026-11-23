// @vitest-environment jsdom
/**
 * ResizeHandle's separator value — a port of
 * `@molecule/app-ide-react/src/__tests__/ResizeHandle.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Angular's own
 * `createApplication`.
 *
 * A focusable `role="separator"` is the WAI-ARIA window-splitter pattern,
 * which requires `aria-valuenow` (axe `aria-required-attr`). The handle
 * reports the leading pane's share of the two panes it divides, so a screen
 * reader announces the split and its changes. The `value` input drives it.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, provideI18n } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ResizeHandle } from '../components/resize-handle.component.js'

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the plain inputs are set through real bindings.
 */
const ResizeHandleHost = Component({
  selector: 'mol-resize-handle-host',
  standalone: true,
  imports: [ResizeHandle],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-resize-handle [value]="p['value']" [onResize]="p['onResize']"></div>`,
})(
  class ResizeHandleHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted handle, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ResizeHandleHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  // The handle's `t` reads the bonded provider.
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
 * Lets Angular's zoneless change detection settle.
 * @param appRef - The application to tick.
 */
async function flush(appRef: ApplicationRef): Promise<void> {
  appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  appRef.tick()
}

/**
 * Mounts a handle with the given value.
 * @param value - The leading pane's share, in percent.
 * @returns The mounted handle's parts.
 */
async function mountHandle(value: number): Promise<Mounted & { handle: HTMLElement }> {
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
      provideI18n(createSimpleI18nProvider('en')),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ResizeHandleHost>> = createComponent(
    ResizeHandleHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { value, onResize: vi.fn() }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush(appRef)
  const handle = container.querySelector('[role="separator"]')
  if (!handle) throw new Error('missing separator')
  return { ...current, handle: handle as HTMLElement }
}

/**
 * Replaces the handle's value input, as React's `rerender` does.
 * @param mounted - The mount.
 * @param value - The new value.
 * @returns Resolves once the view rendered it.
 */
async function setValue(mounted: Mounted, value: number): Promise<void> {
  mounted.ref.instance.p = { ...mounted.ref.instance.p, value }
  mounted.ref.changeDetectorRef.markForCheck()
  await flush(mounted.appRef)
}

describe('ResizeHandle separator value (axe aria-required-attr)', () => {
  it('reports the leading pane share as a rounded percentage', async () => {
    const { handle } = await mountHandle(40.4)

    expect(handle.getAttribute('aria-valuenow')).toBe('40')
    expect(handle.getAttribute('aria-valuemin')).toBe('0')
    expect(handle.getAttribute('aria-valuemax')).toBe('100')
  })

  it('follows the value prop when it changes', async () => {
    const mounted = await mountHandle(25)
    expect(mounted.handle.getAttribute('aria-valuenow')).toBe('25')

    await setValue(mounted, 62.6)
    expect(mounted.handle.getAttribute('aria-valuenow')).toBe('63')
  })
})
