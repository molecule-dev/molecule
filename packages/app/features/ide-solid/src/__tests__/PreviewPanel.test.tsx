// @vitest-environment jsdom
/**
 * The Solid `PreviewPanel` is a VIEW over the shared preview behaviour: one
 * `createPreviewPanelSession` per mounted panel, re-rendered from
 * `session.getState()` whenever the session publishes, with the host-facing
 * props reaching it through `session.update()` and the `<iframe>` element
 * handed to `session.getState().iframeRef.current`.
 *
 * These tests mount a real Solid root with the session STUBBED, so they can see
 * the wiring the panel promises and nothing else: the session is created once
 * with the live preview and the first props, `connect()` runs on mount (and its
 * disconnect once on unmount), a prop change reaches `session.update()`, a
 * provider state change reaches `session.setPreview()` with the SAME four
 * actions, the rendered `<iframe>`
 * is the element in the session's ref box (and the box is emptied on unmount),
 * and a changed `iframeMountKey` mounts a FRESH element exactly as React's
 * `key={iframeMountKey}` does — while a src change alone navigates the same one.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as PanelLogicPanels from '@molecule/app-ide-panel-logic/panels'
import type { PreviewPanelLogic } from '@molecule/app-ide-panel-logic/panels'
import type { PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { PreviewContext } from '@molecule/app-solid'

import { PreviewPanel, type PreviewPanelProps } from '../components/PreviewPanel.jsx'

/**
 * What the stubbed session records, and the state the panel renders from. Held
 * in a hoisted object so the module mock can reach it.
 */
const stub = vi.hoisted(() => ({
  /** Every session call, in order (`create` also carries its live preview). */
  calls: [] as { name: string; value?: unknown; preview?: unknown }[],
  /** The listeners `subscribe` registered. */
  listeners: new Set<() => void>(),
  /** The ref box the panel's `<iframe>` element must land in. */
  iframeRef: { current: null as HTMLIFrameElement | null },
  /** The logic state `getState()` answers with. */
  state: { current: null as unknown },
}))

vi.mock('@molecule/app-ide-panel-logic/panels', async (importOriginal) => {
  const actual = await importOriginal<typeof PanelLogicPanels>()
  return {
    ...actual,
    /**
     * The stubbed session: records what the view asks of it.
     *
     * @param options - The live preview and first props the view passes.
     * @returns The stub session.
     */
    createPreviewPanelSession: (options: { preview?: unknown; props?: unknown }) => {
      stub.calls.push({ name: 'create', value: options.props, preview: options.preview })
      return {
        getState: () => stub.state.current,
        subscribe: (listener: () => void) => {
          stub.calls.push({ name: 'subscribe' })
          stub.listeners.add(listener)
          return () => {
            stub.calls.push({ name: 'unsubscribe' })
            stub.listeners.delete(listener)
          }
        },
        update: (props: unknown) => {
          stub.calls.push({ name: 'update', value: props })
        },
        setPreview: (preview: unknown) => {
          stub.calls.push({ name: 'setPreview', value: preview })
        },
        connect: () => {
          stub.calls.push({ name: 'connect' })
          return () => {
            stub.calls.push({ name: 'disconnect' })
          }
        },
      }
    },
  }
})

/** The names of the calls the stub recorded, in order. */
const callNames = (): string[] => stub.calls.map((call) => call.name)

/**
 * The logic state the panel renders, with sensible defaults per case.
 *
 * @param overrides - The fields this case changes.
 * @returns A complete {@link PreviewPanelLogic}.
 */
function logicState(overrides: Partial<PreviewPanelLogic> = {}): PreviewPanelLogic {
  /** A handler that only records its own name. */
  const act = (name: string) => () => {
    stub.calls.push({ name })
  }
  /** A setter that records its name and value. */
  const update = (name: string) => (value: unknown) => {
    stub.calls.push({ name, value })
  }
  return {
    iframeRef: stub.iframeRef,
    orientation: 'portrait',
    requestedSize: null,
    canRotate: false,
    currentLocation: 'http://preview.local/',
    isSecureLocation: false,
    everLoaded: true,
    iframeReady: true,
    fadingOut: false,
    iframeSrc: 'http://preview.local/',
    iframeMountKey: 1,
    stuckRetryCount: 0,
    previewGaveUp: false,
    lastGoodFrame: null,
    confirmedContent: true,
    blankPostBuild: false,
    previewFrozen: false,
    urlDraft: 'http://preview.local/',
    urlEditing: false,
    renderState: 'rendered',
    setFadingOut: update('setFadingOut'),
    setUrlDraft: update('setUrlDraft'),
    setUrlEditing: update('setUrlEditing'),
    handleDeviceChange: update('handleDeviceChange'),
    handleRotate: act('handleRotate'),
    handleIframeLoad: act('handleIframeLoad'),
    handleUserRetry: act('handleUserRetry'),
    handleReloadFrozen: act('handleReloadFrozen'),
    handleBack: act('handleBack'),
    handleForward: act('handleForward'),
    ...overrides,
  }
}

