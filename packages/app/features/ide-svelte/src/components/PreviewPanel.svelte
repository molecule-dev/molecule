<!--
  PreviewPanel: the Svelte counterpart of `@molecule/app-ide-react`'s
  `PreviewPanel` — the live app preview: a browser-style URL bar (typing,
  Escape, Back/Forward, refresh, the site-info glyph), the device-frame
  selector, and the preview `<iframe>` behind a status overlay. Same props
  (React names), same DOM for the same input, same callbacks and service
  calls. See the React file for the design notes.

  The panel has NO behaviour of its own: one `createPreviewPanelSession`
  (from `@molecule/app-ide-panel-logic/panels`) per mounted panel runs the
  shared behaviour — server polling, stuck-load recovery, the `molecule:*`
  postMessage bridge, the health check, the freeze watchdog, the blank
  notice, wake patience, back/forward and the AI `uiCommand` relay — and the
  view re-renders from `session.getState()` whenever the session publishes.
  The only view-local moving part is the default loading indicator's
  rotating status phrase, exactly as in React's view.

  Inline styles are written as plain CSS text and applied through the
  `styleText` action, which writes each declaration with `style.setProperty`
  — exactly how React's style objects reach the DOM.

  Styling uses `getClassMap()` (`cm.*`); all user-facing text goes through
  `t()`.
