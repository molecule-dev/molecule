/**
 * Shared setup for the ported `PreviewPanel` behaviour tests: a recording
 * live-preview provider with the real provider's contract, a settable-props
 * host, an inbound-bridge message helper, and fake-timer/flush helpers.
 *
 * The provider mirrors `@molecule/app-live-preview-iframe`'s observable
 * behaviour for the calls the panel makes — most importantly `setUrl`'s
 * no-op when the URL repeats the current load target, which the cold-load
 * tests pin.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { vi } from 'vitest'

import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import type { PreviewPanelProps } from '../types.js'
import PreviewPanelTestHost from './PreviewPanelTestHost.svelte'

/** The load target every test starts the panel at. */
export const PREVIEW_URL = 'http://localhost:5173/'

/** The preview's own origin (the bridge messages' `origin`). */
export const PREVIEW_ORIGIN = 'http://localhost:5173'

/**
 * A ClassMap stub whose every member resolves to its own key as a class token,
 * so a component's composed token set is observable without a styling bond.
 *
 * @returns A stub {@link UIClassMap}.
 */
export function buildStubClassMap(): UIClassMap {
  const token = (name: string): ((...args: unknown[]) => string) => {
    const fn = (..._args: unknown[]): string => name
    return new Proxy(fn, {
      get(_target, key) {
        if (key === 'toString' || key === 'valueOf' || key === Symbol.toPrimitive) {
          return () => name
        }
        return undefined
      },
    }) as (...args: unknown[]) => string
  }

  const cn = (...classes: unknown[]): string => {
    const out: string[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'string') {
        if (c) out.push(c)
      } else if (typeof c === 'function') {
        const s = String(c)
        if (s) out.push(s)
      }
    }
    classes.forEach(walk)
    return out.join(' ')
  }

  return new Proxy({} as UIClassMap, {
    get(_target, prop): unknown {
      if (prop === 'cn') return cn
      return token(String(prop))
    },
  })
}

/** The stub provider plus the test's direct state lever. */
export interface StubPreviewProvider extends PreviewProvider {
  /**
   * Replaces state fields and notifies, like a host-side change does.
   *
   * @param patch - The state fields to change.
   */
  setState(patch: Partial<PreviewState>): void
}

/**
 * A minimal recording live-preview provider: real `getState`/`subscribe`
 * semantics (fresh object per change, listener set) with the actions the panel
 * calls recorded as plain state moves.
 *
 * @param seed - The first state's overrides.
 * @returns The provider.
 */
export function buildPreviewProvider(seed: Partial<PreviewState> = {}): StubPreviewProvider {
  let state: PreviewState = {
    url: PREVIEW_URL,
    currentUrl: '',
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: true,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
    ...seed,
  }
  const listeners = new Set<(next: PreviewState) => void>()

  /**
   * Publishes a new state object to every subscriber.
   *
   * @param next - The state after the change.
   */
  const publish = (next: PreviewState): void => {
    state = next
    for (const listener of listeners) listener(next)
  }

  return {
    name: 'preview-stub',
    getUrl: () => state.url,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setUrl(url) {
      if (url === state.url) return
      publish({ ...state, url, loadNonce: state.loadNonce + 1 })
    },
    navigateTo(path) {
      publish({
        ...state,
        url: new URL(path, state.url).toString(),
        loadNonce: state.loadNonce + 1,
      })
    },
    refresh() {
      publish({ ...state, loadNonce: state.loadNonce + 1 })
    },
    setDevice(device: DeviceFrame) {
      publish({ ...state, device })
    },
    recordNavigation(url, isReplace) {
      publish({
        ...state,
        currentUrl: url,
        canGoBack: true,
        canGoForward: isReplace ? state.canGoForward : false,
      })
    },
    back() {
      publish({ ...state, currentUrl: state.url, canGoBack: false, canGoForward: true })
    },
    forward() {
      publish({ ...state, canGoBack: true, canGoForward: false })
    },
    canGoBack: () => state.canGoBack,
    canGoForward: () => state.canGoForward,
    openExternal: () => undefined,
    setState(patch) {
      publish({ ...state, ...patch })
    },
  }
}

