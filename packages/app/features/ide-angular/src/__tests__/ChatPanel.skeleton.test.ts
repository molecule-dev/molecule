// @vitest-environment jsdom
/**
 * The ChatPanel skeleton's one proof: Angular runs the INNER chat surface's
 * mount pass before the outer panel's, which is the order React's child
 * effects use — and nothing in the port still reports itself unported.
 *
 * The mount pass is `ChatInner.ngAfterViewInit`, which calls every slice's
 * `mount()` in React's mount ledger order. With the last unit landed no slice
 * or section reports through `notPorted` any more, so the order is read from a
 * real inner signal: `chat:chat:1` reports the session's loading state through
 * the host's `onLoadingChange`, and the outer panel makes its real
 * `GET /projects/:id/conversations` request in its own `ngAfterViewInit`. The
 * test interleaves both in one log and asserts the inner report lands first —
 * the same check Vue's `chat-panel-mount-order.test.ts` makes.
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
import { beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import { provideChat } from '@molecule/app-angular/chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ChatPanel } from '../components/chat-panel.component.js'
import { onNotPorted } from '../components/chat-panel/not-ported.js'
import { buildChatProvider, buildRejectingHttpClient, makeStorage } from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * React's `onLoadingChange` report from `ChatInner`: every unit has landed, so
 * the order proof uses this real inner signal instead of stub reports.
 *
 * @param loading - The session's loading state the effect reports.
 */
function reportLoading(loading: boolean): void {
  events.push(`loading:${loading}`)
}

/** The JIT host: the panel mounted from the case's props, as a consumer does. */
const ChatPanelHost = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-chat-panel-skeleton-host',
  standalone: true,
  imports: [ChatPanel],
  template: `<div mol-chat-panel [projectId]="'p1'" [onLoadingChange]="reportLoading"></div>`,
})(
  class ChatPanelSkeletonHost {
    /** Records the inner chat's loading report into the shared event log. */
    readonly reportLoading = reportLoading
  },
)

/** The interleaved mount-report / request log for the current mount. */
let events: string[] = []

/**
 * The rejecting client with `get` recorded into the shared event log, so the
 * outer panel's real conversation request is ordered against the inner chat's
 * loading report the way Vue's mount-order test does it.
 * @param base - The rejecting client whose other methods are reused.
 * @param log - The shared event log.
 * @returns The recording client.
 */
function buildRecordingHttpClient(base: HttpClient, log: string[]): HttpClient {
  const record = (url: string): Promise<never> => {
    log.push(`http:GET ${url}`)
    return Promise.reject(new Error('http disabled in test'))
  }
  return { ...base, get: record }
}

/**
 * Mounts the real panel with every provider its services need.
 * @returns The application, the element the panel mounted into, and the teardown.
 */
async function mount(): Promise<{
  appRef: ApplicationRef
  root: HTMLElement
  ref: ComponentRef<InstanceType<typeof ChatPanelHost>>
  unmount: () => void
}> {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const i18n = createSimpleI18nProvider('en')
  setProvider(i18n)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(i18n),
      provideTheme(buildThemeProvider()),
      provideHttp(buildRecordingHttpClient(buildRejectingHttpClient(), events)),
      // The inner chat's session needs a chat provider, as React's ChatPanel (useChat) does.
      provideChat(buildChatProvider([])),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ChatPanelHost>> = createComponent(ChatPanelHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    appRef,
    root: container,
    ref,
    unmount: () => {
      appRef.destroy()
      container.remove()
      document.body.innerHTML = ''
    },
  }
}

/**
 * The storage the real outer panel reads on `ngOnInit` (React's `ChatPanel`
 * reads `localStorage` on first render too; the shared conformance setup
 * installs no storage fake). Every other ChatPanel test mounts with these.
 */
function installStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
}

describe('ChatPanel skeleton', () => {
  beforeEach(() => {
    installStorage()
    events = []
  })

  it('runs ChatInner before ChatPanel, and both in React ledger order', async () => {
    const actions: string[] = []
    const stopListening = onNotPorted((action) => {
      actions.push(action)
      events.push(`stub:${action}`)
    })
    const mounted = await mount()

    try {
      // Every slice and section unit has landed: nothing reports itself any more
      // — no `*.mount`, no `*.effects.<n>`, no `section:*`.
      expect(actions).toEqual([])

      // React's child-before-parent effect order: the inner chat reports its
      // loading state (`chat:chat:1`) before the outer panel's conversation GET
      // (its own `ngAfterViewInit`) runs — the same check Vue's mount-order test
      // makes.
      const innerIndex = events.indexOf('loading:false')
      const getIndex = events.indexOf('http:GET /projects/p1/conversations')
      expect(innerIndex).toBeGreaterThanOrEqual(0)
      expect(getIndex).toBeGreaterThanOrEqual(0)
      expect(innerIndex).toBeLessThan(getIndex)
    } finally {
      mounted.unmount()
      stopListening()
    }
  }, 30_000)
})
