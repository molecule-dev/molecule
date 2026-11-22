// @vitest-environment jsdom

/**
 * The preview must NEVER leave the user staring at a bare white iframe with no feedback — AND it
 * must never FALSELY accuse a still-starting app of being "blank"/"unable to load".
 *
 * The iframe "loading" (its document fired `onLoad`) does NOT mean the app rendered — a fresh
 * project's COLD Vite server can take many seconds to compile the app before React mounts, during
 * which the inline bridge heartbeats (alive) but posts no `molecule:ready` yet. So the overlay
 * stays up until the app CONFIRMS it rendered content (`molecule:ready`), and the actionable
 * "preview is blank — reload / open in new tab" notice is raised ONLY on a real signal — never on
 * a naive "hasn't rendered in N seconds" timer that false-fired over a cold boot. Honest copy:
 *  - while a build is in progress (`isBuilding`) → a reassuring "Building your app…" overlay;
 *  - a first cold boot that is ALIVE (heartbeating) but hasn't confirmed a render → keep the
 *    honest "Starting…" status; do NOT accuse it of being blank (that was the fresh-project bug);
 *  - a document that never even ran its inline bridge (NO heartbeat at all ⇒ broken/error page),
 *    an app that RENDERED-then-reloaded-blank, or an explicit `molecule:blank` → the ACTIONABLE
 *    notice, after a short settle;
 *  - a confirmed render (`molecule:ready`) clears everything;
 *  - right after the host reports a sandbox wake (`wakeAt`), the fast accusations stand down
 *    (a post-wake reload legitimately renders nothing while the dev server restarts) — but the
 *    patience is a bounded window, not a permanent pass.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.blank-overlay.test.tsx` with the
 * same test names and the same assertions: the Vue panel is a view over the same shared behaviour
 * (`createPreviewPanelSession`), so a real jsdom render of {@link PreviewPanel} driving a real
 * iframe preview provider must reach the same DOM states React's panel reaches. Real timers (the
 * blank settle is several seconds); inbound bridge messages are dispatched as same-origin
 * `MessageEvent`s (the panel verifies the source window).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-live-preview-iframe'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  delay,
  loadIframe,
  type MountedPanel,
  mountPanel,
  okResponse,
  type PanelProps,
  postFromPreview,
  PREVIEW_URL,
  providerAtUrl,
  q,
  settle,
  waitFor,
} from './preview-panel-harness.js'

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Mounts the panel over a provider and tracks it for teardown.
 *
 * @param initial - The host-facing props.
 * @param provider - The live-preview provider (a fresh one when omitted).
 * @returns The mounted panel.
 */
function mount(
  initial: PanelProps = {},
  provider: ReturnType<typeof providerAtUrl> = providerAtUrl(),
): MountedPanel {
  const panel = mountPanel(provider, initial)
  mounted.push(panel)
  return panel
}

