// @vitest-environment jsdom
/**
 * The Vue preview panel as a VIEW over `createPreviewPanelSession`: one session
 * per mounted panel, the logic props pushed through `update`, the iframe element
 * written into the session's `iframeRef` box (a fresh element when
 * `iframeMountKey` changes), and the session disconnected on unmount.
 *
 * The session module is faked so the wiring itself is observable; the shared
 * behaviour is `@molecule/app-ide-panel-logic`'s own tests (and the conformance
 * kit's PreviewPanel cases) subject, not this file's.
 *
 * @module
 */

import { fileURLToPath } from 'node:url'

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp, h, nextTick, reactive } from 'vue'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type * as Panels from '@molecule/app-ide-panel-logic/panels'
import type {
  PreviewPanelLogic,
  PreviewPanelLogicProps,
  PreviewPanelPreview,
} from '@molecule/app-ide-panel-logic/panels'
import type {
  PreviewPanelSession,
  PreviewPanelSessionOptions,
} from '@molecule/app-ide-panel-logic/panels'
import type { PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createI18nPlugin, createPreviewPlugin } from '@molecule/app-vue'

import { PreviewPanel } from '../components/PreviewPanel.js'

/** The one session the view is expected to create, faked so its wiring is observable. */
const session = vi.hoisted(() => {
  const noop = (): void => undefined
  const iframeRef: { current: HTMLIFrameElement | null } = { current: null }
  const state = {
    iframeRef,
    orientation: 'portrait' as const,
    requestedSize: null,
    canRotate: false,
    currentLocation: 'http://preview.local/start',
    isSecureLocation: false,
    everLoaded: false,
    iframeReady: true,
    fadingOut: false,
    iframeSrc: 'http://preview.local/start',
    iframeMountKey: 0,
    stuckRetryCount: 0,
    previewGaveUp: false,
    lastGoodFrame: null,
    confirmedContent: false,
    blankPostBuild: false,
    previewFrozen: false,
    urlDraft: 'http://preview.local/start',
    urlEditing: false,
    renderState: 'rendered' as const,
    setFadingOut: noop,
    setUrlDraft: noop,
    setUrlEditing: noop,
    handleDeviceChange: noop,
    handleRotate: noop,
    handleIframeLoad: noop,
    handleUserRetry: noop,
    handleReloadFrozen: noop,
    handleBack: noop,
    handleForward: noop,
  }
  return {
    state,
    iframeRef,
    options: [] as PreviewPanelSessionOptions[],
    previews: [] as PreviewPanelPreview[],
    updates: [] as PreviewPanelLogicProps[],
    listeners: new Set<() => void>(),
    connects: 0,
    disconnects: 0,
  }
})

vi.mock('@molecule/app-ide-panel-logic/panels', async (importOriginal) => {
  const actual = await importOriginal<typeof Panels>()
  return {
    ...actual,
    createPreviewPanelSession: (options: PreviewPanelSessionOptions): PreviewPanelSession => {
      session.options.push(options)
      return {
        getState: (): PreviewPanelLogic => session.state,
        subscribe: (listener: () => void): (() => void) => {
          session.listeners.add(listener)
          return () => {
            session.listeners.delete(listener)
          }
        },
        update: (next: PreviewPanelLogicProps): void => {
          session.updates.push(next)
        },
        setPreview: (preview: PreviewPanelPreview): void => {
          session.previews.push(preview)
        },
        connect: (): (() => void) => {
          session.connects += 1
          return () => {
            session.disconnects += 1
          }
        },
      }
    },
  }
})

/**
 * Pushes a changed session state to the view, as the session's `subscribe` would
 * (a new state object per render, like the shared session's `getState`).
 * @param patch - The fields the new state changes.
 */
async function publish(patch: Partial<(typeof session)['state']> = {}): Promise<void> {
  session.state = { ...session.state, ...patch }
  for (const listener of [...session.listeners]) listener()
  await nextTick()
}

/**
 * Mounts the panel in a fresh app.
 * @param props - The props object the host renders (pass a `reactive` one to change them).
 * @returns The app, the host element, the preview provider and its subscribers.
 */
