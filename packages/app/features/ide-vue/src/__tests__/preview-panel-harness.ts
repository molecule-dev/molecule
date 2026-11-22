/**
 * Shared mount harness for the Vue preview panel's behaviour tests.
 *
 * The Vue panel is a view over the same shared behaviour React's panel runs
 * (`@molecule/app-ide-panel-logic`'s `createPreviewPanelSession`), so these tests drive a
 * real jsdom render of {@link PreviewPanel} over a real iframe preview provider and read
 * the DOM the user sees. Vue applies the session's updates on a microtask and re-renders on
 * its own next-tick flush, so {@link settle} drains both; where a test changes a prop after
 * mounting, {@link MountedPanel.setProps} stands in for React's `rerender`.
 *
 * @module
 */

import { type App, createApp, h, nextTick, reactive } from 'vue'

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
import { createI18nPlugin, createPreviewPlugin } from '@molecule/app-vue'

import { PreviewPanel } from '../components/PreviewPanel.js'

/** The preview URL the tests point their provider at. */
export const PREVIEW_URL = 'http://localhost:5173/'

/** The preview iframe's origin, as the panel's bridge trust gate reads it. */
export const PREVIEW_ORIGIN = 'http://localhost:5173'

/** The host-facing props a test may set or replace after mounting. */
export interface PanelProps {
  /** Whether the host reports an active build. */
  isBuilding?: boolean
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

/** A mounted panel and the handles a test drives it through. */
export interface MountedPanel {
  /** The Vue app the panel mounted in. */
  app: App
  /** The element the panel mounted into. */
  container: HTMLElement
  /** Replaces the panel props, as React's `rerender` does. */
  setProps: (next: PanelProps) => Promise<void>
  /** Unmounts the panel and drops its container. */
  unmount: () => void
}

/** A real successful fetch response, as the panel's server-up probe reads it. */
export const okResponse = (): Promise<Response> =>
  Promise.resolve(new Response(null, { status: 200 }))

/** A real response carrying the verdict a server-up probe reads. */
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

/**
 * Mounts the panel over a provider, the way the app does.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param initial - The host-facing props.
 * @returns The mounted panel's handles.
 */
export function mountPanel(provider: PreviewProvider, initial: PanelProps = {}): MountedPanel {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const props = reactive<PanelProps>({ ...initial })
  const app = createApp({ render: () => h(PreviewPanel, { ...props }) })
  app.use(createPreviewPlugin(provider))
  app.use(createI18nPlugin(createSimpleI18nProvider()))
  app.mount(container)
  return {
    app,
    container,
    async setProps(next: PanelProps): Promise<void> {
      Object.assign(props, next)
      await settle()
    },
    unmount(): void {
      app.unmount()
      container.remove()
    },
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
 * Drains the session's queued microtask flush and the Vue scheduler's next-tick render.
 *
 * @returns Resolves once both settled.
 */
export async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await Promise.resolve()
  }
}

/**
 * Waits for a real-time delay (the blank settle is several seconds).
 *
 * @param ms - Milliseconds to wait.
 * @returns Resolves after the delay.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls until `check` answers true.
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
    await delay(20)
  }
}
