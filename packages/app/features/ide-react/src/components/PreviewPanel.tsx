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
 * - Wake patience: when the preview server restarts (detected by the load-target URL
 *   changing — a wake always reassigns the sandbox's docker port — or the host's `wakeAt`
 *   hint), the fast blank accusations stand down and the patient cold-boot regime governs
 *   for WAKE_PATIENCE_MS: a post-wake reload that renders nothing for a while is expected,
 *   not blank; only the generous never-rendered ceiling may accuse
 * - Trust boundary: inbound `molecule:*` postMessages are accepted only from the
 *   preview iframe's own window (`event.source === iframe.contentWindow`) — a window-
 *   identity check, robust to origin-string divergence (Origin-Agent-Cluster, IP host,
 *   cache-buster, redirect) and unforgeable by any other window
 *
 * @module
 */

import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import type { IconName } from '@molecule/app-icons'
import { resolveDeviceSize } from '@molecule/app-ide-panel-logic'
import {
  MAX_RECOVERY_CYCLES,
  type PrimitiveHooks,
  usePreviewPanelLogic,
} from '@molecule/app-ide-panel-logic/panels'
import { usePreview, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import type { PreviewPanelProps } from '../types.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.js'
import { Icon } from './Icon.js'

export { isRawDocumentUrl, previewTargetOrigin } from '@molecule/app-ide-panel-logic/panels'

/** React's own hooks, for the preview behaviour shared with the other frameworks' panels. */
const REACT_HOOKS: PrimitiveHooks = { useCallback, useEffect, useRef, useState }

/**
 * Live preview panel with iframe, device frame selector, and URL bar.
 * @param props - Component props.
 * @returns The rendered preview panel element.
 */
export function PreviewPanel({
  loadingIndicator,
  restartingIndicator,
  className,
  onPreviewError,
  onPreviewStuck,
  onRestartBackend,
  onRenderState,
  uiCommand,
  onUiResult,
  fileChangeTick,
  buildingHint,
  isBuilding,
  wakeAt,
}: PreviewPanelProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { state, setUrl, refresh, setDevice, openExternal, recordNavigation, back, forward } =
    usePreview()
  const {
    iframeRef,
    orientation,
    requestedSize,
    canRotate,
    currentLocation,
    isSecureLocation,
    everLoaded,
    iframeReady,
    fadingOut,
    iframeSrc,
    iframeMountKey,
    stuckRetryCount,
    previewGaveUp,
    lastGoodFrame,
    confirmedContent,
    blankPostBuild,
    previewFrozen,
    urlDraft,
    urlEditing,
    setFadingOut,
    setUrlDraft,
    setUrlEditing,
    handleDeviceChange,
    handleRotate,
    handleIframeLoad,
    handleUserRetry,
    handleReloadFrozen,
    handleBack,
    handleForward,
  } = usePreviewPanelLogic(
    REACT_HOOKS,
    { state, setDevice, recordNavigation, back, forward },
    {
      onPreviewError,
      onPreviewStuck,
      onRestartBackend,
      onRenderState,
      uiCommand,
      onUiResult,
      fileChangeTick,
      isBuilding,
      wakeAt,
    },
  )
  // Phone-width viewport: the device-frame selector is hidden (the phone IS the
  // device frame — the host resets the device to 'none' on mobile entry) and the
  // URL field keeps a sane minimum width so the nav buttons can never crush it.
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  // 16px input type on phones/touch devices — below that iOS Safari zooms the
  // page when the URL field receives focus.
  const bigUrlType = isNarrow || isCoarse

  // --- Rendering ---
  // Device frame sizes the iframe: fluid frames (responsive/desktop) fill the
  // area; fixed frames (tablet/mobile) get an explicit pixel width AND height,
  // swapped in landscape so rotation visibly re-proportions the preview.
  const deviceSize = resolveDeviceSize(state.device, orientation)
  const iframeWidth = requestedSize ? `${requestedSize.width}px` : deviceSize.width
  const iframeHeight = requestedSize ? `${requestedSize.height}px` : deviceSize.height
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
    <PreviewBlankNotice onReload={handleUserRetry} onOpenExternal={openExternal} />
  ) : isBuilding || building ? (
    <DefaultLoadingIndicator
      hint={buildingHint}
      retryCount={stuckRetryCount}
      onManualRetry={handleUserRetry}
    />
  ) : everLoaded ? (
    (restartingIndicator ??
    loadingIndicator ?? (
      <DefaultLoadingIndicator retryCount={stuckRetryCount} onManualRetry={handleUserRetry} />
    ))
  ) : (
    (loadingIndicator ?? (
      <DefaultLoadingIndicator retryCount={stuckRetryCount} onManualRetry={handleUserRetry} />
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
              // On phone-width viewports the field keeps an 80px floor (the
              // address ellipsizes) so the nav cluster can never squeeze it to
              // zero; elsewhere it may shrink freely.
              minWidth: isNarrow ? 80 : 0,
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
              className={cm.cn(!bigUrlType && cm.textSize('sm'))}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                // Normal (non-monospace) UI font at 14px (cm.textSize('sm')),
                // vertically centered by the field's align-center row (P4-12).
                // On phones/touch devices the class is dropped and 16px set
                // inline instead (never both — inline would silently override
                // the ClassMap class): sub-16px focused inputs make iOS Safari
                // zoom the page. Ellipsize the (unfocused) address overflow.
                fontSize: bigUrlType ? 16 : undefined,
                textOverflow: 'ellipsis',
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
            title={t('ide.preview.refresh', {}, { defaultValue: 'Refresh preview' })}
          />
          {/* The device-frame dropdown also hosts Rotate (only when the current */}
          {/* frame is rotatable — "where relevant") and Open in new tab (P4-04). */}
          {/* Hidden on phone-width viewports: the phone IS the device frame */}
          {/* (the host resets the device to 'none' on mobile entry), and the */}
          {/* 390px toolbar needs the width for the URL field. */}
          {!isNarrow && (
            <DeviceFrameSelector
              current={state.device}
              onChange={handleDeviceChange}
              canRotate={canRotate}
              rotated={orientation === 'landscape'}
              onRotate={handleRotate}
              onOpenExternal={openExternal}
            />
          )}
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
            title={t('ide.preview.livePreview', undefined, { defaultValue: 'Live Preview' })}
            className={cm.cn(state.device !== 'none' && state.device !== 'desktop' && cm.borderAll)}
            style={{
              width: iframeWidth,
              height: iframeHeight,
              borderRadius: state.device === 'mobile' ? '16px' : '0',
              background: '#fff',
            }}
            onLoad={handleIframeLoad}
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
                onClick={handleUserRetry}
                // A LABELLED button, so the 36px compact floor — the 44px
                // `touchTarget` is for the icon-only toolbar controls, whose
                // enlarged hit area is invisible (DESIGN.md → CTA semantics).
                className={cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                  cm.touchTargetCompact,
                )}
              >
                {t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })}
              </button>
              <button
                type="button"
                data-mol-id="preview-load-failed-open"
                onClick={openExternal}
                className={cm.cn(
                  cm.button({ variant: 'ghost', size: 'sm' }),
                  cm.touchTargetCompact,
                )}
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
              data-mol-id="preview-frozen-reload"
              onClick={handleReloadFrozen}
              // The same reload CTA as the load-failed and blank notice cards —
              // one action, one colour, on every surface. It was a hand-rolled
              // 12px/4px-radius `1px solid currentColor` pill.
              className={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
                cm.shrink0,
              )}
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
 * Tooltip, never the whole package barrel.
 * This BarButton is the reference pattern other IDE affordances should follow
 * when replacing native `title` tooltips.
 *
 * The compact `xs` size is ~26px tall — fine for a mouse but below the WCAG
 * 2.5.5 minimum tap target. `cm.touchTarget` grows the hit-area to >=44x44px on
 * coarse-pointer (touch) devices ONLY, so the toolbar stays compact on desktop
 * but is comfortably tappable on phones/tablets.
 * @param props - Component props.
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
 * @param props - Component props.
 * @returns The rendered loading indicator element.
 */
