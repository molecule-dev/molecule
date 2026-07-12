/**
 * Live preview panel with iframe and device frame selection.
 *
 * Two states:
 * 1. "Loading preview" — polling until the first successful fetch
 * 2. "Loading preview" — server was up before but fetch is now failing
 *
 * The iframe is always mounted (behind the overlay) once we have a URL. The overlay REVEAL is
 * driven by TWO regimes, keyed on whether this load target has rendered before this session
 * (`hasEverRendered`):
 *  - FIRST cold boot (never rendered yet): reveal ONLY on the `molecule:ready` handshake. A fresh
 *    project's cold Vite server can take many seconds to pre-bundle deps + compile the app before
 *    React mounts; `onLoad` fires on the shell HTML long BEFORE that, so revealing on `onLoad`
 *    here would flash a white, still-compiling iframe and then let a naive timer falsely accuse it
 *    of being "blank"/"unable to load" (with an "Open in new tab" button) — the exact reason a
 *    fresh preview "wouldn't load until I opened it in a new tab and refreshed the IDE". Instead we
 *    keep an honest "Starting your app…" overlay until the scaffold's inline bridge posts
 *    `molecule:ready` the instant #root mounts (reliable — verified to fire even while the overlay
 *    occludes the cross-origin iframe; the old "rAF frozen under occlusion" deadlock was actually
 *    the overlay's `backdrop-filter` freezing the whole renderer, since removed).
 *  - RELOAD of an app that already rendered (`hasEverRendered`): reveal on `onLoad` (+ a short
 *    grace) as a flash-free fast path, with `molecule:ready` faster still.
 * A genuinely blank/broken app is surfaced by the app's OWN signals — an explicit `molecule:blank`,
 * a crash, a dead (no-heartbeat) document, or an alive-but-never-mounts backstop — never by a
 * timer that can't tell "still cold-compiling" from "rendered nothing".
 *
 * Recovery features:
 * - Never-give-up polling with exponential backoff, single-chain (epoch-guarded +
 *   AbortController) so leaked poll chains can't starve the preview's connections
 * - onLoad grace fallback: clears the overlay when the document loaded but the
 *   ready handshake never came (and no crash fired)
 * - Stuck-load detection: gated on the document NOT having loaded (so it never
 *   interrupts a progressing load), backs off, and is CAPPED — after the cap it
 *   stops thrashing and shows a themed "Preview can't load here" loop-breaker
 *   panel (Reload + Open in new tab) instead of remounting forever
 * - Last-good-frame: stores the sandbox's `molecule:snapshot` data-URL and shows
 *   it blurred behind the overlay while the app is rebuilding / blank
 * - Pre-render error forwarding: module/import errors sent to the agent for auto-fix
 * - Freeze watchdog: the scaffold heartbeats every ~3s; if its thread locks up the
 *   beats stop, so we surface a reload banner (the IDE stays responsive because the
 *   preview origin is isolated via Origin-Agent-Cluster)
 * - Blank page detection: catches pages that render but show nothing
 * - Trust boundary: inbound `molecule:*` postMessages are accepted only from the
 *   preview iframe's own window (`event.source === iframe.contentWindow`) — a window-
 *   identity check, robust to origin-string divergence (Origin-Agent-Cluster, IP host,
 *   cache-buster, redirect) and unforgeable by any other window
 *
 * @module
 */

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import { withCacheBuster } from '@molecule/app-live-preview'
import { usePreview } from '@molecule/app-react'
import { get as storageGet, set as storageSet } from '@molecule/app-storage'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { PreviewPanelProps, PreviewRenderState, PreviewUiResult } from '../types.js'
import { type DeviceOrientation, isDeviceRotatable, resolveDeviceSize } from './device-cycle.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.js'
import { Icon } from './Icon.js'

/**
 * Storage key for the persisted preview orientation. The orientation is a global,
 * cross-device preview preference (it applies to every rotatable device and
 * survives reloads), persisted via the bonded `@molecule/app-storage` provider.
 */
const ORIENTATION_STORAGE_KEY = 'molecule.ide.preview.orientation'

// --- Polling constants (exponential backoff, never gives up) ---

/** Initial poll interval when waiting for the server. */
const POLL_INITIAL_MS = 500
/** Maximum poll interval after backoff. */
const POLL_MAX_MS = 5000
/** Backoff multiplier applied after each failed poll. */
const POLL_BACKOFF_FACTOR = 2

// --- Stuck-load detection constants ---

/**
 * Base time to wait for the load to make progress after the iframe src is set
 * before attempting recovery (ms). Raised from the old 5s — a cold/slow first
 * Vite load after an idle (or a deps-cache wipe) routinely takes longer than 5s,
 * and remounting mid-load (with a cache-buster that defeats Vite's transform
 * cache) only made the next load slower. Recovery now also requires that the
 * document has NOT loaded (see the stuck-detection effect), so a progressing-but-
 * slow load is never interrupted.
 */
const STUCK_DETECT_MS = 8_000
/** Exponential back-off applied to STUCK_DETECT_MS between recovery attempts. */
const STUCK_BACKOFF_FACTOR = 1.6
/**
 * Max recovery cycles (reload + remount) before giving up. After this cap the
 * panel STOPS retrying and shows a themed loop-breaker (Reload + Open in new tab)
 * instead of remounting indefinitely — the old `longRetry()` looped forever.
 */
const MAX_RECOVERY_CYCLES = 3

/**
 * Absolute upper bound (ms) on how long the preview may sit on the loading overlay
 * without ever CONFIRMING a render (`molecule:ready`), while not mid-build. A pure
 * BACKSTOP: the targeted paths (onLoad grace, stuck-detection, blank-post-build) each
 * resolve a specific failure faster, but a *combination* can still leave the overlay up
 * forever — e.g. the document fired `onLoad` (so stuck-detection stands down) yet a
 * crash/HMR-error storm keeps suppressing the onLoad grace, so `iframeReady` never flips
 * and blank-post-build (which requires it) never fires. Past this ceiling the panel gives
 * up to the actionable loop-breaker (Reload / open in tab) so the preview can NEVER be
 * stuck on a spinner indefinitely. Self-correcting: a real render that lands later clears
 * the loop-breaker (see the confirm effect), so an over-eager trip is harmless.
 */
const ABSOLUTE_STUCK_MS = 30_000

/**
 * How long a document may stay LOADED (onLoad fired) without confirming a render before
 * we attempt a single auto-reload (ms). Targets the stale-document case: a Vite "server
 * restarted" (or any dev-server bounce) drops every client's HMR connection mid-load, so
 * an iframe that loaded just before the restart is left disconnected and never renders —
 * recovered today only by a MANUAL reload. The post-ready health check never runs here
 * (it requires a render first), and stuck-detection stands down once onLoad fired.
 */
const LOAD_RECOVER_AFTER_MS = 12_000
/** Max auto-reloads of a loaded-but-unrendered document per load (then defer to the ceiling). */
const MAX_LOAD_RECOVERS = 2

// --- onLoad grace fallback ---

/**
 * After the iframe document fires `onLoad`, how long to wait for `molecule:ready`
 * before treating the load as good anyway (ms). The handshake is the fast path;
 * this is the safety net for a working app whose ready was dropped/suppressed.
 */
const ONLOAD_GRACE_MS = 2_500

/**
 * When a new document fires `onLoad`, how recently a `molecule:ready` must have arrived for the
 * load to count as already-confirmed-rendered (ms). A working full-reload mounts React (→ ready)
 * just before the load event, so its ready lands inside this window and confirmedContent is kept
 * (no overlay flash). A reload that produced a blank app sends no ready, so the last ready is
 * older than this → confirmedContent drops and the overlay re-covers the white iframe.
 */
const READY_FRESH_MS = 1_500

// --- Last-good-frame snapshot (molecule:snapshot trust boundary) ---

/**
 * Max accepted size of an inbound `molecule:snapshot` data-URL (chars). The
 * sandbox sender downscales + JPEG-compresses, so a legitimate frame is well
 * under this; the cap defends the postMessage trust boundary against an oversized
 * payload bloating React state.
 */
const MAX_SNAPSHOT_DATA_URL_LENGTH = 4_000_000

// --- Freeze watchdog constants ---

/**
 * Heartbeat gap beyond which the preview's main thread is treated as frozen (ms).
 * The scaffold posts `molecule:heartbeat` every ~3s; this tolerates two missed
 * beats plus jitter before declaring a freeze, so brief synchronous work (a heavy
 * one-off render) doesn't trip it.
 */
const FREEZE_THRESHOLD_MS = 8_000
/** How often the watchdog compares `now` against the last heartbeat (ms). */
const FREEZE_CHECK_INTERVAL_MS = 2_000

/**
 * Window within which an identical runtime-error signature (message+source+line+column)
 * is treated as a duplicate and dropped before forwarding (ms). Both the centralized
 * runtime bridge AND a template's baked sender can report the SAME uncaught error, and
 * a render-looping app re-throws it continuously — de-duping by signature keeps one
 * fault from flooding the agent with the same message over and over.
 */
const ERROR_DEDUP_WINDOW_MS = 4_000

/**
 * How long an ALREADY-rendered app that RELOADED to blank may stay loaded-but-unconfirmed
 * (document loaded, no fresh `molecule:ready`) before the overlay's copy switches to the
 * actionable "preview is blank — reload" notice (ms). This short window is ONLY used once the
 * app has rendered at least once this session (`hasEverRendered`) — i.e. it WAS working and an
 * edit reloaded it to blank — so a real regression surfaces quickly. It is NEVER used to accuse
 * a first-cold-boot app that simply hasn't finished starting (see COLD_BOOT_PATIENCE_MS).
 */
const BLANK_CONFIRM_MS = 2_500

/**
 * For a NEVER-yet-rendered document, how long with NO liveness (no `molecule:heartbeat` for
 * FREEZE_THRESHOLD_MS) before surfacing the actionable notice (ms). The scaffold's preview
 * bridge is an INLINE script in `index.html`, so it runs (and starts heartbeating) the moment
 * the HTML parses — even before the app's modules compile. So a loaded document that is NOT
 * heartbeating at all means its inline bridge never ran: a broken/error page (or JS disabled),
 * i.e. a genuine failure, not a cold boot in progress. The settle lets the first ~3s heartbeat
 * arrive before we judge liveness.
 */
const BLANK_DEAD_MS = 4_000

/**
 * Absolute patience (ms) for a first-cold-boot app that IS alive (heartbeating) but has not yet
 * confirmed a render (`molecule:ready`). A cold Vite dev server on a fresh project legitimately
 * takes many seconds to pre-bundle deps + compile the app before React mounts; during that whole
 * window the honest "Starting your app…" overlay stays up and we must NOT accuse it of being
 * blank or "unable to load" — that false accusation (with its "Open in new tab" button) was the
 * whole "fresh project preview won't load until I open it in a new tab and refresh the IDE" bug.
 * Only after this generous ceiling — alive the entire time yet still never mounted — do we treat
 * it as genuinely stuck and surface the reload/open-in-tab notice. The scaffold's `molecule:ready`
 * (reliable, fired the instant #root mounts) clears everything long before this on any real boot.
 */
