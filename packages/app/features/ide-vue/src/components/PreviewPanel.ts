/**
 * Live preview panel with iframe and device frame selection.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `PreviewPanel`: the same props
 * (React names), the same DOM for the same input, the same callbacks and
 * service calls. The whole behaviour — server polling, stuck-load recovery,
 * the `molecule:*` bridge, the health check, the freeze watchdog, the blank
 * notice, wake patience, back/forward and the AI `uiCommand` relay — is
 * `@molecule/app-ide-panel-logic/panels`' `createPreviewPanelSession`, the
 * exact code the React panel runs; this file is only the view. One session is
 * created per mounted panel, fed the logic props through `update()`, connected
 * on mount, and re-rendered from `getState()` on every `subscribe` fire.
 *
 * The live preview comes from the binding's `usePreview()`: the binding holds
 * the ONE provider subscription (as React's `usePreview()` does), and every
 * state it hands over is passed to `session.setPreview` together with the four
 * actions, which keep the same function objects for the panel's life.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  shallowRef,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import type { IconName } from '@molecule/app-icons'
import type {
  PreviewRenderState,
  PreviewStuckReport,
  PreviewUiCommand,
  PreviewUiResult,
} from '@molecule/app-ide-panel-logic'
import { resolveDeviceSize } from '@molecule/app-ide-panel-logic'
import type {
  PreviewPanelLogic,
  PreviewPanelLogicProps,
  PreviewPanelPreview,
} from '@molecule/app-ide-panel-logic/panels'
import {
  createPreviewPanelSession,
  MAX_RECOVERY_CYCLES,
} from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { usePreview, useTranslation } from '@molecule/app-vue'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.js'
import { Icon } from './Icon.js'

/**
 * React's own surface re-exported: the raw-document classifier the URL bridge
 * uses and the outbound postMessage target-origin resolver, so a Vue consumer
 * can ask the same questions React's consumer asks.
 */
export { isRawDocumentUrl, previewTargetOrigin } from '@molecule/app-ide-panel-logic/panels'

/**
 * Mirrors React onto an input: React keeps the `value` ATTRIBUTE in step with
 * the controlled value (the DOM property alone is not enough for the same
 * serialized markup).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * Properties for the preview panel — React's own contract. The two indicator
 * props arrive as the React node props or as the same-named slots.
 */
export interface PreviewPanelProps {
  /** Custom loading indicator shown while the dev server is starting. */
  loadingIndicator?: VNodeChild
  /** Custom loading indicator shown when the dev server restarts mid-session. */
  restartingIndicator?: VNodeChild
  /** The current UI command the host wants performed in the preview iframe. */
  uiCommand?: PreviewUiCommand | null
  /** Called when the iframe replies to a {@link PreviewUiCommand}. */
  onUiResult?: (id: string, result: PreviewUiResult) => void
  /** Called when the preview iframe reports runtime JS errors. */
  onPreviewError?: (
    errors: Array<{ message: string; source?: string; line?: number; column?: number }>,
  ) => void
  /** Incremented when AI edits files. Triggers a reload only when the preview is broken. */
  fileChangeTick?: number
  /** Active-build hint the host sets while the AI is editing files. */
  buildingHint?: string | null
  /** Whether the AI agent is actively building right now. */
  isBuilding?: boolean
  /** Timestamp of when the preview's backing server was last woken or restarted. */
  wakeAt?: number
  /** Called when the preview gives up showing the running app. */
  onPreviewStuck?: (report?: PreviewStuckReport) => void
  /** Escalation hook: restart the backing dev server. */
  onRestartBackend?: () => Promise<boolean | void> | boolean | void
  /** Called when the preview's render verdict changes. */
  onRenderState?: (state: PreviewRenderState, url?: string) => void
  /** Extra classes for the root. */
  className?: string
}

/**
 * Molecule-themed status phrases rotated in the preview overlay.
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
 * repeated recovery cycles) a manual retry button.
 *
 * @param props - See the parameter list.
 * @returns The rendered loading indicator.
 */
