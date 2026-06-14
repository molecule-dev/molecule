/**
 * Live preview panel with iframe and device frame selection.
 *
 * Two states:
 * 1. "Loading preview" — polling until the first successful fetch
 * 2. "Loading preview" — server was up before but fetch is now failing
 *
 * The iframe is always mounted (behind the overlay) once we have a URL.
 * The overlay hides when the iframe fires `onLoad`.
 *
 * Recovery features:
 * - Never-give-up polling with exponential backoff (never permanently stuck)
 * - Stuck-load detection: auto-reloads/remounts iframe if molecule:ready never arrives
 * - Pre-render error forwarding: module/import errors sent to the agent for auto-fix
 * - Freeze watchdog: the scaffold heartbeats every ~3s; if its thread locks up the
 *   beats stop, so we surface a reload banner (the IDE stays responsive because the
 *   preview origin is isolated via Origin-Agent-Cluster)
 * - Blank page detection: catches pages that render but show nothing
 *
 * @module
 */

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { withCacheBuster } from '@molecule/app-live-preview'
import { usePreview } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { PreviewPanelProps } from '../types.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.js'
import { Icon } from './Icon.js'

const deviceWidths: Record<string, string> = {
  none: '100%',
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

// --- Polling constants (exponential backoff, never gives up) ---

/** Initial poll interval when waiting for the server. */
const POLL_INITIAL_MS = 500
/** Maximum poll interval after backoff. */
const POLL_MAX_MS = 5000
/** Backoff multiplier applied after each failed poll. */
const POLL_BACKOFF_FACTOR = 2

// --- Stuck-load detection constants ---

/** Time to wait for molecule:ready after iframe src is set before attempting recovery (ms). */
const STUCK_DETECT_MS = 5_000
/** Max recovery cycles (reload + remount) before firing onPreviewStuck. */
const MAX_RECOVERY_CYCLES = 3
/** Interval between recovery attempts after MAX_RECOVERY_CYCLES exhausted (ms). */
const STUCK_RETRY_INTERVAL_MS = 10_000

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
 * connections for script/asset requests.
 * @param url - The URL to check.
 * @returns Whether the server responded within the timeout.
 */
async function isServerUp(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 500)
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
    clearTimeout(timeout)
    return true
  } catch (_error) {
    // Fetch failure means server is not yet up — expected during polling. `false` is the correct result.
    clearTimeout(timeout)
    return false
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
  fileChangeTick,
  buildingHint,
}: PreviewPanelProps): JSX.Element {
  const cm = getClassMap()
  const { state, setUrl, refresh, setDevice, openExternal, recordNavigation, back, forward } =
    usePreview()
  const iframeRef = useRef<HTMLIFrameElement>(null)

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
  // Is the iframe content ready to show?
  const [iframeReady, setIframeReady] = useState(false)
  // Fade-out transition in progress
  const [fadingOut, setFadingOut] = useState(false)

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlRef = useRef(state.url)
  urlRef.current = state.url
  // Tracks the iframe src to force reload when server recovers
  const [iframeSrc, setIframeSrc] = useState('')

  // --- Stuck-load detection state ---
  const [stuckRetryCount, setStuckRetryCount] = useState(0)
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [iframeMountKey, setIframeMountKey] = useState(0)
  // Mirror iframeReady to a ref so timer callbacks read current value
  const iframeReadyRef = useRef(iframeReady)
  iframeReadyRef.current = iframeReady

  // --- Heartbeat tracking ---
  const lastHeartbeatRef = useRef<number>(0)
  // True when heartbeats have stopped for FREEZE_THRESHOLD_MS while the app is up.
  const [previewFrozen, setPreviewFrozen] = useState(false)

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
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
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
      clearPoll()
      setIframeReady(false)
      setFadingOut(false)

      let interval = POLL_INITIAL_MS
      const poll = async (): Promise<void> => {
        if (urlRef.current !== url) return
        const up = await isServerUp(url)
        if (urlRef.current !== url) return

        if (up) {
          setEverLoaded(true)
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
      return
    }

    setEverLoaded(false)
    setIframeSrc('')
    setStuckRetryCount(0)
    startPolling(state.url)

    return () => {
      clearPoll()
      clearStuckTimer()
    }
    // state.loadNonce forces a reload even when the URL string is unchanged
    // (refresh, or back/forward to the same load target). recordNavigation does
    // NOT bump loadNonce, so an in-app navigation updates the URL bar without
    // reloading here.
  }, [state.url, state.loadNonce, startPolling, clearPoll, clearStuckTimer])

  // --- When iframeReady becomes true, trigger fade-out ---
  useEffect(() => {
    if (iframeReady) setFadingOut(true)
  }, [iframeReady])

  // --- Stuck-load detection: auto-recover when molecule:ready never arrives ---
  useEffect(() => {
    // Only run when we have a src but iframe hasn't reported ready
    if (!iframeSrc || iframeReady) {
      clearStuckTimer()
      return
    }

    let cycleCount = 0
    let stuckFired = false

    const attempt = (): void => {
      const delay = cycleCount < MAX_RECOVERY_CYCLES ? STUCK_DETECT_MS : STUCK_RETRY_INTERVAL_MS
      stuckTimerRef.current = setTimeout(() => {
        stuckTimerRef.current = null
        // Check ref, not stale closure
        if (iframeReadyRef.current) return

        cycleCount++
        setStuckRetryCount(cycleCount)

        if (cycleCount <= MAX_RECOVERY_CYCLES) {
          if (cycleCount % 2 === 1) {
            // Odd cycles: force-reload iframe with cache buster
            setIframeSrc(withCacheBuster(urlRef.current))
          } else {
            // Even cycles: full iframe remount (unmount + remount)
            setIframeMountKey((k) => k + 1)
          }
          attempt()
        } else {
          // Exhausted recovery cycles — fire onPreviewStuck (once)
          if (!stuckFired) {
            stuckFired = true
            onPreviewStuck?.()
          }
          // Continue retrying at longer intervals indefinitely
          const longRetry = (): void => {
            stuckTimerRef.current = setTimeout(() => {
              stuckTimerRef.current = null
              if (iframeReadyRef.current) return
              setIframeMountKey((k) => k + 1)
              setStuckRetryCount((n) => n + 1)
              longRetry()
            }, STUCK_RETRY_INTERVAL_MS)
          }
          longRetry()
        }
      }, delay)
    }

    attempt()

    return () => clearStuckTimer()
  }, [iframeSrc, iframeReady, onPreviewStuck, clearStuckTimer])

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
      if (errorBatch.length < MAX_ERRORS_PER_BATCH) {
        errorBatch.push(err)
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(flushErrors, 2000)
    }

    const handler = (event: MessageEvent): void => {
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
      } else if (event.data?.type === 'molecule:navigate') {
        // The preview reported a client-side navigation (see the scaffold-injected
        // sender). recordNavigation validates the URL and updates the URL bar
        // (state.currentUrl) without reloading the iframe.
        if (typeof event.data.url === 'string') recordNavigation(event.data.url)
      } else if (event.data?.type === 'molecule:blank') {
        // Page rendered but appears blank — notify the agent
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
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      if (debounceTimer) clearTimeout(debounceTimer)
      if (pendingMsg) clearTimeout(pendingMsg)
    }
  }, [clearPoll, onPreviewError, recordNavigation])

  // --- iframe onError: server unreachable, poll and reload when ready ---
  const handleIframeError = useCallback(() => {
    if (!urlRef.current) return
    setIframeReady(false)
    setFadingOut(false)
    startPolling(urlRef.current)
  }, [startPolling])

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
  const iframeWidth = deviceWidths[state.device] || '100%'
  // `building` selects the overlay CONTENT ("Updating `X`…") while the overlay
  // is shown for a BROKEN preview during edits — it no longer forces the overlay
  // over a healthy iframe. It existed to mask the white flash of the old
  // reload-after-every-edit safety net; with that gone, a healthy preview stays
  // visible and HMR updates are seen live, uncovered.
  const building = buildingHint != null
  const showOverlay = Boolean(state.url) && (!iframeReady || fadingOut)

  const overlayContent = building ? (
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
      {/* Browser-style URL bar: a single rounded, subtly-bordered bar holding
          the device-cycle, back/forward, refresh, the URL input, and open-in-
          new-tab \u2014 left \u2192 right, like a real browser toolbar. */}
      <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.shrink0, cm.borderB)}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
            cm.sp('px', 1),
            cm.surfaceSecondary,
            cm.borderAll,
          )}
          style={{ borderRadius: '8px' }}
        >
          <DeviceFrameSelector current={state.device} onChange={setDevice} />

          {/* Back / Forward \u2014 navigate the preview's own history (built from
              the molecule:navigate messages it reports). Disabled when there's
              no entry to go to. */}
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

          {/* Address field — a browser-style omnibox: a recessed `surface`
              panel (visually distinct from the toolbar's surfaceSecondary) with
              a leading site-info glyph and a focus ring. The lock/globe glyph
              comes from the shared SVG icon set (lock = served over https, globe
              = otherwise), wrapped in the same styled Tooltip the toolbar
              buttons use — not a native `title`. The border lights up in the
              primary brand color while the input is focused — the same focus
              token as the chat input — restoring the visible-focus indicator
              (WCAG 2.4.7) that the previous bare `outline: none` had stripped.
              ClassMap can't express a state-driven border color, so the focus
              ring is inline and driven by the theme's `--mol-color-*` tokens. */}
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
              borderRadius: '6px',
              border: `1px solid ${
                urlEditing
                  ? 'var(--mol-color-primary, #6366f1)'
                  : 'var(--mol-color-border, rgba(128,128,128,0.2))'
              }`,
              transition: 'border-color 120ms',
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
                className={cm.textMuted}
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
              className={cm.cn(cm.textSize('xs'), cm.sp('py', 1))}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                // The wrapping address field carries the visible focus indicator
                // (border → primary while focused), so the input's own outline is
                // intentionally suppressed here — matching the chat input.
                outline: 'none',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <BarButton
            icon="link-external"
            molId="preview-open-external"
            onClick={openExternal}
            title={t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })}
          />
        </div>
      </div>

      {/* Preview area */}
      <div
        className={cm.cn(cm.flex({ direction: 'row', justify: 'center' }), cm.surfaceSecondary)}
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
              height: '100%',
              borderRadius: state.device === 'mobile' ? '16px' : '0',
              background: '#fff',
            }}
            onError={handleIframeError}
          />
        )}

        {/* Overlay — "Loading preview" */}
        {showOverlay && (
          <div
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
              background: everLoaded
                ? 'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 78%, transparent)'
                : 'var(--mol-color-surface-secondary, #f5f5f5)',
              backdropFilter: everLoaded ? 'blur(2px)' : undefined,
              // A build forces the overlay fully visible (it may have already faded
              // out from a prior ready state); otherwise honor the fade-out.
              opacity: building ? 1 : fadingOut ? 0 : 1,
              transition: 'opacity 0.5s ease-out',
              pointerEvents: building || !fadingOut ? 'auto' : 'none',
            }}
            onTransitionEnd={() => {
              if (fadingOut) setFadingOut(false)
            }}
          >
            {overlayContent}
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

        {/* Freeze watchdog banner — heartbeats stopped → the app's thread is locked */}
        {previewFrozen && iframeReady && !fadingOut && (
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
  icon: string
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
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
          color: 'var(--mol-color-text-muted, #888)',
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
