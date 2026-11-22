/**
 * Shared mount harness for the Angular preview panel's behaviour tests.
 *
 * The Angular panel is a view over the same shared behaviour React's panel runs
 * (`@molecule/app-ide-panel-logic`'s `createPreviewPanelSession`), so these tests drive a
 * real jsdom render of {@link PreviewPanel} over a real iframe preview provider and read
 * the DOM the user sees. Angular applies the session's updates when its change detection
 * runs, so {@link settle} drains the session's queued microtask flush and then ticks the
 * application; where a test changes a prop after mounting, {@link MountedPanel.setProps}
 * stands in for React's `rerender`.
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
import { vi } from 'vitest'

import { provideI18n, providePreview } from '@molecule/app-angular'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type {
  PreviewRenderState,
  PreviewStuckReport,
  PreviewUiCommand,
  PreviewUiResult,
} from '@molecule/app-ide-panel-logic'
import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'

import { PreviewPanel } from '../components/preview-panel.component.js'

/** The preview URL the tests point their provider at. */
export const PREVIEW_URL = 'http://localhost:5173/'

/** The preview iframe's origin, as the panel's bridge trust gate reads it. */
export const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The host-facing props a test may set or replace after mounting. */
export interface PanelProps {
  /** Whether the host reports an active build. */
  isBuilding?: boolean
  /** The file the build is currently editing (shows "Updating <hint>…"). */
  buildingHint?: string | null
  /** When the backing preview server was last woken. */
  wakeAt?: number
  /** The loop-breaker signal the host receives. */
  onPreviewStuck?: (report?: PreviewStuckReport) => void
  /** The runtime-error forwarder the host receives. */
  onPreviewError?: (errors: PreviewErrorReport[]) => void
  /** The iframe UI-command reply handler the host receives. */
  onUiResult?: (id: string, result: PreviewUiResult) => void
  /** The render-verdict handler the host receives. */
  onRenderState?: (state: PreviewRenderState, url?: string) => void
  /** The current UI command the host wants performed in the iframe. */
  uiCommand?: PreviewUiCommand | null
  /** Incremented when AI edits files. */
  fileChangeTick?: number
  /** The escalation hook: restart the backing dev server. */
  onRestartBackend?: () => Promise<boolean | void> | boolean | void
}

/** The JIT host: the panel with React's prop names wired through `p`. */
const PreviewPanelHost = Component({
  selector: 'div[mol-preview-host]',
  standalone: true,
  imports: [PreviewPanel],
  changeDetection: ChangeDetectionStrategy.Default,
  // prettier-ignore
  template: `<div mol-preview-panel [buildingHint]="p['buildingHint']" [isBuilding]="p['isBuilding']" [wakeAt]="p['wakeAt']" [fileChangeTick]="p['fileChangeTick']" [uiCommand]="p['uiCommand']" [onPreviewError]="p['onPreviewError']" [onPreviewStuck]="p['onPreviewStuck']" [onRestartBackend]="p['onRestartBackend']" [onRenderState]="p['onRenderState']" [onUiResult]="p['onUiResult']"></div>`,
})(
  class PreviewPanelHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** A mounted panel and the handles a test drives it through. */
export interface MountedPanel {
  /** The Angular application the panel mounted in. */
  appRef: ApplicationRef
  /** The host component instance (its `p` carries the props). */
  ref: ComponentRef<InstanceType<typeof PreviewPanelHost>>
  /** The element the panel mounted into. */
  container: HTMLElement
  /** The live-preview provider driving the panel. */
  provider: PreviewProvider
  /** Replaces the panel props, as React's `rerender` does. */
  setProps: (next: PanelProps) => Promise<void>
  /** Unmounts the panel and drops its container. */
  unmount: () => void
}

/** A real successful fetch response, as the panel's server-up probe reads it. */
export const okResponse = (): Promise<Response> =>
  Promise.resolve(new Response(null, { status: 200 }))

/**
 * A real response carrying the verdict a server-up probe reads.
 *
 * @param up - Whether the server is serving.
 * @returns The response.
 */
export function responseOf(up: boolean): Response {
  return new Response(null, { status: up ? 200 : 503 })
}

/**
 * A real iframe preview provider already pointed at its URL.
 *
 * @param url - The preview URL (defaults to {@link PREVIEW_URL}).
 * @returns The provider.
 */
export function providerAtUrl(url: string = PREVIEW_URL): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: url })
  provider.setUrl(url)
  return provider
}

/** The mount {@link settle} ticks, so it can be called without passing one around. */
let current: MountedPanel | null = null

/**
 * Mounts the panel over a provider, the way the app does.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param initial - The host-facing props.
 * @returns The mounted panel's handles.
 */
