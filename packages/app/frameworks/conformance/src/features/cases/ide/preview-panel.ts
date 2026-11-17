/**
 * `PreviewPanel` cases: the live preview's whole surface — the browser-style
 * URL bar (typing, Escape, Back/Forward, refresh, the site-info glyph), the
 * cold-boot poll and its overlay, the `molecule:*` bridge messages (ready,
 * crash, blank, snapshot, viewport, navigate, runtime errors, ui results),
 * device frames and the persisted orientation, the actionable notices (blank
 * post-build, the loop breaker), the stuck detector and the absolute ceiling,
 * the freeze watchdog, wake patience, the raw-document click intent, and the
 * build overlays.
 *
 * The panel talks to the preview host over `window.fetch` (the server-up
 * probe), so every case seeds `context.window.fetch` — deferred when the probe
 * must stay pending, `503` when the host never answers. The bridge is driven
 * with `message` steps whose `from` is the panel's own iframe (the trust gate
 * accepts only its window), the preview service with `control` steps, and the
 * document's `onLoad` with `event` steps.
 *
 * @module
 */

import type { FeatureCaseContext, FeatureComponentCases } from '../../spec.js'

/** Seeds the binding kit's preview fake. */
const preview = (seed: Record<string, unknown> = {}): FeatureCaseContext => ({
  areas: { native: { preview: seed } },
})

/** The default context: a preview at the default target and a server-up probe held pending. */
const held = (seed: Record<string, unknown> = {}): FeatureCaseContext => ({
  ...preview(seed),
  window: { fetch: { status: 200, defer: true } },
})

/** Answers the panel's server-up probe (mounts the iframe). */
const MOUNT = { type: 'fetch' } as const

/** Fires the iframe document's `onLoad`, as a finished load does. */
const LOAD = { type: 'event', selector: 'iframe', event: 'load' } as const

/** Delivers a bridge message from the preview iframe's own window. */
const fromPreview = (
  data: Record<string, unknown>,
): { type: 'message'; data: Record<string, unknown>; from: string } => ({
  type: 'message',
  data,
  from: 'iframe',
})

/** The scaffold's render confirmation (`#root` got children). */
const READY = fromPreview({ type: 'molecule:ready' })

/** The scaffold's liveness beat. */
const BEAT = fromPreview({ type: 'molecule:heartbeat' })

/** A pinned clock, so the wake timestamps read as "just now". */
const NOW = 1_700_000_000_000

/** `molecule:runtime-error` payloads for the de-dup case. */
const RUNTIME_ERROR_ONE = {
  type: 'molecule:runtime-error',
  message: 'x is not defined',
  source: 'http://preview.local/src/main.tsx',
  line: 12,
  column: 3,
}
const RUNTIME_ERROR_TWO = { type: 'molecule:runtime-error', message: 'second failure' }

/** Custom loading/restarting indicators (the React node props, as slots). */
const CUSTOM_LOADING = [
  { tag: 'div', attrs: { 'data-slot': 'loading-indicator' }, children: ['custom loading'] },
]
const CUSTOM_RESTARTING = [
  { tag: 'div', attrs: { 'data-slot': 'restarting-indicator' }, children: ['custom restarting'] },
]