/** The exports of a mounted test host. */
export interface MountedPanel {
  /** Where the panel rendered (the document body). */
  container: HTMLElement
  /**
   * Replaces the panel's props, the way a host re-render does.
   *
   * @param next - The panel's new props.
   */
  setProps(next: PreviewPanelProps): void
  /** Unmounts the panel and empties the body (the test's teardown). */
  dispose(): Promise<void>
}

/**
 * Mounts the panel over a provider. Call {@link MountedPanel.dispose} when done.
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param initial - The panel's first props.
 * @returns The mounted panel.
 */
export function mountPanel(
  provider: PreviewProvider,
  initial: PreviewPanelProps = {},
): MountedPanel {
  const instance = mount(PreviewPanelTestHost, {
    target: document.body,
    props: { preview: provider, initial },
  })
  flushSync()
  return {
    container: document.body,
    setProps: instance.setProps,
    async dispose() {
      await unmount(instance)
      document.body.innerHTML = ''
    },
  }
}

/**
 * Installs the class map stub the panel renders with.
 */
export function installStubClassMap(): void {
  setClassMap(buildStubClassMap())
}

/**
 * Simulates an inbound bridge message from the preview iframe (same-origin).
 * The panel's trust gate accepts `molecule:*` ONLY from the preview iframe's
 * own window (`event.source === iframe.contentWindow`), so the message is
 * dispatched with that window as its source.
 *
 * @param data - The message payload.
 */
export function postFromPreview(data: Record<string, unknown>): void {
  const source = document.querySelector('iframe')?.contentWindow ?? null
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
}

/**
 * Dispatches the iframe's `load` event (React's `fireEvent.load`).
 *
 * @param iframe - The preview iframe.
 */
export function fireFrameLoad(iframe: HTMLIFrameElement): void {
  iframe.dispatchEvent(new Event('load'))
}

/**
 * A `[data-mol-id]` element inside the panel.
 *
 * @param container - The element the panel rendered into.
 * @param molId - The id.
 * @returns The element, or null.
 */
export function q(container: HTMLElement, molId: string): Element | null {
  return container.querySelector(`[data-mol-id="${molId}"]`)
}

/**
 * The current preview iframe element.
 *
 * @param container - The element the panel rendered into.
 * @returns The iframe, or null.
 */
export function currentIframe(container: HTMLElement): HTMLIFrameElement | null {
  return container.querySelector('iframe')
}

/**
 * The current preview iframe's `src`.
 *
 * @param container - The element the panel rendered into.
 * @returns The `src` attribute (empty when there is no iframe).
 */
export function frameSrc(container: HTMLElement): string {
  return currentIframe(container)?.getAttribute('src') ?? ''
}

/**
 * Advances fake timers, then flushes Svelte so the panel's DOM reflects the
 * state the timers produced.
 *
 * @param ms - Fake-timer milliseconds to advance.
 */
export async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
  flushSync()
}

/**
 * Lets the panel's microtasks (the store-fed session update, the server-up
 * probe) settle and flushes Svelte.
 */
export async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0)
  flushSync()
}

/**
 * Mounts the panel and advances in small steps until the server-up poll has
 * mounted the iframe (the poll's mocked-fetch microtask resolves before the
 * probe's abort timer can race it under fake timers).
 *
 * @param provider - The live-preview provider to drive the panel.
 * @param initial - The panel's first props.
 * @returns The mounted panel and its iframe.
 */
export async function mountWithIframe(
  provider: PreviewProvider,
  initial: PreviewPanelProps = {},
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const panel = mountPanel(provider, initial)
  for (let i = 0; i < 12 && !currentIframe(panel.container); i++) {
    await advance(50)
  }
  const iframe = currentIframe(panel.container)
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { ...panel, iframe }
}
