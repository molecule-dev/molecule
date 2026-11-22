/**
 * Live preview panel with iframe, device frame selection and URL bar.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `PreviewPanel` (see that file
 * for the design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks and service calls. The panel has NO behaviour of
 * its own — ONE `createPreviewPanelSession` (from `@molecule/app-ide-panel-logic/panels`)
 * runs exactly the code React's panel runs (server polling, stuck-load recovery,
 * the `molecule:*` postMessage bridge, the health check, the freeze watchdog,
 * the blank notice, wake patience, back/forward, the AI `uiCommand` relay): this
 * view renders from `session.getState()`, re-reading it whenever the session
 * publishes, puts the `<iframe>` element in the session's ref box (a FRESH
 * element whenever `iframeMountKey` changes, the way React's `key` remounts
 * one), passes the host-facing props to `session.update` whenever any of
 * them changes, and passes the live preview to `session.setPreview` whenever
 * `usePreview()` publishes a new state (the binding holds the provider
 * subscription, as React's `usePreview` does, so the session never subscribes
 * a second time). The only state the view owns is the default loading
 * indicator's rotating status phrase — React's `DefaultLoadingIndicator` holds
 * that locally too.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express (Solid, unlike React, does not append `px` to numeric
 * style values, so the pixels spell their unit). All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import { resolveDeviceSize } from '@molecule/app-ide-panel-logic'
import {
  createPreviewPanelSession,
  MAX_RECOVERY_CYCLES,
  type PreviewPanelLogicProps,
  type PreviewPanelPreview,
} from '@molecule/app-ide-panel-logic/panels'
import { usePreview, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-solid'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.jsx'
import { Icon } from './Icon.jsx'

export { isRawDocumentUrl, previewTargetOrigin } from '@molecule/app-ide-panel-logic/panels'

/**
 * Marks an inline style map as a RUNTIME value, so Solid applies each
 * declaration through the CSSOM (`element.style.setProperty`) — the path
 * React's `style` prop takes — instead of baking a static style object into
 * the element's template string, where the declarations would never be
 * normalized (`flex: 1` would stay `1` instead of React's `1 1 0%`,
 * `border: none` would stay `none` instead of React's `medium`). The map is
 * returned unchanged; only the compiler's static/dynamic decision changes.
 *
 * @param styles - The React-style declarations (CSS property → value).
 * @returns The same declarations.
 */
const inlineStyle = (styles: JSX.CSSProperties): JSX.CSSProperties => styles

/**
 * Props for {@link PreviewPanel} — the React prop names, React's own contract:
 * the shared behaviour's inputs plus the view-only ones (the two indicator
 * elements, the build hint and the root's extra classes).
 */
export interface PreviewPanelProps extends PreviewPanelLogicProps {
  /** Custom loading indicator shown while the dev server is starting. */
  loadingIndicator?: JSX.Element
  /** Custom loading indicator shown when the dev server restarts mid-session. Falls back to loadingIndicator if not provided. */
  restartingIndicator?: JSX.Element
  /**
   * Active-build hint (e.g. a basename like `GuestMenu.tsx`) the host sets while
   * the AI is editing files. While non-null the overlay content shows
   * "Updating `<hint>`…" instead of the rotating status phrases.
   */
  buildingHint?: string | null
  /** Extra classes for the root. */
  className?: string
}

/**
 * Molecule-themed status phrases rotated in the preview overlay. A build edits
 * files rapidly, so the preview can reload (or briefly blank) many times before
 * it settles — a static "Loading preview…" left users wondering what was
 * happening. Rotating phrases read as "the agent is actively working", not
 * "broken".
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
 * The preview panel's keyframes, as the style element's verbatim text (React's
 * template literal; whitespace is part of the rendered markup).
 */
const PULSE_KEYFRAMES = `
        @keyframes mol-preview-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `

/**
 * Live preview panel with iframe, device frame selector and URL bar.
 *
 * @param props - {@link PreviewPanelProps}.
 * @returns The rendered preview panel element.
 */
