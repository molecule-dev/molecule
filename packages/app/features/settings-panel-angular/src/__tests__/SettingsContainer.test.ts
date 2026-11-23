// @vitest-environment jsdom

/**
 * Unit tests for the Angular `SettingsContainer` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/SettingsContainer.test.tsx`:
 * the same context-publishing behaviour, rendered through Angular's real
 * renderer (a JIT host, the shape the conformance kit's Angular adapter uses)
 * and observed through a consumer component that resolves the container's
 * context the way a section does.
 *
 * Angular has no component re-render to count, so React's `rerender` becomes
 * the port's way of setting a prop — a signal the host template binds, plus a
 * change-detection pass — and React's consumer render count becomes the
 * identity of the context value the container publishes, which stays the same
 * object across a parent update.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import { settingsPanelContext } from '../container-context.js'
import { useSettingsPanelContext } from '../context.js'
import { SettingsContainer } from '../settings-container.component.js'
import type { SettingsPanelContextValue } from '../types.js'

/** A consumer that resolves the container's context and closes on click. */
const Consumer = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-settings-container-consumer',
  standalone: true,
  template: `<button type="button" (click)="close()">close</button>`,
})(
  class Consumer {
    /** The container's context, read the way a section reads it. */
    readonly context = useSettingsPanelContext()

    /** Calls the published dismiss handler. */
    close(): void {
      this.context.onClose()
    }
  },
)

/** The host whose bindings hand the container its props (React's parent render). */
const Host = Component({
  selector: 'mol-settings-container-host',
  standalone: true,
  imports: [SettingsContainer, Consumer],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-settings-container [onClose]="onClose()"><mol-settings-container-consumer /></div>
    <span data-testid="tick">{{ tick() }}</span>`,
})(
  class Host {
    /** The dismiss handler the container receives. */
    readonly onClose = signal<() => void>(() => undefined)

    /** Bumps to re-run the host's render (React's `rerender` with the same props). */
    readonly tick = signal(0)
  },
)

/** The mounted host of the current test. */
let current: { host: InstanceType<typeof Host>; tick: () => void; destroy: () => void } | null =
  null

/**
 * Mounts the host and runs the first change-detection pass.
 *
 * @param onClose - The initial dismiss handler.
 * @returns The host instance and a change-detection flush (React's `rerender`).
 */
async function mountHost(
  onClose: () => void,
): Promise<{ host: InstanceType<typeof Host>; tick: () => void }> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  const host = ref.instance
  host.onClose.set(onClose)
  appRef.tick()
  const view = {
    host,
    tick: () => appRef.tick(),
  }
  current = {
    ...view,
    destroy: () => {
      appRef.destroy()
      container.remove()
    },
  }
  return view
}

/** The consumer's element (the node the container's context is resolved from). */
function consumerElement(): HTMLElement {
  const element = document.querySelector('mol-settings-container-consumer')
  if (!element) throw new Error('no consumer element')
  return element as HTMLElement
}

/** Reads the context value the container publishes for the consumer. */
function publishedContext(): SettingsPanelContextValue | undefined {
  return settingsPanelContext.find(consumerElement())
}

/** The consumer's button. */
function closeButton(): HTMLButtonElement {
  const button = consumerElement().querySelector('button')
  if (!button) throw new Error('no close button')
  return button as HTMLButtonElement
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  current?.destroy()
  current = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<SettingsContainer>', () => {
  it('keeps the context value stable while onClose keeps its identity', async () => {
    const onClose = vi.fn()
    const view = await mountHost(onClose)
    const before = publishedContext()
    expect(before).toBeDefined()

    view.host.tick.set(1)
    view.tick()

    // The parent re-rendered; a fresh context value would replace the consumer's.
    expect(document.querySelector('[data-testid="tick"]')?.textContent?.trim()).toBe('1')
    expect(publishedContext()).toBe(before)
    closeButton().click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('publishes a new onClose to consumers when the handler changes', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = await mountHost(first)

    view.host.onClose.set(second)
    view.tick()

    closeButton().click()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