function mount(props: Record<string, unknown> = {}): {
  app: App
  host: HTMLElement
  provider: PreviewProvider
  subscribers: Set<(state: PreviewState) => void>
} {
  const subscribers = new Set<(state: PreviewState) => void>()
  let previewState: PreviewState = {
    url: 'http://preview.local/start',
    currentUrl: 'http://preview.local/start',
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: true,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const provider: PreviewProvider = {
    name: 'test-preview',
    setUrl: (url) => {
      previewState = {
        ...previewState,
        url,
        currentUrl: url,
        loadNonce: previewState.loadNonce + 1,
      }
    },
    getUrl: () => previewState.url,
    refresh: () => undefined,
    setDevice: (device) => {
      previewState = { ...previewState, device }
      for (const subscriber of [...subscribers]) subscriber({ ...previewState })
    },
    getState: () => ({ ...previewState }),
    navigateTo: () => undefined,
    recordNavigation: (url) => {
      previewState = { ...previewState, currentUrl: url }
    },
    back: () => undefined,
    forward: () => undefined,
    canGoBack: () => previewState.canGoBack,
    canGoForward: () => previewState.canGoForward,
    subscribe: (callback) => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
    openExternal: () => undefined,
  }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render: () => h(PreviewPanel, { ...props }) })
  app.use(createPreviewPlugin(provider))
  app.use(createI18nPlugin(createSimpleI18nProvider()))
  app.mount(host)
  return { app, host, provider, subscribers }
}