const COLD_BOOT_PATIENCE_MS = 60_000

/**
 * Duration of the overlay fade-out (ms) — kept in sync with the overlay's `transition:
 * opacity` below. `fadingOut` is cleared on `onTransitionEnd`, but a timer matched to this
 * is the robust fallback for when that event never fires (the overlay unmounts mid-fade,
 * `prefers-reduced-motion` disables the transition, or a non-rendering env): a stuck
 * `fadingOut` would pin the overlay at opacity 0 and block the post-build blank re-cover.
 */
const OVERLAY_FADE_MS = 500

// --- Rate-limiting constants ---

/** Minimum interval between acting on ready/error messages (ms). */
const MSG_RATE_LIMIT_MS = 300

/** Max ready↔error transitions before suppressing (per window). */
const MAX_TRANSITIONS = 10
/** Window duration for transition counting (ms). */
const TRANSITION_WINDOW_MS = 5000

/**
 * Check whether the server at `url` is accepting connections.
 * Uses `no-cors` so CORS errors aren't mistaken for network failures.
 * Aborts after 500ms to avoid holding browser connections — hanging polls
 * exhaust the per-origin connection limit and starve the iframe of
 * connections for script/asset requests. An optional `externalSignal` lets the
 * caller abort the in-flight request on cleanup (e.g. when a poll chain is
 * superseded), so a unmounting/restarting panel never leaves a fetch dangling.
 * @param url - The URL to check.
 * @param externalSignal - Optional signal; aborting it aborts this probe.
 * @returns Whether the server responded within the timeout.
 */
async function isServerUp(url: string, externalSignal?: AbortSignal): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 500)
  const onExternalAbort = (): void => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort)
  }
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
    return true
  } catch (_error) {
    // Fetch failure (or an abort) means the server is not usable right now —
    // expected during polling / on cancellation. `false` is the correct result.
    return false
  } finally {
    clearTimeout(timeout)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }
}

/**
 * Live preview panel with iframe, device frame selector, and URL bar.
 * @param root0 - The component props.
 * @param root0.loadingIndicator - Custom loading indicator for initial start.
 * @param root0.restartingIndicator - Custom loading indicator for mid-session restarts.
 * @param root0.onPreviewError - Called when the preview iframe reports runtime JS errors.
 * @param root0.onPreviewStuck - Called when the preview fails to load after multiple recovery attempts.
 * @param root0.className - Optional CSS class name for the container.
 * @param root0.fileChangeTick - Incremented when the user edits a file, used to cancel queued autofix messages.
 * @returns The rendered preview panel element.
 */