-->
<script module lang="ts">
  import type { IconName } from '@molecule/app-icons'

  import type * as types from '../types.js'

  /** The panel's props — the plain-TS contract in src/types.ts (React's own prop names). */
  export type PreviewPanelProps = types.PreviewPanelProps

  /**
   * Molecule-themed status phrases rotated in the preview overlay. A build
   * edits files rapidly, so the preview can reload (or briefly blank) many
   * times before it settles — a static "Loading preview…" left users
   * wondering what was happening. Rotating phrases read as "the agent is
   * actively working", not "broken".
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
   * The pulse keyframes the default indicator's dots animate with, emitted as a
   * real `<style>` ELEMENT inside the card (a component-style block is CSS for
   * the component, not a DOM node). The text is byte-for-byte React's.
   */
  const PULSE_KEYFRAMES = `
        @keyframes mol-preview-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `

  /** The toolbar separator between the address field and the nav cluster. */
  const SEPARATOR_STYLE =
    'align-self: stretch; width: 1px; flex-shrink: 0; margin: 0 4px; background: var(--mol-color-border, rgba(128,128,128,0.2))'

  /** The scrollable preview area the iframe and overlays sit in. */
  const PREVIEW_AREA_STYLE = 'flex: 1; min-height: 0px; overflow: auto; position: relative'

  /** The blurred last-good frame behind the overlay. */
  const LAST_FRAME_STYLE =
    'position: absolute; inset: 0px; width: 100%; height: 100%; object-fit: cover; object-position: top center; filter: blur(8px); z-index: 0; pointer-events: none'

  /** The scrim that keeps the overlay content readable over the frame. */
  const SCRIM_STYLE =
    'position: absolute; inset: 0px; z-index: 0; background: color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 55%, transparent); pointer-events: none'

  /** The overlay content wrapper. */
  const OVERLAY_CONTENT_STYLE = 'position: relative; z-index: 1'

  /** The loop-breaker panel that covers the whole preview area. */
  const LOAD_FAILED_STYLE =
    'position: absolute; inset: 0px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; z-index: 2; padding: 24px; text-align: center'

  /** A notice title (full-contrast text, semibold). */
  const NOTICE_TITLE_STYLE = 'color: var(--mol-color-text, #333); font-weight: 600'

  /** The loop breaker hint width. */
  const HINT_MAX_WIDTH_STYLE = 'max-width: 320px'

  /** A row of notice action buttons. */
  const BUTTON_ROW_STYLE = 'display: flex; gap: 8px'

  /** The no-preview placeholder. */
  const NO_URL_STYLE = 'display: flex; align-items: center; justify-content: center; width: 100%'

  /** The freeze-watchdog banner. */
  const FROZEN_BANNER_STYLE =
    'position: absolute; top: 0px; left: 0px; right: 0px; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px'

  /** The preview error banner. */
  const ERROR_BANNER_STYLE = 'position: absolute; bottom: 0px; left: 0px; right: 0px; z-index: 2'

  /** The blank-preview notice card. */
  const BLANK_NOTICE_STYLE =
    'display: flex; flex-direction: column; align-items: center; gap: 12px; border: 1px solid var(--mol-color-border, rgba(128,128,128,0.2)); border-radius: 8px; padding: 20px 24px; max-width: 360px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.12)'

  /** The blank notice hint line height. */
  const BLANK_HINT_STYLE = 'line-height: 1.5'

  /** The default loading indicator solid surface card. */
  const INDICATOR_CARD_STYLE =
    'display: flex; flex-direction: column; align-items: center; gap: 16px; background: var(--mol-color-surface, #fff); border: 1px solid var(--mol-color-border, rgba(128,128,128,0.2)); border-radius: 8px; padding: 16px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12)'

  /** The pulsing-dots row. */
  const DOTS_ROW_STYLE = 'display: flex; gap: 8px'

  /** The indicator status line. */
  const STATUS_SPAN_STYLE =
    'font-size: 13px; color: var(--mol-color-text, #333); text-align: center'

  /** The updated-file name inside the status line. */
  const CODE_STYLE = 'font-family: monospace; font-size: inherit; opacity: 0.9'

  /** The retry-count line. */
  const RETRY_COUNT_STYLE = 'font-size: 11px; color: var(--mol-color-text-muted, #888)'

  /** The retry button offset. */
  const RETRY_MARGIN_STYLE = 'margin-top: 8px'
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { get } from 'svelte/store'

  import { resolveDeviceSize } from '@molecule/app-ide-panel-logic'
  import type { PreviewPanelLogicProps } from '@molecule/app-ide-panel-logic/panels'
  import {
    createPreviewPanelSession,
    MAX_RECOVERY_CYCLES,
  } from '@molecule/app-ide-panel-logic/panels'
  import { usePreview, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
  import { styleText } from '../parts/inline-style.js'
  import DeviceFrameSelector from './DeviceFrameSelector.svelte'
  import Icon from './Icon.svelte'

  let {
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
  }: PreviewPanelProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  // The live preview as the view takes it: `usePreview()` binds the provider —
  // once; the session never subscribes a second time — and hands out its
  // display state and actions.
  const preview = usePreview()
  const pstate = preview.state
  // The four actions the session drives the live preview with: `usePreview()`
  // created them once for this mounted panel, and they must stay the SAME
  // function objects on every `setPreview` — an effect that depends on one
  // would re-run and loop.
  const previewActions = {
    setDevice: preview.setDevice,
    recordNavigation: preview.recordNavigation,
    back: preview.back,
    forward: preview.forward,
  }

  // Phone-width viewport: the device-frame selector is hidden (the phone IS the
  // device frame — the host resets the device to 'none' on mobile entry) and the
  // URL field keeps a sane minimum width so the nav buttons can never crush it.
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  // 16px input type on phones/touch devices — below that iOS Safari zooms the
  // page when the URL field receives focus.
  const bigUrlType = $derived($isNarrow || $isCoarse)

  // ONE session per mounted panel: it runs exactly the code React's panel runs,
  // and its first render is the panel's first render — with the mount's props,
  // as React's first render has them (the two indicator slots, the building hint
  // and the root classes are view-only and never reach the logic).
  let appliedProps: PreviewPanelLogicProps = untrack(() => ({
    onPreviewError,
    onPreviewStuck,
    onRestartBackend,
    onRenderState,
    uiCommand,
    onUiResult,
    fileChangeTick,
    isBuilding,
    wakeAt,
  }))
  const session = createPreviewPanelSession({
    preview: { state: get(pstate), ...previewActions },
    props: appliedProps,
  })

  // Re-render from the session's state whenever it publishes: the tick bumps on
  // every session flush, which recomputes `logic` from `session.getState()`.
  let sessionTick = $state(0)
  const stopSession = session.subscribe(() => {
    sessionTick += 1
  })
  const logic = $derived.by(() => {
    void sessionTick
    return session.getState()
  })

  // The iframe box the session's bridge trusts messages from (stable across
  // renders — the headless `useRef` slot).
  const iframeBox = session.getState().iframeRef

  // Passes the panel's latest props to the session whenever any of them changes.
  // The reads of the props are the effect's dependencies; the session update
  // itself runs untracked, so the flush it causes (and this component's tick
  // write in the session's listener) is never attributed back to this effect —
  // a tracked update would read and write `sessionTick` in one effect and loop.
  $effect(() => {
    const next: PreviewPanelLogicProps = {
      onPreviewError,
      onPreviewStuck,
      onRestartBackend,
      onRenderState,
      uiCommand,
      onUiResult,
      fileChangeTick,
      isBuilding,
      wakeAt,
    }
    untrack(() => {
      // The mount's props are already in the session's first render.
      if (sameLogicProps(appliedProps, next)) return
      appliedProps = next
      session.update(next)
    })
  })

  // Feeds the session each new live-preview state on the binding store's own
  // schedule — the read React's `useSyncExternalStore` renders on — so the
  // logic sees every change exactly when React's does (an effect would run a
  // Svelte flush later, and the recovery schedules shift). The store contract's
  // immediate first call re-states the state the session already rendered
  // with: one cheap rerender before mount, with no effects behind it. The
  // session update itself runs untracked, like the props update above — the
  // flush it causes (and this component's tick write in the session's
  // listener) must never be attributed back to a Svelte reaction.
  const stopPreviewFeed = pstate.subscribe((next) => {
    untrack(() => {
      session.setPreview({ state: next, ...previewActions })
    })
  })

  /**
   * Whether two sets of logic props hold the same values (so the session only
   * re-renders for a real prop change, as React's `usePreviewPanelLogic` does
   * when a parent re-render passes the same values).
   *
   * @param a - One set of logic props.
   * @param b - The other set.
   * @returns Whether every prop is identical.
   */
  function sameLogicProps(a: PreviewPanelLogicProps, b: PreviewPanelLogicProps): boolean {
    return (
      a.onPreviewError === b.onPreviewError &&
      a.onPreviewStuck === b.onPreviewStuck &&
      a.onRestartBackend === b.onRestartBackend &&
      a.onRenderState === b.onRenderState &&
      a.uiCommand === b.uiCommand &&
      a.onUiResult === b.onUiResult &&
      a.fileChangeTick === b.fileChangeTick &&
      a.isBuilding === b.isBuilding &&
      a.wakeAt === b.wakeAt
    )
  }

  // Mounts the session (its timers, listeners and provider subscription);
  // unmounting stops all of them and drops the iframe element.
  onMount(() => {
    const disconnect = session.connect()
    return () => {
      disconnect()
      stopSession()
      stopPreviewFeed()
      iframeBox.current = null
    }
  })

  /**
   * Puts the rendered preview `<iframe>` element into the session's ref box
   * (and clears the box when the element goes away). A `{#key}` block remounts
   * the element, so the cleanup may run before the next mount — only the
   * element this run installed is cleared.
   *
   * @param el - The iframe element Svelte just created.
   * @returns The Svelte action's teardown hook.
   */
  function mountPreviewIframe(el: HTMLIFrameElement): { destroy: () => void } {
    iframeBox.current = el
    return {
      destroy: () => {
        if (iframeBox.current === el) iframeBox.current = null
      },
    }
  }

  // --- View state: the default indicator's rotating status phrase ---
  // React's DefaultLoadingIndicator holds this locally and mounts/unmounts with
  // its branch; the index resets whenever the default indicator stops being the
  // rendered overlay content (React remounts it at 0) and the ~2.4s rotation
  // runs while it is shown WITHOUT a build hint. The deriveds live below the
  // overlay conditions they read; the effect runs after mount, once the whole
  // script has initialized.
  let messageIndex = $state(0)

  // --- Rendering ---
  // Device frame sizes the iframe: fluid frames (responsive/desktop) fill the
  // area; fixed frames (tablet/mobile) get an explicit pixel width AND height,
  // swapped in landscape so rotation visibly re-proportions the preview.
  const deviceSize = $derived(resolveDeviceSize($pstate.device, logic.orientation))
  const iframeWidth = $derived(
    logic.requestedSize ? `${logic.requestedSize.width}px` : deviceSize.width,
  )
  const iframeHeight = $derived(
    logic.requestedSize ? `${logic.requestedSize.height}px` : deviceSize.height,
  )
  // `building` selects the overlay CONTENT ("Updating `X`…") while the overlay
  // is shown for a BROKEN preview during edits — it no longer forces the overlay
  // over a healthy iframe.
  const building = $derived(buildingHint != null)
  // The agent is actively building AND the app has not confirmed it rendered
  // content (no molecule:ready): keep the reassuring overlay up over a
  // half-built/blank iframe instead of a bare white screen.
  const buildingUnconfirmed = $derived((isBuilding || building) && !logic.confirmedContent)
  const showOverlay = $derived(
    Boolean($pstate.url) &&
      !logic.previewGaveUp &&
      (!logic.iframeReady || logic.fadingOut || logic.blankPostBuild || buildingUnconfirmed),
  )
  // Fully opaque + interactive whenever it is standing in for missing content
  // (only the ready-then-fading-out state animates to transparent).
  const overlaySolid = $derived(!logic.iframeReady || logic.blankPostBuild || buildingUnconfirmed)

  // --- Inline style texts (applied declaration-by-declaration, like React) ---
  const urlFieldStyle = $derived(
    `flex: 1; min-width: ${$isNarrow ? '80px' : '0px'}; align-self: stretch; border-radius: 6px; box-shadow: ${
      logic.urlEditing ? '0 0 0 2px var(--mol-color-primary, #6366f1)' : 'none'
    }; transition: box-shadow 120ms`,
  )
  const urlInputStyle = $derived(
    `flex: 1; min-width: 0px; background: transparent; border: none; color: inherit;${
      bigUrlType ? ' font-size: 16px;' : ''
    } text-overflow: ellipsis; font-family: inherit; outline: none`,
  )
  const iframeStyle = $derived(
    `width: ${iframeWidth}; height: ${iframeHeight}; border-radius: ${
      $pstate.device === 'mobile' ? '16px' : '0px'
    }; background: #fff`,
  )
  const overlayStyle = $derived(
    `position: absolute; inset: 0px; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1; background: ${
      logic.everLoaded && logic.lastGoodFrame
        ? 'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 78%, transparent)'
        : 'var(--mol-color-surface-secondary, #f5f5f5)'
    }; opacity: ${overlaySolid ? 1 : logic.fadingOut ? 0 : 1}; transition: opacity 0.5s ease-out; pointer-events: ${
      overlaySolid || !logic.fadingOut ? 'auto' : 'none'
    }`,
  )

  // React keeps the input's `value` ATTRIBUTE in step with the controlled
  // value (Svelte's `value={…}` sets only the property; the serialized markup
  // carries both).
  let urlInputEl = $state<HTMLInputElement | null>(null)
  $effect(() => {
    urlInputEl?.setAttribute('value', logic.urlDraft)
  })

  /** Whether the overlay is currently showing the DEFAULT loading indicator. */
  const defaultIndicatorShown = $derived.by(() => {
    if (!showOverlay) return false
    if (logic.blankPostBuild) return false
    if (isBuilding || building) return true
    if (logic.everLoaded) return restartingIndicator === undefined && loadingIndicator === undefined
    return loadingIndicator === undefined
  })
  /** The hint the default indicator shows (only the building branch passes one). */
  const defaultIndicatorHint = $derived((isBuilding || building ? buildingHint : undefined) ?? null)
  $effect(() => {
    if (!defaultIndicatorShown) {
      messageIndex = 0
      return
    }
    if (defaultIndicatorHint) return
    const timer = setInterval(() => {
      messageIndex = (messageIndex + 1) % PREVIEW_MESSAGES.length
    }, 2400)
    return () => clearInterval(timer)
  })

  /**
   * The rotating status phrase the default indicator currently shows.
   */
  const phrase = $derived(PREVIEW_MESSAGES[messageIndex])
</script>

<div class={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
  <!-- Browser-style URL bar: a borderless, full-height address field on the
       left, then a full-height divider, then the nav cluster (back/forward,
       refresh) and the device-frame dropdown (which also holds Rotate + Open
       in new tab) — left → right, like a real browser toolbar. -->
  <div class={cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.shrink0, cm.borderB)}>
    <div class={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))}>
      <div
        data-mol-id="preview-url-field"
        class={cm.cn(
          cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
          cm.sp('px', 2),
          cm.surface,
        )}
        use:styleText={urlFieldStyle}
      >
        <Tooltip
          content={logic.isSecureLocation
            ? t('ide.preview.secure', undefined, { defaultValue: 'Secure (HTTPS)' })
            : t('ide.preview.address', undefined, { defaultValue: 'Preview address' })}
          placement="bottom"
        >
          <Icon
            name={logic.isSecureLocation ? 'lock' : 'globe'}
            size={16}
            data-mol-id="preview-site-info"
            className={cm.cn(cm.textMuted, cm.sp('mr', 1))}
            aria-hidden="true"
          />
        </Tooltip>
        <input
          type="text"
          data-mol-id="preview-url"
          bind:this={urlInputEl}
          value={logic.urlDraft}
          oninput={(e) => logic.setUrlDraft(e.currentTarget.value)}
          onfocus={(e) => {
            logic.setUrlEditing(true)
            // Select-all on focus so one click readies the whole address to
            // overtype or copy — standard browser omnibox behavior.
            e.currentTarget.select()
          }}
          onblur={() => logic.setUrlEditing(false)}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              const next = logic.urlDraft.trim()
              if (next) preview.setUrl(next)
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              logic.setUrlDraft(logic.currentLocation)
              e.currentTarget.blur()
            }
          }}
          aria-label={t('ide.preview.urlBar', undefined, { defaultValue: 'Preview URL' })}
          class={cm.cn(!bigUrlType && cm.textSize('sm'))}
          use:styleText={urlInputStyle}
        />
      </div>
      <!-- Full-height divider to the LEFT of the nav cluster: a vertical
           separator between the address field and the back/forward/etc icons. -->
      <div
        aria-hidden="true"
        data-mol-id="preview-toolbar-separator"
        use:styleText={SEPARATOR_STYLE}
      ></div>
      <!-- Nav cluster: back/forward navigate the preview's own history, refresh
           reloads. The device dropdown picks a frame AND hosts Rotate + Open in
           new tab — the rotate/open buttons no longer sit in the toolbar. -->
      {@render barButton(
        'arrow-left',
        t('ide.preview.back', undefined, { defaultValue: 'Back' }),
        'preview-back',
        logic.handleBack,
        !$pstate.canGoBack,
      )}
      {@render barButton(
        'arrow-right',
        t('ide.preview.forward', undefined, { defaultValue: 'Forward' }),
        'preview-forward',
        logic.handleForward,
        !$pstate.canGoForward,
      )}
      {@render barButton(
        'sync',
        t('ide.preview.refresh', undefined, { defaultValue: 'Refresh preview' }),
        'preview-refresh',
        preview.refresh,
        undefined,
      )}
      <!-- The device-frame dropdown also hosts Rotate (only when the current
           frame is rotatable — "where relevant") and Open in new tab. Hidden on
           phone-width viewports: the phone IS the device frame (the host resets
           the device to 'none' on mobile entry), and the 390px toolbar needs
           the width for the URL field. -->
      {#if !$isNarrow}
        <DeviceFrameSelector
          current={$pstate.device}
          onChange={logic.handleDeviceChange}
          canRotate={logic.canRotate}
          rotated={logic.orientation === 'landscape'}
          onRotate={logic.handleRotate}
          onOpenExternal={preview.openExternal}
        />
      {/if}
    </div>
  </div>

  <!-- Preview area -->
  <div
    class={cm.cn(
      cm.flex({ direction: 'row', justify: 'center', align: 'center' }),
      cm.surfaceSecondary,
    )}
    use:styleText={PREVIEW_AREA_STYLE}
  >
    <!-- Iframe — always mounted when we have a src, sits behind overlay. The
         keyed block mounts a FRESH element whenever the mount key changes, the
         way React's key={iframeMountKey} does. -->
    {#if logic.iframeSrc}
      {#key logic.iframeMountKey}
        <iframe
          use:mountPreviewIframe
          src={logic.iframeSrc}
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          title={t('ide.preview.livePreview', undefined, { defaultValue: 'Live Preview' })}
          class={cm.cn($pstate.device !== 'none' && $pstate.device !== 'desktop' && cm.borderAll)}
          use:styleText={iframeStyle}
          onload={logic.handleIframeLoad}
        ></iframe>
      {/key}
    {/if}

    <!-- Overlay — "Loading preview" -->
    {#if showOverlay}
      <div
        data-mol-id="preview-overlay"
        use:styleText={overlayStyle}
        ontransitionend={() => {
          if (logic.fadingOut) logic.setFadingOut(false)
        }}
      >
        <!-- Last working build, shown BLURRED behind the overlay content while
             the app is rebuilding or blank — so the user sees the previous good
             UI instead of a white iframe. Gated on everLoaded so the first cold
             load (no frame captured yet) is unaffected. -->
        {#if logic.everLoaded && logic.lastGoodFrame}
          <img
            src={logic.lastGoodFrame}
            data-mol-id="preview-last-frame"
            alt={t('ide.preview.lastWorkingFrame', undefined, {
              defaultValue: 'Last working preview',
            })}
            use:styleText={LAST_FRAME_STYLE}
          />
          <!-- Subtle theme-token scrim over the frame so the status card reads
               clearly without hiding the last-good UI entirely. -->
          <div aria-hidden="true" use:styleText={SCRIM_STYLE}></div>
        {/if}
        <div use:styleText={OVERLAY_CONTENT_STYLE}>
          {#if logic.blankPostBuild}
            <!-- Build finished but the app rendered nothing — actionable, not a
                 spinner. -->
            {@render blankNotice()}
          {:else if isBuilding || building}
            {@render defaultIndicator(
              buildingHint ?? null,
              logic.stuckRetryCount,
              logic.handleUserRetry,
            )}
          {:else}
            <!-- One branch for the first load and a restart: React renders the
                 indicator in the same place either way, so a loadingIndicator
                 shown before the first load stays mounted through a restart that
                 falls back to it. -->
            {@const indicator = logic.everLoaded
              ? (restartingIndicator ?? loadingIndicator)
              : loadingIndicator}
            {#if indicator}{@render indicator?.()}{:else}{@render defaultIndicator(
                null,
                logic.stuckRetryCount,
                logic.handleUserRetry,
              )}{/if}
          {/if}
        </div>
      </div>
    {/if}

    <!-- Loop breaker — recovery cap reached. Stop thrashing the iframe forever
         and give the user a deterministic way out: reload, or open the preview
         URL directly in a new tab (which always works even when framing here
         fails). Replaces the old indefinite remount loop. -->
    {#if logic.previewGaveUp}
      <div data-mol-id="preview-load-failed" class={cm.surface} use:styleText={LOAD_FAILED_STYLE}>
        <Icon name="x-circle" size={28} className={cm.textMuted} aria-hidden="true" />
        <div class={cm.cn(cm.textSize('sm'))} use:styleText={NOTICE_TITLE_STYLE}>
          {t('ide.preview.loadFailed', undefined, { defaultValue: "Preview can't load here" })}
        </div>
        <div class={cm.cn(cm.textSize('xs'), cm.textMuted)} use:styleText={HINT_MAX_WIDTH_STYLE}>
          {t('ide.preview.loadFailedHint', undefined, {
            defaultValue: 'Try reloading, or open the preview in a new tab.',
          })}
        </div>
        <div use:styleText={BUTTON_ROW_STYLE}>
          <button
            type="button"
            data-mol-id="preview-load-failed-reload"
            onclick={logic.handleUserRetry}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
              cm.touchTargetCompact,
            )}
          >
            {t('ide.preview.reloadPreview', undefined, { defaultValue: 'Reload preview' })}
          </button>
          <button
            type="button"
            data-mol-id="preview-load-failed-open"
            onclick={preview.openExternal}
            class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
          >
            {t('ide.preview.openNewTab', undefined, { defaultValue: 'Open in new tab' })}
          </button>
        </div>
      </div>
    {/if}

    <!-- No URL state -->
    {#if !$pstate.url}
      <div class={cm.cn(cm.textMuted, cm.textSize('sm'))} use:styleText={NO_URL_STYLE}>
        {$pstate.isLoading
          ? t('ide.preview.starting', undefined, { defaultValue: 'Loading preview...' })
          : t('ide.preview.noPreview', undefined, { defaultValue: 'No preview available' })}
      </div>
    {/if}

    <!-- Freeze watchdog banner — heartbeats stopped → the app's thread is
         locked. Gated on confirmedContent: "this app stopped responding" only
         makes sense once the app was actually SHOWING content. -->
    {#if logic.previewFrozen && logic.confirmedContent && !logic.fadingOut}
      <div
        class={cm.cn(cm.textSize('xs'), cm.bgErrorSubtle, cm.textError)}
        use:styleText={FROZEN_BANNER_STYLE}
      >
        <span>
          {t('ide.preview.frozen', undefined, {
            defaultValue:
              'This app stopped responding — an infinite loop or runaway render froze the preview. The IDE is unaffected.',
          })}
        </span>
        <button
          type="button"
          data-mol-id="preview-frozen-reload"
          onclick={logic.handleReloadFrozen}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {t('ide.preview.frozenReload', undefined, { defaultValue: 'Reload app' })}
        </button>
      </div>
    {/if}

    {#if $pstate.error}
      <div
        class={cm.cn(cm.textSize('sm'), cm.sp('p', 3), cm.bgErrorSubtle, cm.textError)}
        use:styleText={ERROR_BANNER_STYLE}
      >
        {$pstate.error}
      </div>
    {/if}
  </div>
</div>

{#snippet barButton(
  icon: IconName,
  buttonTitle: string,
  molId: string,
  onClick: (() => void) | undefined,
  disabled: boolean | undefined,
)}
  <!-- A single icon button inside the preview URL bar: a ghost button with an
       icon-set glyph wrapped in the framework's REAL styled Tooltip, with a
       >=44px touch area on coarse pointers (cm.touchTarget). -->
  <Tooltip content={buttonTitle} placement="bottom">
    <button
      type="button"
      data-mol-id={molId}
      aria-label={buttonTitle}
      onclick={onClick}
      {disabled}
      class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
    >
      <Icon name={icon} size={16} aria-hidden="true" />
    </button>
  </Tooltip>
{/snippet}

{#snippet blankNotice()}
  <!-- Actionable notice shown when a build has FINISHED but the app rendered
       nothing: reload, or open the preview in a new tab. -->
  <div data-mol-id="preview-blank-notice" class={cm.surface} use:styleText={BLANK_NOTICE_STYLE}>
    <Icon name="image" size={28} className={cm.textMuted} aria-hidden="true" />
    <div class={cm.cn(cm.textSize('sm'))} use:styleText={NOTICE_TITLE_STYLE}>
      {t('ide.preview.blankTitle', undefined, { defaultValue: 'The preview is blank' })}
    </div>
    <div class={cm.cn(cm.textSize('xs'), cm.textMuted)} use:styleText={BLANK_HINT_STYLE}>
      {t('ide.preview.blankHint', undefined, {
        defaultValue:
          'The app loaded but didn’t render anything — it may have an error. Synthase has been notified. You can reload, or open the preview in a new tab.',
      })}
    </div>
    <div use:styleText={BUTTON_ROW_STYLE}>
      <button
        type="button"
        data-mol-id="preview-blank-reload"
        onclick={logic.handleUserRetry}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
          cm.touchTargetCompact,
        )}
      >
        {t('ide.preview.reloadPreview', undefined, { defaultValue: 'Reload preview' })}
      </button>
      <button
        type="button"
        data-mol-id="preview-blank-open"
        onclick={preview.openExternal}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
      >
        {t('ide.preview.openNewTab', undefined, { defaultValue: 'Open in new tab' })}
      </button>
    </div>
  </div>
{/snippet}

{#snippet defaultIndicator(
  hint: string | null,
  retryCount: number,
  onManualRetry: (() => void) | undefined,
)}
  <!-- Default preview-overlay content: pulsing dots, a status message, and
       (after repeated recovery cycles) a manual retry button. With a `hint` it
       shows "Updating `<hint>`" (the file the build is currently editing);
       without one it rotates molecule-themed phrases so the overlay never reads
       as frozen. A self-contained card on SOLID theme tokens. -->
  <div use:styleText={INDICATOR_CARD_STYLE}>
    <div use:styleText={DOTS_ROW_STYLE}>
      {#each [0, 1, 2] as i (i)}
        <span
          use:styleText={`width: 8px; height: 8px; border-radius: 50%; background: var(--mol-color-primary, #4070e0); animation: mol-preview-pulse 1.4s ease-in-out ${i * 0.2}s infinite`}
        ></span>
      {/each}
    </div>
    <span use:styleText={STATUS_SPAN_STYLE}>
      {#if hint}
        {t('ide.preview.updating', undefined, { defaultValue: 'Updating' })}
        <code use:styleText={CODE_STYLE}>{hint}</code>
      {:else}
        {t(phrase.key, undefined, { defaultValue: phrase.defaultValue })}
      {/if}
    </span>
    {#if retryCount > 0}
      <span use:styleText={RETRY_COUNT_STYLE}>
        {t(
          'ide.preview.retryCount',
          { count: retryCount },
          {
            defaultValue: 'Retry attempt {{count}}',
          },
        )}
      </span>
    {/if}
    {#if retryCount >= MAX_RECOVERY_CYCLES && onManualRetry}
      <button
        type="button"
        data-mol-id="preview-manual-retry"
        onclick={onManualRetry}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
          cm.touchTargetCompact,
        )}
        use:styleText={RETRY_MARGIN_STYLE}
      >
        {t('ide.preview.retryButton', undefined, { defaultValue: 'Retry now' })}
      </button>
    {/if}
    <svelte:element this={"style"}>{PULSE_KEYFRAMES}</svelte:element>
  </div>
{/snippet}
