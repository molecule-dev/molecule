// @vitest-environment jsdom
/**
 * `PreviewPanel` rendered for real through Svelte 5's own `mount`/`flushSync`:
 * the view's wiring of the shared `createPreviewPanelSession` — mount connects
 * the session, the iframe element lands in the session's ref box, the bridge
 * listener answers the preview's own window, unmount disconnects everything —
 * and the iframe remount on a mount-key change (a fresh element, not a src
 * change).
 *
 * @module
 */

import { fileURLToPath } from 'node:url'

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import PreviewPanelHost from './PreviewPanelHost.svelte'

/**
 * A ClassMap stub whose every member resolves to its own key as a class token,
 * so a component's composed token set is observable without a styling bond.
 * @returns A stub {@link UIClassMap}.
 */
function buildStubClassMap(): UIClassMap {
  const token = (name: string): ((...args: unknown[]) => string) => {
    const fn = (..._args: unknown[]): string => name
    return new Proxy(fn, {
      get(_t, key) {
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
    get(_t, prop): unknown {
      if (prop === 'cn') return cn
      return token(String(prop))
    },
  })
}

/** The stub provider plus the test's direct state lever. */
interface StubPreviewProvider extends PreviewProvider {
  /** Replaces state fields and notifies, like a host-side change does. */
  setState(patch: Partial<PreviewState>): void
}

/**
 * A minimal recording live-preview provider: real `getState`/`subscribe`
 * semantics (fresh object per change, listener set) with the actions the panel
 * calls recorded as plain state moves.
 * @param seed - The first state's overrides.
 * @returns The provider.
 */
function buildPreviewProvider(seed: Partial<PreviewState> = {}): StubPreviewProvider {
  let state: PreviewState = {
    url: 'http://preview.local/',
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
      return () => listeners.delete(listener)
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
    setDevice(device) {
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

/** Lets the panel's microtasks (the server-up probe) settle and flushes Svelte. */
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
  flushSync()
}

describe('PreviewPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setClassMap(buildStubClassMap())
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200, statusText: 'OK' })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('mounts one session, mounts the iframe into it, and disconnects it on unmount', async () => {
    const provider = buildPreviewProvider()
    const onRenderState = vi.fn()
    const removeListener = vi.spyOn(window, 'removeEventListener')

    const instance = mount(PreviewPanelHost, {
      target: document.body,
      props: { preview: provider, onRenderState },
    })
    flushSync()

    // Before the server answers, the overlay is up and there is no iframe.
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('[data-mol-id="preview-overlay"]')).not.toBeNull()

    // The server-up probe resolves → the session mounts the iframe.
    await settle()
    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('http://preview.local/')

    // The render verdict reached the host: loading once the target exists.
    expect(onRenderState).toHaveBeenCalledWith('loading', 'http://preview.local/')

    // The bridge answers the iframe's OWN window (the trust gate): a ready from
    // it reveals the preview once the fade completes.
    const previewWindow = iframe?.contentWindow ?? null
    expect(previewWindow).not.toBeNull()
    window.dispatchEvent(
      new MessageEvent('message', { source: previewWindow, data: { type: 'molecule:ready' } }),
    )
    await vi.advanceTimersByTimeAsync(600)
    flushSync()
    expect(document.querySelector('[data-mol-id="preview-overlay"]')).toBeNull()
    expect(onRenderState).toHaveBeenCalledWith('rendered', 'http://preview.local/')

    // Unmount disconnects the session: its message listener is removed.
    removeListener.mockClear()
    await unmount(instance)
    expect(removeListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('remounts a fresh iframe element when the mount key changes', async () => {
    const provider = buildPreviewProvider()
    const onRenderState = vi.fn()

    mount(PreviewPanelHost, {
      target: document.body,
      props: { preview: provider, onRenderState },
    })
    flushSync()
    await settle()

    const first = document.querySelector('iframe')
    expect(first).not.toBeNull()
    expect(first?.getAttribute('src')).toBe('http://preview.local/')

    // A new load target on an already-running preview is an ATOMIC remount: a
    // fresh element with a cache-busted src, never a src change in place.
    provider.setUrl('http://preview.local/next')
    await settle()

    const second = document.querySelector('iframe')
    expect(second).not.toBeNull()
    expect(second).not.toBe(first)
    expect(first?.isConnected).toBe(false)
    const src = second?.getAttribute('src') ?? ''
    expect(src).toContain('http://preview.local/next')
    expect(src).toContain('_r=')

    // The session's iframe ref follows the new element: a ready posted from the
    // NEW iframe's own window passes the trust gate and reaches the host.
    onRenderState.mockClear()
    window.dispatchEvent(
      new MessageEvent('message', {
        source: second?.contentWindow ?? null,
        data: { type: 'molecule:ready' },
      }),
    )
    await settle()
    expect(onRenderState).toHaveBeenCalledWith('rendered', 'http://preview.local/next')
  })
})

// ---------------------------------------------------------------------------
// The sandbox / freeze-watchdog / URL-bar / back-forward contract, ported from
// `@molecule/app-ide-react`'s `PreviewPanel.test.ts` with the same test names.
//
// The panel's behaviour runs from `@molecule/app-ide-panel-logic` (the same
// `preview-panel-logic.ts` React uses) and its view is `PreviewPanel.svelte`,
// so each source assertion reads BOTH files — exactly the pair React's test
// concatenates — and asserts the Svelte form of every view-local construct
// (`logic.previewFrozen`, `onclick={logic.handleReloadFrozen}`, the
// `{@render barButton(...)}` call).
// ---------------------------------------------------------------------------

// The sandbox attribute value that must be present on the preview iframe.
const EXPECTED_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin'

/**
 * Resolves a source path relative to this test file. The jsdom environment
 * replaces the global `URL` (so Node's `fs` will not take it), hence the
 * `href` string handed to `fileURLToPath`.
 *
 * @param relative - The path relative to this test file.
 * @returns The absolute file path.
 */
function sourcePath(relative: string): string {
  return fileURLToPath(new URL(relative, import.meta.url).href)
}

/**
 * The panel's whole source: the Svelte view, plus the behaviour it runs from
 * `@molecule/app-ide-panel-logic` (`createPreviewPanelSession` /
 * `usePreviewPanelLogic`, shared with the other frameworks).
 *
 * @returns Both files' text.
 */
async function readPanelSource(): Promise<string> {
  const fs = await import('node:fs/promises')
  const files = [
    sourcePath('../components/PreviewPanel.svelte'),
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
      const fs = await import('node:fs/promises')
      const source = await fs.readFile(sourcePath('../components/PreviewPanel.svelte'), 'utf-8')
      expect(source).toContain(`sandbox="${EXPECTED_SANDBOX}"`)
    })
  })
})