export function PreviewPanel(props: PreviewPanelProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { state, setUrl, refresh, setDevice, openExternal, recordNavigation, back, forward } =
    usePreview()
  // Phone-width viewport: the device-frame selector is hidden (the phone IS the
  // device frame — the host resets the device to 'none' on mobile entry) and the
  // URL field keeps a sane minimum width so the nav buttons can never crush it.
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  // 16px input type on phones/touch devices — below that iOS Safari zooms the
  // page when the URL field receives focus.
  const bigUrlType = (): boolean => isNarrow() || isCoarse()

  /**
   * The host-facing props the session runs with, read fresh from the view's
   * props (Solid props are getters, so the effect that passes them to
   * `session.update` re-runs whenever any of them changes).
   *
   * @returns The logic props.
   */
  const logicProps = (): PreviewPanelLogicProps => ({
    onPreviewError: props.onPreviewError,
    onPreviewStuck: props.onPreviewStuck,
    onRestartBackend: props.onRestartBackend,
    onRenderState: props.onRenderState,
    uiCommand: props.uiCommand,
    onUiResult: props.onUiResult,
    fileChangeTick: props.fileChangeTick,
    isBuilding: props.isBuilding,
    wakeAt: props.wakeAt,
  })

  /**
   * The live preview as the session takes it: the binding's state snapshot and
   * its four actions. The actions are the SAME function objects for the
   * panel's lifetime (this body runs once, as React's memoized callbacks do),
   * so an effect of the logic that depends on one never re-runs for them; the
   * state itself reaches the session through `session.setPreview` below
   * whenever the binding publishes a new one.
   *
   * @returns The live preview's latest state and actions.
   */
  const preview = (): PreviewPanelPreview => ({
    state: state(),
    setDevice,
    recordNavigation,
    back,
    forward,
  })

  // ONE session per mounted panel: it runs exactly the code React's panel runs.
  const session = createPreviewPanelSession({ preview: preview(), props: logicProps() })
  // The iframe box the session's bridge trusts messages from (the headless
  // `useRef` slot — the same object across every session render).
  const iframeRef = session.getState().iframeRef

  // Re-render from the session's state whenever it publishes: the tick bumps on
  // every session flush, which recomputes `logic` from `session.getState()`.
  const [sessionTick, setSessionTick] = createSignal(0)
  const stopSession = session.subscribe(() => setSessionTick((count) => count + 1))
  const logic = createMemo(() => {
    void sessionTick()
    return session.getState()
  })

  // Passes the panel's latest props to the session whenever any of them changes
  // (the first run's values were already passed at creation, so it is skipped —
  // React's props flow into its one render the same way).
  let propsPassed = false
  createEffect(() => {
    const next = logicProps()
    if (propsPassed) session.update(next)
    propsPassed = true
  })

  // Passes the live preview's latest state to the session whenever the binding's
  // `usePreview()` publishes one — its own provider subscription; the session
  // never subscribes a second time. The first run's values were already passed
  // at creation, so it is skipped, the way React's render passes the fresh
  // state it already holds.
  let previewPassed = false
  createEffect(() => {
    const next = preview()
    if (previewPassed) session.setPreview(next)
    previewPassed = true
  })

  // React keeps the URL field's `value` ATTRIBUTE in step with the controlled
  // value (the DOM snapshot carries the attribute as well as the live
  // property); Solid's `value` prop writes only the property, so the attribute
  // is mirrored here, the way this package's other fields do it.
  let urlInputEl: HTMLInputElement | undefined
  createEffect(() => {
    urlInputEl?.setAttribute('value', logic().urlDraft)
  })

  // Mounts the session (its timers, listeners and provider subscription);
  // unmounting stops all of them, stops the view's subscription and drops the
  // iframe element.
  onMount(() => {
    const disconnect = session.connect()
    onCleanup(() => {
      disconnect()
      stopSession()
      iframeRef.current = null
    })
  })

  // --- Rendering ---
  // Device frame sizes the iframe: fluid frames (responsive/desktop) fill the
  // area; fixed frames (tablet/mobile) get an explicit pixel width AND height,
  // swapped in landscape so rotation visibly re-proportions the preview.
  const deviceSize = createMemo(() => resolveDeviceSize(state().device, logic().orientation))
  const iframeWidth = (): string =>
    logic().requestedSize ? `${logic().requestedSize?.width}px` : deviceSize().width
  const iframeHeight = (): string =>
    logic().requestedSize ? `${logic().requestedSize?.height}px` : deviceSize().height
  // `building` selects the overlay CONTENT ("Updating `X`…") while the overlay
  // is shown for a BROKEN preview during edits — it no longer forces the overlay
  // over a healthy iframe.
  const building = (): boolean => props.buildingHint != null
  // The agent is actively building AND the app has not confirmed it rendered
  // content (no molecule:ready). The iframe may have "loaded" into a
  // half-built/blank/white state — keep the reassuring "Building your app…"
  // overlay up over it instead of a bare white screen.
  const buildingUnconfirmed = createMemo(
    () => (props.isBuilding || building()) && !logic().confirmedContent,
  )
  const showOverlay = createMemo(
    () =>
      Boolean(state().url) &&
      !logic().previewGaveUp &&
      (!logic().iframeReady ||
        logic().fadingOut ||
        logic().blankPostBuild ||
        buildingUnconfirmed()),
  )
  // Fully opaque + interactive whenever it is standing in for missing content
  // (only the ready-then-fading-out state animates to transparent).
  const overlaySolid = createMemo(
    () => !logic().iframeReady || logic().blankPostBuild || buildingUnconfirmed(),
  )

  /**
   * Which of React's `overlayContent` branches is rendered, as a key that
   * changes EXACTLY when React would remount the branch (a different element
   * type at the position): the blank notice, a custom indicator slot, or the
   * default loading indicator. React reconciles the two default-indicator
   * branches (with and without a build hint) as the SAME component, so they share
   * one key here and the rotation survives the switch.
   *
   * @returns The overlay content key.
   */
  const overlayKey = createMemo<'blank' | 'slot-restarting' | 'slot-loading' | 'default'>(() => {
    const current = logic()
    if (current.blankPostBuild) return 'blank'
    if (props.isBuilding || building()) return 'default'
    if (current.everLoaded) {
      if (props.restartingIndicator) return 'slot-restarting'
      if (props.loadingIndicator) return 'slot-loading'
      return 'default'
    }
    if (props.loadingIndicator) return 'slot-loading'
    return 'default'
  })

  return (
    <div class={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, props.className)}>
      {/* Browser-style URL bar: a borderless, full-height address field on the
          left, then a full-height divider, then the nav cluster (back/forward,
          refresh) and the device-frame dropdown (which now also holds Rotate +
          Open in new tab) — left → right, like a real browser toolbar. */}
      <div class={cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.shrink0, cm.borderB)}>
        <div class={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))}>
          <div
            data-mol-id="preview-url-field"
            class={cm.cn(
              cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.surface,
            )}
            style={inlineStyle({
              flex: '1',
              // On phone-width viewports the field keeps an 80px floor (the
              // address ellipsizes) so the nav cluster can never squeeze it to
              // zero; elsewhere it may shrink freely.
              'min-width': isNarrow() ? '80px' : '0px',
              // Full height (P4-12): the address field stretches to fill the
              // toolbar row instead of sitting as a short centered box.
              'align-self': 'stretch',
              'border-radius': '6px',
              // Borderless (P4-12): no resting border. The focus indicator is a
              // primary-token ring shown only while editing — it preserves the
              // WCAG 2.4.7 focus indicator the removed border used to carry,
              // without a boxed border at rest.
              'box-shadow': logic().urlEditing
                ? '0 0 0 2px var(--mol-color-primary, #6366f1)'
                : 'none',
              transition: 'box-shadow 120ms',
            })}
          >
            <Tooltip
              content={
                logic().isSecureLocation
                  ? t('ide.preview.secure', {}, { defaultValue: 'Secure (HTTPS)' })
                  : t('ide.preview.address', {}, { defaultValue: 'Preview address' })
              }
              placement="bottom"
            >
              <Icon
                name={logic().isSecureLocation ? 'lock' : 'globe'}
                size={16}
                data-mol-id="preview-site-info"
                className={cm.cn(cm.textMuted, cm.sp('mr', 1))}
                aria-hidden="true"
              />
            </Tooltip>
            <input
              type="text"
              data-mol-id="preview-url"
              ref={(el) => {
                urlInputEl = el
              }}
              value={logic().urlDraft}
              onInput={(e) => logic().setUrlDraft(e.currentTarget.value)}
              onFocus={(e) => {
                logic().setUrlEditing(true)
                // Select-all on focus so one click readies the whole address to
                // overtype or copy — standard browser omnibox behavior.
                e.currentTarget.select()
              }}
              onBlur={() => logic().setUrlEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const next = logic().urlDraft.trim()
                  if (next) setUrl(next)
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  logic().setUrlDraft(logic().currentLocation)
                  e.currentTarget.blur()
                }
              }}
              aria-label={t('ide.preview.urlBar', {}, { defaultValue: 'Preview URL' })}
              class={cm.cn(!bigUrlType() && cm.textSize('sm'))}
              style={inlineStyle({
                flex: '1',
                'min-width': '0px',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                // Normal (non-monospace) UI font at 14px (cm.textSize('sm')),
                // vertically centered by the field's align-center row (P4-12).
                // On phones/touch devices the class is dropped and 16px set
                // inline instead (never both — inline would silently override
                // the ClassMap class): sub-16px focused inputs make iOS Safari
                // zoom the page. Ellipsize the (unfocused) address overflow.
                'font-size': bigUrlType() ? '16px' : undefined,
                'text-overflow': 'ellipsis',
                'font-family': 'inherit',
                // The wrapping address field carries the visible focus indicator
                // (a primary-token ring while focused), so the input's own outline
                // is intentionally suppressed here — matching the chat input.
                outline: 'none',
              })}
            />
          </div>
          {/* Full-height divider to the LEFT of the nav cluster (P4-12): a vertical
              separator between the address field and the back/forward/etc icons. */}
          <div
            aria-hidden="true"
            data-mol-id="preview-toolbar-separator"
            style={inlineStyle({
              'align-self': 'stretch',
              width: '1px',
              'flex-shrink': '0',
              margin: '0 4px',
              background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
            })}
          />
          {/* Nav cluster: back/forward navigate the preview's own history, refresh */}
          {/* reloads. The device dropdown picks a frame AND hosts Rotate + Open in */}
          {/* new tab (P4-04) — the rotate/open buttons no longer sit in the toolbar. */}
          <BarButton
            icon="arrow-left"
            molId="preview-back"
            onClick={() => logic().handleBack()}
            disabled={!state().canGoBack}
            title={t('ide.preview.back', {}, { defaultValue: 'Back' })}
          />
          <BarButton
            icon="arrow-right"
            molId="preview-forward"
            onClick={() => logic().handleForward()}
            disabled={!state().canGoForward}
            title={t('ide.preview.forward', {}, { defaultValue: 'Forward' })}
          />
          <BarButton
            icon="sync"
            molId="preview-refresh"
            onClick={() => refresh()}
            title={t('ide.preview.refresh', {}, { defaultValue: 'Refresh preview' })}
          />
          {/* The device-frame dropdown also hosts Rotate (only when the current */}
          {/* frame is rotatable — "where relevant") and Open in new tab (P4-04). */}
          {/* Hidden on phone-width viewports: the phone IS the device frame */}
          {/* (the host resets the device to 'none' on mobile entry), and the */}
          {/* 390px toolbar needs the width for the URL field. */}
          <Show when={!isNarrow()}>
            <DeviceFrameSelector
              current={state().device}
              onChange={(device) => logic().handleDeviceChange(device)}
              canRotate={logic().canRotate}
              rotated={logic().orientation === 'landscape'}
              onRotate={() => logic().handleRotate()}
              onOpenExternal={() => openExternal()}
            />
          </Show>
        </div>
      </div>

      {/* Preview area */}
      <div
        class={cm.cn(
          cm.flex({ direction: 'row', justify: 'center', align: 'center' }),
          cm.surfaceSecondary,
        )}
        style={inlineStyle({
          flex: '1',
          'min-height': '0px',
          overflow: 'auto',
          position: 'relative',
        })}
      >
        {/* Iframe — always mounted when we have a src, sits behind overlay. The
            keyed Show mounts a FRESH element whenever the mount key changes (the
            way React's key={iframeMountKey} does); a src change alone navigates
            the SAME element, as React's attribute update does. */}
        <Show when={logic().iframeSrc ? logic().iframeMountKey : null} keyed>
          {(_mountKey) => (
            <iframe
              ref={(el) => {
                iframeRef.current = el
                onCleanup(() => {
                  if (iframeRef.current === el) iframeRef.current = null
                })
              }}
              src={logic().iframeSrc}
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              title={t('ide.preview.livePreview', undefined, { defaultValue: 'Live Preview' })}
              class={cm.cn(
                state().device !== 'none' && state().device !== 'desktop' && cm.borderAll,
              )}
              style={inlineStyle({
                width: iframeWidth(),
                height: iframeHeight(),
                'border-radius': state().device === 'mobile' ? '16px' : '0',
                background: '#fff',
              })}
              onLoad={() => logic().handleIframeLoad()}
            />
          )}
        </Show>

        {/* Overlay — "Loading preview" */}
        <Show when={showOverlay()}>
          <div
            data-mol-id="preview-overlay"
            style={inlineStyle({
              position: 'absolute',
              inset: '0',
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              'z-index': '1',
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
                logic().everLoaded && logic().lastGoodFrame
                  ? 'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 78%, transparent)'
                  : 'var(--mol-color-surface-secondary, #f5f5f5)',
              // DO NOT add `backdrop-filter` here. This overlay sits ON TOP of the live
              // cross-origin preview <iframe> (an out-of-process iframe). backdrop-filter must
              // SAMPLE its backdrop — i.e. read the OOPIF's compositor surface across processes
              // every frame. Under software / GPU-less compositing that cross-process surface
              // read DEADLOCKS the host renderer's main thread. The blurred "last working UI"
              // is provided SAFELY by the last-good-frame <img> below — it blurs its OWN
              // pixels (a same-origin snapshot), never the live OOPIF backdrop.
              // Anything standing in for missing content (a build, a blank fallback, an
              // unconfirmed building app, or a post-build blank) forces the overlay fully
              // visible (it may have already faded out from a prior ready state); otherwise
              // honor the fade-out.
              opacity: overlaySolid() ? '1' : logic().fadingOut ? '0' : '1',
              transition: 'opacity 0.5s ease-out',
              'pointer-events': overlaySolid() || !logic().fadingOut ? 'auto' : 'none',
            })}
            onTransitionEnd={() => {
              if (logic().fadingOut) logic().setFadingOut(false)
            }}
          >
            {/* Last working build, shown BLURRED behind the overlay content while
                the app is rebuilding or blank — so the user sees the previous good
                UI instead of a white iframe. Gated on everLoaded so the first cold
                load (no frame captured yet) is unaffected. */}
            <Show when={logic().everLoaded && logic().lastGoodFrame}>
              <>
                <img
                  src={logic().lastGoodFrame ?? undefined}
                  data-mol-id="preview-last-frame"
                  alt={t(
                    'ide.preview.lastWorkingFrame',
                    {},
                    {
                      defaultValue: 'Last working preview',
                    },
                  )}
                  style={inlineStyle({
                    position: 'absolute',
                    inset: '0',
                    width: '100%',
                    height: '100%',
                    'object-fit': 'cover',
                    'object-position': 'top center',
                    filter: 'blur(8px)',
                    'z-index': '0',
                    'pointer-events': 'none',
                  })}
                />
                {/* Subtle theme-token scrim over the frame so the status card reads
                    clearly without hiding the last-good UI entirely. */}
                <div
                  aria-hidden="true"
                  style={inlineStyle({
                    position: 'absolute',
                    inset: '0',
                    'z-index': '0',
                    background:
                      'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 55%, transparent)',
                    'pointer-events': 'none',
                  })}
                />
              </>
            </Show>
            <div style={inlineStyle({ position: 'relative', 'z-index': '1' })}>
              {/* React's overlayContent, keyed so each branch remounts exactly
                  where React would remount it (see overlayKey). */}
              <Show when={overlayKey()} keyed>
                {(key) => {
                  if (key === 'blank') {
                    // Build finished but the app rendered nothing — actionable, not a spinner.
                    return (
                      <PreviewBlankNotice
                        onReload={() => logic().handleUserRetry()}
                        onOpenExternal={() => openExternal()}
                      />
                    )
                  }
                  if (key === 'slot-restarting') return props.restartingIndicator
                  if (key === 'slot-loading') return props.loadingIndicator
                  // The default indicator serves both the building branch (with
                  // the hint) and the plain loading/restarting branches, as React's
                  // same-type reconciliation keeps one component there.
                  return (
                    <DefaultLoadingIndicator
                      hint={props.isBuilding || building() ? (props.buildingHint ?? null) : null}
                      retryCount={logic().stuckRetryCount}
                      onManualRetry={() => logic().handleUserRetry()}
                    />
                  )
                }}
              </Show>
            </div>
          </div>
        </Show>

        {/* Loop breaker — recovery cap reached. Stop thrashing the iframe forever
            and give the user a deterministic way out: reload, or open the preview
            URL directly in a new tab (which always works even when framing here
            fails). Replaces the old indefinite remount loop. */}
        <Show when={logic().previewGaveUp}>
          <div
            data-mol-id="preview-load-failed"
            class={cm.surface}
            style={inlineStyle({
              position: 'absolute',
              inset: '0',
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              gap: '12px',
              'z-index': '2',
              padding: '24px',
              'text-align': 'center',
            })}
          >
            <Icon name="x-circle" size={28} className={cm.textMuted} aria-hidden="true" />
            <div
              class={cm.cn(cm.textSize('sm'))}
              style={inlineStyle({ color: 'var(--mol-color-text, #333)', 'font-weight': '600' })}
            >
              {t('ide.preview.loadFailed', {}, { defaultValue: "Preview can't load here" })}
            </div>
            <div
              class={cm.cn(cm.textSize('xs'), cm.textMuted)}
              style={inlineStyle({ 'max-width': '320px' })}
            >
              {t(
                'ide.preview.loadFailedHint',
                {},
                {
                  defaultValue: 'Try reloading, or open the preview in a new tab.',
                },
              )}
            </div>
            <div style={inlineStyle({ display: 'flex', gap: '8px' })}>
              <button
                type="button"
                data-mol-id="preview-load-failed-reload"
                onClick={() => logic().handleUserRetry()}
                // A LABELLED button, so the 36px compact floor — the 44px
                // `touchTarget` is for the icon-only toolbar controls, whose
                // enlarged hit area is invisible (DESIGN.md → CTA semantics).
                class={cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                  cm.touchTargetCompact,
                )}
              >
                {t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })}
              </button>
              <button
                type="button"
                data-mol-id="preview-load-failed-open"
                onClick={() => openExternal()}
                class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
              >
                {t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })}
              </button>
            </div>
          </div>
        </Show>

        {/* No URL state */}
        <Show when={!state().url}>
          <div
            class={cm.cn(cm.textMuted, cm.textSize('sm'))}
            style={inlineStyle({
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              width: '100%',
            })}
          >
            {state().isLoading
              ? t('ide.preview.starting', {}, { defaultValue: 'Loading preview...' })
              : t('ide.preview.noPreview', {}, { defaultValue: 'No preview available' })}
          </div>
        </Show>

        {/* Freeze watchdog banner — heartbeats stopped → the app's thread is locked.
            Gated on confirmedContent: "this app stopped responding" only makes sense once the
            app was actually SHOWING content. A never-rendered / blank app is covered by the
            building / blank overlay instead, so the two never contradict each other. */}
        <Show when={logic().previewFrozen && logic().confirmedContent && !logic().fadingOut}>
          <div
            class={cm.cn(cm.textSize('xs'), cm.bgErrorSubtle, cm.textError)}
            style={inlineStyle({
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              'z-index': '3',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
              gap: '12px',
              padding: '8px 12px',
            })}
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
              onClick={() => logic().handleReloadFrozen()}
              // The same reload CTA as the load-failed and blank notice cards —
              // one action, one colour, on every surface.
              class={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
                cm.shrink0,
              )}
            >
              {t('ide.preview.frozenReload', {}, { defaultValue: 'Reload app' })}
            </button>
          </div>
        </Show>

        <Show when={state().error}>
          <div
            class={cm.cn(cm.textSize('sm'), cm.sp('p', 3), cm.bgErrorSubtle, cm.textError)}
            style={inlineStyle({
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              'z-index': '2',
            })}
          >
            {state().error}
          </div>
        </Show>
      </div>
    </div>
  )
}