describe('PreviewPanel (Vue) — the view over the shared session', () => {
  beforeEach(() => {
    setClassMap(classMap)
    session.options.length = 0
    session.previews.length = 0
    session.updates.length = 0
    session.listeners.clear()
    session.connects = 0
    session.disconnects = 0
    session.iframeRef.current = null
    session.state = {
      ...session.state,
      iframeReady: true,
      iframeSrc: 'http://preview.local/start',
      iframeMountKey: 0,
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('creates one session with the live preview and the logic props, and connects it on mount', async () => {
    const onRenderState = (): void => undefined
    const { app, provider, subscribers } = mount({ onRenderState, fileChangeTick: 2 })
    await nextTick()

    expect(session.options).toHaveLength(1)
    // The session takes the live preview from the binding's `usePreview()` (its
    // state and actions), and the binding owns the one provider subscription.
    expect(session.options[0]?.preview.state.url).toBe('http://preview.local/start')
    expect(session.options[0]?.preview.setDevice).toBeTypeOf('function')
    expect(subscribers.size).toBe(1)
    expect(session.options[0]?.props).toEqual({ onRenderState, fileChangeTick: 2 })
    expect(session.connects).toBe(1)

    // A provider change flows through the binding's subscription into
    // `session.setPreview`.
    provider.setDevice('tablet')
    await nextTick()
    expect(session.previews.at(-1)?.state.device).toBe('tablet')

    app.unmount()
  })

  it('puts the iframe in the session box and renders the preview markup', async () => {
    const { app, host } = mount({ className: 'panel-extra' })
    await nextTick()

    const iframe = host.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('http://preview.local/start')
    expect(session.iframeRef.current).toBe(iframe)
    expect(host.firstElementChild?.className).toContain('panel-extra')
    expect(host.querySelector('[data-mol-id="preview-url"]')).not.toBeNull()

    app.unmount()
  })

  it('mounts a fresh iframe element when iframeMountKey changes', async () => {
    const { app, host } = mount()
    await nextTick()
    const first = host.querySelector('iframe')

    await publish({ iframeSrc: 'http://preview.local/remounted', iframeMountKey: 1 })

    const second = host.querySelector('iframe')
    expect(second).not.toBeNull()
    expect(second).not.toBe(first)
    expect(second?.getAttribute('src')).toBe('http://preview.local/remounted')
    expect(session.iframeRef.current).toBe(second)

    app.unmount()
  })

  it('pushes a changed logic prop through session.update', async () => {
    const logicProps = reactive({ fileChangeTick: 0 })
    const { app } = mount(logicProps)
    await nextTick()

    logicProps.fileChangeTick = 7
    await nextTick()

    expect(session.updates.at(-1)).toEqual({ fileChangeTick: 7 })
    app.unmount()
  })

  it('disconnects the session, drops the iframe box and stops listening on unmount', async () => {
    const { app } = mount()
    await nextTick()
    expect(session.listeners.size).toBe(1)

    app.unmount()
    await nextTick()

    expect(session.disconnects).toBe(1)
    expect(session.listeners.size).toBe(0)
    expect(session.iframeRef.current).toBeNull()
  })

  it('renders a custom loading indicator from its node prop', async () => {
    const { app, host } = mount({
      loadingIndicator: h('div', { 'data-slot': 'loading-indicator' }, 'custom loading'),
    })
    // The overlay only shows while the preview is confirmed unready; the session
    // fakes an already-revealed iframe, so a cold boot (everLoaded false) is set up.
    await publish({ iframeReady: false })

    expect(host.querySelector('[data-slot="loading-indicator"]')).not.toBeNull()

    app.unmount()
  })
})

// The sandbox attribute value that must be present on the preview iframe.
const EXPECTED_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin'

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
 * The panel's whole source: the view, plus the behaviour it runs from
 * `@molecule/app-ide-panel-logic` (`createPreviewPanelSession`, shared with the
 * other frameworks).
 *
 * @returns Both files' text.
 */
async function readPanelSource(): Promise<string> {
  const fs = await import('node:fs/promises')
  const files = [
    sourcePath('../components/PreviewPanel.ts'),
    sourcePath('../../../ide-panel-logic/src/components/preview-panel-logic.ts'),
  ]
  return (await Promise.all(files.map((file) => fs.readFile(file, 'utf-8')))).join('\n')
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
      const source = await readPanelSource()
      expect(source).toMatch(new RegExp(`sandbox:\\s*'${EXPECTED_SANDBOX}'`))
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
    // The freeze banner is gated on confirmedContent (only "this app stopped responding" once
    // it was actually showing content — a never-rendered/blank app is covered by the overlay).
    expect(source).toContain('L.previewFrozen && L.confirmedContent')
    expect(source).toContain("'ide.preview.frozen'")
    expect(source).toContain("'ide.preview.frozenReload'")
    expect(source).toContain('onClick: L.handleReloadFrozen')
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
 * behaviour lives in the shared logic; the Vue view renders the same contract.
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
    expect(source).toContain('const currentLocation = state.currentUrl || state.url')
    // The input is a controlled draft synced to the current location.
    expect(source).toContain('value: L.urlDraft')
    expect(source).toMatch(/if \(!urlEditing\) setUrlDraft\(currentLocation\)/)
  })

  it('commits a typed URL on Enter (a real load), not on every keystroke', async () => {
    const source = await readSource()
    expect(source).toMatch(/if \(event\.key === 'Enter'\)[\s\S]*?if \(next\) setUrl\(next\)/)
    // No per-keystroke navigation: the input's handler edits the draft only.
    expect(source).not.toContain('onInput: (event: Event) => setUrl(')
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
    expect(source).toMatch(/recordNavigation, back, forward \} =\s*\n?\s*usePreview\(\)/)
  })

  it('wires the Back button to handleBack and disables it via canGoBack', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /molId: 'preview-back'[\s\S]*?onClick: L\.handleBack[\s\S]*?disabled: !snapshot\.canGoBack/,
    )
  })

  it('wires the Forward button to handleForward and disables it via canGoForward', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /molId: 'preview-forward'[\s\S]*?onClick: L\.handleForward[\s\S]*?disabled: !snapshot\.canGoForward/,
    )
  })

  it('does not leave the back/forward buttons as hardcoded-disabled placeholders', async () => {
    const source = await readSource()
    expect(source).not.toMatch(/molId: 'preview-(back|forward)'[\s\S]{0,300}?disabled: true/)
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