/**
 * Freeze watchdog: the scaffold posts `molecule:heartbeat` every ~3s; if its main
 * thread locks up (infinite loop / runaway render) the beats stop and we surface a
 * reload banner. This package is node-env (no DOM), so — like the sandbox test
 * above — these assert the wiring against source to catch regressions, notably the
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
    const threshold = Number(m![1].replace(/_/g, ''))
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
    // The freeze banner is gated on confirmedContent (only "this app stopped
    // responding" once it was actually showing content — a never-rendered/blank
    // app is covered by the overlay). The Svelte view reads the session state
    // through `logic.` and binds the click with `onclick`.
    expect(source).toContain('logic.previewFrozen && logic.confirmedContent')
    expect(source).toContain("'ide.preview.frozen'")
    expect(source).toContain("'ide.preview.frozenReload'")
    expect(source).toContain('onclick={logic.handleReloadFrozen}')
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
 * The behavioral load-timeout path is covered in PreviewPanel.absolute-stuck.test.ts;
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
 * URL bar (PV2): the preview reports its own client-side location via a
 * `molecule:navigate` postMessage; the panel forwards it to `recordNavigation`
 * (which updates the URL bar without reloading the iframe). The bar reflects the
 * preview's CURRENT location and stays editable, committing on Enter. These
 * assert the wiring against source; the Svelte view reads the session state
 * through `logic.` and posts through the live-preview provider.
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
    // mid-reload, so the command is RE-POSTED on an interval until the bridge replies (or ~12s),
    // and the ui-result marks the id resolved to STOP the retry loop.
    expect(source).toContain('window.setInterval')
    expect(source).toContain('uiResolvedRef.current.has(cmdId)')
    expect(source).toContain('uiResolvedRef.current.add(event.data.id)')
  })

  it('binds the URL bar to the live current location, not the raw load target', async () => {
    const source = await readSource()
    expect(source).toContain('const currentLocation = state.currentUrl || state.url')
    // The input is a controlled draft synced to the current location (the Svelte
    // view binds it from the session state).
    expect(source).toContain('value={logic.urlDraft}')
    expect(source).toMatch(/if \(!urlEditing\) setUrlDraft\(currentLocation\)/)
  })

  it('commits a typed URL on Enter (a real load), not on every keystroke', async () => {
    const source = await readSource()
    expect(source).toMatch(/if \(e\.key === 'Enter'\)[\s\S]*?if \(next\) preview\.setUrl\(next\)/)
    // No per-keystroke navigation: typing only moves the draft, never the load
    // target (`oninput` writes `setUrlDraft`, `setUrl` loads).
    expect(source).toContain('oninput={(e) => logic.setUrlDraft(e.currentTarget.value)}')
    expect(source).not.toMatch(/oninput=\{[^}]*\bsetUrl\(/)
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
    // The Svelte view takes the live preview from `usePreview()` and hands the
    // three nav actions (stable function objects) to the session.
    expect(source).toContain('usePreview()')
    expect(source).toMatch(
      /recordNavigation: preview\.recordNavigation[\s\S]*?back: preview\.back[\s\S]*?forward: preview\.forward/,
    )
  })

  it('wires the Back button to handleBack and disables it via canGoBack', async () => {
    const source = await readSource()
    expect(source).toMatch(/'preview-back',\s*logic\.handleBack,\s*!\$pstate\.canGoBack,/)
  })

  it('wires the Forward button to handleForward and disables it via canGoForward', async () => {
    const source = await readSource()
    expect(source).toMatch(/'preview-forward',\s*logic\.handleForward,\s*!\$pstate\.canGoForward,/)
  })

  it('does not leave the back/forward buttons as hardcoded-disabled placeholders', async () => {
    const source = await readSource()
    // A placeholder would pass a literal `true`; both buttons take the live
    // history flags instead.
    expect(source).not.toMatch(/'preview-back',\s*logic\.handleBack,\s*true,/)
    expect(source).not.toMatch(/'preview-forward',\s*logic\.handleForward,\s*true,/)
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
