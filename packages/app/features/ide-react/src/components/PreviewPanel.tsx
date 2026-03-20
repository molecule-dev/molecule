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
 * @module
 */

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { usePreview } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PreviewPanelProps } from '../types.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.js'

const deviceWidths: Record<string, string> = {
  none: '100%',
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

/** How often to poll when waiting for the server to come up. */
const POLL_INTERVAL_MS = 500

/**
 * Check whether the server at `url` is accepting connections.
 * Uses `no-cors` so CORS errors aren't mistaken for network failures.
 * Aborts after 2s to avoid holding browser connections — hanging polls
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
  } catch {
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
 * @param root0.className - Optional CSS class name for the container.
 * @param root0.fileChangeTick - Incremented when the user edits a file, used to cancel queued autofix messages.
 * @returns The rendered preview panel element.
 */
export function PreviewPanel({
  loadingIndicator,
  restartingIndicator,
  className,
  onPreviewError,
  fileChangeTick,
}: PreviewPanelProps): JSX.Element {
  const cm = getClassMap()
  const { state, setUrl, refresh, setDevice, openExternal } = usePreview()
  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  // --- Clear poll timer ---
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // --- Poll until server is up, then mount the iframe ---
  const startPolling = useCallback(
    (url: string): void => {
      clearPoll()
      setIframeReady(false)
      setFadingOut(false)

      const poll = async (): Promise<void> => {
        if (urlRef.current !== url) return
        const up = await isServerUp(url)
        if (urlRef.current !== url) return

        if (up) {
          setEverLoaded(true)
          setIframeSrc(url)
          pollRef.current = null
        } else {
          pollRef.current = setTimeout(poll, POLL_INTERVAL_MS)
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
      setEverLoaded(false)
      setIframeReady(false)
      setFadingOut(false)
      setIframeSrc('')
      return
    }

    setEverLoaded(false)
    setIframeSrc('')
    startPolling(state.url)

    return () => clearPoll()
  }, [state.url, startPolling, clearPoll])

  // --- When iframeReady becomes true, trigger fade-out ---
  useEffect(() => {
    if (iframeReady) setFadingOut(true)
  }, [iframeReady])

  // --- Listen for postMessage from scaffold template ---
  // molecule:ready  = #root got children (app rendered)  → hide overlay
  // molecule:error {crash:true} = #root emptied (app crashed) → show overlay
  // molecule:runtime-error = JS runtime error in the iframe → forward to chat
  useEffect(() => {
    // Debounce runtime errors — HMR triggers rapid error/recovery cycles
    let errorBatch: Array<{ message: string; source?: string; line?: number; column?: number }> = []
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const MAX_ERRORS_PER_BATCH = 5

    const handler = (event: MessageEvent): void => {
      if (event.data?.type === 'molecule:ready') {
        clearPoll()
        setEverLoaded(true)
        setIframeReady(true)
      } else if (event.data?.type === 'molecule:error' && event.data.crash) {
        setIframeReady(false)
        setFadingOut(false)
      } else if (event.data?.type === 'molecule:runtime-error' && onPreviewError) {
        if (errorBatch.length < MAX_ERRORS_PER_BATCH) {
          errorBatch.push({
            message: String(event.data.message ?? 'Unknown error'),
            source: event.data.source ?? undefined,
            line: event.data.line ?? undefined,
            column: event.data.column ?? undefined,
          })
        }
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          if (errorBatch.length > 0) {
            onPreviewError(errorBatch)
            errorBatch = []
          }
          debounceTimer = null
        }, 2000)
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [clearPoll, onPreviewError])

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

    healthRef.current = setInterval(async () => {
      const up = await isServerUp(url)
      if (!up && urlRef.current === url) {
        // Server went down — show overlay, poll, reload when back
        if (healthRef.current) clearInterval(healthRef.current)
        setIframeReady(false)
        setFadingOut(false)

        const poll = async (): Promise<void> => {
          if (urlRef.current !== url) return
          const back = await isServerUp(url)
          if (urlRef.current !== url) return
          if (back) {
            // Force-reload iframe with cache buster
            setIframeSrc(url + (url.includes('?') ? '&' : '?') + '_r=' + Date.now())
          } else {
            setTimeout(poll, POLL_INTERVAL_MS)
          }
        }
        void poll()
      }
    }, 3000)

    return () => {
      if (healthRef.current) clearInterval(healthRef.current)
    }
  }, [iframeReady, fadingOut, state.url])

  // --- Auto-reload when preview is broken and AI edits files ---
  // Only triggers when the overlay is showing (preview broken/loading) and
  // fileChangeTick increments (AI wrote/edited a file that might fix the issue).
  const fileChangTickRef = useRef(fileChangeTick)
  useEffect(() => {
    if (fileChangTickRef.current === fileChangeTick) return
    fileChangTickRef.current = fileChangeTick
    // Only reload if the preview is broken (overlay visible, server was up before)
    if (!iframeReady && everLoaded && state.url) {
      // Debounce — wait for Vite to process the change before reloading
      const timer = setTimeout(() => {
        setIframeSrc(state.url + (state.url.includes('?') ? '&' : '?') + '_r=' + Date.now())
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [fileChangeTick, iframeReady, everLoaded, state.url])

  // --- Rendering ---
  const iframeWidth = deviceWidths[state.device] || '100%'
  const showOverlay = Boolean(state.url) && (!iframeReady || fadingOut)

  const overlayContent = everLoaded
    ? (restartingIndicator ?? loadingIndicator ?? <DefaultLoadingIndicator restarting />)
    : (loadingIndicator ?? <DefaultLoadingIndicator restarting={false} />)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
      {/* Header */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.shrink0,
          cm.borderB,
        )}
      >
        <div className={cm.flex({ direction: 'row', align: 'center', gap: 'sm' })}>
          <DeviceFrameSelector current={state.device} onChange={setDevice} />
          <button
            type="button"
            onClick={refresh}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.borderAll)}
            aria-label={t('ide.preview.refresh')}
          >
            {'\u21BB'}
          </button>
          <button
            type="button"
            onClick={openExternal}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.borderAll)}
            aria-label={t('ide.preview.openNewTab')}
          >
            {'\u2197'}
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 1), cm.shrink0, cm.borderB)}>
        <input
          type="text"
          value={state.url}
          onChange={(e) => setUrl(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.textSize('xs'),
            cm.sp('p', 1),
            cm.surfaceSecondary,
            cm.borderAll,
          )}
          style={{
            borderRadius: '4px',
            color: 'inherit',
            outline: 'none',
            fontFamily: 'monospace',
          }}
        />
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

        {/* Overlay — "Loading preview" or "Loading preview" */}
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
              background: 'var(--mol-color-surface-secondary, #f5f5f5)',
              opacity: fadingOut ? 0 : 1,
              transition: 'opacity 0.5s ease-out',
              pointerEvents: fadingOut ? 'none' : 'auto',
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
 * Fallback loading indicator when no custom one is provided.
 * @param root0 - Component props.
 * @param root0.restarting - Whether this is a restart (server was previously up).
 * @returns The rendered loading indicator element.
 */
function DefaultLoadingIndicator({ restarting }: { restarting: boolean }): JSX.Element {
  const message = restarting
    ? t('ide.preview.restarting', {}, { defaultValue: 'Loading preview...' })
    : t('ide.preview.starting', {}, { defaultValue: 'Loading preview...' })

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
      <span style={{ fontSize: '13px', color: 'var(--mol-color-text-muted, #888)' }}>
        {message}
      </span>
      <style>{`
        @keyframes mol-preview-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