/**
 * The preview state the panel reads through the binding.
 *
 * @param overrides - The fields this case changes.
 * @returns A complete {@link PreviewState}.
 */
function previewState(overrides: Partial<PreviewState> = {}): PreviewState {
  return {
    url: 'http://preview.local/',
    currentUrl: 'http://preview.local/',
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: true,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
    ...overrides,
  }
}

/**
 * A fake live-preview provider over one state, notifying its subscribers on change.
 *
 * @param state - The initial state.
 * @returns The fake provider.
 */
function fakeProvider(state: PreviewState): PreviewProvider {
  let current = state
  const subscribers = new Set<(next: PreviewState) => void>()
  const notify = (): void => {
    for (const subscriber of [...subscribers]) subscriber(current)
  }
  return {
    name: 'fake',
    setUrl: (url: string) => {
      current = { ...current, url, currentUrl: url, loadNonce: current.loadNonce + 1 }
      notify()
    },
    getUrl: () => current.url,
    refresh: () => {
      current = { ...current, loadNonce: current.loadNonce + 1 }
      notify()
    },
    setDevice: (device) => {
      current = { ...current, device }
      notify()
    },
    getState: () => current,
    navigateTo: (path: string) => {
      current = { ...current, url: path, currentUrl: path, loadNonce: current.loadNonce + 1 }
      notify()
    },
    recordNavigation: () => {},
    back: () => {},
    forward: () => {},
    canGoBack: () => current.canGoBack,
    canGoForward: () => current.canGoForward,
    subscribe: (callback) => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
    openExternal: () => {},
  }
}

/** The mounted root this file last rendered, disposed before the next test. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  stub.calls = []
  stub.listeners.clear()
  stub.iframeRef.current = null
  stub.state.current = logicState()
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

/**
 * Renders the panel over the stubbed session.
 *
 * @param props - The panel's props.
 * @returns The container it rendered into.
 */