/**
 * Actionable notice shown when a build has FINISHED but the app rendered nothing — the
 * document loaded and the preview bridge is alive, yet no `molecule:ready` ever arrived
 * (the app's `#root` stayed empty). Unlike the reassuring building spinner, this gives the
 * user a clear way forward instead of a bare white screen: reload, or open the preview in a
 * new tab — and it honestly names the likely cause (an app error the agent can fix).
 * @param props - Component props.
 * @returns The rendered blank-preview notice card.
 */
function PreviewBlankNotice({
  onReload,
  onOpenExternal,
}: {
  onReload: () => void
  onOpenExternal: () => void
}): JSX.Element {
  const { t } = useTranslation()
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
          // Labelled CTA → the compact 36px floor, matching the identical
          // Reload preview / Open in new tab pair on the load-failed card.
          className={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
            cm.touchTargetCompact,
          )}
        >
          {t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })}
        </button>
        <button
          type="button"
          data-mol-id="preview-blank-open"
          onClick={onOpenExternal}
          className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
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
 * @param props - Component props.
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
  const { t } = useTranslation()
  const cm = getClassMap()
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
          data-mol-id="preview-manual-retry"
          onClick={onManualRetry}
          // Same recovery CTA as Reload preview / Reload app, so it is the same
          // design-system button rather than another hand-rolled outline pill.
          className={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
          )}
          style={{ marginTop: '8px' }}
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