/** `PreviewPanel`. */
export const previewPanelCases: FeatureComponentCases = {
  component: 'PreviewPanel',
  cases: [
    // --- The cold boot: poll → iframe → ready → reveal -------------------------
    {
      name: 'the preview frame',
      context: held(),
      callbacks: ['onRenderState'],
      fakeTimers: true,
      now: NOW,
      interactions: [MOUNT, LOAD, READY, { type: 'advance', ms: 600 }],
    },

    // --- The no-target states ---------------------------------------------------
    { name: 'no preview without a load target', context: preview({ url: '' }) },
    {
      name: 'loading preview while the server starts',
      fakeTimers: true,
      context: preview({ url: '', isLoading: true }),
    },

    // --- The URL bar ------------------------------------------------------------
    {
      name: 'an https location shows the lock',
      fakeTimers: true,
      context: held({ url: 'https://preview.local/start' }),
      interactions: [MOUNT],
    },
    {
      name: 'typing commits a navigation on Enter',
      fakeTimers: true,
      context: held(),
      now: NOW,
      interactions: [
        MOUNT,
        {
          type: 'input',
          selector: '[data-mol-id="preview-url"]',
          value: 'http://preview.local/next',
        },
        { type: 'keydown', selector: '[data-mol-id="preview-url"]', key: 'Enter' },
      ],
    },
    {
      name: 'escape restores the live location',
      now: NOW,
      fakeTimers: true,
      context: held(),
      interactions: [
        {
          type: 'input',
          selector: '[data-mol-id="preview-url"]',
          value: 'http://elsewhere.example/typo',
        },
        { type: 'keydown', selector: '[data-mol-id="preview-url"]', key: 'Escape' },
      ],
    },
    {
      name: 'navigation messages update the url bar without a reload',
      now: NOW,
      fakeTimers: true,
      context: held(),
      interactions: [
        MOUNT,
        fromPreview({ type: 'molecule:navigate', url: 'http://preview.local/dashboard' }),
      ],
    },
    {
      name: 'back and forward are client-side moves',
      now: NOW,
      fakeTimers: true,
      context: held(),
      interactions: [
        MOUNT,
        fromPreview({ type: 'molecule:navigate', url: 'http://preview.local/dashboard' }),
        { type: 'click', selector: '[data-mol-id="preview-back"]' },
        { type: 'click', selector: '[data-mol-id="preview-forward"]' },
      ],
    },
    {
      name: 'a replace navigation keeps the forward stack',
      fakeTimers: true,
      context: held(),
      interactions: [
        MOUNT,
        fromPreview({ type: 'molecule:navigate', url: 'http://preview.local/a' }),
        { type: 'click', selector: '[data-mol-id="preview-back"]' },
        fromPreview({
          type: 'molecule:navigate',
          url: 'http://preview.local/b',
          isReplace: true,
        }),
      ],
    },
    {
      name: 'a className joins the root classes',
      fakeTimers: true,
      props: { className: 'parity-token' },
      context: preview({ url: '' }),
    },

    // --- Refresh and the loading indicators -------------------------------------
    {
      name: 'refresh reloads through the custom indicators',
      slots: { loadingIndicator: CUSTOM_LOADING, restartingIndicator: CUSTOM_RESTARTING },
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        { type: 'click', selector: '[data-mol-id="preview-refresh"]' },
        LOAD,
        READY,
        { type: 'advance', ms: 600 },
      ],
    },
    {
      name: 'refresh falls back to the default status',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        { type: 'click', selector: '[data-mol-id="preview-refresh"]' },
        LOAD,
        READY,
        { type: 'advance', ms: 600 },
      ],
    },
    {
      name: 'a custom loading indicator stands in before the first load',
      fakeTimers: true,
      slots: { loadingIndicator: CUSTOM_LOADING },
      context: held(),
    },
    {
      name: 'a custom restarting indicator covers a crash',
      slots: { loadingIndicator: CUSTOM_LOADING, restartingIndicator: CUSTOM_RESTARTING },
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:error', crash: true }),
        { type: 'advance', ms: 400 },
      ],
    },
    {
      name: 'a restart falls back to the loading indicator',
      slots: { loadingIndicator: CUSTOM_LOADING },
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:error', crash: true }),
        { type: 'advance', ms: 400 },
      ],
    },

    // --- Bridge messages: errors, crash, blank, snapshot ------------------------
    {
      name: 'a runtime error reaches the host once per signature',
      context: held(),
      callbacks: ['onPreviewError'],
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        fromPreview(RUNTIME_ERROR_ONE),
        fromPreview(RUNTIME_ERROR_ONE),
        { type: 'advance', ms: 2_100 },
        fromPreview(RUNTIME_ERROR_TWO),
        { type: 'advance', ms: 2_100 },
      ],
    },
    {
      name: 'a pre-render error is forwarded to the host',
      context: held(),
      callbacks: ['onPreviewError'],
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        fromPreview({
          type: 'molecule:error',
          message: 'does not provide an export named default',
          source: 'http://preview.local/src/main.tsx',
          line: 3,
          column: 9,
        }),
        { type: 'advance', ms: 2_100 },
      ],
    },
    {
      name: 'a crash recovers the overlay',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:error', crash: true }),
        { type: 'advance', ms: 400 },
      ],
    },
    {
      name: 'molecule:blank re-covers and reports',
      context: held(),
      callbacks: ['onPreviewError'],
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:blank' }),
      ],
    },
    {
      name: 'the last good frame stands in behind the overlay',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:snapshot', dataUrl: 'data:image/jpeg;base64,AAAA' }),
        fromPreview({ type: 'molecule:blank' }),
      ],
    },
    {
      name: 'a snapshot that is not an image is ignored',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:snapshot', dataUrl: 'https://elsewhere.example/frame.png' }),
        fromPreview({ type: 'molecule:blank' }),
      ],
    },
    {
      name: 'a blank reload after a build shows the actionable notice',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        LOAD,
        READY,
        { type: 'advance', ms: 3_000 },
        fromPreview({ type: 'molecule:blank' }),
        { type: 'advance', ms: 600 },
        { type: 'click', selector: '[data-mol-id="preview-blank-open"]' },
        { type: 'click', selector: '[data-mol-id="preview-blank-reload"]' },
      ],
    },

    // --- AI-driven ui commands ---------------------------------------------------
    {
      name: 'an ai command is relayed and its result forwarded',
      context: held(),
      callbacks: ['onUiResult'],
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        {
          type: 'props',
          props: { uiCommand: { id: 'cmd-1', action: 'click', molId: 'submit-button' } },
        },
        fromPreview({ type: 'molecule:ui-result', id: 'cmd-1', ok: true, found: true }),
      ],
    },

    // --- Viewport requests -------------------------------------------------------
    {
      name: 'the viewport message resizes the frame',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:viewport', width: 390, height: 844 }),
      ],
    },
    {
      name: 'the viewport clamps to the panel bounds',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:viewport', width: 99_999, height: 99_999 }),
        fromPreview({ type: 'molecule:viewport', width: 1, height: 1 }),
        fromPreview({ type: 'molecule:viewport', width: 0, height: 0 }),
      ],
    },

    // --- Device frames -------------------------------------------------------------
    {
      name: 'device frames size the frame and rotate',
      context: held({ device: 'tablet' }),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        { type: 'click', selector: '[data-mol-id="preview-device-cycle"]' },
        { type: 'click', selector: '[data-mol-id="preview-device-rotate"]' },
        { type: 'click', selector: '[data-mol-id="preview-device-cycle"]' },
        { type: 'click', selector: '[data-mol-id="preview-device-option-mobile"]' },
      ],
    },
    {
      name: 'a page-requested viewport yields to a device choice',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:viewport', width: 390, height: 844 }),
        { type: 'click', selector: '[data-mol-id="preview-device-cycle"]' },
        { type: 'click', selector: '[data-mol-id="preview-device-option-desktop"]' },
      ],
    },
    {
      name: 'a stored orientation restores landscape',
      fakeTimers: true,
      context: {
        ...held({ device: 'tablet' }),
        window: {
          fetch: { status: 200, defer: true },
          localStorage: { 'molecule.ide.preview.orientation': 'landscape' },
        },
      },
      interactions: [MOUNT],
    },

    // --- Build overlays --------------------------------------------------------------
    {
      name: 'builds hold the overlay with the updating hint',
      fakeTimers: true,
      props: { buildingHint: 'GuestMenu.tsx' },
      context: held(),
      interactions: [MOUNT],
    },
    {
      name: 'isBuilding keeps the overlay until the app confirms',
      props: { isBuilding: true },
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        fromPreview({ type: 'molecule:blank' }),
      ],
    },

    // --- Recovery ceilings -------------------------------------------------------------
    {
      name: 'the loop breaker offers reload and open in new tab',
      context: { ...preview(), window: { fetch: { status: 503 } } },
      callbacks: ['onPreviewStuck', 'onRenderState'],
      fakeTimers: true,
      now: NOW,
      interactions: [
        { type: 'advance', ms: 31_000 },
        { type: 'click', selector: '[data-mol-id="preview-load-failed-open"]' },
        { type: 'click', selector: '[data-mol-id="preview-load-failed-reload"]' },
      ],
    },
    {
      name: 'the stuck detector retries a dead load, then reports',
      context: held(),
      callbacks: ['onPreviewStuck', 'onRenderState'],
      fakeTimers: true,
      now: NOW,
      interactions: [MOUNT, { type: 'advance', ms: 15_500 }, { type: 'advance', ms: 124_000 }],
    },
    {
      name: 'a declined restart is asked again later',
      context: { ...preview(), window: { fetch: { status: 200 } } },
      callbacks: ['onRestartBackend', 'onPreviewStuck'],
      callbackResults: { onRestartBackend: { resolve: false } },
      fakeTimers: true,
      now: NOW,
      interactions: [
        { type: 'advance', ms: 40_000 },
        { type: 'advance', ms: 160_000 },
        { type: 'advance', ms: 30_000 },
      ],
    },

    // --- Freeze watchdog ------------------------------------------------------------------
    {
      name: 'a frozen app is reported and reloaded',
      context: held(),
      callbacks: ['onPreviewStuck'],
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 600 },
        BEAT,
        { type: 'advance', ms: 3_000 },
        BEAT,
        { type: 'advance', ms: 10_000 },
        { type: 'click', selector: '[data-mol-id="preview-frozen-reload"]' },
      ],
    },

    // --- Wake patience -------------------------------------------------------------------
    {
      name: 'wake patience holds the status over a blank reload',
      context: held(),
      now: NOW,
      fakeTimers: true,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 2_500 },
        { type: 'props', props: { wakeAt: NOW } },
        LOAD,
        BEAT,
        { type: 'advance', ms: 5_000 },
        READY,
        { type: 'advance', ms: 600 },
      ],
    },
    {
      name: 'a wake on a never-rendered target reloads the stale document',
      context: held(),
      now: NOW,
      fakeTimers: true,
      interactions: [MOUNT, { type: 'props', props: { wakeAt: NOW } }],
    },

    // --- Raw documents and click intents ----------------------------------------------------
    {
      name: 'a raw document the user clicked to is content',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 2_500 },
        fromPreview({
          type: 'molecule:navigate',
          url: 'http://preview.local/blog/feed.xml',
          isIntent: true,
        }),
        LOAD,
        { type: 'advance', ms: 5_000 },
      ],
    },
    {
      name: 'an app-route click intent does not excuse a blank reload',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        READY,
        { type: 'advance', ms: 2_500 },
        fromPreview({
          type: 'molecule:navigate',
          url: 'http://preview.local/about/',
          isIntent: true,
        }),
        LOAD,
        { type: 'advance', ms: 3_000 },
      ],
    },

    // --- File-change reloads -----------------------------------------------------------------
    {
      name: 'a file change reloads only a broken preview',
      context: held(),
      fakeTimers: true,
      now: NOW,
      interactions: [
        MOUNT,
        { type: 'props', props: { fileChangeTick: 1 } },
        { type: 'advance', ms: 1_600 },
        READY,
        { type: 'props', props: { fileChangeTick: 2 } },
        { type: 'advance', ms: 2_000 },
      ],
    },

    // --- Viewport + pointer variants ------------------------------------------------------------
    {
      name: 'narrow viewports drop the device selector',
      now: NOW,
      fakeTimers: true,
      viewportWidth: 390,
      context: held(),
      interactions: [],
    },
    {
      name: 'a coarse pointer enlarges the url type',
      now: NOW,
      fakeTimers: true,
      pointer: 'coarse',
      context: held(),
      interactions: [],
    },

    // --- Service error ------------------------------------------------------------------------------
    {
      name: 'the preview error surfaces in a banner',
      now: NOW,
      fakeTimers: true,
      context: held(),
      interactions: [
        { type: 'control', name: 'native.preview.setError', args: ['dev server unreachable'] },
      ],
    },
  ],
}