export async function mountPanel(
  provider: PreviewProvider,
  initial: PanelProps = {},
): Promise<MountedPanel> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideI18n(createSimpleI18nProvider('en')),
      providePreview(provider),
    ],
  })
  const ref = createComponent(PreviewPanelHost, { environmentInjector: appRef.injector })
  ref.instance.p = { ...initial }
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  await settle(appRef)
  const mounted: MountedPanel = {
    appRef,
    ref,
    container,
    provider,
    async setProps(next: PanelProps): Promise<void> {
      ref.instance.p = { ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      await settle(appRef)
    },
    unmount(): void {
      appRef.destroy()
      container.remove()
    },
  }
  current = mounted
  return mounted
}

/**
 * Clears the module's remembered mount (between test files' teardown).
 *
 * @param panel - The panel being unmounted.
 */
export function forget(panel: MountedPanel): void {
  if (current === panel) current = null
}

/**
 * Drains the session's queued microtask flush and Angular's change detection.
 *
 * The session applies its updates on a microtask and the panel re-renders from its
 * `revision` signal when Angular's change detection runs, so each pass ticks the
 * application and then lets pending microtasks run. Under fake timers a real
 * macrotask cannot be awaited (it would hang), so only the microtask queue is
 * drained there — which is where every listener the session schedules lives.
 *
 * @param appRef - The application to tick (the module's current mount by default).
 * @returns Resolves once both settled.
 */
export async function settle(appRef: ApplicationRef | undefined = current?.appRef): Promise<void> {
  if (!appRef) return
  const fake = vi.isFakeTimers()
  for (let i = 0; i < 5; i++) {
    appRef.tick()
    await Promise.resolve()
    if (!fake) await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/**
 * Dispatches an inbound bridge message from the preview iframe (same-origin).
 *
 * The panel's trust gate accepts `molecule:*` ONLY from the preview iframe's own window,
 * so the event is simulated as a genuine message from it.
 *
 * @param container - The mount container.
 * @param data - The message payload.
 * @returns Resolves once the session's flush and the view's re-render ran.
 */
export async function postFromPreview(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void> {
  const source = container.querySelector('iframe')?.contentWindow ?? null
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
  await settle()
}

/**
 * Dispatches an inbound bridge message from a window that is NOT the preview
 * iframe (another tab, a hostile sub-iframe) — the trust gate must ignore it.
 *
 * @param data - The message payload.
 * @returns Resolves once the session's flush and the view's re-render ran.
 */
export async function postFromForeignWindow(data: Record<string, unknown>): Promise<void> {
  window.dispatchEvent(
    new MessageEvent('message', { data, origin: 'https://evil.example', source: window }),
  )
  await settle()
}

/**
 * Fires the iframe document's `load` event.
 *
 * @param iframe - The preview iframe.
 * @returns Resolves once the session's flush and the view's re-render ran.
 */
export async function loadIframe(iframe: HTMLIFrameElement): Promise<void> {
  iframe.dispatchEvent(new Event('load'))
  await settle()
}

/**
 * The element carrying the given `data-mol-id`, or null.
 *
 * @param container - The mount container.
 * @param molId - The marker.
 * @returns The element, or null when none is rendered.
 */
export const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

/**
 * Waits for a real-time delay (the blank settle is several seconds).
 *
 * @param ms - Milliseconds to wait.
 * @returns Resolves after the delay.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Waits a real-time delay while keeping the panel rendered.
 *
 * Angular only updates the DOM when its change detection runs, so a wait that spanned
 * several timer callbacks (the blank evaluator's interval, the recovery timers) is
 * drained by ticking the application throughout. Vue and Svelte render on their own
 * next tick, so their ports can simply `delay`; this is the framework-forced difference.
 *
 * @param ms - Milliseconds to wait.
 * @returns Resolves once the delay elapsed and the view rendered the final state.
 */
export async function settleDelay(ms: number): Promise<void> {
  const deadline = Date.now() + ms
  for (;;) {
    await settle()
    const left = deadline - Date.now()
    if (left <= 0) break
    await delay(Math.min(20, left))
  }
  await settle()
}

/**
 * Polls until `check` answers true, keeping the panel rendered between polls.
 *
 * @param check - The condition.
 * @param timeout - How long to wait (ms).
 * @param what - What is awaited, for the failure message.
 * @returns Resolves once the condition holds.
 */
export async function waitFor(check: () => boolean, timeout: number, what: string): Promise<void> {
  const deadline = Date.now() + timeout
  for (;;) {
    if (check()) return
    if (Date.now() > deadline) throw new Error(`timed out after ${timeout}ms waiting for ${what}`)
    await settle()
    await delay(20)
  }
}