const DefaultLoadingIndicator = defineComponent({
  name: 'PreviewDefaultLoadingIndicator',
  inheritAttrs: false,
  props: {
    hint: { type: String as PropType<string | null>, required: false, default: null },
    retryCount: { type: Number, required: true },
    onManualRetry: {
      type: Function as PropType<() => void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const msgIdx = shallowRef(0)
    let interval: ReturnType<typeof setInterval> | null = null
    /** Rotates the phrases unless a specific edit hint is shown. */
    const syncRotation = (): void => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      if (props.hint) return
      interval = setInterval(() => {
        msgIdx.value = (msgIdx.value + 1) % PREVIEW_MESSAGES.length
      }, 2400)
    }
    onMounted(syncRotation)
    watch(() => props.hint, syncRotation, { flush: 'post' })
    onBeforeUnmount(() => {
      if (interval) clearInterval(interval)
      interval = null
    })
    return (): VNodeChild => {
      const phrase = PREVIEW_MESSAGES[msgIdx.value]
      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--mol-color-surface, #fff)',
            border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
            borderRadius: '8px',
            padding: '16px 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          },
        },
        [
          h(
            'div',
            { style: { display: 'flex', gap: '8px' } },
            [0, 1, 2].map((i) =>
              h('span', {
                key: i,
                style: {
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--mol-color-primary, #4070e0)',
                  animation: `mol-preview-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                },
              }),
            ),
          ),
          h(
            'span',
            {
              style: {
                fontSize: '13px',
                color: 'var(--mol-color-text, #333)',
                textAlign: 'center',
              },
            },
            [
              props.hint
                ? [
                    t('ide.preview.updating', undefined, { defaultValue: 'Updating' }),
                    ' ',
                    h(
                      'code',
                      { style: { fontFamily: 'monospace', fontSize: 'inherit', opacity: 0.9 } },
                      [props.hint],
                    ),
                  ]
                : t(phrase.key, undefined, { defaultValue: phrase.defaultValue }),
            ],
          ),
          props.retryCount > 0
            ? h(
                'span',
                { style: { fontSize: '11px', color: 'var(--mol-color-text-muted, #888)' } },
                [
                  t(
                    'ide.preview.retryCount',
                    { count: props.retryCount },
                    { defaultValue: 'Retry attempt {{count}}' },
                  ),
                ],
              )
            : null,
          props.retryCount >= MAX_RECOVERY_CYCLES && props.onManualRetry
            ? h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'preview-manual-retry',
                  onClick: props.onManualRetry,
                  class: cm.cn(
                    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                    cm.touchTargetCompact,
                  ),
                  style: { marginTop: '8px' },
                },
                [t('ide.preview.retryButton', undefined, { defaultValue: 'Retry now' })],
              )
            : null,
          h('style', [
            `
        @keyframes mol-preview-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `,
          ]),
        ],
      )
    }
  },
})

/**
 * Actionable notice shown when a build has finished but the app rendered nothing.
 *
 * @param props - See the parameter list.
 * @returns The rendered blank-preview notice card.
 */
const PreviewBlankNotice = defineComponent({
  name: 'PreviewBlankNotice',
  inheritAttrs: false,
  props: {
    onReload: { type: Function as PropType<() => void>, required: true },
    onOpenExternal: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()
    return (): VNodeChild =>
      h(
        'div',
        {
          'data-mol-id': 'preview-blank-notice',
          class: cm.surface,
          style: {
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
          },
        },
        [
          h(Icon, { name: 'image', size: 28, className: cm.textMuted, 'aria-hidden': 'true' }),
          h(
            'div',
            {
              class: cm.cn(cm.textSize('sm')),
              style: { color: 'var(--mol-color-text, #333)', fontWeight: 600 },
            },
            [t('ide.preview.blankTitle', undefined, { defaultValue: 'The preview is blank' })],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.textSize('xs'), cm.textMuted),
              style: { lineHeight: 1.5 },
            },
            [
              t('ide.preview.blankHint', undefined, {
                defaultValue:
                  'The app loaded but didn’t render anything — it may have an error. Synthase has been notified. You can reload, or open the preview in a new tab.',
              }),
            ],
          ),
          h('div', { style: { display: 'flex', gap: '8px' } }, [
            h(
              'button',
              {
                type: 'button',
                'data-mol-id': 'preview-blank-reload',
                onClick: props.onReload,
                class: cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                  cm.touchTargetCompact,
                ),
              },
              [t('ide.preview.reloadPreview', undefined, { defaultValue: 'Reload preview' })],
            ),
            h(
              'button',
              {
                type: 'button',
                'data-mol-id': 'preview-blank-open',
                onClick: props.onOpenExternal,
                class: cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact),
              },
              [t('ide.preview.openNewTab', undefined, { defaultValue: 'Open in new tab' })],
            ),
          ]),
        ],
      )
  },
})

/**
 * A single icon button inside the preview URL bar.
 *
 * @param props - See the parameter list.
 * @returns The rendered button element.
 */
const BarButton = defineComponent({
  name: 'PreviewBarButton',
  inheritAttrs: false,
  props: {
    icon: { type: String as PropType<IconName>, required: true },
    title: { type: String, required: true },
    molId: { type: String, required: true },
    onClick: { type: Function as PropType<() => void>, required: false, default: undefined },
    disabled: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    return (): VNodeChild =>
      h(Tooltip, { content: props.title, placement: 'bottom' }, () =>
        h(
          'button',
          {
            type: 'button',
            'data-mol-id': props.molId,
            'aria-label': props.title,
            onClick: props.onClick,
            disabled: props.disabled,
            class: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget),
          },
          [h(Icon, { name: props.icon, size: 16, 'aria-hidden': 'true' })],
        ),
      )
  },
})

/**
 * Live preview panel with iframe, device frame selector and URL bar — the view
 * over `createPreviewPanelSession`, which holds every piece of the behaviour.
 *
 * @param props - See {@link PreviewPanelProps}.
 * @returns The rendered preview panel element.
 */
export const PreviewPanel = defineComponent({
  name: 'PreviewPanel',
  inheritAttrs: false,
  props: {
    /**
     * A custom indicator shown while the dev server is starting: the React node
     * prop, or the `loadingIndicator` slot (the conformance kit supplies both).
     */
    loadingIndicator: {
      type: [Object, Array] as PropType<VNodeChild>,
      required: false,
      default: undefined,
    },
    /**
     * A custom indicator shown when the dev server restarts mid-session: the React
     * node prop, or the `restartingIndicator` slot.
     */
    restartingIndicator: {
      type: [Object, Array] as PropType<VNodeChild>,
      required: false,
      default: undefined,
    },
    /** The current UI command the host wants performed in the preview iframe. */
    uiCommand: {
      type: Object as PropType<PreviewUiCommand | null>,
      required: false,
      default: undefined,
    },
    /** Called when the iframe replies to a UI command. */
    onUiResult: {
      type: Function as PropType<(id: string, result: PreviewUiResult) => void>,
      required: false,
      default: undefined,
    },
    /** Called when the preview iframe reports runtime JS errors. */
    onPreviewError: {
      type: Function as PropType<
        (
          errors: Array<{ message: string; source?: string; line?: number; column?: number }>,
        ) => void
      >,
      required: false,
      default: undefined,
    },
    /** Incremented when AI edits files. */
    fileChangeTick: { type: Number, required: false, default: undefined },
    /** Active-build hint. */
    buildingHint: { type: String as PropType<string | null>, required: false, default: undefined },
    /** Whether the AI agent is actively building right now. */
    isBuilding: { type: Boolean, required: false, default: undefined },
    /** Timestamp of when the preview's backing server was last woken or restarted. */
    wakeAt: { type: Number, required: false, default: undefined },
    /** Called when the preview gives up showing the running app. */
    onPreviewStuck: {
      type: Function as PropType<(report?: PreviewStuckReport) => void>,
      required: false,
      default: undefined,
    },
    /** Escalation hook: restart the backing dev server. */
    onRestartBackend: {
      type: Function as PropType<() => Promise<boolean | void> | boolean | void>,
      required: false,
      default: undefined,
    },
    /** Called when the preview's render verdict changes. */
    onRenderState: {
      type: Function as PropType<(state: PreviewRenderState, url?: string) => void>,
      required: false,
      default: undefined,
    },
    /** Extra classes for the root. */
    className: { type: String, required: false, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // The live preview as the framework binding gives it: its state and its
    // actions. The binding holds the ONE provider subscription (React's
    // `usePreview()` does too), so the session must not subscribe a second
    // time, and its actions keep the same function objects for the panel's
    // life (an effect that depends on one would re-run and loop otherwise).
    const { state, setUrl, refresh, setDevice, openExternal, recordNavigation, back, forward } =
      usePreview()
    const isNarrow = useNarrowViewport()
    const isCoarse = useCoarsePointer()

    /**
     * The behaviour props the shared logic takes (everything but the two
     * indicator slots, the building hint and the root classes, which only the
     * view reads).
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
     * The live preview as the session takes it: the binding's latest snapshot
     * and its four actions (the same function objects on every call).
     */
    const previewOf = (): PreviewPanelPreview => ({
      state: state.value,
      setDevice,
      recordNavigation,
      back,
      forward,
    })

    // One session per mounted panel: the exact behaviour the React panel runs.
    // The view re-renders from `getState()` on every subscribe fire and never
    // holds behaviour of its own.
    const session = createPreviewPanelSession({ preview: previewOf(), props: logicProps() })
    const logic = shallowRef<PreviewPanelLogic>(session.getState())

    // The binding's subscription delivers every new state to the session (the
    // behaviour re-renders for it, as React re-runs its hooks).
    watch(state, () => {
      session.setPreview(previewOf())
    })

    let disconnect: (() => void) | null = null
    /** Stops hearing the behaviour (assigned once mounted). */
    let stopListening: (() => void) | null = null

    /**
     * Adopts the behaviour's latest state. The session produces a fresh result
     * per render, but React only re-renders the panel when a value actually
     * changed (its setters bail out on an unchanged value), so an equal result
     * is not a render here either.
     */
    const adopt = (): void => {
      const next = session.getState()
      const previous = logic.value
      if (
        Object.entries(next).every(([key, value]) =>
          Object.is(value, previous[key as keyof PreviewPanelLogic]),
        )
      )
        return
      logic.value = next
    }

    onMounted(() => {
      disconnect = session.connect()
      adopt()
      stopListening = session.subscribe(adopt)
    })
    onBeforeUnmount(() => {
      disconnect?.()
      stopListening?.()
    })

    // React re-runs the panel's logic with the live props on every render; the
    // session re-runs on `update`, so feed it whenever a logic prop changes.
    watch(
      () => [
        props.onPreviewError,
        props.onPreviewStuck,
        props.onRestartBackend,
        props.onRenderState,
        props.uiCommand,
        props.onUiResult,
        props.fileChangeTick,
        props.isBuilding,
        props.wakeAt,
      ],
      () => session.update(logicProps()),
    )

    return (): VNodeChild => {
      const snapshot = state.value
      const L = logic.value
      const bigUrlType = isNarrow.value || isCoarse.value
      const currentLocation = L.currentLocation
      const isSecureLocation = L.isSecureLocation
      const deviceSize = resolveDeviceSize(snapshot.device, L.orientation)
      const iframeWidth = L.requestedSize ? `${L.requestedSize.width}px` : deviceSize.width
      const iframeHeight = L.requestedSize ? `${L.requestedSize.height}px` : deviceSize.height
      const building = props.buildingHint != null
      const buildingUnconfirmed = (props.isBuilding || building) && !L.confirmedContent
      const showOverlay =
        Boolean(snapshot.url) &&
        !L.previewGaveUp &&
        (!L.iframeReady || L.fadingOut || L.blankPostBuild || buildingUnconfirmed)
      const overlaySolid = !L.iframeReady || L.blankPostBuild || buildingUnconfirmed

      // React's node props, or the same-named slots (see the adapter contract).
      const loadingIndicator = (): VNodeChild =>
        props.loadingIndicator ?? slots.loadingIndicator?.()
      const restartingIndicator = (): VNodeChild =>
        props.restartingIndicator ?? slots.restartingIndicator?.()
      const defaultIndicator = (): VNode =>
        h(DefaultLoadingIndicator, {
          retryCount: L.stuckRetryCount,
          onManualRetry: L.handleUserRetry,
        })

      const indicator = (): VNodeChild =>
        L.everLoaded
          ? (restartingIndicator() ?? loadingIndicator() ?? defaultIndicator())
          : (loadingIndicator() ?? defaultIndicator())

      const overlayContent = (): VNodeChild =>
        L.blankPostBuild
          ? h(PreviewBlankNotice, {
              onReload: L.handleUserRetry,
              onOpenExternal: () => openExternal(),
            })
          : props.isBuilding || building
            ? h(DefaultLoadingIndicator, {
                hint: props.buildingHint ?? null,
                retryCount: L.stuckRetryCount,
                onManualRetry: L.handleUserRetry,
              })
            : indicator()

      const overlayChildren: VNodeChild[] = []
      if (L.everLoaded && L.lastGoodFrame) {
        overlayChildren.push(
          h('img', {
            src: L.lastGoodFrame,
            'data-mol-id': 'preview-last-frame',
            alt: t('ide.preview.lastWorkingFrame', undefined, {
              defaultValue: 'Last working preview',
            }),
            // A style TEXT, not an object: Vue's object-style writer CSS-prefixes
            // `filter` (`-webkit-filter`), while React writes the plain property.
            style:
              'position: absolute; inset: 0px; width: 100%; height: 100%; object-fit: cover; object-position: top center; filter: blur(8px); z-index: 0; pointer-events: none',
          }),
          h('div', {
            'aria-hidden': 'true',
            style: {
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background:
                'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 55%, transparent)',
              pointerEvents: 'none',
            },
          }),
        )
      }
      overlayChildren.push(
        h('div', { style: { position: 'relative', zIndex: 1 } }, [overlayContent()]),
      )

      return h(
        'div',
        { class: cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, props.className) },
        [
          h('div', { class: cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.shrink0, cm.borderB) }, [
            h('div', { class: cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' })) }, [
              h(
                'div',
                {
                  'data-mol-id': 'preview-url-field',
                  class: cm.cn(
                    cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
                    cm.sp('px', 2),
                    cm.surface,
                  ),
                  style: {
                    flex: 1,
                    minWidth: isNarrow.value ? '80px' : 0,
                    alignSelf: 'stretch',
                    borderRadius: '6px',
                    boxShadow: L.urlEditing
                      ? '0 0 0 2px var(--mol-color-primary, #6366f1)'
                      : 'none',
                    transition: 'box-shadow 120ms',
                  },
                },
                [
                  h(
                    Tooltip,
                    {
                      content: isSecureLocation
                        ? t('ide.preview.secure', undefined, { defaultValue: 'Secure (HTTPS)' })
                        : t('ide.preview.address', undefined, { defaultValue: 'Preview address' }),
                      placement: 'bottom',
                    },
                    () =>
                      h(Icon, {
                        name: isSecureLocation ? 'lock' : 'globe',
                        size: 16,
                        'data-mol-id': 'preview-site-info',
                        className: cm.cn(cm.textMuted, cm.sp('mr', 1)),
                        'aria-hidden': 'true',
                      }),
                  ),
                  h('input', {
                    type: 'text',
                    'data-mol-id': 'preview-url',
                    value: L.urlDraft,
                    onInput: (event: Event) => {
                      L.setUrlDraft((event.target as HTMLInputElement).value)
                    },
                    onFocus: (event: FocusEvent) => {
                      L.setUrlEditing(true)
                      ;(event.currentTarget as HTMLInputElement).select()
                    },
                    onBlur: () => {
                      L.setUrlEditing(false)
                    },
                    onKeydown: (event: KeyboardEvent) => {
                      const el = event.currentTarget as HTMLInputElement
                      if (event.key === 'Enter') {
                        const next = L.urlDraft.trim()
                        if (next) setUrl(next)
                        el.blur()
                      } else if (event.key === 'Escape') {
                        L.setUrlDraft(currentLocation)
                        el.blur()
                      }
                    },
                    onVnodeMounted: syncValueAttr,
                    onVnodeUpdated: syncValueAttr,
                    'aria-label': t('ide.preview.urlBar', undefined, {
                      defaultValue: 'Preview URL',
                    }),
                    class: cm.cn(!bigUrlType && cm.textSize('sm')),
                    style: {
                      flex: 1,
                      minWidth: 0,
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      fontSize: bigUrlType ? '16px' : undefined,
                      textOverflow: 'ellipsis',
                      fontFamily: 'inherit',
                      outline: 'none',
                    },
                  }),
                ],
              ),
              h('div', {
                'aria-hidden': 'true',
                'data-mol-id': 'preview-toolbar-separator',
                style: {
                  alignSelf: 'stretch',
                  width: '1px',
                  flexShrink: 0,
                  margin: '0 4px',
                  background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
                },
              }),
              h(BarButton, {
                icon: 'arrow-left',
                molId: 'preview-back',
                onClick: L.handleBack,
                disabled: !snapshot.canGoBack,
                title: t('ide.preview.back', undefined, { defaultValue: 'Back' }),
              }),
              h(BarButton, {
                icon: 'arrow-right',
                molId: 'preview-forward',
                onClick: L.handleForward,
                disabled: !snapshot.canGoForward,
                title: t('ide.preview.forward', undefined, { defaultValue: 'Forward' }),
              }),
              h(BarButton, {
                icon: 'sync',
                molId: 'preview-refresh',
                onClick: () => refresh(),
                title: t('ide.preview.refresh', undefined, {
                  defaultValue: 'Refresh preview',
                }),
              }),
              !isNarrow.value
                ? h(DeviceFrameSelector, {
                    current: snapshot.device,
                    onChange: L.handleDeviceChange,
                    canRotate: L.canRotate,
                    rotated: L.orientation === 'landscape',
                    onRotate: L.handleRotate,
                    onOpenExternal: () => openExternal(),
                  })
                : null,
            ]),
          ]),
          h(
            'div',
            {
              class: cm.cn(
                cm.flex({ direction: 'row', justify: 'center', align: 'center' }),
                cm.surfaceSecondary,
              ),
              style: { flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' },
            },
            [
              L.iframeSrc
                ? h('iframe', {
                    // A changed mount key mounts a FRESH element, like React's key.
                    key: L.iframeMountKey,
                    ref: (el: unknown) => {
                      L.iframeRef.current = (el as HTMLIFrameElement | null) ?? null
                    },
                    src: L.iframeSrc,
                    sandbox:
                      'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin',
                    title: t('ide.preview.livePreview', undefined, {
                      defaultValue: 'Live Preview',
                    }),
                    class: cm.cn(
                      snapshot.device !== 'none' && snapshot.device !== 'desktop' && cm.borderAll,
                    ),
                    style: {
                      width: iframeWidth,
                      height: iframeHeight,
                      borderRadius: snapshot.device === 'mobile' ? '16px' : '0',
                      background: '#fff',
                    },
                    onLoad: L.handleIframeLoad,
                  })
                : null,
              showOverlay
                ? h(
                    'div',
                    {
                      'data-mol-id': 'preview-overlay',
                      style: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        background:
                          L.everLoaded && L.lastGoodFrame
                            ? 'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 78%, transparent)'
                            : 'var(--mol-color-surface-secondary, #f5f5f5)',
                        opacity: overlaySolid ? 1 : L.fadingOut ? 0 : 1,
                        transition: 'opacity 0.5s ease-out',
                        pointerEvents: overlaySolid || !L.fadingOut ? 'auto' : 'none',
                      },
                      onTransitionend: () => {
                        if (L.fadingOut) L.setFadingOut(false)
                      },
                    },
                    overlayChildren,
                  )
                : null,
              L.previewGaveUp
                ? h(
                    'div',
                    {
                      'data-mol-id': 'preview-load-failed',
                      class: cm.surface,
                      style: {
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
                      },
                    },
                    [
                      h(Icon, {
                        name: 'x-circle',
                        size: 28,
                        className: cm.textMuted,
                        'aria-hidden': 'true',
                      }),
                      h(
                        'div',
                        {
                          class: cm.cn(cm.textSize('sm')),
                          style: { color: 'var(--mol-color-text, #333)', fontWeight: 600 },
                        },
                        [
                          t('ide.preview.loadFailed', undefined, {
                            defaultValue: "Preview can't load here",
                          }),
                        ],
                      ),
                      h(
                        'div',
                        {
                          class: cm.cn(cm.textSize('xs'), cm.textMuted),
                          style: { maxWidth: '320px' },
                        },
                        [
                          t('ide.preview.loadFailedHint', undefined, {
                            defaultValue: 'Try reloading, or open the preview in a new tab.',
                          }),
                        ],
                      ),
                      h('div', { style: { display: 'flex', gap: '8px' } }, [
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-mol-id': 'preview-load-failed-reload',
                            onClick: L.handleUserRetry,
                            class: cm.cn(
                              cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                              cm.touchTargetCompact,
                            ),
                          },
                          [
                            t('ide.preview.reloadPreview', undefined, {
                              defaultValue: 'Reload preview',
                            }),
                          ],
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            'data-mol-id': 'preview-load-failed-open',
                            onClick: () => openExternal(),
                            class: cm.cn(
                              cm.button({ variant: 'ghost', size: 'sm' }),
                              cm.touchTargetCompact,
                            ),
                          },
                          [
                            t('ide.preview.openNewTab', undefined, {
                              defaultValue: 'Open in new tab',
                            }),
                          ],
                        ),
                      ]),
                    ],
                  )
                : null,
              !snapshot.url
                ? h(
                    'div',
                    {
                      class: cm.cn(cm.textMuted, cm.textSize('sm')),
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                      },
                    },
                    [
                      snapshot.isLoading
                        ? t('ide.preview.starting', undefined, {
                            defaultValue: 'Loading preview...',
                          })
                        : t('ide.preview.noPreview', undefined, {
                            defaultValue: 'No preview available',
                          }),
                    ],
                  )
                : null,
              L.previewFrozen && L.confirmedContent && !L.fadingOut
                ? h(
                    'div',
                    {
                      class: cm.cn(cm.textSize('xs'), cm.bgErrorSubtle, cm.textError),
                      style: {
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
                      },
                    },
                    [
                      h('span', [
                        t('ide.preview.frozen', undefined, {
                          defaultValue:
                            'This app stopped responding — an infinite loop or runaway render froze the preview. The IDE is unaffected.',
                        }),
                      ]),
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': 'preview-frozen-reload',
                          onClick: L.handleReloadFrozen,
                          class: cm.cn(
                            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                            cm.touchTargetCompact,
                            cm.shrink0,
                          ),
                        },
                        [t('ide.preview.frozenReload', undefined, { defaultValue: 'Reload app' })],
                      ),
                    ],
                  )
                : null,
              snapshot.error
                ? h(
                    'div',
                    {
                      class: cm.cn(
                        cm.textSize('sm'),
                        cm.sp('p', 3),
                        cm.bgErrorSubtle,
                        cm.textError,
                      ),
                      style: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 },
                    },
                    [snapshot.error],
                  )
                : null,
            ],
          ),
        ],
      )
    }
  },
})