/**
 * A single icon button inside the preview URL bar. Renders a ghost button with
 * an icon-set glyph wrapped in the framework's REAL styled {@link Tooltip} —
 * instant, themed via ClassMap tokens, and focus-aware — NOT the delayed,
 * unstyled, touch-blind native `title` attribute it replaces. `disabled` buttons
 * (e.g. Back/Forward when there's no history entry to go to) are dimmed and
 * non-interactive via the ClassMap button's built-in disabled styling.
 *
 * The compact `xs` size is ~26px tall — fine for a mouse but below the WCAG
 * 2.5.5 minimum tap target. `cm.touchTarget` grows the hit-area to >=44x44px on
 * coarse-pointer (touch) devices ONLY, so the toolbar stays compact on desktop
 * but is comfortably tappable on phones/tablets.
 *
 * @param props - Component props.
 * @returns The rendered button element.
 */
function BarButton(props: {
  icon: IconName
  title: string
  molId: string
  onClick?: () => void
  disabled?: boolean
}): JSX.Element {
  const cm = getClassMap()
  return (
    <Tooltip content={props.title} placement="bottom">
      <button
        type="button"
        data-mol-id={props.molId}
        aria-label={props.title}
        onClick={props.onClick}
        disabled={props.disabled}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
      >
        <Icon name={props.icon} size={16} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}

/**
 * Actionable notice shown when a build has FINISHED but the app rendered nothing — the
 * document loaded and the preview bridge is alive, yet no `molecule:ready` ever arrived
 * (the app's `#root` stayed empty). Unlike the reassuring building spinner, this gives the
 * user a clear way forward instead of a bare white screen: reload, or open the preview in
 * a new tab — and it honestly names the likely cause (an app error the agent can fix).
 *
 * @param props - Component props.
 * @returns The rendered blank-preview notice card.
 */
function PreviewBlankNotice(props: {
  onReload: () => void
  onOpenExternal: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      data-mol-id="preview-blank-notice"
      class={cm.surface}
      style={inlineStyle({
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        gap: '12px',
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
        'border-radius': '8px',
        padding: '20px 24px',
        'max-width': '360px',
        'text-align': 'center',
        'box-shadow': '0 2px 8px rgba(0,0,0,0.12)',
      })}
    >
      <Icon name="image" size={28} className={cm.textMuted} aria-hidden="true" />
      <div
        class={cm.cn(cm.textSize('sm'))}
        style={inlineStyle({ color: 'var(--mol-color-text, #333)', 'font-weight': '600' })}
      >
        {t('ide.preview.blankTitle', {}, { defaultValue: 'The preview is blank' })}
      </div>
      <div
        class={cm.cn(cm.textSize('xs'), cm.textMuted)}
        style={inlineStyle({ 'line-height': '1.5' })}
      >
        {t(
          'ide.preview.blankHint',
          {},
          {
            defaultValue:
              'The app loaded but didn’t render anything — it may have an error. Synthase has been notified. You can reload, or open the preview in a new tab.',
          },
        )}
      </div>
      <div style={inlineStyle({ display: 'flex', gap: '8px' })}>
        <button
          type="button"
          data-mol-id="preview-blank-reload"
          onClick={props.onReload}
          // Labelled CTA → the compact 36px floor, matching the identical
          // Reload preview / Open in new tab pair on the load-failed card.
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
            cm.touchTargetCompact,
          )}
        >
          {t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })}
        </button>
        <button
          type="button"
          data-mol-id="preview-blank-open"
          onClick={props.onOpenExternal}
          class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
        >
          {t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })}
        </button>
      </div>
    </div>
  )
}