function renderPanel(props: PreviewPanelProps = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const provider = fakeProvider(previewState())
  mounted.dispose = render(
    () => (
      <PreviewContext.Provider value={provider}>
        <PreviewPanel {...props} />
      </PreviewContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Re-renders the panel from the session, as the session's `subscribe` does.
 *
 * @param state - The state `getState()` should answer with.
 */
function publish(state: PreviewPanelLogic = stub.state.current as PreviewPanelLogic): void {
  stub.state.current = state
  for (const listener of [...stub.listeners]) listener()
}

/**
 * The rendered preview `<iframe>`.
 *
 * @param container - The render container.
 * @returns The element, or null when none is rendered.
 */
const iframeOf = (container: HTMLElement): HTMLIFrameElement | null =>
  container.querySelector('iframe')

describe('PreviewPanel', () => {
  it('creates one session from the first props and connects it on mount', () => {
    renderPanel({ isBuilding: false, fileChangeTick: 3 })
    const created = stub.calls.find((call) => call.name === 'create')
    expect(created).toBeDefined()
    expect(created?.value).toMatchObject({ isBuilding: false, fileChangeTick: 3 })
    expect(callNames().filter((name) => name === 'create')).toHaveLength(1)
    expect(callNames().filter((name) => name === 'connect')).toHaveLength(1)
    expect(callNames().filter((name) => name === 'subscribe')).toHaveLength(1)
  })

  it('renders the markup React renders, from the session state', () => {
    const container = renderPanel()
    expect(container.querySelector('[data-mol-id="preview-url"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="preview-back"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="preview-forward"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="preview-refresh"]')).not.toBeNull()
    expect(iframeOf(container)?.getAttribute('src')).toBe('http://preview.local/')
  })

  it('passes a changed prop to session.update', async () => {
    const [isBuilding, setIsBuilding] = createSignal(false)
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <PreviewContext.Provider value={fakeProvider(previewState())}>
          <PreviewPanel isBuilding={isBuilding()} buildingHint="GuestMenu.tsx" />
        </PreviewContext.Provider>
      ),
      container,
    )
    expect(stub.calls.filter((call) => call.name === 'update')).toHaveLength(0)
    setIsBuilding(true)
    await Promise.resolve()
    const updates = stub.calls.filter((call) => call.name === 'update')
    expect(updates.length).toBeGreaterThan(0)
    expect(updates.at(-1)?.value).toMatchObject({ isBuilding: true })
  })

  it('passes the live preview to the session and re-passes it when the provider state changes', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const provider = fakeProvider(previewState())
    mounted.dispose = render(
      () => (
        <PreviewContext.Provider value={provider}>
          <PreviewPanel />
        </PreviewContext.Provider>
      ),
      container,
    )
    const creates = stub.calls.filter((call) => call.name === 'create')
    expect(creates).toHaveLength(1)
    const initialPreview = creates[0]?.preview as {
      state: PreviewState
      setDevice: (device: PreviewState['device']) => void
      recordNavigation: (url: string, isReplace?: boolean) => void
      back: () => void
      forward: () => void
    }
    expect(initialPreview.state).toMatchObject({ url: 'http://preview.local/' })
    expect(initialPreview.setDevice).toBeTypeOf('function')

    // A provider state change reaches the session through `setPreview`, with
    // the SAME four action objects (an effect of the logic that depends on one
    // must never re-run for them).
    provider.setDevice('mobile')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const passes = stub.calls.filter((call) => call.name === 'setPreview')
    expect(passes.length).toBeGreaterThan(0)
    const last = passes.at(-1)?.value as {
      state: PreviewState
      setDevice: unknown
      recordNavigation: unknown
      back: unknown
      forward: unknown
    }
    expect(last.state).toMatchObject({ device: 'mobile' })
    expect(last.setDevice).toBe(initialPreview.setDevice)
    expect(last.recordNavigation).toBe(initialPreview.recordNavigation)
    expect(last.back).toBe(initialPreview.back)
    expect(last.forward).toBe(initialPreview.forward)
  })

  it('puts the iframe element in the session ref box and empties it on unmount', () => {
    const container = renderPanel()
    const iframe = iframeOf(container)
    expect(iframe).not.toBeNull()
    expect(stub.iframeRef.current).toBe(iframe)

    mounted.dispose?.()
    mounted.dispose = undefined
    expect(stub.iframeRef.current).toBeNull()
    expect(callNames().filter((name) => name === 'disconnect')).toHaveLength(1)
    expect(callNames().filter((name) => name === 'unsubscribe')).toHaveLength(1)
  })

  it('navigates the same iframe element when only the src changes', () => {
    const container = renderPanel()
    const first = iframeOf(container)
    expect(first).not.toBeNull()

    publish(logicState({ iframeSrc: 'http://preview.local/dashboard', iframeMountKey: 1 }))
    const second = iframeOf(container)
    expect(second).not.toBeNull()
    expect(second).toBe(first)
    expect(second?.getAttribute('src')).toBe('http://preview.local/dashboard')
  })

  it('mounts a fresh iframe element when iframeMountKey changes', () => {
    const container = renderPanel()
    const first = iframeOf(container)
    expect(first).not.toBeNull()

    publish(logicState({ iframeSrc: 'http://preview.local/?_r=2', iframeMountKey: 2 }))
    const second = iframeOf(container)
    expect(second).not.toBeNull()
    expect(second).not.toBe(first)
    expect(stub.iframeRef.current).toBe(second)
    expect(second?.getAttribute('src')).toBe('http://preview.local/?_r=2')
  })
})

/**
 * The sandbox attribute value that must be present on the preview iframe.
 *
 * The preview renders untrusted user code in an iframe; the sandbox attribute is
 * the security boundary that prevents it from navigating the parent, triggering
 * downloads, spawning modals, etc. The Solid view renders the same contract React
 * renders (the shared session decides everything else).
 */
const EXPECTED_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin'

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
      // (The jsdom environment's `URL` is not Node's, so resolve a plain path.)
      const source = await readFile(
        join(dirname(fileURLToPath(import.meta.url)), '..', 'components', 'PreviewPanel.tsx'),
        'utf-8',
      )
      expect(source).toContain(`sandbox="${EXPECTED_SANDBOX}"`)
    })
  })
})

/**
 * The panel's whole source: the Solid view, plus the behaviour it runs from
 * `@molecule/app-ide-panel-logic` (`usePreviewPanelLogic`, shared with React and
 * every other framework through `createPreviewPanelSession`).
 *
 * @returns Both files' text.
 */
async function readPanelSource(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url))
  const files = [
    join(here, '..', 'components', 'PreviewPanel.tsx'),
    join(here, '..', '..', '..', 'ide-panel-logic', 'src', 'components', 'preview-panel-logic.ts'),
  ]
  return (await Promise.all(files.map((file) => readFile(file, 'utf-8')))).join('\n')
}

/**
 * Freeze watchdog: the scaffold posts `molecule:heartbeat` every ~3s; if its main
 * thread locks up (an infinite loop / runaway render) the beats stop and we surface a
 * reload banner. These assert the wiring against source to catch regressions, notably
 * the original bug where the heartbeat was collected but never read (dead detection).
 */
