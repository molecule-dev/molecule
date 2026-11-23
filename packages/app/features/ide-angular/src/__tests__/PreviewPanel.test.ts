// @vitest-environment jsdom

/**
 * The Angular `PreviewPanel`'s view wiring: one shared-logic session per mounted panel, props
 * reaching it, the preview store driving re-renders, the `<iframe>` element adopted into the
 * session's ref (so the `molecule:*` bridge reaches the host) and a fresh `<iframe>` on a remount.
 *
 * The panel's BEHAVIOUR belongs to `@molecule/app-ide-panel-logic` and is covered there and by the
 * conformance suite; these tests pin the Angular seam between that store and the DOM.
 *
 * @module
 */

import { fileURLToPath } from 'node:url'

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

import { provideDomPlacement, provideI18n, providePreview } from '@molecule/app-angular'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type { PreviewProvider, PreviewState } from '@molecule/app-live-preview'

import { PreviewPanel } from '../components/preview-panel.component.js'

/** The load target every mount starts from. */
const TARGET = 'http://preview.local/start'

/**
 * A live-preview provider whose state the test moves, recording every call.
 * @param seed - The first state's overrides.
 * @returns The stub provider.
 */
function buildProvider(seed: Partial<PreviewState> = {}): {
  provider: PreviewProvider
  notify: () => void
  unsubscribe: ReturnType<typeof vi.fn>
} {
  let state: PreviewState = {
    url: TARGET,
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
  const unsubscribe = vi.fn()
  const notify = (): void => {
    for (const listener of [...listeners]) listener(state)
  }
  const provider: PreviewProvider = {
    name: 'test-preview',
    setUrl: vi.fn(),
    getUrl: () => state.url,
    refresh: vi.fn(() => {
      state = { ...state, loadNonce: state.loadNonce + 1 }
      notify()
    }),
    setDevice: vi.fn(),
    getState: () => state,
    navigateTo: vi.fn(),
    recordNavigation: vi.fn((url: string, isReplace?: boolean) => {
      state = {
        ...state,
        currentUrl: url,
        canGoBack: true,
        canGoForward: isReplace ? state.canGoForward : false,
      }
      notify()
    }),
    back: vi.fn(),
    forward: vi.fn(),
    canGoBack: () => state.canGoBack,
    canGoForward: () => state.canGoForward,
    subscribe: vi.fn((callback: (next: PreviewState) => void) => {
      listeners.add(callback)
      return () => {
        const had = listeners.delete(callback)
        if (had) unsubscribe()
      }
    }),
    openExternal: vi.fn(),
  }
  return { provider, notify, unsubscribe }
}

/** The JIT host: the panel with React's prop names wired through `p`. */
const PreviewPanelHost = Component({
  selector: 'div[mol-preview-host]',
  standalone: true,
  imports: [PreviewPanel],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-preview-panel [buildingHint]="p['buildingHint']" [className]="p['className']"></div>`,
})(
  class PreviewPanelHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof PreviewPanelHost>>
  container: HTMLElement
  provider: PreviewProvider
  unsubscribe: ReturnType<typeof vi.fn>
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  // The panel's server-up probe: an answering host mounts the iframe.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ status: 200, ok: true }) as Response),
  )
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

/** Lets Angular's zoneless change detection and the session's batched renders settle. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 4; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
  await Promise.resolve()
}

/**
 * Mounts the panel through a real Angular application with the preview and i18n providers.
 * @param seed - The first preview-state overrides.
 * @param props - The host's first props.
 * @returns The mount.
 */
async function mount(
  seed: Partial<PreviewState> = {},
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const { provider, unsubscribe } = buildProvider(seed)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(createSimpleI18nProvider('en')),
      providePreview(provider),
    ],
  })
  const ref = createComponent(PreviewPanelHost, { environmentInjector: appRef.injector })
  ref.instance.p = props
  container.appendChild(ref.location.nativeElement as HTMLElement)
  current = { appRef, ref, container, provider, unsubscribe }
  appRef.attachView(ref.hostView)
  appRef.tick()
  await flush()
  // The first server-up probe waits POLL_INITIAL_MS (500ms) before it answers.
  await new Promise((resolve) => setTimeout(resolve, 700))
  await flush()
  return current
}

/**
 * Sends a `molecule:*` bridge message from the preview iframe's own window.
 * @param data - The message payload.
 */
function postFromIframe(data: Record<string, unknown>): void {
  const iframe = current?.container.querySelector('iframe') as HTMLIFrameElement | null
  if (!iframe) throw new Error('no preview iframe mounted')
  window.dispatchEvent(
    new MessageEvent('message', { data, origin: '', source: iframe.contentWindow }),
  )
}

describe('PreviewPanel (Angular view wiring)', () => {
  it('mounts one session, renders the preview store and unmounts it', async () => {
    const mountState = await mount()

    // One live subscription: the panel view's usePreview(). The session takes the live
    // preview from it (setPreview) and never subscribes itself, as React's view does.
    expect(mountState.provider.subscribe).toHaveBeenCalledTimes(1)
    // The server-up poll mounted the iframe at the load target (React mounts the bare URL first).
    const iframe = mountState.container.querySelector('iframe') as HTMLIFrameElement | null
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')?.startsWith(TARGET)).toBe(true)
    // The URL bar shows the preview's current location.
    const urlInput = mountState.container.querySelector(
      '[data-mol-id="preview-url"]',
    ) as HTMLInputElement | null
    expect(urlInput?.value).toBe(TARGET)

    // A navigate message is accepted only from the panel's own iframe — proving the element
    // reached the session's ref and the bridge listener is mounted.
    postFromIframe({ type: 'molecule:navigate', url: 'http://preview.local/dashboard' })
    await flush()
    expect(mountState.provider.recordNavigation).toHaveBeenCalledWith(
      'http://preview.local/dashboard',
      false,
    )
    // …and the re-render from `session.getState()` moved the URL bar with it.
    expect(urlInput?.value).toBe('http://preview.local/dashboard')

    mountState.appRef.destroy()
    mountState.container.remove()
    current = null
    expect(mountState.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('passes changed props to the session', async () => {
    const mountState = await mount()

    // A build hint reaches the behaviour, which forces the overlay and shows the hint.
    mountState.ref.instance.p = { buildingHint: 'GuestMenu.tsx' }
    mountState.ref.changeDetectorRef.markForCheck()
    mountState.appRef.tick()
    await flush()

    const overlay = mountState.container.querySelector('[data-mol-id="preview-overlay"]')
    expect(overlay?.textContent).toContain('Updating')
    expect(overlay?.textContent).toContain('GuestMenu.tsx')
  })

  it('re-creates the iframe element when the mount key changes', async () => {
    const mountState = await mount()
    const before = mountState.container.querySelector('iframe') as HTMLIFrameElement
    expect(before).not.toBeNull()

    // A refresh bumps `loadNonce`; the behaviour answers with a fresh mount key, and React's
    // `key={iframeMountKey}` contract is a NEW element (not a src change on the old one).
    mountState.provider.refresh()
    await flush()
    await flush()

    const after = mountState.container.querySelector('iframe') as HTMLIFrameElement
    expect(after).not.toBeNull()
    expect(after).not.toBe(before)
    expect(before.isConnected).toBe(false)
  })

  it('adopts the remounted iframe, so the bridge keeps reaching the host', async () => {
    const mountState = await mount()
    const before = mountState.container.querySelector('iframe') as HTMLIFrameElement
    expect(before).not.toBeNull()

    mountState.provider.refresh()
    await flush()
    await flush()
    const after = mountState.container.querySelector('iframe') as HTMLIFrameElement
    expect(after).not.toBe(before)
    // The ref must hold the NEW element: the old one's removal reports `null`, and if that ran
    // after the new element was adopted the bridge would silently go dark on every refresh.
    postFromIframe({ type: 'molecule:navigate', url: 'http://preview.local/after-refresh' })
    await flush()
    expect(mountState.provider.recordNavigation).toHaveBeenCalledWith(
      'http://preview.local/after-refresh',
      false,
    )
  })
})

// The sandbox attribute value that must be present on the preview iframe.
const EXPECTED_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin'

/** The Angular view file: React's `PreviewPanel.tsx` counterpart. */
const PANEL_VIEW = '../components/preview-panel.component.ts'

/** The shared behaviour both frameworks' panels run. */
const PANEL_LOGIC = '../../../ide-panel-logic/src/components/preview-panel-logic.ts'

/**
 * Resolves a source path relative to this test file, so the suite reads the same files whether
 * Vitest runs from the package or from the molecule root (CI and the release run from the root).
 * The jsdom environment replaces the global `URL` (so Node's `fs` will not take it), hence the
 * `href` string handed to `fileURLToPath`.
 *
 * @param relative - The path relative to this test file.
 * @returns The absolute file path.
 */
function sourcePath(relative: string): string {
  return fileURLToPath(new URL(relative, import.meta.url).href)
}

/**
 * Reads one of the panel's source files.
 *
 * @param file - The path relative to this test file.
 * @returns The file's text.
 */
async function readSourceFile(file: string): Promise<string> {
  const fs = await import('node:fs/promises')
  return fs.readFile(sourcePath(file), 'utf-8')
}

/**
 * The Angular view's whole source (the component with React's markup, attributes,
 * `data-mol-id`s and handlers).
 *
 * @returns The view's text.
 */
const readViewSource = (): Promise<string> => readSourceFile(PANEL_VIEW)

/**
 * The shared behaviour's source (`createPreviewPanelSession`, shared with the other
 * frameworks and run by the Angular panel).
 *
 * @returns The behaviour's text.
 */
const readLogicSource = (): Promise<string> => readSourceFile(PANEL_LOGIC)

/**
 * The panel's whole source: the view, plus the behaviour it runs from
 * `@molecule/app-ide-panel-logic`.
 *
 * @returns Both files' text.
 */
async function readPanelSource(): Promise<string> {
  return (await Promise.all([readViewSource(), readLogicSource()])).join('\n')
}

describe('PreviewPanel security', () => {
  describe('iframe sandbox attribute', () => {
    const permissions = EXPECTED_SANDBOX.split(' ')

    it('should include allow-scripts (needed for preview to work)', () => {
      expect(permissions).toContain('allow-scripts')
    })

    it('should include allow-forms (needed for form submissions)', () => {
      expect(permissions).toContain('allow-forms')
    })

    it('should include allow-popups (needed for OAuth and external links)', () => {
      expect(permissions).toContain('allow-popups')
    })

    it('should include allow-same-origin (needed for service workers and localStorage)', () => {
      expect(permissions).toContain('allow-same-origin')
    })

    it('should NOT include allow-top-navigation (prevents iframe from navigating parent)', () => {
      expect(permissions).not.toContain('allow-top-navigation')
    })

    it('should NOT include allow-top-navigation-by-user-activation', () => {
      expect(permissions).not.toContain('allow-top-navigation-by-user-activation')
    })

    it('should NOT include allow-downloads (prevents drive-by downloads)', () => {
      expect(permissions).not.toContain('allow-downloads')
    })

    it('should NOT include allow-modals (prevents alert/confirm/prompt spam)', () => {
      expect(permissions).not.toContain('allow-modals')
    })

    it('should include allow-popups-to-escape-sandbox (popups get full permissions)', () => {
      expect(permissions).toContain('allow-popups-to-escape-sandbox')
    })

    it('should have exactly 5 permissions (no extras)', () => {
      expect(permissions).toHaveLength(5)
    })
  })

  describe('sandbox attribute matches source code', () => {
    it('should match the attribute string in PreviewPanel.tsx', async () => {
      // Read the actual source file to verify the sandbox value has not drifted.
      const source = await readViewSource()
      expect(source).toContain(`sandbox="${EXPECTED_SANDBOX}"`)
    })
  })
})

/**
 * Freeze watchdog: the scaffold posts `molecule:heartbeat` every ~3s; if its main
 * thread locks up (infinite loop / runaway render) the beats stop and we surface a
 * reload banner. The behaviour lives in the shared logic both frameworks' panels
 * run, so these assert the wiring against source to catch regressions, notably the
 * original bug where the heartbeat was collected but never read (dead detection).
 */
describe('PreviewPanel freeze watchdog', () => {
  /** The scaffold's heartbeat cadence (index.html.tpl): `setInterval(post, 3000)`. */
  const SCAFFOLD_HEARTBEAT_MS = 3000

  const readSource = readPanelSource

  it('declares a freeze threshold longer than the scaffold heartbeat (no false positives)', async () => {
    const source = await readSource()
    const m = source.match(/FREEZE_THRESHOLD_MS\s*=\s*([\d_]+)/)
    expect(m).not.toBeNull()
    if (!m) throw new Error('FREEZE_THRESHOLD_MS is not declared')
    const threshold = Number(m[1].replace(/_/g, ''))
    // Must tolerate at least two missed beats so brief jank doesn't trip it.
    expect(threshold).toBeGreaterThan(SCAFFOLD_HEARTBEAT_MS * 2)
  })

  it('actually reads the heartbeat to detect a freeze (regression: it used to be write-only)', async () => {
    const source = await readSource()
    // The watchdog must consume lastHeartbeatRef, not just write it on message.
    expect(source).toMatch(
      /Date\.now\(\)\s*-\s*lastHeartbeatRef\.current\s*>\s*FREEZE_THRESHOLD_MS/,
    )
    expect(source).toContain('setPreviewFrozen(')
  })

  it('auto-clears the frozen state when the app is not loaded (transient jank recovers)', async () => {
    const source = await readSource()
    // Effect early-returns to setPreviewFrozen(false) when not ready/no url.
    expect(source).toMatch(
      /if \(!iframeReady \|\| fadingOut \|\| !state\.url\) \{\s*setPreviewFrozen\(false\)/,
    )
  })

  it('renders a reload banner with an i18n message and a reload action', async () => {
    const source = await readSource()
    const view = await readViewSource()
    // The freeze banner is gated on confirmedContent (only "this app stopped responding" once
    // it was actually showing content — a never-rendered/blank app is covered by the overlay).
    expect(view).toContain('view.previewFrozen && view.confirmedContent')
    expect(source).toContain("'ide.preview.frozen'")
    expect(source).toContain("'ide.preview.frozenReload'")
    expect(view).toContain('view.handleReloadFrozen()')
  })

  it('reloads a frozen preview by remounting the iframe', async () => {
    const source = await readSource()
    // handleReloadFrozen clears the flag, reseeds the heartbeat, and remounts.
    expect(source).toMatch(
      /handleReloadFrozen = useCallback\(\(\) => \{[\s\S]*?setPreviewFrozen\(false\)[\s\S]*?handleManualRetry\(\)/,
    )
  })

  it('reports the freeze to the host (not just a banner) on the false→true transition', async () => {
    const source = await readSource()
    // The banner alone leaves the agent blind — a locked thread can post nothing, so the
    // host watchdog is the ONLY detector. On the freeze transition it must call
    // onPreviewStuck with a `frozen` report carrying the route, exactly once per episode.
    expect(source).toMatch(
      /if \(previewFrozen && !frozenReportedRef\.current\) \{\s*frozenReportedRef\.current = true\s*onPreviewStuck\?\.\(\{ reason: 'frozen', url: currentLocationRef\.current \}\)/,
    )
    // Re-arms when heartbeats resume so a later freeze re-reports.
    expect(source).toMatch(/else if \(!previewFrozen\) \{\s*frozenReportedRef\.current = false/)
  })
})

/**
 * Structured stuck reports: every give-up path hands the host a failure CLASS + route so
 * it can compose an actionable, agent-fixable request (vs. a bare "preview is stuck").
 * These source-assert the per-path reason strings the shared logic emits.
 */
describe('PreviewPanel structured stuck reasons', () => {
  const readSource = readPanelSource

  it('tags the loop-breaker (exhausted reloads) as reason: load-failed', async () => {
    const source = await readSource()
    expect(source).toContain(
      "onPreviewStuck?.({ reason: 'load-failed', url: currentLocationRef.current })",
    )
  })

  it('tags the absolute readiness ceiling as reason: load-timeout', async () => {
    const source = await readSource()
    expect(source).toContain(
      "onPreviewStuck?.({ reason: 'load-timeout', url: currentLocationRef.current })",
    )
  })

  it('de-dups runtime errors by signature before forwarding (one fault, one report)', async () => {
    const source = await readSource()
    // The baked sender + the centralized bridge can both report the SAME error, and a
    // render loop re-throws it endlessly — the agent must hear each signature once.
    expect(source).toMatch(
      /const signature = `\$\{err\.message\}\|\$\{err\.source \?\? ''\}\|\$\{err\.line \?\? ''\}\|\$\{err\.column \?\? ''\}`/,
    )
    expect(source).toMatch(/now - lastSeen < ERROR_DEDUP_WINDOW_MS\) return/)
  })
})

/**
 * URL bar (PV2): the preview reports its own client-side location via a
 * `molecule:navigate` postMessage; the panel forwards it to `recordNavigation`
 * (which updates the URL bar without reloading the iframe). The bar reflects the
 * preview's CURRENT location and stays editable, committing on Enter. The
 * behaviour lives in the shared logic; the Angular view renders the same contract.
 */
describe('PreviewPanel URL bar (current location)', () => {
  const readSource = readPanelSource

  it('handles the molecule:navigate message and forwards url + isReplace to recordNavigation', async () => {
    const source = await readSource()
    expect(source).toContain("event.data?.type === 'molecule:navigate'")
    // Forwards BOTH the url AND the isReplace flag (PV3): a replaceState
    // redirect-on-load must preserve the Forward stack, so the panel passes
    // event.data.isReplace through to recordNavigation rather than dropping it.
    expect(source).toMatch(
      /molecule:navigate'[\s\S]*?if \(typeof event\.data\.url === 'string'\) \{[\s\S]*?recordNavigation\(event\.data\.url, event\.data\.isReplace === true\)/,
    )
  })

  it('subscribes recordNavigation as a dependency of the message listener', async () => {
    const source = await readSource()
    // The message effect must re-bind when recordNavigation (or onUiResult — the AI-driven
    // ui-result handler — or reveal, which starts the overlay fade) changes, so its closure is
    // never stale.
    expect(source).toMatch(
      /\}, \[clearPoll, onPreviewError, recordNavigation, onUiResult, reveal\]\)/,
    )
  })

  it('relays a uiCommand to the iframe and forwards the ui-result to the host (AI preview control)', async () => {
    const source = await readSource()
    // Posts the command to the iframe's interaction bridge, keyed on id so each fires once.
    expect(source).toContain("type: 'molecule:ui-command'")
    expect(source).toContain('uiCommand.id === lastUiCommandIdRef.current')
    expect(source).toContain('iframeRef.current?.contentWindow?.postMessage')
    // Forwards the bridge's reply to the host's onUiResult callback (generic — no API specifics).
    expect(source).toContain("event.data?.type === 'molecule:ui-result'")
    expect(source).toContain('onUiResult(event.data.id')
    // Readiness race fix: a single post is dropped when the iframe/bridge is mid-mount or
    // mid-reload, so the command is RE-POSTED on an interval until the bridge replies (or ~40s),
    // and the ui-result marks the id resolved to STOP the retry loop.
    expect(source).toContain('window.setInterval')
    expect(source).toContain('uiResolvedRef.current.has(cmdId)')
    expect(source).toContain('uiResolvedRef.current.add(event.data.id)')
  })

  it('binds the URL bar to the live current location, not the raw load target', async () => {
    const source = await readSource()
    const view = await readViewSource()
    expect(source).toContain('const currentLocation = state.currentUrl || state.url')
    // The input is a controlled draft synced to the current location.
    expect(view).toContain('[value]="view.urlDraft"')
    expect(source).toMatch(/if \(!urlEditing\) setUrlDraft\(currentLocation\)/)
  })

  it('commits a typed URL on Enter (a real load), not on every keystroke', async () => {
    const view = await readViewSource()
    expect(view).toMatch(/if \(event\.key === 'Enter'\)[\s\S]*?if \(next\) this\.setUrl\(next\)/)
    // No per-keystroke navigation: the input's handler edits the draft only.
    expect(view).toMatch(/onUrlInput\(event: Event\): void \{\s*this\.view\.setUrlDraft\(/)
    expect(view).not.toMatch(/onUrlInput\(event: Event\)[\s\S]{0,200}?this\.setUrl\(/)
  })
})

/**
 * Back/Forward (PV2/PV3): the panel drives the preview provider's own navigation
 * history. The buttons are wired to handleBack/handleForward — which move the
 * provider's history cursor AND post a `molecule:nav-command` to the iframe so
 * the preview runs its OWN client-side `history.back()`/`forward()` (preserving
 * scroll + SPA state) — and are disabled from the canGoBack/canGoForward flags.
 * Crucially this is NOT a loadNonce-keyed cold reload (that path is reserved for
 * setUrl/refresh). Assert the wiring against source; the live behavior is
 * covered by PreviewPanel.navigation.test.ts.
 */
describe('PreviewPanel back/forward navigation', () => {
  const readSource = readPanelSource

  it('pulls back/forward off the preview hook', async () => {
    const source = await readSource()
    const view = await readViewSource()
    // The behaviour takes its state + actions from the live preview binding (React's
    // `usePreview()` destructure); the Angular view supplies them from its own store.
    expect(source).toMatch(/recordNavigation, back, forward \} =\s*preview/)
    expect(view).toContain('back: this.preview.back')
    expect(view).toContain('forward: this.preview.forward')
  })

  it('wires the Back button to handleBack and disables it via canGoBack', async () => {
    const view = await readViewSource()
    expect(view).toMatch(
      /molId="preview-back"[\s\S]*?\[onClick\]="backClick"[\s\S]*?\[disabled\]="!previewState\(\)\.canGoBack"/,
    )
    // The button's handler is the panel's handleBack wiring.
    expect(view).toMatch(/backClick = \(\): void => this\.view\.handleBack\(\)/)
  })

  it('wires the Forward button to handleForward and disables it via canGoForward', async () => {
    const view = await readViewSource()
    expect(view).toMatch(
      /molId="preview-forward"[\s\S]*?\[onClick\]="forwardClick"[\s\S]*?\[disabled\]="!previewState\(\)\.canGoForward"/,
    )
    expect(view).toMatch(/forwardClick = \(\): void => this\.view\.handleForward\(\)/)
  })

  it('does not leave the back/forward buttons as hardcoded-disabled placeholders', async () => {
    const view = await readViewSource()
    // A placeholder is a literal disable with no live history gate behind it.
    expect(view).not.toMatch(/molId="preview-back"[\s\S]{0,300}?\[disabled\]="true"/)
    expect(view).not.toMatch(/molId="preview-forward"[\s\S]{0,300}?\[disabled\]="true"/)
  })

  it('posts a molecule:nav-command to the iframe for Back/Forward (client-side nav)', async () => {
    const source = await readSource()
    // The handlers move the provider cursor then post a command to the iframe's
    // OWN history — NOT a host-side reload.
    expect(source).toMatch(
      /handleBack = useCallback\(\(\) => \{\s*back\(\)\s*postNavCommand\('back'\)/,
    )
    expect(source).toMatch(
      /handleForward = useCallback\(\(\) => \{\s*forward\(\)\s*postNavCommand\('forward'\)/,
    )
    expect(source).toMatch(
      /iframeRef\.current\?\.contentWindow\?\.postMessage\(\s*\{ type: 'molecule:nav-command', action \},\s*previewTargetOrigin\(iframeRef\.current\),?\s*\)/,
    )
  })

  it('keys the iframe cold-reload off loadNonce (bumped by setUrl/refresh, not back/forward)', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /\}, \[state\.url, state\.loadNonce, startPolling, clearPoll, clearStuckTimer\]\)/,
    )
  })
})