beforeEach(() => {
  setClassMap(classMap)
  // Server-up poll resolves so PreviewPanel mounts the iframe.
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(okResponse))
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Mounts the panel + waits until its iframe is present, then returns it.
 *
 * @param isBuilding - Whether the host reports an active build.
 * @returns The mounted panel and its iframe.
 */
async function mountWithIframe(
  isBuilding: boolean,
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const panel = mount({ isBuilding })
  await waitFor(
    () => panel.container.querySelector('iframe') !== null,
    4000,
    'the preview iframe to mount',
  )
  const iframe = panel.container.querySelector('iframe')
  if (!iframe) throw new Error('the preview iframe never mounted')
  return { ...panel, iframe }
}

/**
 * Mounts the panel and delivers the iframe at the earliest observable moment: on the
 * MutationObserver microtask that follows the DOM mutation that inserts it. That is the
 * ordering a loaded CI runner produced, and it is delivered deterministically here instead of
 * being hoped for. (Vue runs its mounted hooks on a post-flush job; this still delivers the load
 * before the view has had a chance to interact with the document again.)
 *
 * @param isBuilding - Whether the host reports an active build.
 * @returns The mounted panel and its iframe.
 */
async function mountWithIframeBeforeEffects(
  isBuilding: boolean,
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const panel = mount({ isBuilding })
  const iframe = await new Promise<HTMLIFrameElement>((resolve, reject) => {
    const giveUp = setTimeout(() => {
      observer.disconnect()
      reject(new Error('the preview iframe never mounted'))
    }, 4000)
    const observer = new MutationObserver(() => {
      const el = panel.container.querySelector('iframe')
      if (!el) return
      clearTimeout(giveUp)
      observer.disconnect()
      resolve(el)
    })
    observer.observe(panel.container, { childList: true, subtree: true })
  })
  // The load lands INSIDE the mutation microtask, before the session's queued flush.
  iframe.dispatchEvent(new Event('load'))
  return { ...panel, iframe }
}

// TIMING: the dead-document blank notice is gated on PreviewPanel's BLANK_DEAD_MS
// (15s since 1.0.2's proxy/Fly retuning; the 12s LOAD_RECOVER_AFTER_MS auto-reload
// fires before it), so every positive waitFor must clear 15s by a wide margin, and
// every NEGATIVE wait ("the notice must NOT appear") must ALSO outlast 15s or it
// passes trivially no matter what the panel does. Keep the ratio generous — a slow
// runner is not a regression.
describe('PreviewPanel — no bare white screen (blank/building overlay)', () => {
  it('does NOT falsely accuse a still-starting (alive, cold-booting) app of being blank', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // A fresh project's COLD Vite dev server legitimately takes many seconds to pre-bundle deps +
    // compile the just-written app before React mounts. Throughout, the scaffold's INLINE bridge
    // heartbeats (the app is alive) but posts no molecule:ready yet. This must NOT be accused of
    // being "blank" — that false accusation (with its "Open in new tab" button) is the whole
    // "fresh project preview won't load until I open a new tab and refresh the IDE" bug. The
    // honest status overlay stays up; the actionable blank notice must NOT appear.
    await loadIframe(iframe)
    const beat = setInterval(
      () => void postFromPreview(container, { type: 'molecule:heartbeat' }),
      1000,
    )
    try {
      await delay(8000)
      expect(q(container, 'preview-blank-notice')).toBeNull()
      // …and the overlay (honest "starting" status) still covers the not-yet-rendered app, so the
      // user always has feedback — never a bare white iframe AND never a false failure.
      expect(q(container, 'preview-overlay')).not.toBeNull()
    } finally {
      clearInterval(beat)
    }
  }, 90000)

  it('fresh project: AI stops building while cold Vite is still compiling → honest status, never a false blank, then reveals on ready', async () => {
    // The exact reported bug. A brand-new project: the AI writes files (isBuilding true), then
    // FINISHES (isBuilding flips false) while the cold Vite dev server is still pre-bundling/
    // compiling the just-written app. The iframe's shell HTML fires onLoad early; the inline bridge
    // heartbeats (alive) but React has not mounted yet (no molecule:ready for several seconds).
    // The panel MUST keep an honest "Starting…" status — never the false "preview is blank / open
    // in new tab" (or "can't load here") that forced the user to open a new tab + refresh — and
    // then reveal the app the instant the cold compile finishes and molecule:ready arrives.
    const { container, iframe, setProps } = await mountWithIframe(true)
    await loadIframe(iframe) // shell HTML loaded; modules still compiling
    const beat = setInterval(
      () => void postFromPreview(container, { type: 'molecule:heartbeat' }),
      800,
    )
    try {
      // AI finishes — isBuilding flips false while the app has NOT rendered yet.
      await setProps({ isBuilding: false })
      // For several seconds the app is alive (heartbeats) but unmounted: honest overlay, and
      // NEITHER the false "blank" notice NOR the "can't load here" give-up panel.
      await delay(6000)
      expect(q(container, 'preview-blank-notice')).toBeNull()
      expect(q(container, 'preview-load-failed')).toBeNull()
      expect(q(container, 'preview-overlay')).not.toBeNull()
      // Cold compile finishes, React mounts → molecule:ready → the overlay reveals the app.
      await postFromPreview(container, { type: 'molecule:ready' })
      await waitFor(
        () => q(container, 'preview-overlay') === null,
        4000,
        'the overlay to reveal the confirmed app',
      )
    } finally {
      clearInterval(beat)
    }
  }, 18000)

  it('covers a broken page that never ran its bridge (no heartbeat at all) — the worst case', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The document loads but the page is broken/blank and its bridge NEVER runs, so there is NO
    // molecule:ready AND NO molecule:heartbeat — the iframe just sits there (e.g. a broken-image
    // / error response). The overlay must STILL cover it and the blank notice must STILL appear.
    // (The earlier bridgeAlive gate required a heartbeat, which left exactly this case a bare,
    // feedback-less broken preview.)
    await loadIframe(iframe)
    // Deliberately post NOTHING — no ready, no heartbeat.

    await waitFor(
      () => q(container, 'preview-blank-notice') !== null,
      60000,
      'the blank notice for a document whose bridge never ran',
    )
    // …and the overlay covered the iframe the whole time (never a bare broken page).
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 90000)

  it('never accuses the app of being blank while a build is still in progress', async () => {
    const { container, iframe } = await mountWithIframe(true)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:heartbeat' })

    // Past every accusation window — including the dead-doc BLANK_DEAD_MS (15s; the single
    // heartbeat above went stale long before that) — an ACTIVE build keeps the reassuring
    // status overlay up over the unconfirmed app: never the "preview is blank" accusation,
    // never bare white.
    await delay(17000)
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 90000)

  it('clears the blank notice once the app confirms it rendered (molecule:ready)', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // Drive the genuine-failure path: the document loads but its inline bridge NEVER runs (no
    // heartbeat at all ⇒ a broken/error page), so the actionable notice appears — after
    // BLANK_DEAD_MS (15s), hence the generous timeout.
    await loadIframe(iframe)
    await waitFor(
      () => q(container, 'preview-blank-notice') !== null,
      60000,
      'the blank notice for a bridge-less document',
    )

    // A real render confirmation tears the notice down — the app is showing content now.
    await postFromPreview(container, { type: 'molecule:ready' })
    await waitFor(
      () => q(container, 'preview-blank-notice') === null,
      4000,
      'the blank notice to clear on molecule:ready',
    )
  }, 90000)

  it('honors an onLoad that lands before the mount commit finishes its effects (the loaded-CI ordering)', async () => {
    // CI flake 2026-10-18 (run 39098572320): on a loaded runner React's passive effects for the
    // iframe's mounting commit were still queued when the document's onLoad was handled. The
    // per-load reset then ran AFTER the load, discarded it, and the cold-boot evaluator never
    // armed — the notice never appeared. Deliver the load on the mount's MutationObserver
    // microtask here, so the ordering is exercised every run instead of only under scheduler
    // starvation.
    const { container } = await mountWithIframeBeforeEffects(false)
    // No heartbeat: a loaded document whose inline bridge never ran. It must still be accused.
    await waitFor(
      () => q(container, 'preview-blank-notice') !== null,
      60000,
      'the blank notice for a load delivered before the mount settled',
    )
  }, 90000)

  it('a raw document the user clicked to (feed.xml, provenance.json) is content, never a blank app', async () => {
    const { container, iframe } = await mountWithIframe(false)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    await delay(2500)
    expect(q(container, 'preview-blank-notice')).toBeNull()

    // The bridge in the app page reports the click before the browser leaves for the XML;
    // the XML document then loads with NO bridge: no ready, no heartbeat, ever.
    await postFromPreview(container, {
      type: 'molecule:navigate',
      url: new URL('/blog/feed.xml', PREVIEW_URL).href,
      isReplace: false,
      isIntent: true,
    })
    await loadIframe(iframe)

    // Well past BLANK_CONFIRM_MS: the notice must not appear, the document stays revealed.
    await delay(5000)
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(iframe.style.visibility).not.toBe('hidden')
  }, 18000)

  it('a click intent for an app route does not certify a blank reload', async () => {
    const { container, iframe } = await mountWithIframe(false)
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    await delay(2500)

    await postFromPreview(container, {
      type: 'molecule:navigate',
      url: new URL('/about/', PREVIEW_URL).href,
      isReplace: false,
      isIntent: true,
    })
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    await waitFor(
      () => q(container, 'preview-blank-notice') !== null,
      60000,
      'the blank notice after an app-route click reloaded to blank',
    )
  }, 18000)

  it('re-covers the preview when an edit reloads a previously-working app to blank', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The app loads and CONFIRMS it rendered → no blank accusation.
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    // Wait past READY_FRESH_MS so the NEXT load is evaluated as a fresh document, not a
    // continuation of the just-confirmed one.
    await delay(2500)
    expect(q(container, 'preview-blank-notice')).toBeNull()

    // An edit triggers a Vite full-reload, but the app now renders nothing: a fresh onLoad
    // with NO molecule:ready (the reloaded document is white), bridge still alive.
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:heartbeat' })

    // confirmedContent must DROP — the stale "it rendered" state can't keep masking a now-blank
    // reload — so the actionable notice appears instead of a bare white screen. (Without the
    // onLoad reconfirm, confirmedContent stayed true and the user was left staring at white.)
    await waitFor(
      () => q(container, 'preview-blank-notice') !== null,
      60000,
      'the blank notice after an edit reloaded the app to blank',
    )
  }, 18000)

  it('wake patience: a previously-rendered app that reloads right after a sandbox wake is NOT accused of being blank', async () => {
    // The hibernation-wake bug: the sandbox sleeps and is silently woken (e.g. a chat turn),
    // the restarting Vite server makes the still-mounted document full-reload, and the reloaded
    // document legitimately renders nothing while the cold dev server recompiles. Without wake
    // awareness the "already rendered → reload must re-confirm within BLANK_CONFIRM_MS" regime
    // false-fired the "preview is blank" notice a couple seconds in, only for the app to render
    // fine moments later. With a fresh `wakeAt` the panel must keep the honest loading status
    // (no accusation), then reveal on the ready that follows.
    const { container, iframe, setProps } = await mountWithIframe(false)
    // The app loads and CONFIRMS it rendered (the pre-hibernation session).
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    await postFromPreview(container, { type: 'molecule:heartbeat' })
    // Wait past READY_FRESH_MS so the next load counts as a fresh document.
    await delay(2500)

    // The sandbox is woken — the host reports it — and the restarting server reloads the
    // document, which stays unconfirmed (alive but cold-recompiling; no fresh ready).
    await setProps({ isBuilding: false, wakeAt: Date.now() })
    await loadIframe(iframe)
    const beat = setInterval(
      () => void postFromPreview(container, { type: 'molecule:heartbeat' }),
      800,
    )
    try {
      // Well past BLANK_CONFIRM_MS (2.5s): the notice must NOT appear; the honest overlay must.
      await delay(5000)
      expect(q(container, 'preview-blank-notice')).toBeNull()
      expect(q(container, 'preview-load-failed')).toBeNull()
      expect(q(container, 'preview-overlay')).not.toBeNull()
      // The cold recompile finishes → ready → the overlay reveals the app as usual.
      await postFromPreview(container, { type: 'molecule:ready' })
      await waitFor(
        () => q(container, 'preview-overlay') === null,
        4000,
        'the overlay to reveal the post-wake app',
      )
    } finally {
      clearInterval(beat)
    }
  }, 20000)

  it('wake patience: an app that renders once DURING the wake window then reloads blank is still NOT accused (the hasEverRendered branch)', async () => {
    // The gap the first wake fix missed — and the exact live symptom. A cold wake relaunches
    // Vite, which routinely mounts the app once (→ molecule:ready, flipping hasEverRendered
    // true) and THEN does a full HMR reload while it finishes pre-bundling deps. That reload
    // renders nothing for a beat and lands on the ALREADY-rendered BLANK_CONFIRM_MS (2.5s)
    // path — which the wake window must also override, not just the never-rendered path. The
    // ready here arrives AFTER wakeAt (unlike the pre-hibernation case), so the reset-on-wake
    // effect can't be what saves it; the evaluator's own wake gate must.
    const wakeAt = Date.now()
    const { container } = mount({ isBuilding: false, wakeAt })
    await waitFor(
      () => container.querySelector('iframe') !== null,
      4000,
      'the preview iframe to mount after a wake',
    )
    const mountedIframe = container.querySelector('iframe')
    if (!mountedIframe) throw new Error('the preview iframe never mounted')
    const beat = setInterval(
      () => void postFromPreview(container, { type: 'molecule:heartbeat' }),
      800,
    )
    try {
      // The woken Vite mounts the app once — DURING the wake window — so hasEverRendered flips true.
      await loadIframe(mountedIframe)
      await postFromPreview(container, { type: 'molecule:ready' })
      // Past READY_FRESH_MS so the next load is treated as a fresh document (drops confirmed).
      await delay(1800)
      // Vite full-reloads mid-optimize: fresh onLoad, NO new ready (blank for a beat).
      await loadIframe(mountedIframe)
      // Well past BLANK_CONFIRM_MS (2.5s) yet inside the wake window: no accusation.
      await delay(4000)
      expect(q(container, 'preview-blank-notice')).toBeNull()
      expect(q(container, 'preview-load-failed')).toBeNull()
      expect(q(container, 'preview-overlay')).not.toBeNull()
      // Cold optimize finishes → ready → reveal.
      await postFromPreview(container, { type: 'molecule:ready' })
      await waitFor(
        () => q(container, 'preview-overlay') === null,
        4000,
        'the overlay to reveal the app after the wake-window reload',
      )
    } finally {
      clearInterval(beat)
    }
  }, 20000)

  it('wake patience: a preview-URL change (new sandbox port) is itself a wake signal — a bridge-less reload is NOT accused', async () => {
    // The reliable, self-contained wake signal: a wake ALWAYS reassigns the sandbox's docker port
    // (empty HostPort → a fresh ephemeral port each start), so the woken preview arrives on a new
    // URL. That URL change alone must trigger wake patience — no host `wakeAt` prop needed (the
    // status broadcasts that feed it are easily missed). Here the app renders on the first URL,
    // then the sandbox is woken onto a NEW port whose cold Vite briefly serves a bridge-less
    // document; the URL change must grant patience so the notice does not fire.
    const provider = createProvider({ defaultUrl: 'http://127.0.0.1:40001/' })
    provider.setUrl('http://127.0.0.1:40001/')
    const { container } = mount({ isBuilding: false }, provider)
    await waitFor(
      () => container.querySelector('iframe') !== null,
      4000,
      'the preview iframe to mount on the first URL',
    )
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    // First URL renders fine.
    await loadIframe(iframe)
    await postFromPreview(container, { type: 'molecule:ready' })
    // Wait past READY_FRESH_MS so the post-wake reload is treated as a fresh document (a real
    // wake happens long after the last render — the app was hibernated).
    await delay(2500)
    // Wake: the sandbox comes back on a NEW port → the host repoints the preview at a new URL.
    provider.setUrl('http://127.0.0.1:40002/')
    await settle()
    await delay(500)
    await waitFor(
      () => {
        const next = container.querySelector('iframe')
        return next !== null && next !== iframe
      },
      4000,
      'the preview iframe to remount on the new URL',
    )
    const iframe2 = container.querySelector('iframe')
    if (!iframe2) throw new Error('the preview iframe never remounted')
    // The new port's cold Vite serves a bridge-less document (no ready, no heartbeat).
    await loadIframe(iframe2)
    // Well past BLANK_DEAD_MS (15s): the URL-change wake window must keep the notice away.
    // (A shorter wait passes trivially — the accusation can't fire before 15s at all.)
    await delay(17000)
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 90000)

  it('wake patience: a bridge-less (dead) document right after a wake is NOT accused within the dead-doc window', async () => {
    // Behind a preview proxy, a wake can transiently serve an error page that never runs the
    // inline bridge — the exact signature BLANK_DEAD_MS treats as a genuine failure (15s). Right
    // after a wake that inference is wrong: the dev server is still coming up and the stale-
    // document auto-reloads recover it. The notice must stay away well past BLANK_DEAD_MS.
    const { container } = mount({ isBuilding: false, wakeAt: Date.now() })
    await waitFor(
      () => container.querySelector('iframe') !== null,
      4000,
      'the preview iframe to mount after a wake',
    )
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    await loadIframe(iframe)
    // Deliberately post NOTHING — no ready, no heartbeat (the error page has no bridge).
    // Outlast BLANK_DEAD_MS (15s), or wake patience is never actually exercised.
    await delay(17000)
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-load-failed')).toBeNull()
    // …while the honest overlay keeps covering it (never a bare error page).
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 90000)

  it('a STALE wakeAt (older than the patience window) changes nothing — the dead-doc accusation still fires', async () => {
    // Wake patience must be a bounded window, not a permanent free pass: with a wake long past,
    // a loaded document that never ran its bridge is a genuine failure and the actionable
    // notice must appear exactly as before.
    const { container } = mount({ isBuilding: false, wakeAt: Date.now() - 120_000 })
    await waitFor(
      () => container.querySelector('iframe') !== null,
      4000,
      'the preview iframe to mount after a stale wake',
    )
    const iframe = container.querySelector('iframe')
    if (!iframe) throw new Error('the preview iframe never mounted')
    await loadIframe(iframe)
    await waitFor(
      () => q(container, 'preview-blank-notice') !== null,
      60000,
      'the blank notice for a bridge-less document after a stale wake',
    )
  }, 90000)

  it('the overlay carries NO backdrop-filter (sampling the cross-origin OOPIF backdrop deadlocks the host renderer under software compositing — the whole-tab freeze)', async () => {
    // Reproduce the exact state the freeze needed: the status overlay shown over a once-loaded
    // preview (everLoaded true → the old code set `backdrop-filter: blur(2px)` HERE). The overlay
    // sits directly on top of the live cross-origin preview <iframe> (an out-of-process iframe);
    // a backdrop-filter must read that OOPIF's compositor surface across processes every frame,
    // which deadlocks the host main thread under GPU-less software compositing. isBuilding keeps
    // the overlay up over the unconfirmed app so we can inspect it after onLoad flips everLoaded.
    const { container, iframe } = await mountWithIframe(true)
    await loadIframe(iframe) // onLoad grace flips everLoaded → the state that used to add the blur
    await delay(3200) // past ONLOAD_GRACE_MS
    const overlay = container.querySelector<HTMLElement>('[data-mol-id="preview-overlay"]')
    expect(overlay).not.toBeNull()
    const style = (overlay?.getAttribute('style') ?? '').toLowerCase()
    expect(style).not.toContain('backdrop-filter')
    expect(style).not.toContain('backdropfilter')
    expect(overlay?.style.backdropFilter ?? '').toBe('')
  }, 8000)
})