export function PreviewPanel({
  loadingIndicator,
  restartingIndicator,
  className,
  onPreviewError,
  onPreviewStuck,
  onRenderState,
  uiCommand,
  onUiResult,
  fileChangeTick,
  buildingHint,
  isBuilding,
}: PreviewPanelProps): JSX.Element {
  const cm = getClassMap()
  const { state, setUrl, refresh, setDevice, openExternal, recordNavigation, back, forward } =
    usePreview()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // AI-driven live preview control: when the host sets a NEW `uiCommand` (keyed on `id`), relay
  // it to the iframe's interaction bridge (`molecule:ui-command`); the bridge replies
  // `molecule:ui-result`, handled in the message listener below → `onUiResult`. Lets Synthase
  // drive + verify the app end-to-end in the preview the user is watching (no headless browser).
  const lastUiCommandIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!uiCommand || uiCommand.id === lastUiCommandIdRef.current) return
    lastUiCommandIdRef.current = uiCommand.id
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'molecule:ui-command',
        id: uiCommand.id,
        action: uiCommand.action,
        molId: uiCommand.molId,
        selector: uiCommand.selector,
        value: uiCommand.value,
      },
      '*',
    )
  }, [uiCommand])

  // Preview-only iframe orientation (portrait ⇄ landscape) for fixed-frame
  // devices. A purely visual preview concern, so it lives here rather than in the
  // live-preview core state — but it is GLOBAL (one orientation for every
  // rotatable device, never reset on a device switch) and PERSISTED across reloads
  // via the bonded storage provider, so a chosen landscape carries everywhere.
  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait')
  // Restore the persisted orientation once on mount. Best-effort: if no storage
  // provider is bonded (tests / an app that didn't wire one) it just won't persist.
  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const stored = await storageGet<DeviceOrientation>(ORIENTATION_STORAGE_KEY)
        if (mounted && (stored === 'portrait' || stored === 'landscape')) {
          setOrientation(stored)
        }
      } catch (_error) {
        // No storage provider bonded / read failed — orientation simply won't persist.
      }
    })()
    return () => {
      mounted = false
    }
  }, [])
  // Device switching does NOT reset the orientation — it's a global preference, so
  // a landscape choice applies to whichever rotatable device is selected next.
  const handleDeviceChange = useCallback(
    (device: typeof state.device) => {
      setDevice(device)
    },
    [setDevice],
  )
  const handleRotate = useCallback(() => {
    const next: DeviceOrientation = orientation === 'portrait' ? 'landscape' : 'portrait'
    setOrientation(next)
    void storageSet(ORIENTATION_STORAGE_KEY, next).catch((_error) => {
      // Best-effort persist — no storage provider bonded; the in-memory value still applies.
    })
  }, [orientation])
  const canRotate = isDeviceRotatable(state.device)

  // The preview's actual current location (updated by the scaffold's
  // `molecule:navigate` message), falling back to the load target before the
  // preview has reported a location.
  const currentLocation = state.currentUrl || state.url

  // Whether the current location is served over a secure (https) origin. Drives
  // the address bar's leading site-info glyph — a lock when secure, a globe
  // otherwise — exactly like a real browser omnibox.
  const isSecureLocation = /^https:/i.test(currentLocation)

  // Has the server ever responded successfully?
  const [everLoaded, setEverLoaded] = useState(false)
  // Mirror everLoaded to a ref so the message handler (which is NOT re-subscribed
  // when everLoaded changes) reads the live value, not a stale closure.
  const everLoadedRef = useRef(everLoaded)
  everLoadedRef.current = everLoaded
  // Is the iframe content ready to show?
  const [iframeReady, setIframeReady] = useState(false)
  // Fade-out transition in progress
  const [fadingOut, setFadingOut] = useState(false)

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Generation token: bumped on every clearPoll so a superseded poll() chain bails
  // on its next guard instead of re-arming — guarantees only ONE live poll chain.
  const pollEpochRef = useRef(0)
  // AbortController for the in-flight server-up probe, so cleanup can cancel it.
  const pollAbortRef = useRef<AbortController | null>(null)
  const urlRef = useRef(state.url)
  urlRef.current = state.url
  // The preview's live location (client-side route included), read by the stuck/freeze
  // callbacks so a failure report names the route the user is actually on, not the
  // initial load target.
  const currentLocationRef = useRef(currentLocation)
  currentLocationRef.current = currentLocation
  // De-dup ledger for forwarded runtime errors: signature → last-forwarded timestamp.
  // Persists across message-handler re-subscriptions so a duplicate from the baked +
  // centralized senders (or a re-throwing render loop) is dropped within the window.
  const recentErrorSigRef = useRef<Map<string, number>>(new Map())
  // Tracks the iframe src to force reload when server recovers
  const [iframeSrc, setIframeSrc] = useState('')

  // --- Stuck-load detection state ---
  const [stuckRetryCount, setStuckRetryCount] = useState(0)
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [iframeMountKey, setIframeMountKey] = useState(0)
  // Auto-reloads attempted for a loaded-but-unrendered document THIS load (stale-document
  // recovery, e.g. after a Vite server restart) — bounded by MAX_LOAD_RECOVERS, reset per load.
  const loadRecoverCountRef = useRef(0)
  // True once the cap of recovery cycles is hit — stops the loop and shows the
  // themed "Preview can't load here" panel (loop breaker) instead of thrashing.
  const [previewGaveUp, setPreviewGaveUp] = useState(false)
  // Mirror iframeReady to a ref so timer callbacks read current value
  const iframeReadyRef = useRef(iframeReady)
  iframeReadyRef.current = iframeReady
  // Whether the CURRENT iframe document has fired `onLoad`. When it has, the load
  // reached the document and only the handshake is missing — the onLoad grace
  // fallback (not a remount) clears the overlay, so the stuck-detector stands down.
  const iframeLoadedRef = useRef(false)
  // Pending onLoad grace timer (cleared on a new load / unmount).
  const onLoadGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Timestamp of the last crash message — the onLoad fallback refuses to mask a
  // load that just crashed (a crash within the grace window suppresses it).
  const lastCrashAtRef = useRef(0)

  // --- Last-good-frame (molecule:snapshot) ---
  // The most recent rasterized frame the sandbox app posted while it was rendering
  // fine. Shown BLURRED behind the overlay while the app is rebuilding or blank,
  // so the user sees the last working UI instead of a white iframe.
  const [lastGoodFrame, setLastGoodFrame] = useState<string | null>(null)

  // --- Content confirmation ---
  // `iframeReady` only means the iframe was REVEALED (handshake OR the onLoad grace
  // fallback) — it is true even for a blank/white app the grace path optimistically
  // unmasked. `confirmedContent` is the stronger signal: the app actually reported it
  // rendered visible content (molecule:ready, which a healthy app re-sends ~every 4s).
  // The overlay keeps a status up until content is confirmed, so a half-built / blank /
  // white iframe never shows as a bare white screen. Reset on a crash/blank/new load.
  const [confirmedContent, setConfirmedContent] = useState(false)
  const confirmedContentRef = useRef(false)
  confirmedContentRef.current = confirmedContent
  // Timestamp of the last molecule:ready. When a NEW document loads (initial load, or a Vite
  // full-reload that an edit triggers), we keep confirmedContent only if a ready landed in the
  // moment before — otherwise the (re)loaded document has NOT shown content for THIS load and
  // confirmedContent is dropped so the overlay re-covers a blank reload. This is what catches
  // "the app rendered, then a reload left it blank."
  const lastReadyAtRef = useRef(0)
  // Settle-gated post-build blank: the build is not running, the document loaded, yet no content
  // was ever confirmed — the app rendered nothing. Switches the overlay's copy to an ACTIONABLE
  // notice (reload / open in tab) instead of the generic spinner.
  const [blankPostBuild, setBlankPostBuild] = useState(false)
  // Mirror blankPostBuild to a ref so the absolute-ceiling timer can tell "still on a
  // bare spinner" (fire) from "already showing the actionable blank notice" (a way out
  // exists — stand down).
  const blankPostBuildRef = useRef(blankPostBuild)
  blankPostBuildRef.current = blankPostBuild
  // Mirror isBuilding into a ref so timers/handlers read the current value.
  const isBuildingRef = useRef(isBuilding)
  isBuildingRef.current = isBuilding

  // Has the app at the CURRENT load target confirmed a render (`molecule:ready`) at least once
  // this session? Set on the first ready, reset only on a genuinely NEW load target (url /
  // loadNonce change), NOT on a plain Vite HMR full-reload of the same src. It is the switch
  // between two regimes: a NEVER-yet-rendered app is treated as a patient cold boot (reveal only
  // on ready, honest "Starting…" status, no false "blank"/"can't load"); an app that HAS rendered
  // and then reloaded blank is a real regression (short blank-confirm window, fast onLoad-grace
  // reveal). Conflating the two is what surfaced a false "blank" over a still-compiling fresh app.
  const hasEverRenderedRef = useRef(false)
  // Timestamp of the current document's last `onLoad` (0 = not loaded this target). Drives the
  // elapsed-since-load math in the cold-boot evaluator without racing a stale closure.
  const lastLoadAtRef = useRef(0)
  // Bumped on every iframe `onLoad` so the cold-boot evaluator effect re-runs when a fresh
  // document loads (the reveal no longer flips `iframeReady` on the grace during a cold boot, so
  // that flag can't be the trigger anymore).
  const [docLoadedTick, setDocLoadedTick] = useState(0)

  // --- Heartbeat tracking ---
  const lastHeartbeatRef = useRef<number>(0)
  // True when heartbeats have stopped for FREEZE_THRESHOLD_MS while the app is up.
  const [previewFrozen, setPreviewFrozen] = useState(false)
  // Guards the freeze report so a single freeze episode notifies the host ONCE, not on
  // every watchdog tick; reset when heartbeats resume so a later freeze re-reports.
  const frozenReportedRef = useRef(false)

  // --- Cycle detection: catch rapid ready↔error oscillations ---
  const transitionTimesRef = useRef<number[]>([])
  const suppressedRef = useRef(false)

  // --- URL bar (browser-style: reflects the preview's CURRENT location) ---
  // A local draft so the user can type freely; it's committed on Enter (a real
  // load) and resynced to the live location whenever the preview navigates and
  // the user isn't mid-edit. Editing never reloads per-keystroke.
  const [urlDraft, setUrlDraft] = useState(currentLocation)
  const [urlEditing, setUrlEditing] = useState(false)
  useEffect(() => {
    if (!urlEditing) setUrlDraft(currentLocation)
  }, [currentLocation, urlEditing])

  // --- Clear poll timer ---
  // Also invalidates any in-flight poll chain: bumping the epoch makes a poll()
  // that is mid-await bail on its next guard instead of re-arming a new timer, and
  // aborting the controller releases the in-flight HEAD probe so it stops holding a
  // per-origin connection (the leak the file's own comment warns about).
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
    pollEpochRef.current += 1
    if (pollAbortRef.current) {
      pollAbortRef.current.abort()
      pollAbortRef.current = null
    }
  }, [])

  // --- Clear stuck timer ---
  const clearStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current)
      stuckTimerRef.current = null
    }
  }, [])

  // --- Poll until server is up, then mount the iframe ---
  // Uses exponential backoff: POLL_INITIAL_MS → POLL_MAX_MS. Never gives up.
  const startPolling = useCallback(
    (url: string): void => {
      // clearPoll() bumps the epoch + aborts the prior chain; capture the fresh
      // epoch + a new AbortController so THIS chain is the only live one. Any older
      // poll() awaiting a fetch now sees a stale epoch and bails.
      clearPoll()
      const epoch = pollEpochRef.current
      const abort = new AbortController()
      pollAbortRef.current = abort
      setIframeReady(false)
      setFadingOut(false)
      setPreviewGaveUp(false)
      // A (re)load hasn't confirmed content yet — the overlay governs until it does.
      setConfirmedContent(false)
      setBlankPostBuild(false)

      let interval = POLL_INITIAL_MS
      const poll = async (): Promise<void> => {
        if (pollEpochRef.current !== epoch || urlRef.current !== url) return
        const up = await isServerUp(url, abort.signal)
        if (pollEpochRef.current !== epoch || urlRef.current !== url) return

        if (up) {
          setEverLoaded(true)
          // Atomic remount (fresh <iframe> element + src in one commit), like the
          // proven manual-reload/navigation paths: if `setUrl` was called more than
          // once for this load target before the server came up (e.g. a sandbox-boot
          // host reporting its preview URL from more than one code path), an earlier
          // poll chain may already have raced partway through mounting an iframe for
          // this exact url before being superseded — bumping the mount key here
          // guarantees this success always creates a genuinely fresh OOPIF rather
          // than reusing/navigating one a superseded chain may have touched.
          setIframeMountKey((k) => k + 1)
          setIframeSrc(url)
          pollRef.current = null
        } else {
          pollRef.current = setTimeout(poll, interval)
          interval = Math.min(interval * POLL_BACKOFF_FACTOR, POLL_MAX_MS)
        }
      }

      void poll()
    },
    [clearPoll],
  )

  // --- When URL changes, reset and start polling ---
  useEffect(() => {
    if (!state.url) {
      clearPoll()
      clearStuckTimer()
      setEverLoaded(false)
      setIframeReady(false)
      setFadingOut(false)
      setIframeSrc('')
      setStuckRetryCount(0)
      setPreviewGaveUp(false)
      setLastGoodFrame(null)
      setConfirmedContent(false)
      setBlankPostBuild(false)
      hasEverRenderedRef.current = false
      lastLoadAtRef.current = 0
      return
    }

    setStuckRetryCount(0)
    setPreviewGaveUp(false)
    loadRecoverCountRef.current = 0 // fresh stale-document recovery budget for this load
    // A brand-new load target starts a fresh cold-boot regime: it has not rendered yet, so treat
    // it patiently (reveal on ready, no premature blank/give-up) until ITS first molecule:ready.
    hasEverRenderedRef.current = false
    lastLoadAtRef.current = 0
    // A new load target hasn't confirmed content yet.
    setConfirmedContent(false)
    setBlankPostBuild(false)
    // A brand-new load target is a different app — drop the previous app's frame
    // so a blank in the NEW app never flashes the OLD app's last-good frame.
    setLastGoodFrame(null)

    if (everLoadedRef.current) {
      // NAVIGATION / refresh of an already-running preview (a chat-link route, the URL
      // bar, Back/Forward, or a loadNonce refresh). The dev server is already up, so do an
      // ATOMIC remount to the new target — bump the mount key (fresh <iframe> element) and
      // set the src in ONE commit — EXACTLY like the manual-reload path (handleManualRetry),
      // which is known to work. The OLD path blanked the live iframe (setIframeSrc('')) then
      // re-added it after an async probe; that two-phase teardown→rebuild wedged the live
      // sandboxed cross-origin (OOPIF) frame so the route "navigated but never loaded".
      //
      // CRUCIALLY use the cache-buster, like refresh does: navigating a cross-origin iframe
      // to a URL it already treats as its CURRENT location (the app's own client-side router
      // may have moved the iframe's location to this route already, or a bfcache entry
      // exists) is a same-document no-op that never reloads — which is why a chat-link nav
      // hung while the refresh button (cache-busted) worked. The `_r=<ts>` makes every nav a
      // novel URL that forces a real document load; recordNavigation strips `_r` so the URL
      // bar stays clean.
      clearPoll()
      setIframeMountKey((k) => k + 1)
      setIframeSrc(withCacheBuster(state.url))
    } else {
      // COLD / first load: the dev server may still be starting, so keep the empty state
      // and poll until it answers, then mount.
      setEverLoaded(false)
      setIframeSrc('')
      startPolling(state.url)
    }

    return () => {
      clearPoll()
      clearStuckTimer()
    }
    // state.loadNonce forces a reload even when the URL string is unchanged
    // (refresh, or back/forward to the same load target). recordNavigation does
    // NOT bump loadNonce, so an in-app navigation updates the URL bar without
    // reloading here.
  }, [state.url, state.loadNonce, startPolling, clearPoll, clearStuckTimer])

  // --- A new document is loading → reset per-load onLoad tracking ---
  // Whenever the iframe gets a fresh src or is remounted, the onLoad flag and any
  // pending grace timer belong to the PREVIOUS load — clear them so the new load's
  // own onLoad drives the fallback.
  useEffect(() => {
    iframeLoadedRef.current = false
    if (onLoadGraceRef.current) {
      clearTimeout(onLoadGraceRef.current)
      onLoadGraceRef.current = null
    }
    return () => {
      if (onLoadGraceRef.current) {
        clearTimeout(onLoadGraceRef.current)
        onLoadGraceRef.current = null
      }
    }
  }, [iframeSrc, iframeMountKey])

  // --- When the preview is ready to SHOW, trigger fade-out ---
  // Reveal is driven by `iframeReady`, set by the `molecule:ready` handshake (always) OR the
  // `onLoad` grace — but the grace flips it ONLY for a RELOAD of an app that already rendered
  // (`hasEverRendered`), NOT on a first cold boot (see handleIframeLoad). So:
  //   • first cold boot → reveal only on `molecule:ready` (the honest "Starting…" overlay stays
  //     up over the still-compiling app; no white flash, no false "blank"). The bridge reliably
  //     posts ready the instant #root mounts — verified to fire even under occlusion, so this
  //     does NOT deadlock (the old "overlay covers iframe → rAF frozen → ready never posts" stall
  //     was actually the overlay's `backdrop-filter` freezing the whole renderer, since removed).
  //   • reload of an already-rendered app → reveal on the onLoad grace (fast, flash-free), with
  //     ready faster still.
  // A genuinely blank/crashed app is RE-COVERED by the explicit `molecule:blank`/crash handlers
  // (which lower `iframeReady`). `confirmedContent` stays the diagnostic render-verdict signal.
  useEffect(() => {
    if (iframeReady) {
      setFadingOut(true)
      // Content is showing again — tear down the loop-breaker panel so a later good render
      // always clears it.
      setPreviewGaveUp(false)
      // Clear fadingOut when the fade finishes. The overlay's onTransitionEnd is the primary
      // trigger, but it never fires if the overlay unmounts mid-fade, the transition is disabled
      // (prefers-reduced-motion), or in a non-rendering env — so a timer matched to the fade is
      // the robust fallback. A stuck fadingOut pins the overlay at opacity 0 AND blocks the
      // post-build blank re-cover (which is gated on !fadingOut).
      const t = setTimeout(() => setFadingOut(false), OVERLAY_FADE_MS + 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [iframeReady])

  // --- Stuck-load detection: recover ONLY when the load is genuinely stuck ---
  // "Stuck" now means: we have a src, the iframe hasn't reported ready, AND we've
  // given up (panel shown) is not the case. Critically, recovery is gated on the
  // document NOT having fired `onLoad` — if the document loaded, the handshake (not
  // the load) is what's missing and the onLoad grace fallback handles it, so we do
  // NOT remount (remounting would interrupt a progressing load and bust Vite's
  // cache). Delays back off, and after MAX_RECOVERY_CYCLES we STOP and show the
  // themed loop-breaker panel instead of remounting forever.
  useEffect(() => {
    if (!iframeSrc || iframeReady || previewGaveUp) {
      clearStuckTimer()
      return
    }

    let cycleCount = 0

    const scheduleNext = (): void => {
      const delay = STUCK_DETECT_MS * Math.pow(STUCK_BACKOFF_FACTOR, cycleCount)
      stuckTimerRef.current = setTimeout(() => {
        stuckTimerRef.current = null
        // Read refs, not stale closures.
        if (iframeReadyRef.current) return
        // The document loaded but ready never came → defer to the onLoad grace
        // fallback; do not interrupt a progressing load with a remount.
        if (iframeLoadedRef.current) return

        cycleCount += 1
        setStuckRetryCount(cycleCount)

        if (cycleCount <= MAX_RECOVERY_CYCLES) {
          if (cycleCount % 2 === 1) {
            // Odd cycles: force-reload iframe with cache buster
            setIframeSrc(withCacheBuster(urlRef.current))
          } else {
            // Even cycles: full iframe remount (unmount + remount)
            setIframeMountKey((k) => k + 1)
          }
          scheduleNext()
        } else {
          // Cap reached — HARD STOP. Never loop forever (the old longRetry()
          // remounted every 10s indefinitely, compounding the thrash). Notify the
          // host once, then surface the loop-breaker panel (Reload + open in tab).
          onPreviewStuck?.({ reason: 'load-failed', url: currentLocationRef.current })
          setPreviewGaveUp(true)
        }
      }, delay)
    }

    scheduleNext()

    return () => clearStuckTimer()
  }, [iframeSrc, iframeReady, previewGaveUp, onPreviewStuck, clearStuckTimer])

  // --- Absolute readiness ceiling (backstop: never stuck on the overlay forever) ---
  // Independent of every intermediate flag (onLoad / iframeReady / stuck cycles): anchored
  // to the load, it fires ONCE after ABSOLUTE_STUCK_MS and — if the app still hasn't
  // confirmed a render and a build isn't running — surfaces the actionable loop-breaker
  // panel. This is the guarantee that no combination of failed sub-paths can leave the
  // preview spinning forever. Read live refs (not stale closures); a `molecule:ready` that
  // lands later clears `previewGaveUp` via the confirm effect, so an early trip is harmless.
  useEffect(() => {
    if (!state.url) return
    const timer = setTimeout(() => {
      // Fire ONLY when still on a bare spinner. iframeReady is the key addition: the onLoad
      // grace already revealed a loaded document, so the give-up panel must never cover it —
      // the panel is reserved for a preview that genuinely never loaded (onLoad never fired).
      // A confirmed render, an active build, or the actionable blank notice also mean not-stuck.
      if (
        confirmedContentRef.current ||
        iframeReadyRef.current ||
        isBuildingRef.current ||
        blankPostBuildRef.current ||
        // The app is ALIVE (heartbeating) — a cold boot in progress, not a stuck load. Never show
        // "Preview can't load here" over an app that's still starting; the cold-boot evaluator
        // surfaces an honest notice only if it stays alive-but-unmounted past COLD_BOOT_PATIENCE_MS.
        Date.now() - lastHeartbeatRef.current < FREEZE_THRESHOLD_MS
      )
        return
      onPreviewStuck?.({ reason: 'load-timeout', url: currentLocationRef.current })
      setPreviewGaveUp(true)
    }, ABSOLUTE_STUCK_MS)
    return () => clearTimeout(timer)
    // Re-armed per load (url change or refresh/back-forward via loadNonce); a successful
    // render before the ceiling is honored by the live-ref check in the callback.
  }, [state.url, state.loadNonce, onPreviewStuck])

  // --- Stale-document auto-recovery (loaded but never rendered → reload once) ---
  // The post-ready health check (below) only recovers a server drop AFTER a render; a Vite
  // "server restarted" mid-load drops the HMR connection and leaves the just-loaded iframe
  // disconnected, so it never renders and nothing reloads it (today only a MANUAL reload
  // recovers — the "loads in a new tab, then works on reload" symptom). Here: once the
  // document has fired onLoad (so it's a stale/blank LOADED doc, NOT a still-optimizing
  // pre-onLoad load we'd interrupt) and still hasn't confirmed a render, do a SINGLE
  // server-up check (not continuous polling — that competes for the load's connections) and,
  // if the server is up, reload ONCE. Bounded by MAX_LOAD_RECOVERS; defers to the ceiling.
  useEffect(() => {
    if (!iframeSrc || iframeReady || confirmedContent || previewGaveUp) return
    if (loadRecoverCountRef.current >= MAX_LOAD_RECOVERS) return
    const timer = setTimeout(() => {
      void (async () => {
        // Re-check live state — a render/build/give-up since scheduling cancels recovery.
        if (iframeReadyRef.current || confirmedContentRef.current || isBuildingRef.current) return
        // Only act on a LOADED document; a still-loading one is progressing (slow optimize).
        if (!iframeLoadedRef.current) return
        // A heartbeating document is ALIVE and still coming up on a cold boot — reloading it only
        // restarts the load and thrashes Vite's cold optimize (making the fresh-project first load
        // WORSE). Only recover a genuinely STALE doc — no heartbeat for FREEZE_THRESHOLD_MS, i.e.
        // its bridge is dead (a Vite "server restarted" dropped it mid-load) — the exact case this
        // recovery exists for.
        if (Date.now() - lastHeartbeatRef.current < FREEZE_THRESHOLD_MS) return
        const up = await isServerUp(urlRef.current)
        if (!up || iframeReadyRef.current || confirmedContentRef.current) return
        loadRecoverCountRef.current += 1
        setIframeSrc(withCacheBuster(urlRef.current))
      })()
    }, LOAD_RECOVER_AFTER_MS)
    return () => clearTimeout(timer)
  }, [iframeSrc, iframeReady, confirmedContent, previewGaveUp, iframeMountKey])

  // --- Listen for postMessage from scaffold template ---
  // molecule:ready       = #root got children (app rendered)  → hide overlay
  // molecule:error       = pre-render error OR crash           → forward/show overlay
  // molecule:runtime-error = JS runtime error in the iframe   → forward to chat
  // molecule:heartbeat   = scaffold alive signal
  // molecule:blank       = page rendered but appears empty
  // molecule:navigate    = preview's client-side location changed → update URL bar
  useEffect(() => {
    // Debounce runtime errors — HMR triggers rapid error/recovery cycles
    let errorBatch: Array<{ message: string; source?: string; line?: number; column?: number }> = []
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const MAX_ERRORS_PER_BATCH = 5

    // Rate-limit ready/error to prevent rapid state oscillation
    let lastMsgTime = 0
    let lastMsgType = ''
    let pendingMsg: ReturnType<typeof setTimeout> | null = null

    const flushErrors = (): void => {
      if (errorBatch.length > 0 && onPreviewError) {
        onPreviewError(errorBatch)
        errorBatch = []
      }
      debounceTimer = null
    }

    const queueError = (err: {
      message: string
      source?: string
      line?: number
      column?: number
    }): void => {
      // Drop a signature already forwarded within the window — the baked sender and the
      // centralized runtime bridge can each report the SAME uncaught error, and a
      // render-looping app re-throws it endlessly; either way the agent needs it once.
      const signature = `${err.message}|${err.source ?? ''}|${err.line ?? ''}|${err.column ?? ''}`
      const now = Date.now()
      const ledger = recentErrorSigRef.current
      const lastSeen = ledger.get(signature)
      if (lastSeen !== undefined && now - lastSeen < ERROR_DEDUP_WINDOW_MS) return
      ledger.set(signature, now)
      // Bound the ledger: evict entries older than the window so it can't grow unbounded
      // over a long session (a steady stream of distinct errors would otherwise leak).
      for (const [sig, ts] of ledger) {
        if (now - ts >= ERROR_DEDUP_WINDOW_MS) ledger.delete(sig)
      }
      if (errorBatch.length < MAX_ERRORS_PER_BATCH) {
        errorBatch.push(err)
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(flushErrors, 2000)
    }

    const handler = (event: MessageEvent): void => {
      // Trust boundary: accept molecule:* messages ONLY from the preview iframe's OWN window.
      // We compare the SOURCE WINDOW IDENTITY (event.source === the iframe's contentWindow), NOT
      // a fragile origin STRING match. event.origin can legitimately fail to byte-equal
      // new URL(state.url).origin — Origin-Agent-Cluster isolation, a host:port vs 127.0.0.1 vs
      // IP-literal preview URL, the load's cache-buster, or a redirect-on-load all diverge the
      // strings — and an origin-only gate then silently DROPS the real handshake (the
      // molecule:ready that lifts the overlay) and every nav/error report. Window identity is
      // both more robust AND strictly more secure: no other window (a malicious sub-iframe the
      // preview embeds, another tab/opener) can forge the source reference, and it needs no
      // cross-origin read. The iframe is always mounted before it can post, so contentWindow is
      // set by the time any message arrives.
      const previewWindow = iframeRef.current?.contentWindow
      if (!previewWindow || event.source !== previewWindow) return

      if (event.data?.type === 'molecule:ready') {
        const now = Date.now()

        // Track transitions for cycle detection
        const times = transitionTimesRef.current
        times.push(now)
        // Trim old entries
        while (times.length > 0 && now - times[0] > TRANSITION_WINDOW_MS) times.shift()
        if (times.length >= MAX_TRANSITIONS && !suppressedRef.current) {
          suppressedRef.current = true
          console.warn(
            '[PreviewPanel] Rapid ready/error cycle detected (%d transitions in %dms) — suppressing further toggles. This indicates a render loop in the preview iframe.',
            times.length,
            TRANSITION_WINDOW_MS,
          )
          // Auto-recover after the storm passes
          setTimeout(() => {
            suppressedRef.current = false
            transitionTimesRef.current = []
          }, TRANSITION_WINDOW_MS)
          return
        }
        if (suppressedRef.current) return

        // Rate-limit: ignore duplicate ready within MSG_RATE_LIMIT_MS
        if (lastMsgType === 'molecule:ready' && now - lastMsgTime < MSG_RATE_LIMIT_MS) return
        lastMsgTime = now
        lastMsgType = 'molecule:ready'
        if (pendingMsg) clearTimeout(pendingMsg)

        clearPoll()
        setEverLoaded(true)
        setIframeReady(true)
        setStuckRetryCount(0)
        // The app CONFIRMED it rendered visible content — the strong signal that clears the
        // status overlay (vs. the onLoad grace which only reveals the iframe). Also tears down
        // any post-build "blank" notice: a real render means it isn't blank anymore.
        setConfirmedContent(true)
        // This load target has now rendered at least once — leave cold-boot patience mode. A
        // subsequent reload that goes blank is a real regression handled by the short window.
        hasEverRenderedRef.current = true
        lastReadyAtRef.current = now
        setBlankPostBuild(false)
        // Handshake arrived (the fast path) — cancel any pending onLoad grace
        // fallback and clear the crash marker so a future onLoad isn't suppressed.
        if (onLoadGraceRef.current) {
          clearTimeout(onLoadGraceRef.current)
          onLoadGraceRef.current = null
        }
        lastCrashAtRef.current = 0
      } else if (event.data?.type === 'molecule:error' && event.data.crash) {
        const now = Date.now()

        // Track transitions
        const times = transitionTimesRef.current
        times.push(now)
        while (times.length > 0 && now - times[0] > TRANSITION_WINDOW_MS) times.shift()
        if (times.length >= MAX_TRANSITIONS && !suppressedRef.current) {
          suppressedRef.current = true
          console.warn(
            '[PreviewPanel] Rapid ready/error cycle detected (%d transitions in %dms) — suppressing further toggles.',
            times.length,
            TRANSITION_WINDOW_MS,
          )
          setTimeout(() => {
            suppressedRef.current = false
            transitionTimesRef.current = []
          }, TRANSITION_WINDOW_MS)
          return
        }
        if (suppressedRef.current) return

        // Rate-limit: debounce crash to let HMR settle
        if (lastMsgType === 'molecule:error' && now - lastMsgTime < MSG_RATE_LIMIT_MS) return
        lastMsgTime = now
        lastMsgType = 'molecule:error'
        if (pendingMsg) clearTimeout(pendingMsg)

        // Debounce crash — if a ready arrives within 300ms, skip the crash entirely
        pendingMsg = setTimeout(() => {
          pendingMsg = null
          setIframeReady(false)
          setFadingOut(false)
          // The app crashed — it is no longer showing confirmed content, so the status
          // overlay must come back.
          setConfirmedContent(false)
          // Mark the crash so the onLoad grace fallback won't mask it as a good
          // load (a crash within the grace window suppresses the fallback).
          lastCrashAtRef.current = Date.now()
        }, MSG_RATE_LIMIT_MS)
      } else if (event.data?.type === 'molecule:error' && !event.data.crash && event.data.message) {
        // Pre-render error — app failed to mount (e.g., module export missing, import error).
        // Forward to the agent so it can fix the issue.
        queueError({
          message: String(event.data.message),
          source: event.data.source ? String(event.data.source) : 'pre-render',
          line: event.data.line ?? undefined,
          column: event.data.column ?? undefined,
        })
      } else if (event.data?.type === 'molecule:runtime-error') {
        queueError({
          message: String(event.data.message ?? 'Unknown error'),
          source: event.data.source ?? undefined,
          line: event.data.line ?? undefined,
          column: event.data.column ?? undefined,
        })
      } else if (event.data?.type === 'molecule:heartbeat') {
        lastHeartbeatRef.current = Date.now()
      } else if (event.data?.type === 'molecule:ui-result') {
        // AI-driven preview interaction result — forward to the host, keyed by the command `id`
        // it round-trips on (see the uiCommand effect / onUiResult). The panel only relays it.
        if (typeof event.data.id === 'string' && onUiResult) {
          onUiResult(event.data.id, event.data as PreviewUiResult)
        }
      } else if (event.data?.type === 'molecule:navigate') {
        // The preview reported a client-side navigation (see the scaffold-injected
        // sender). recordNavigation validates the URL and updates the URL bar
        // (state.currentUrl) without reloading the iframe. `isReplace` (set by the
        // sender for replaceState) preserves the Forward stack on a redirect-on-load
        // instead of truncating it; a missing/garbage value coerces to false (push).
        if (typeof event.data.url === 'string')
          recordNavigation(event.data.url, event.data.isReplace === true)
      } else if (event.data?.type === 'molecule:blank') {
        // Page rendered but appears blank — re-cover it. Reveal is gated on `iframeReady`, so
        // dropping `confirmedContent` alone no longer re-covers; lower `iframeReady` too. The
        // onLoad grace already fired and won't re-arm, so the overlay stays (showing the
        // last-good frame) until a real `molecule:ready` re-reveals a non-blank render.
        setConfirmedContent(false)
        setIframeReady(false)
        setFadingOut(false)
        // Notify the agent
        if (onPreviewError) {
          onPreviewError([
            {
              message: String(
                event.data.message ?? 'Page appears blank — rendered but no visible content',
              ),
              source: 'molecule:blank',
            },
          ])
        }
        // Marking content unconfirmed (above) already raises the overlay, and the blurred
        // last-good frame stands in behind it (it renders whenever a frame was captured) — so
        // a blanked app shows the last working UI instead of an empty white iframe.
      } else if (event.data?.type === 'molecule:snapshot') {
        // The sandbox app self-rasterized a stable render and posted it. Validate
        // defensively (postMessage trust boundary): a data:image/ URL within a sane
        // size cap. Stored as the blurred last-good placeholder shown during a
        // rebuild/blank window.
        const dataUrl: unknown = event.data.dataUrl
        if (
          typeof dataUrl === 'string' &&
          dataUrl.startsWith('data:image/') &&
          dataUrl.length <= MAX_SNAPSHOT_DATA_URL_LENGTH
        ) {
          setLastGoodFrame(dataUrl)
        }
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      if (debounceTimer) clearTimeout(debounceTimer)
      if (pendingMsg) clearTimeout(pendingMsg)
    }
  }, [clearPoll, onPreviewError, recordNavigation, onUiResult])

  // --- iframe onError: server unreachable, poll and reload when ready ---
  const handleIframeError = useCallback(() => {
    if (!urlRef.current) return
    setIframeReady(false)
    setFadingOut(false)
    startPolling(urlRef.current)
  }, [startPolling])

  // --- iframe onLoad: grace fallback when molecule:ready never arrives ---
  // The document finished loading. `molecule:ready` is the fast path that clears
  // the overlay immediately; but if that handshake is dropped/suppressed/starved,
  // a perfectly good app would otherwise stay hidden behind the overlay forever
  // (the single point of failure that made the preview get permanently stuck). So
  // after a short grace, if no ready arrived AND no crash just fired, treat the
  // load as good and clear the overlay anyway.
  const handleIframeLoad = useCallback(() => {
    if (!urlRef.current) return
    iframeLoadedRef.current = true
    lastLoadAtRef.current = Date.now()
    // Re-trigger the cold-boot evaluator effect: during a first cold boot the reveal no longer
    // flips `iframeReady` on the grace, so this document-load tick is the effect's trigger.
    setDocLoadedTick((k) => k + 1)
    // A NEW document is now displayed — the initial load OR a Vite full-reload that an edit
    // (Synthase's or the user's) triggered, which reloads the SAME iframe src without remounting
    // it or changing state.url, so no other reset path runs. If this load did NOT just confirm a
    // render (no molecule:ready landed in the moment before — i.e. the reloaded app rendered
    // nothing), drop confirmedContent so the overlay re-covers the now-blank iframe instead of
    // leaving the stale "it rendered" state masking a white screen. A working full-reload mounts
    // React (→ molecule:ready) just before the load event, so its ready is fresh and
    // confirmedContent is KEPT (no flash); a slow/async render re-confirms via the ready that
    // follows (the bridge re-sends ready ~every 4s while content is visible).
    if (Date.now() - lastReadyAtRef.current > READY_FRESH_MS) {
      setConfirmedContent(false)
      // Re-cover the freshly (re)loaded document until ITS OWN onLoad grace re-reveals it (or a
      // fresh molecule:ready confirms sooner). Reveal is gated on `iframeReady`, so a full-reload
      // that an edit triggers must lower it — otherwise the previous load's reveal leaks through
      // and flashes the new, possibly-blank document uncovered. The grace timer armed just below
      // re-reveals it.
      setIframeReady(false)
      // Bring the overlay back SOLID over the blank reload — not mid-fade from the previous
      // app's confirmation (whose fade-out may still be in flight).
      setFadingOut(false)
    }
    if (onLoadGraceRef.current) clearTimeout(onLoadGraceRef.current)
    onLoadGraceRef.current = setTimeout(() => {
      onLoadGraceRef.current = null
      if (iframeReadyRef.current) return
      // A crash within the grace window means the load is NOT good — don't mask it.
      if (Date.now() - lastCrashAtRef.current < ONLOAD_GRACE_MS) return
      // FIRST cold boot (this target has NEVER rendered): do NOT reveal on the grace. The
      // scaffold's inline bridge posts `molecule:ready` the instant #root mounts (reliable), so
      // we keep the honest "Starting your app…" overlay up until that REAL signal instead of
      // flashing a white, still-compiling iframe and then falsely accusing it of being blank —
      // the fresh-project "won't load until I open a new tab" bug. The grace reveal is purely a
      // flash-avoidance shortcut for RELOADS of an app that already rendered once; a genuinely
      // never-mounting app is surfaced honestly by the cold-boot evaluator (dead / 60s ceiling).
      if (!hasEverRenderedRef.current) return
      setEverLoaded(true)
      setIframeReady(true)
      setStuckRetryCount(0)
    }, ONLOAD_GRACE_MS)
  }, [])

  // --- Health check: periodically verify server is still up ---
  useEffect(() => {
    // Only run health checks after overlay is fully gone
    if (!iframeReady || fadingOut || !state.url) return

    const url = state.url
    const healthRef = { current: null as ReturnType<typeof setInterval> | null }
    // Cancellation flag — prevents orphaned poll() closures from running
    // after this effect cleans up.
    let cancelled = false

    healthRef.current = setInterval(async () => {
      if (cancelled) return
      const up = await isServerUp(url)
      if (cancelled) return
      if (!up && urlRef.current === url) {
        // Server went down — show overlay, poll, reload when back
        if (healthRef.current) clearInterval(healthRef.current)
        setIframeReady(false)
        setFadingOut(false)

        let interval = POLL_INITIAL_MS
        const poll = async (): Promise<void> => {
          if (cancelled || urlRef.current !== url) return
          const back = await isServerUp(url)
          if (cancelled || urlRef.current !== url) return
          if (back) {
            // Force-reload iframe with cache buster
            setIframeSrc(withCacheBuster(url))
          } else {
            setTimeout(poll, interval)
            interval = Math.min(interval * POLL_BACKOFF_FACTOR, POLL_MAX_MS)
          }
        }
        void poll()
      }
    }, 3000)

    return () => {
      cancelled = true
      if (healthRef.current) clearInterval(healthRef.current)
    }
  }, [iframeReady, fadingOut, state.url])

  // --- Freeze watchdog ---
  // The scaffold's main thread posts `molecule:heartbeat` every ~3s. If that thread
  // locks up (an infinite loop or runaway render in the in-progress app), the beats
  // stop. Origin-Agent-Cluster isolation keeps that freeze off the IDE's thread, so
  // the IDE can notice the silence and offer a reload — a frozen frame can't recover
  // on its own. Auto-clears if heartbeats resume (transient jank, not a hard lock).
  useEffect(() => {
    if (!iframeReady || fadingOut || !state.url) {
      setPreviewFrozen(false)
      return
    }
    // Baseline so a stale value from a prior load can't trip us immediately.
    lastHeartbeatRef.current = Date.now()
    const timer = setInterval(() => {
      setPreviewFrozen(Date.now() - lastHeartbeatRef.current > FREEZE_THRESHOLD_MS)
    }, FREEZE_CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [iframeReady, fadingOut, state.url])

  // --- Freeze → host report ---
  // A frozen preview is the worst case the iframe CANNOT self-report (its thread is
  // locked, so no molecule:error/runtime-error can ever be posted) — the banner alone
  // gives the user a reload but never tells the agent. Bridge that gap: on the
  // false→true freeze transition, hand the host a structured `frozen` report (with the
  // route) so it can, gated on the autofix setting, ask the agent to find and fix the
  // infinite loop / runaway render. Fires once per episode; re-arms when beats resume.
  useEffect(() => {
    if (previewFrozen && !frozenReportedRef.current) {
      frozenReportedRef.current = true
      onPreviewStuck?.({ reason: 'frozen', url: currentLocationRef.current })
    } else if (!previewFrozen) {
      frozenReportedRef.current = false
    }
  }, [previewFrozen, onPreviewStuck])

  // --- Render verdict → host (→ server) ---
  // Collapse the panel's internal flags into the single render verdict the server needs:
  // did the app actually draw content, or is it blank/frozen/still loading? The host
  // forwards it so Synthase's post-loop verification can confirm a REAL render (not just
  // that the bundle compiled + served). Emit only on change, with the live route.
  const renderState: PreviewRenderState = previewFrozen
    ? 'frozen'
    : previewGaveUp || blankPostBuild
      ? 'blank'
      : confirmedContent
        ? 'rendered'
        : 'loading'
  const lastRenderStateRef = useRef<PreviewRenderState | null>(null)
  useEffect(() => {
    if (!state.url) return
    if (lastRenderStateRef.current === renderState) return
    lastRenderStateRef.current = renderState
    onRenderState?.(renderState, currentLocationRef.current)
  }, [renderState, state.url, onRenderState])

  // --- "Preview is in trouble" detection (signal-driven, NOT a naive timer) ---
  // Decides whether to swap the honest "Starting/Building…" status for the ACTIONABLE
  // "preview is blank — reload / open in new tab" notice. Driven by the scaffold bridge's OWN
  // signals — `molecule:ready` (rendered), `molecule:heartbeat` (alive) — instead of the old
  // "loaded + 2.5s + no ready ⇒ blank" guess, which FALSE-fired over a fresh project whose cold
  // Vite server was still pre-bundling/compiling the just-written app (the app WAS coming up and
  // would render seconds later). The regimes:
  //   • confirmed / actively building / mid-fade / no document yet → never a problem.
  //   • already rendered once, then reloaded blank (`hasEverRendered`) → real regression, surface
  //     after the short BLANK_CONFIRM_MS.
  //   • never rendered yet AND not alive (no heartbeat for FREEZE_THRESHOLD_MS after a settle) →
  //     the inline bridge never ran ⇒ broken/error page ⇒ surface after BLANK_DEAD_MS.
  //   • never rendered yet BUT alive (heartbeating) → a cold boot in progress → keep the honest
  //     "Starting…" overlay; only surface after the generous COLD_BOOT_PATIENCE_MS ceiling
  //     (alive the whole time yet never mounted ⇒ genuinely stuck).
  // Re-evaluated on an interval because liveness + elapsed-since-load change over time. An
  // explicit `molecule:blank` also raises the notice directly via its handler (setBlankPostBuild).
  useEffect(() => {
    if (!state.url || !iframeLoadedRef.current || confirmedContent || isBuilding || fadingOut) {
      setBlankPostBuild(false)
      return
    }
    const evaluate = (): boolean => {
      if (confirmedContentRef.current || isBuildingRef.current) {
        setBlankPostBuild(false)
        return true
      }
      const now = Date.now()
      const sinceLoad = now - (lastLoadAtRef.current || now)
      const aliveRecently = now - lastHeartbeatRef.current < FREEZE_THRESHOLD_MS
      const introuble = hasEverRenderedRef.current
        ? sinceLoad >= BLANK_CONFIRM_MS
        : (!aliveRecently && sinceLoad >= BLANK_DEAD_MS) || sinceLoad >= COLD_BOOT_PATIENCE_MS
      setBlankPostBuild(introuble)
      return introuble
    }
    if (evaluate()) return
    const id = setInterval(() => {
      if (evaluate()) clearInterval(id)
    }, 500)
    return () => clearInterval(id)
    // docLoadedTick re-arms this when a fresh document loads (iframeReady no longer flips on the
    // cold-boot grace, so it can't be the trigger). iframeReady is still a dep so a real reveal
    // re-evaluates (and clears) immediately.
  }, [state.url, docLoadedTick, iframeReady, confirmedContent, isBuilding, fadingOut])

  // --- Auto-reload when AI edits files — ONLY while the preview is broken ---
  // A healthy preview needs nothing from us: Vite HMR applies every edit live,
  // and Vite itself broadcasts a full reload when a change can't hot-apply. The
  // old "safety net" (force-reload 3s after EVERY edit even when healthy) made
  // each HMR-applied change get wiped by a redundant full reload moments later —
  // the "theme updated, then the whole preview reloaded anyway" flash. When the
  // preview IS broken (crashed / failed to mount), the document may be an error
  // page without a live Vite client, so HMR can't deliver the fix — there a
  // debounced reload after the next edit is the genuine recovery path.
  const fileChangTickRef = useRef(fileChangeTick)
  useEffect(() => {
    if (fileChangTickRef.current === fileChangeTick) return
    fileChangTickRef.current = fileChangeTick
    if (!everLoaded || !state.url) return
    if (iframeReady) return // healthy — trust HMR / Vite's own full-reload
    const timer = setTimeout(() => {
      setIframeSrc(withCacheBuster(state.url))
    }, 1500)
    return () => clearTimeout(timer)
  }, [fileChangeTick, iframeReady, everLoaded, state.url])

  // --- Manual retry handler ---
  const handleManualRetry = useCallback(() => {
    // Clear the loop-breaker so a fresh attempt starts clean.
    setPreviewGaveUp(false)
    setIframeMountKey((k) => k + 1)
    setStuckRetryCount(0)
    if (state.url) {
      setIframeSrc(withCacheBuster(state.url))
    }
  }, [state.url])

  // --- Reload a frozen preview ---
  // Remounts the iframe (fresh load re-runs the app, clearing the locked thread).
  const handleReloadFrozen = useCallback(() => {
    setPreviewFrozen(false)
    lastHeartbeatRef.current = Date.now()
    handleManualRetry()
  }, [handleManualRetry])

  // --- Back / Forward: client-side history, NOT a cold reload ---
  // Browser-grade Back/Forward must preserve scroll position + SPA state, so we
  // do NOT bump loadNonce (which would re-mount the iframe and re-run the app).
  // Instead we (1) move the host's history cursor via the provider — updating the
  // URL bar + button gating with NO reload — and (2) post a `molecule:nav-command`
  // to the iframe, whose scaffold-injected receiver runs `history.back()`/
  // `forward()` inside the preview. The resulting `molecule:navigate` dedupes
  // against the cursor we just moved, so the forward stack survives.
  //
  // Order matters: move the cursor FIRST (synchronously sets currentUrl) so the
  // reported navigation dedupes; posting first would let recordNavigation push a
  // fresh entry and truncate the forward stack. Back/Forward are only enabled once
  // the preview has reported navigations (history is built from them), so the
  // scaffold nav-bridge receiver is always present when these fire.
  const postNavCommand = useCallback((action: 'back' | 'forward'): void => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'molecule:nav-command', action }, '*')
  }, [])
  const handleBack = useCallback(() => {
    back()
    postNavCommand('back')
  }, [back, postNavCommand])
  const handleForward = useCallback(() => {
    forward()
    postNavCommand('forward')
  }, [forward, postNavCommand])

  // --- Rendering ---
  // Device frame sizes the iframe: fluid frames (responsive/desktop) fill the
  // area; fixed frames (tablet/mobile) get an explicit pixel width AND height,
  // swapped in landscape so rotation visibly re-proportions the preview.
  const { width: iframeWidth, height: iframeHeight } = resolveDeviceSize(state.device, orientation)
  // `building` selects the overlay CONTENT ("Updating `X`…") while the overlay
  // is shown for a BROKEN preview during edits — it no longer forces the overlay
  // over a healthy iframe. It existed to mask the white flash of the old
  // reload-after-every-edit safety net; with that gone, a healthy preview stays
  // visible and HMR updates are seen live, uncovered.
  const building = buildingHint != null
  // The agent is actively building AND the app has not confirmed it rendered content (no
  // molecule:ready). The iframe may have "loaded" into a half-built/blank/white state — keep
  // the reassuring "Building your app…" overlay up over it instead of a bare white screen.
  // A confirmed render clears it, so a working preview stays visible (HMR updates uncovered).
  // THE invariant: the overlay shows until the preview is READY TO SHOW. On a first cold boot that
  // means until `molecule:ready` confirms a render (the honest "Starting…" status stays up over
  // the still-compiling app — no white flash, no false "blank"); on a reload of an already-rendered
  // app the onLoad grace reveals it fast. `iframeReady` is that reveal flag (set by ready always,
  // by the grace only when `hasEverRendered` — see handleIframeLoad + the fade-out effect). Explicit
  // `molecule:blank`/crash signals RE-COVER a blank/broken app by lowering `iframeReady`, so a
  // working preview always surfaces and the user is never left staring at a bare iframe OR stuck
  // behind a status that can't lift. `fadingOut` keeps the overlay through its fade-out;
  // `blankPostBuild` re-asserts it (as the actionable notice) for a real blank/dead/stuck app.
  // An active build keeps the reassuring status overlay up ONLY while the preview is
  // unconfirmed — a confirmed-healthy preview stays uncovered so the user sees HMR edits live
  // (the "theme updated, no reload flash" behavior). So `(isBuilding || building) &&
  // !confirmedContent` re-asserts the overlay during a build, but never over a working app.
  const buildingUnconfirmed = (isBuilding || building) && !confirmedContent
  const showOverlay =
    Boolean(state.url) &&
    !previewGaveUp &&
    (!iframeReady || fadingOut || blankPostBuild || buildingUnconfirmed)
  // Fully opaque + interactive whenever it is standing in for missing content (only the
  // ready-then-fading-out state animates to transparent).
  const overlaySolid = !iframeReady || blankPostBuild || buildingUnconfirmed

  const overlayContent = blankPostBuild ? (
    // Build finished but the app rendered nothing — actionable, not a spinner.
    <PreviewBlankNotice onReload={handleManualRetry} onOpenExternal={openExternal} />
  ) : isBuilding || building ? (
    <DefaultLoadingIndicator
      hint={buildingHint}
      retryCount={stuckRetryCount}
      onManualRetry={handleManualRetry}
    />
  ) : everLoaded ? (
    (restartingIndicator ??
    loadingIndicator ?? (
      <DefaultLoadingIndicator retryCount={stuckRetryCount} onManualRetry={handleManualRetry} />
    ))
  ) : (
    (loadingIndicator ?? (
      <DefaultLoadingIndicator retryCount={stuckRetryCount} onManualRetry={handleManualRetry} />
    ))
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
      {/* Browser-style URL bar: a borderless, full-height address field on the
          left, then a full-height divider, then the nav cluster (back/forward,
          refresh) and the device-frame dropdown (which now also holds Rotate +
          Open in new tab) \u2014 left \u2192 right, like a real browser toolbar. */}
      <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.shrink0, cm.borderB)}>
        <div className={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))}>
          <div
            data-mol-id="preview-url-field"
            className={cm.cn(
              cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.surface,
            )}
            style={{
              flex: 1,
              minWidth: 0,
              // Full height (P4-12): the address field stretches to fill the
              // toolbar row instead of sitting as a short centered box.
              alignSelf: 'stretch',
              borderRadius: '6px',
              // Borderless (P4-12): no resting border. The focus indicator is a
              // primary-token ring shown only while editing \u2014 it preserves the
              // WCAG 2.4.7 focus indicator the removed border used to carry,
              // without a boxed border at rest.
              boxShadow: urlEditing ? '0 0 0 2px var(--mol-color-primary, #6366f1)' : 'none',
              transition: 'box-shadow 120ms',
            }}
          >
            <Tooltip
              content={
                isSecureLocation
                  ? t('ide.preview.secure', {}, { defaultValue: 'Secure (HTTPS)' })
                  : t('ide.preview.address', {}, { defaultValue: 'Preview address' })
              }
              placement="bottom"
            >
              <Icon
                name={isSecureLocation ? 'lock' : 'globe'}
                size={16}
                data-mol-id="preview-site-info"
                className={cm.cn(cm.textMuted, cm.sp('mr', 1))}
                aria-hidden="true"
              />
            </Tooltip>
            <input
              type="text"
              data-mol-id="preview-url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onFocus={(e) => {
                setUrlEditing(true)
                // Select-all on focus so one click readies the whole address to
                // overtype or copy — standard browser omnibox behavior.
                e.currentTarget.select()
              }}
              onBlur={() => setUrlEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const next = urlDraft.trim()
                  if (next) setUrl(next)
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  setUrlDraft(currentLocation)
                  e.currentTarget.blur()
                }
              }}
              aria-label={t('ide.preview.urlBar', {}, { defaultValue: 'Preview URL' })}
              className={cm.cn(cm.textSize('sm'))}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                // Normal (non-monospace) UI font at 14px (cm.textSize('sm')),
                // vertically centered by the field's align-center row (P4-12).
                fontFamily: 'inherit',
                // The wrapping address field carries the visible focus indicator
                // (a primary-token ring while focused), so the input's own outline
                // is intentionally suppressed here — matching the chat input.
                outline: 'none',
              }}
            />
          </div>
          {/* Full-height divider to the LEFT of the nav cluster (P4-12): a vertical
              separator between the address field and the back/forward/etc icons. */}
          <div
            aria-hidden="true"
            data-mol-id="preview-toolbar-separator"
            style={{
              alignSelf: 'stretch',
              width: '1px',
              flexShrink: 0,
              margin: '0 4px',
              background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
            }}
          />
          {/* Nav cluster: back/forward navigate the preview's own history, refresh */}
          {/* reloads. The device dropdown picks a frame AND hosts Rotate + Open in */}
          {/* new tab (P4-04) — the rotate/open buttons no longer sit in the toolbar. */}
          <BarButton
            icon="arrow-left"
            molId="preview-back"
            onClick={handleBack}
            disabled={!state.canGoBack}
            title={t('ide.preview.back', {}, { defaultValue: 'Back' })}
          />
          <BarButton
            icon="arrow-right"
            molId="preview-forward"
            onClick={handleForward}
            disabled={!state.canGoForward}
            title={t('ide.preview.forward', {}, { defaultValue: 'Forward' })}
          />
          <BarButton
            icon="sync"
            molId="preview-refresh"
            onClick={refresh}
            title={t('ide.preview.refresh', {}, { defaultValue: 'Reload' })}
          />
          {/* The device-frame dropdown also hosts Rotate (only when the current */}
          {/* frame is rotatable — "where relevant") and Open in new tab (P4-04). */}
          <DeviceFrameSelector
            current={state.device}
            onChange={handleDeviceChange}
            canRotate={canRotate}
            rotated={orientation === 'landscape'}
            onRotate={handleRotate}
            onOpenExternal={openExternal}
          />
        </div>
      </div>

      {/* Preview area */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'row', justify: 'center', align: 'center' }),
          cm.surfaceSecondary,
        )}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Iframe — always mounted when we have a src, sits behind overlay */}
        {iframeSrc && (
          <iframe
            key={iframeMountKey}
            ref={iframeRef}
            src={iframeSrc}
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            title={t('ide.preview.livePreview')}
            className={cm.cn(state.device !== 'none' && state.device !== 'desktop' && cm.borderAll)}
            style={{
              width: iframeWidth,
              height: iframeHeight,
              borderRadius: state.device === 'mobile' ? '16px' : '0',
              background: '#fff',
            }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {/* Overlay — "Loading preview" */}
        {showOverlay && (
          <div
            data-mol-id="preview-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              // Once the preview has loaded at least once, a restart overlay is
              // semi-transparent so the last rendered UI stays dimly visible behind
              // the rotating status — the user keeps "something to look at" instead
              // of a blank wall on every build-triggered reload. The very first load
              // (nothing rendered yet) stays fully opaque.
              // Semi-transparent (so the dim last-good UI shows through) ONLY when there is
              // actually a last-good frame to reveal — a restart of an app that rendered before.
              // A first cold boot has no frame yet, so stay fully opaque instead of bleeding the
              // still-white, mid-compile iframe through a 78% tint.
              background:
                everLoaded && lastGoodFrame
                  ? 'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 78%, transparent)'
                  : 'var(--mol-color-surface-secondary, #f5f5f5)',
              // DO NOT add `backdrop-filter` here. This overlay sits ON TOP of the live
              // cross-origin preview <iframe> (an out-of-process iframe). backdrop-filter must
              // SAMPLE its backdrop — i.e. read the OOPIF's compositor surface across processes
              // every frame. Under software / GPU-less compositing (this VM runs
              // --disable-gpu-compositing) that cross-process surface read DEADLOCKS the host
              // renderer's main thread → the whole IDE tab freezes on every reload of a
              // once-loaded preview. A `backdrop-filter: blur(2px)` here was the CONFIRMED cause
              // of exactly that freeze (verified by elimination: removing only the backdrop-filter,
              // overlay still opaque + occluding, un-froze the foregrounded tab). The blurred
              // "last working UI" is provided SAFELY by the last-good-frame <img> below — it
              // blurs its OWN pixels (a same-origin snapshot), never the live OOPIF backdrop.
              // Anything standing in for missing content (a build, a blank fallback, an
              // unconfirmed building app, or a post-build blank) forces the overlay fully
              // visible (it may have already faded out from a prior ready state); otherwise
              // honor the fade-out.
              opacity: overlaySolid ? 1 : fadingOut ? 0 : 1,
              transition: 'opacity 0.5s ease-out',
              pointerEvents: overlaySolid || !fadingOut ? 'auto' : 'none',
            }}
            onTransitionEnd={() => {
              if (fadingOut) setFadingOut(false)
            }}
          >
            {/* Last working build, shown BLURRED behind the overlay content while
                the app is rebuilding or blank — so the user sees the previous good
                UI instead of a white iframe. Gated on everLoaded so the first cold
                load (no frame captured yet) is unaffected. */}
            {everLoaded && lastGoodFrame && (
              <>
                <img
                  src={lastGoodFrame}
                  data-mol-id="preview-last-frame"
                  alt={t(
                    'ide.preview.lastWorkingFrame',
                    {},
                    { defaultValue: 'Last working preview' },
                  )}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top center',
                    filter: 'blur(8px)',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                />
                {/* Subtle theme-token scrim over the frame so the status card reads
                    clearly without hiding the last-good UI entirely. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    background:
                      'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 55%, transparent)',
                    pointerEvents: 'none',
                  }}
                />
              </>
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>{overlayContent}</div>
          </div>
        )}

        {/* Loop breaker — recovery cap reached. Stop thrashing the iframe forever
            and give the user a deterministic way out: reload, or open the preview
            URL directly in a new tab (which always works even when framing here
            fails). Replaces the old indefinite remount loop. */}
        {previewGaveUp && (
          <div
            data-mol-id="preview-load-failed"
            className={cm.surface}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              zIndex: 2,
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <Icon name="x-circle" size={28} className={cm.textMuted} aria-hidden="true" />
            <div
              className={cm.cn(cm.textSize('sm'))}
              style={{ color: 'var(--mol-color-text, #333)', fontWeight: 600 }}
            >
              {t('ide.preview.loadFailed', {}, { defaultValue: "Preview can't load here" })}
            </div>
            <div className={cm.cn(cm.textSize('xs'), cm.textMuted)} style={{ maxWidth: '320px' }}>
              {t(
                'ide.preview.loadFailedHint',
                {},
                { defaultValue: 'Try reloading, or open the preview in a new tab.' },
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                data-mol-id="preview-load-failed-reload"
                onClick={handleManualRetry}
                className={cm.button({ variant: 'solid', color: 'primary', size: 'sm' })}
              >
                {t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })}
              </button>
              <button
                type="button"
                data-mol-id="preview-load-failed-open"
                onClick={openExternal}
                className={cm.button({ variant: 'ghost', size: 'sm' })}
              >
                {t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })}
              </button>
            </div>
          </div>
        )}

        {/* No URL state */}
        {!state.url && (
          <div
            className={cm.cn(cm.textMuted, cm.textSize('sm'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {state.isLoading
              ? t('ide.preview.starting', {}, { defaultValue: 'Loading preview...' })
              : t('ide.preview.noPreview', {}, { defaultValue: 'No preview available' })}
          </div>
        )}

        {/* Freeze watchdog banner — heartbeats stopped → the app's thread is locked.
            Gated on confirmedContent: "this app stopped responding" only makes sense once the
            app was actually SHOWING content. A never-rendered / blank app is covered by the
            building / blank overlay instead, so the two never contradict each other. */}
        {previewFrozen && confirmedContent && !fadingOut && (
          <div
            className={cm.cn(cm.textSize('xs'), cm.bgErrorSubtle, cm.textError)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '8px 12px',
            }}
          >
            <span>
              {t(
                'ide.preview.frozen',
                {},
                {
                  defaultValue:
                    'This app stopped responding — an infinite loop or runaway render froze the preview. The IDE is unaffected.',
                },
              )}
            </span>
            <button
              type="button"
              onClick={handleReloadFrozen}
              style={{
                flexShrink: 0,
                padding: '4px 12px',
                fontSize: '12px',
                border: '1px solid currentColor',
                borderRadius: '4px',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              {t('ide.preview.frozenReload', {}, { defaultValue: 'Reload app' })}
            </button>
          </div>
        )}

        {state.error && (
          <div
            className={cm.cn(cm.textSize('sm'), cm.sp('p', 3), cm.bgErrorSubtle, cm.textError)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 2,
            }}
          >
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}

PreviewPanel.displayName = 'PreviewPanel'

/**
 * A single icon button inside the preview URL bar. Renders a ghost button with
 * an icon-set glyph wrapped in the framework's REAL styled {@link Tooltip} —
 * instant, themed via ClassMap tokens, and focus-aware — NOT the delayed,
 * unstyled, touch-blind native `title` attribute it replaces. `disabled` buttons
 * (e.g. Back/Forward when there's no history entry to go to) are dimmed and
 * non-interactive via the ClassMap button's built-in disabled styling.
 *
 * The Tooltip is imported via its dedicated subpath
 * (`@molecule/app-ui-react/components/Tooltip.js`) so the IDE pulls only the
 * Tooltip, never the package barrel (which would drag in `react-router-dom`).
 * This BarButton is the reference pattern other IDE affordances should follow
 * when replacing native `title` tooltips.
 *
 * The compact `xs` size is ~26px tall — fine for a mouse but below the WCAG
 * 2.5.5 minimum tap target. `cm.touchTarget` grows the hit-area to >=44x44px on
 * coarse-pointer (touch) devices ONLY, so the toolbar stays compact on desktop
 * but is comfortably tappable on phones/tablets.
 * @param root0 - Component props.
 * @param root0.icon - Icon-set glyph name.
 * @param root0.title - Tooltip + accessible label.
 * @param root0.molId - `data-mol-id` for AI-agent / test targeting.
 * @param root0.onClick - Click handler (omitted for disabled placeholders).
 * @param root0.disabled - Whether the button is a disabled placeholder.
 * @returns The rendered button element.
 */
function BarButton({
  icon,
  title,
  molId,
  onClick,
  disabled,
}: {
  icon: IconName
  title: string
  molId: string
  onClick?: () => void
  disabled?: boolean
}): JSX.Element {
  const cm = getClassMap()
  return (
    <Tooltip content={title} placement="bottom">
      <button
        type="button"
        data-mol-id={molId}
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
      >
        <Icon name={icon} size={16} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}

/**
 * Fallback loading indicator when no custom one is provided.
 * @param root0 - Component props.
 * @param root0.restarting - Whether this is a restart (server was previously up).
 * @param root0.retryCount - Number of stuck-load recovery attempts so far.
 * @param root0.onManualRetry - Callback to trigger a manual retry.
 * @returns The rendered loading indicator element.
 */
/**
 * Actionable notice shown when a build has FINISHED but the app rendered nothing — the
 * document loaded and the preview bridge is alive, yet no `molecule:ready` ever arrived
 * (the app's `#root` stayed empty). Unlike the reassuring building spinner, this gives the
 * user a clear way forward instead of a bare white screen: reload, or open the preview in a
 * new tab — and it honestly names the likely cause (an app error the agent can fix).
 * @param root0 - Component props.
 * @param root0.onReload - Reload the preview (remount + cache-bust).
 * @param root0.onOpenExternal - Open the preview URL in a new browser tab.
 * @returns The rendered blank-preview notice card.
 */
function PreviewBlankNotice({
  onReload,
  onOpenExternal,
}: {
  onReload: () => void
  onOpenExternal: () => void
}): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      data-mol-id="preview-blank-notice"
      className={cm.surface}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
        borderRadius: '8px',
        padding: '20px 24px',
        maxWidth: '360px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <Icon name="image" size={28} className={cm.textMuted} aria-hidden="true" />
      <div
        className={cm.cn(cm.textSize('sm'))}
        style={{ color: 'var(--mol-color-text, #333)', fontWeight: 600 }}
      >
        {t('ide.preview.blankTitle', {}, { defaultValue: 'The preview is blank' })}
      </div>
      <div className={cm.cn(cm.textSize('xs'), cm.textMuted)} style={{ lineHeight: 1.5 }}>
        {t(
          'ide.preview.blankHint',
          {},
          {
            defaultValue:
              'The app loaded but didn’t render anything — it may have an error. Synthase has been notified. You can reload, or open the preview in a new tab.',
          },
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          data-mol-id="preview-blank-reload"
          onClick={onReload}
          className={cm.button({ variant: 'solid', color: 'primary', size: 'sm' })}
        >
          {t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })}
        </button>
        <button
          type="button"
          data-mol-id="preview-blank-open"
          onClick={onOpenExternal}
          className={cm.button({ variant: 'ghost', size: 'sm' })}
        >
          {t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })}
        </button>
      </div>
    </div>
  )
}

/**
 * Molecule-themed status phrases rotated in the preview overlay. A build edits
 * files rapidly, so the preview can reload (or briefly blank) many times before it
 * settles — a static "Loading preview…" left users wondering what was happening.
 * Rotating phrases read as "the agent is actively working", not "broken".
 */
const PREVIEW_MESSAGES: ReadonlyArray<{ key: string; defaultValue: string }> = [
  { key: 'ide.preview.msg.synthesizing', defaultValue: 'Synthesizing components…' },
  { key: 'ide.preview.msg.bonding', defaultValue: 'Bonding the modules…' },
  { key: 'ide.preview.msg.assembling', defaultValue: 'Assembling the build…' },
  { key: 'ide.preview.msg.reacting', defaultValue: 'Reacting to your edits…' },
  { key: 'ide.preview.msg.composing', defaultValue: 'Composing the interface…' },
  { key: 'ide.preview.msg.catalyzing', defaultValue: 'Catalyzing your changes…' },
  { key: 'ide.preview.msg.stabilizing', defaultValue: 'Stabilizing the structure…' },
  { key: 'ide.preview.msg.crystallizing', defaultValue: 'Crystallizing the UI…' },
  { key: 'ide.preview.msg.workingOnIt', defaultValue: 'Working on it…' },
  { key: 'ide.preview.msg.almostThere', defaultValue: 'Almost there…' },
]

/**
 * Default preview-overlay content: pulsing dots, a status message, and (after
 * repeated recovery cycles) a manual retry button. With a `hint` it shows
 * "Updating `<hint>`" (the file the build is currently editing); without one it
 * rotates molecule-themed phrases so the overlay never reads as frozen.
 * @param root0 - Component props.
 * @param root0.hint - Current build edit target (e.g. a basename), or null to rotate phrases.
 * @param root0.retryCount - Number of auto-recovery cycles attempted so far.
 * @param root0.onManualRetry - Invoked when the user clicks "Retry now".
 * @returns The rendered loading indicator.
 */
function DefaultLoadingIndicator({
  hint,
  retryCount,
  onManualRetry,
}: {
  hint?: string | null
  retryCount: number
  onManualRetry?: () => void
}): JSX.Element {
  // Rotate the themed phrases (~2.4s each) so the overlay never reads as a frozen
  // "Loading preview…" while the build thrashes the preview with reloads. (When a
  // specific edit `hint` is present we show that instead — the changing filenames
  // are their own liveliness.)
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    if (hint) return
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % PREVIEW_MESSAGES.length), 2400)
    return () => clearInterval(id)
  }, [hint])
  const phrase = PREVIEW_MESSAGES[msgIdx]

  return (
    // A self-contained "card" backdrop on SOLID theme tokens. The overlay scrim is
    // intentionally semi-transparent (the last UI / blurred last-good frame stays
    // dimly visible), so the status text used to bleed into a white/light preview
    // and become unreadable — worst in light theme. A solid surface card guarantees
    // the dots + status + retry always sit on a known, theme-correct backdrop.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        background: 'var(--mol-color-surface, #fff)',
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
        borderRadius: '8px',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--mol-color-primary, #4070e0)',
              animation: `mol-preview-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: '13px',
          // Foreground token (not the low-contrast muted token) so "Updating
          // <file>" reads with full contrast in BOTH themes — the card backdrop
          // above guarantees a known surface behind it.
          color: 'var(--mol-color-text, #333)',
          textAlign: 'center',
        }}
      >
        {hint ? (
          <>
            {t('ide.preview.updating', {}, { defaultValue: 'Updating' })}{' '}
            <code style={{ fontFamily: 'monospace', fontSize: 'inherit', opacity: 0.9 }}>
              {hint}
            </code>
          </>
        ) : (
          t(phrase.key, {}, { defaultValue: phrase.defaultValue })
        )}
      </span>
      {retryCount > 0 && (
        <span style={{ fontSize: '11px', color: 'var(--mol-color-text-muted, #888)' }}>
          {t(
            'ide.preview.retryCount',
            { count: retryCount },
            { defaultValue: 'Retry attempt {{count}}' },
          )}
        </span>
      )}
      {retryCount >= MAX_RECOVERY_CYCLES && onManualRetry && (
        <button
          type="button"
          onClick={onManualRetry}
          style={{
            marginTop: '8px',
            padding: '6px 16px',
            fontSize: '12px',
            border: '1px solid var(--mol-color-border, #ddd)',
            borderRadius: '4px',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {t('ide.preview.retryButton', {}, { defaultValue: 'Retry now' })}
        </button>
      )}
      <style>{`
        @keyframes mol-preview-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