describe('PreviewPanel freeze watchdog', () => {
  /** The scaffold's heartbeat cadence (index.html.tpl): `setInterval(post, 3000)`. */
  const SCAFFOLD_HEARTBEAT_MS = 3000

  const readSource = readPanelSource

  it('declares a freeze threshold longer than the scaffold heartbeat (no false positives)', async () => {
    const source = await readSource()
    const m = source.match(/FREEZE_THRESHOLD_MS\s*=\s*([\d_]+)/)
    expect(m).not.toBeNull()
    const threshold = Number(m?.[1]?.replace(/_/g, '') ?? Number.NaN)
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
    // The Solid view reads the session state through `logic()`, so each render-state field
    // carries that accessor where React's render read it directly off the hook's result.
    expect(source).toMatch(/previewFrozen\s*&&\s*logic\(\)\.confirmedContent/)
    expect(source).toContain("'ide.preview.frozen'")
    expect(source).toContain("'ide.preview.frozenReload'")
    expect(source).toMatch(/onClick=\{\(\) => logic\(\)\.handleReloadFrozen\(\)\}/)
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
 * The behavioral load-timeout path is covered in PreviewPanel.absolute-stuck.test.tsx;
 * these source-assert the per-path reason strings.
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
 * URL bar: the preview reports its own client-side location via a
 * `molecule:navigate` postMessage; the panel forwards it to `recordNavigation`
 * (which updates the URL bar without reloading the iframe). The bar reflects the
 * preview's CURRENT location and stays editable, committing on Enter.
 */
describe('PreviewPanel URL bar (current location)', () => {
  const readSource = readPanelSource

  it('handles the molecule:navigate message and forwards url + isReplace to recordNavigation', async () => {
    const source = await readSource()
    expect(source).toContain("event.data?.type === 'molecule:navigate'")
    // Forwards BOTH the url AND the isReplace flag: a replaceState
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
    // mid-reload, so the command is RE-POSTED on an interval until the bridge replies (or ~12s),
    // and the ui-result marks the id resolved to STOP the retry loop.
    expect(source).toContain('window.setInterval')
    expect(source).toContain('uiResolvedRef.current.has(cmdId)')
    expect(source).toContain('uiResolvedRef.current.add(event.data.id)')
  })

  it('binds the URL bar to the live current location, not the raw load target', async () => {
    const source = await readSource()
    expect(source).toContain('const currentLocation = state.currentUrl || state.url')
    // The input is a controlled draft synced to the current location.
    expect(source).toMatch(/value=\{logic\(\)\.urlDraft\}/)
    expect(source).toMatch(/if \(!urlEditing\) setUrlDraft\(currentLocation\)/)
  })

  it('commits a typed URL on Enter (a real load), not on every keystroke', async () => {
    const source = await readSource()
    expect(source).toMatch(/if \(e\.key === 'Enter'\)[\s\S]*?if \(next\) setUrl\(next\)/)
    // No per-keystroke navigation.
    expect(source).not.toContain('onChange={(e) => setUrl(e.target.value)}')
  })
})

/**
 * Back/Forward: the panel drives the preview provider's own navigation
 * history. The buttons are wired to handleBack/handleForward — which move the
 * provider's history cursor AND post a `molecule:nav-command` to the iframe so
 * the preview runs its OWN client-side `history.back()`/`forward()` (preserving
 * scroll + SPA state) — and are disabled from the canGoBack/canGoForward flags.
 * Crucially this is NOT a loadNonce-keyed cold reload (that path is reserved for
 * setUrl/refresh). The live behavior is covered by PreviewPanel.navigation.test.tsx.
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
      /molId="preview-back"[\s\S]*?onClick=\{\(\) => logic\(\)\.handleBack\(\)\}[\s\S]*?disabled=\{!state\(\)\.canGoBack\}/,
    )
  })

  it('wires the Forward button to handleForward and disables it via canGoForward', async () => {
    const source = await readSource()
    expect(source).toMatch(
      /molId="preview-forward"[\s\S]*?onClick=\{\(\) => logic\(\)\.handleForward\(\)\}[\s\S]*?disabled=\{!state\(\)\.canGoForward\}/,
    )
  })

  it('does not leave the back/forward buttons as hardcoded-disabled placeholders', async () => {
    const source = await readSource()
    // The placeholder markup carried a bare `disabled`; the real wiring derives it
    // from the provider's history flags instead.
    expect(source).not.toMatch(/molId="preview-(?:back|forward)"[\s\S]{0,160}?disabled(?=[\s/>])/)
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