/**
 * Default preview-overlay content: pulsing dots, a status message, and (after
 * repeated recovery cycles) a manual retry button. With a `hint` it shows
 * "Updating `<hint>`" (the file the build is currently editing); without one it
 * rotates molecule-themed phrases so the overlay never reads as frozen.
 *
 * @param props - Component props.
 * @returns The rendered loading indicator.
 */
function DefaultLoadingIndicator(props: {
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
  const [msgIdx, setMsgIdx] = createSignal(0)
  createEffect(() => {
    if (props.hint) return
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % PREVIEW_MESSAGES.length), 2400)
    onCleanup(() => clearInterval(id))
  })
  const phrase = createMemo(() => PREVIEW_MESSAGES[msgIdx()])

  return (
    // A self-contained "card" backdrop on SOLID theme tokens. The overlay scrim is
    // intentionally semi-transparent (the last UI / blurred last-good frame stays
    // dimly visible), so the status text used to bleed into a white/light preview
    // and become unreadable — worst in light theme. A solid surface card guarantees
    // the dots + status + retry always sit on a known, theme-correct backdrop.
    <div
      style={inlineStyle({
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        gap: '16px',
        background: 'var(--mol-color-surface, #fff)',
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
        'border-radius': '8px',
        padding: '16px 24px',
        'box-shadow': '0 2px 8px rgba(0,0,0,0.12)',
      })}
    >
      <div style={inlineStyle({ display: 'flex', gap: '8px' })}>
        {[0, 1, 2].map((i) => (
          <span
            style={inlineStyle({
              width: '8px',
              height: '8px',
              'border-radius': '50%',
              background: 'var(--mol-color-primary, #4070e0)',
              animation: `mol-preview-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            })}
          />
        ))}
      </div>
      <span
        style={inlineStyle({
          'font-size': '13px',
          // Foreground token (not the low-contrast muted token) so "Updating
          // <file>" reads with full contrast in BOTH themes — the card backdrop
          // above guarantees a known surface behind it.
          color: 'var(--mol-color-text, #333)',
          'text-align': 'center',
        })}
      >
        {props.hint ? (
          <>
            {t('ide.preview.updating', {}, { defaultValue: 'Updating' })}{' '}
            <code
              style={inlineStyle({
                'font-family': 'monospace',
                'font-size': 'inherit',
                opacity: '0.9',
              })}
            >
              {props.hint}
            </code>
          </>
        ) : (
          t(phrase().key, {}, { defaultValue: phrase().defaultValue })
        )}
      </span>
      {props.retryCount > 0 && (
        <span
          style={inlineStyle({
            'font-size': '11px',
            color: 'var(--mol-color-text-muted, #888)',
          })}
        >
          {t(
            'ide.preview.retryCount',
            { count: props.retryCount },
            {
              defaultValue: 'Retry attempt {{count}}',
            },
          )}
        </span>
      )}
      {props.retryCount >= MAX_RECOVERY_CYCLES && props.onManualRetry && (
        <button
          type="button"
          data-mol-id="preview-manual-retry"
          onClick={props.onManualRetry}
          // Same recovery CTA as Reload preview / Reload app, so it is the same
          // design-system button rather than another hand-rolled outline pill.
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
          )}
          style={inlineStyle({ 'margin-top': '8px' })}
        >
          {t('ide.preview.retryButton', {}, { defaultValue: 'Retry now' })}
        </button>
      )}
      <style>{PULSE_KEYFRAMES}</style>
    </div>
  )
}
