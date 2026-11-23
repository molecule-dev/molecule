// @vitest-environment jsdom

/**
 * The preview must NEVER leave the user staring at a bare white iframe with no
 * feedback — AND it must never FALSELY accuse a still-starting app of being
 * "blank"/"unable to load".
 *
 * The iframe "loading" (its document fired `onLoad`) does NOT mean the app
 * rendered — a fresh project's COLD Vite server can take many seconds to
 * compile the app before React mounts, during which the inline bridge
 * heartbeats (alive) but posts no `molecule:ready` yet. So the overlay stays up
 * until the app CONFIRMS it rendered content (`molecule:ready`), and the
 * actionable "preview is blank — reload / open in new tab" notice is raised
 * ONLY on a real signal — never on a naive "hasn't rendered in N seconds" timer
 * that false-fired over a cold boot. Honest copy:
 *  - while a build is in progress (`isBuilding`) → a reassuring "Building your
 *    app…" overlay;
 *  - a first cold boot that is ALIVE (heartbeating) but hasn't confirmed a
 *    render → keep the honest "Starting…" status; do NOT accuse it of being
 *    blank (that was the fresh-project bug);
 *  - a document that never even ran its inline bridge (NO heartbeat at all ⇒
 *    broken/error page), an app that RENDERED-then-reloaded-blank, or an
 *    explicit `molecule:blank` → the ACTIONABLE notice, after a short settle;
 *  - a confirmed render (`molecule:ready`) clears everything;
 *  - right after the host reports a sandbox wake (`wakeAt`), the fast
 *    accusations stand down (a post-wake reload legitimately renders nothing
 *    while the dev server restarts) — but the patience is a bounded window.
 *
 * This is a real jsdom render of the Svelte `PreviewPanel` driving a recording
 * live-preview provider. `fetch` is stubbed so the server-up poll succeeds and
 * the iframe mounts; inbound bridge messages are dispatched from the preview
 * iframe's own window (the panel's trust gate). Real timers + `vi.waitFor`
 * (the blank settle is several seconds), so the asserts are robust to the
 * panel's async scheduler rather than racing a fake clock.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreviewPanelProps } from '../types.js'
import {
  buildPreviewProvider,
  currentIframe,
  fireFrameLoad,
  installStubClassMap,
  type MountedPanel,
  mountPanel,
  postFromPreview,
  PREVIEW_URL,
  q,
} from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

/** A real-time wait (the blank settle is measured in seconds). */
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(() => {
  installStubClassMap()
  // Server-up poll resolves so the panel mounts the iframe.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))),
  )
})

afterEach(async () => {
  await panel?.dispose()
  panel = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** The panel's current iframe, once it has mounted. */
async function waitForIframe(container: HTMLElement): Promise<HTMLIFrameElement> {
  return vi.waitFor(
    () => {
      const el = currentIframe(container)
      if (!el) throw new Error('the preview iframe never mounted')
      return el
    },
    { timeout: 4000 },
  )
}

/** Mount the panel + wait until its iframe is present, then return it. */
async function mountWithIframe(
  isBuilding: boolean,
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const mounted = mountPanel(buildPreviewProvider(), { isBuilding })
  panel = mounted
  const iframe = await waitForIframe(mounted.container)
  return { ...mounted, iframe }
}

/**
 * Mount the panel and return the iframe as soon as the DOM carries it — on the
 * MutationObserver microtask that follows the mutation, before any later task
 * (the loaded-CI ordering the React test delivers deterministically).
 */
async function mountWithIframeBeforeEffects(
  isBuilding: boolean,
): Promise<MountedPanel & { iframe: HTMLIFrameElement }> {
  const mounted = mountPanel(buildPreviewProvider(), { isBuilding })
  panel = mounted
  const iframe = await new Promise<HTMLIFrameElement>((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const el = currentIframe(mounted.container)
      if (!el) return
      clearTimeout(giveUp)
      observer.disconnect()
      resolve(el)
    })
    const giveUp = setTimeout(() => {
      observer.disconnect()
      reject(new Error('the preview iframe never mounted'))
    }, 4000)
    observer.observe(mounted.container, { childList: true, subtree: true })
  })
  return { ...mounted, iframe }
}

/** Replaces the panel's props and flushes Svelte (React's `rerender`). */
function setProps(mounted: MountedPanel, next: PreviewPanelProps): void {
  mounted.setProps(next)
}

describe('PreviewPanel — no bare white screen (blank/building overlay)', () => {
  it('does NOT falsely accuse a still-starting (alive, cold-booting) app of being blank', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // A fresh project's COLD Vite dev server legitimately takes many seconds to pre-bundle deps +
    // compile the just-written app before React mounts. Throughout, the scaffold's INLINE bridge
    // heartbeats (the app is alive) but posts no molecule:ready yet. This must NOT be accused of
    // being "blank" — that false accusation (with its "Open in new tab" button) is the whole
    // "fresh project preview won't load until I open a new tab and refresh the IDE" bug. The
    // honest status overlay stays up; the actionable blank notice must NOT appear.
    fireFrameLoad(iframe)
    const beat = setInterval(() => postFromPreview({ type: 'molecule:heartbeat' }), 1000)
    try {
      await wait(8000)
      expect(q(container, 'preview-blank-notice')).toBeNull()
      // …and the overlay (honest "starting" status) still covers the not-yet-rendered app, so the
      // user always has feedback — never a bare white iframe AND never a false failure.
      expect(q(container, 'preview-overlay')).not.toBeNull()
    } finally {
      clearInterval(beat)
    }
  }, 90_000)

  it('fresh project: AI stops building while cold Vite is still compiling → honest status, never a false blank, then reveals on ready', async () => {
    // The exact reported bug. A brand-new project: the AI writes files (isBuilding true), then
    // FINISHES (isBuilding flips false) while the cold Vite dev server is still pre-bundling/
    // compiling the just-written app. The iframe's shell HTML fires onLoad early; the inline bridge
    // heartbeats (alive) but React has not mounted yet (no molecule:ready for several seconds).
    // The panel MUST keep an honest "Starting…" status — never the false "preview is blank / open
    // in new tab" (or "can't load here") that forced the user to open a new tab + refresh — and
    // then reveal the app the instant the cold compile finishes and molecule:ready arrives.
    const provider = buildPreviewProvider()
    const mounted = mountPanel(provider, { isBuilding: true })
    panel = mounted
    const iframe = await waitForIframe(mounted.container)
    fireFrameLoad(iframe) // shell HTML loaded; modules still compiling
    const beat = setInterval(() => postFromPreview({ type: 'molecule:heartbeat' }), 800)
    try {
      // AI finishes — isBuilding flips false while the app has NOT rendered yet.
      setProps(mounted, { isBuilding: false })
      // For several seconds the app is alive (heartbeats) but unmounted: honest overlay, and
      // NEITHER the false "blank" notice NOR the "can't load here" give-up panel.
      await wait(6000)
      expect(q(mounted.container, 'preview-blank-notice')).toBeNull()
      expect(q(mounted.container, 'preview-load-failed')).toBeNull()
      expect(q(mounted.container, 'preview-overlay')).not.toBeNull()
      // Cold compile finishes, React mounts → molecule:ready → the overlay reveals the app.
      postFromPreview({ type: 'molecule:ready' })
      await vi.waitFor(() => expect(q(mounted.container, 'preview-overlay')).toBeNull(), {
        timeout: 4000,
      })
    } finally {
      clearInterval(beat)
    }
  }, 18_000)

  it('covers a broken page that never ran its bridge (no heartbeat at all) — the worst case', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The document loads but the page is broken/blank and its bridge NEVER runs, so there is NO
    // molecule:ready AND NO molecule:heartbeat — the iframe just sits there (e.g. a broken-image
    // / error response). The overlay must STILL cover it and the blank notice must STILL appear.
    // (The earlier bridgeAlive gate required a heartbeat, which left exactly this case a bare,
    // feedback-less broken preview.)
    fireFrameLoad(iframe)
    // Deliberately post NOTHING — no ready, no heartbeat.

    await vi.waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 60000,
    })
    // …and the overlay covered the iframe the whole time (never a bare broken page).
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 90_000)

  it('never accuses the app of being blank while a build is still in progress', async () => {
    const { container, iframe } = await mountWithIframe(true)
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:heartbeat' })

    // Past every accusation window — including the dead-doc window (15s; the single
    // heartbeat above went stale long before that) — an ACTIVE build keeps the reassuring
    // status overlay up over the unconfirmed app: never the "preview is blank" accusation,
    // never bare white.
    await wait(17_000)
    expect(q(container, 'preview-blank-notice')).toBeNull()
    expect(q(container, 'preview-overlay')).not.toBeNull()
  }, 90_000)

  it('clears the blank notice once the app confirms it rendered (molecule:ready)', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // Drive the genuine-failure path: the document loads but its inline bridge NEVER runs (no
    // heartbeat at all ⇒ a broken/error page), so the actionable notice appears — after the
    // dead-document window (15s), hence the generous timeout.
    fireFrameLoad(iframe)
    await vi.waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 60000,
    })

    // A real render confirmation tears the notice down — the app is showing content now.
    postFromPreview({ type: 'molecule:ready' })
    await vi.waitFor(() => expect(q(container, 'preview-blank-notice')).toBeNull(), {
      timeout: 4000,
    })
  }, 90_000)

  it('honors an onLoad that lands before the mount commit finishes its effects (the loaded-CI ordering)', async () => {
    // CI flake 2026-10-18 (run 39098572320): on a loaded runner the iframe's mounting commit
    // was still settling when the document's onLoad was handled. The per-load reset then ran
    // AFTER the load, discarded it, and the cold-boot evaluator never armed — the notice never
    // appeared (the panel showed "Retry attempt 1" instead). Deliver the load on the commit's
    // MutationObserver microtask, before any later task, so the ordering is exercised every run
    // instead of only under scheduler starvation.
    const { container, iframe } = await mountWithIframeBeforeEffects(false)
    fireFrameLoad(iframe)
    // No heartbeat: a loaded document whose inline bridge never ran. It must still be accused.
    await vi.waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 60000,
    })
  }, 90_000)

  it('a raw document the user clicked to (feed.xml, provenance.json) is content, never a blank app', async () => {
    const { container, iframe } = await mountWithIframe(false)
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:heartbeat' })
    await wait(2500)
    expect(q(container, 'preview-blank-notice')).toBeNull()

    // The bridge in the app page reports the click before the browser leaves for the XML;
    // the XML document then loads with NO bridge: no ready, no heartbeat, ever.
    postFromPreview({
      type: 'molecule:navigate',
      url: new URL('/blog/feed.xml', PREVIEW_URL).href,
      isReplace: false,
      isIntent: true,
    })
    const current = currentIframe(container)
    if (!current) throw new Error('the preview iframe went away')
    fireFrameLoad(current)

    // Well past the already-rendered blank window: the notice must not appear, the document
    // stays revealed.
    await wait(5000)
    expect(q(container, 'preview-blank-notice')).toBeNull()
    const iframeAfter = currentIframe(container)
    expect(iframeAfter).not.toBeNull()
    expect(iframeAfter!.style.visibility).not.toBe('hidden')
  }, 18_000)

  it('a click intent for an app route does not certify a blank reload', async () => {
    const { container, iframe } = await mountWithIframe(false)
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:heartbeat' })
    await wait(2500)

    postFromPreview({
      type: 'molecule:navigate',
      url: new URL('/about/', PREVIEW_URL).href,
      isReplace: false,
      isIntent: true,
    })
    const current = currentIframe(container)
    if (!current) throw new Error('the preview iframe went away')
    fireFrameLoad(current)
    postFromPreview({ type: 'molecule:heartbeat' })
    await vi.waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 60000,
    })
  }, 18_000)

  it('re-covers the preview when an edit reloads a previously-working app to blank', async () => {
    const { container, iframe } = await mountWithIframe(false)
    // The app loads and CONFIRMS it rendered → no blank accusation.
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:heartbeat' })
    // Wait past the ready-fresh window so the NEXT load is evaluated as a fresh document, not a
    // continuation of the just-confirmed one.
    await wait(2500)
    expect(q(container, 'preview-blank-notice')).toBeNull()

    // An edit triggers a Vite full-reload, but the app now renders nothing: a fresh onLoad
    // with NO molecule:ready (the reloaded document is white), bridge still alive.
    const current = currentIframe(container)
    if (!current) throw new Error('the preview iframe went away')
    fireFrameLoad(current)
    postFromPreview({ type: 'molecule:heartbeat' })

    // confirmedContent must DROP — the stale "it rendered" state can't keep masking a now-blank
    // reload — so the actionable notice appears instead of a bare white screen. (Without the
    // onLoad reconfirm, confirmedContent stayed true and the user was left staring at white.)
    await vi.waitFor(() => expect(q(container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 60000,
    })
  }, 18_000)

  it('wake patience: a previously-rendered app that reloads right after a sandbox wake is NOT accused of being blank', async () => {
    // The hibernation-wake bug: the sandbox sleeps and is silently woken (e.g. a chat turn),
    // the restarting Vite server makes the still-mounted document full-reload, and the reloaded
    // document legitimately renders nothing while the cold dev server recompiles. Without wake
    // awareness the "already rendered → reload must re-confirm within the short window" regime
    // false-fired the "preview is blank" notice a couple seconds in, only for the app to render
    // fine moments later. With a fresh `wakeAt` the panel must keep the honest loading status
    // (no accusation), then reveal on the ready that follows.
    const provider = buildPreviewProvider()
    const mounted = mountPanel(provider, { isBuilding: false })
    panel = mounted
    const iframe = await waitForIframe(mounted.container)
    // The app loads and CONFIRMS it rendered (the pre-hibernation session).
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    postFromPreview({ type: 'molecule:heartbeat' })
    // Wait past the ready-fresh window so the next load counts as a fresh document.
    await wait(2500)

    // The sandbox is woken — the host reports it — and the restarting server reloads the
    // document, which stays unconfirmed (alive but cold-recompiling; no fresh ready).
    setProps(mounted, { isBuilding: false, wakeAt: Date.now() })
    const current = currentIframe(mounted.container)
    if (!current) throw new Error('the preview iframe went away')
    fireFrameLoad(current)
    const beat = setInterval(() => postFromPreview({ type: 'molecule:heartbeat' }), 800)
    try {
      // Well past the already-rendered blank window (2.5s): the notice must NOT appear; the
      // honest overlay must.
      await wait(5000)
      expect(q(mounted.container, 'preview-blank-notice')).toBeNull()
      expect(q(mounted.container, 'preview-load-failed')).toBeNull()
      expect(q(mounted.container, 'preview-overlay')).not.toBeNull()
      // The cold recompile finishes → ready → the overlay reveals the app as usual.
      postFromPreview({ type: 'molecule:ready' })
      await vi.waitFor(() => expect(q(mounted.container, 'preview-overlay')).toBeNull(), {
        timeout: 4000,
      })
    } finally {
      clearInterval(beat)
    }
  }, 20_000)

  it('wake patience: an app that renders once DURING the wake window then reloads blank is still NOT accused (the hasEverRendered branch)', async () => {
    // The gap the first wake fix missed — and the exact live symptom. A cold wake relaunches
    // Vite, which routinely mounts the app once (→ molecule:ready, flipping hasEverRendered
    // true) and THEN does a full HMR reload while it finishes pre-bundling deps. That reload
    // renders nothing for a beat and lands on the ALREADY-rendered blank window — which the wake
    // window must also override, not just the never-rendered path. The ready here arrives AFTER
    // wakeAt (unlike the pre-hibernation case), so the reset-on-wake effect can't be what saves
    // it; the evaluator's own wake gate must.
    const wakeAt = Date.now()
    const provider = buildPreviewProvider()
    const mounted = mountPanel(provider, { isBuilding: false, wakeAt })
    panel = mounted
    const iframe = await waitForIframe(mounted.container)
    const beat = setInterval(() => postFromPreview({ type: 'molecule:heartbeat' }), 800)
    try {
      // The woken Vite mounts the app once — DURING the wake window — so hasEverRendered flips true.
      fireFrameLoad(iframe)
      postFromPreview({ type: 'molecule:ready' })
      // Past the ready-fresh window so the next load is treated as a fresh document (drops confirmed).
      await wait(1800)
      // Vite full-reloads mid-optimize: fresh onLoad, NO new ready (blank for a beat).
      const current = currentIframe(mounted.container)
      if (!current) throw new Error('the preview iframe went away')
      fireFrameLoad(current)
      // Well past the already-rendered blank window (2.5s) yet inside the wake window: no accusation.
      await wait(4000)
      expect(q(mounted.container, 'preview-blank-notice')).toBeNull()
      expect(q(mounted.container, 'preview-load-failed')).toBeNull()
      expect(q(mounted.container, 'preview-overlay')).not.toBeNull()
      // Cold optimize finishes → ready → reveal.
      postFromPreview({ type: 'molecule:ready' })
      await vi.waitFor(() => expect(q(mounted.container, 'preview-overlay')).toBeNull(), {
        timeout: 4000,
      })
    } finally {
      clearInterval(beat)
    }
  }, 20_000)

  it('wake patience: a preview-URL change (new sandbox port) is itself a wake signal — a bridge-less reload is NOT accused', async () => {
    // The reliable, self-contained wake signal: a wake ALWAYS reassigns the sandbox's docker port
    // (empty HostPort → a fresh ephemeral port each start), so the woken preview arrives on a new
    // URL. That URL change alone must trigger wake patience — no host `wakeAt` prop needed (the
    // status broadcasts that feed it are easily missed). Here the app renders on the first URL,
    // then the sandbox is woken onto a NEW port whose cold Vite briefly serves a bridge-less
    // document; the URL change must grant patience so the notice does not fire.
    const provider = buildPreviewProvider({ url: 'http://127.0.0.1:40001/' })
    const mounted = mountPanel(provider, { isBuilding: false })
    panel = mounted
    const iframe = await waitForIframe(mounted.container)
    // First URL renders fine.
    fireFrameLoad(iframe)
    postFromPreview({ type: 'molecule:ready' })
    // Wait past the ready-fresh window so the post-wake reload is treated as a fresh document (a
    // real wake happens long after the last render — the app was hibernated).
    await wait(2500)
    // Wake: the sandbox comes back on a NEW port → the host repoints the preview at a new URL.
    provider.setUrl('http://127.0.0.1:40002/')
    await wait(500)
    const iframe2 = await waitForIframe(mounted.container)
    // The new port's cold Vite serves a bridge-less document (no ready, no heartbeat).
    fireFrameLoad(iframe2)
    // Well past the dead-document window (15s): the URL-change wake window must keep the notice
    // away. (A shorter wait passes trivially — the accusation can't fire before 15s at all.)
    await wait(17_000)
    expect(q(mounted.container, 'preview-blank-notice')).toBeNull()
    expect(q(mounted.container, 'preview-overlay')).not.toBeNull()
  }, 90_000)

  it('wake patience: a bridge-less (dead) document right after a wake is NOT accused within the dead-doc window', async () => {
    // Behind a preview proxy, a wake can transiently serve an error page that never runs the
    // inline bridge — the exact signature the dead-document window treats as a genuine failure
    // (15s). Right after a wake that inference is wrong: the dev server is still coming up and
    // the stale-document auto-reloads recover it. The notice must stay away well past it.
    const provider = buildPreviewProvider()
    const mounted = mountPanel(provider, { isBuilding: false, wakeAt: Date.now() })
    panel = mounted
    const iframe = await waitForIframe(mounted.container)
    fireFrameLoad(iframe)
    // Deliberately post NOTHING — no ready, no heartbeat (the error page has no bridge).
    // Outlast the dead-document window (15s), or wake patience is never actually exercised.
    await wait(17_000)
    expect(q(mounted.container, 'preview-blank-notice')).toBeNull()
    expect(q(mounted.container, 'preview-load-failed')).toBeNull()
    // …while the honest overlay keeps covering it (never a bare error page).
    expect(q(mounted.container, 'preview-overlay')).not.toBeNull()
  }, 90_000)

  it('a STALE wakeAt (older than the patience window) changes nothing — the dead-doc accusation still fires', async () => {
    // Wake patience must be a bounded window, not a permanent free pass: with a wake long past,
    // a loaded document that never ran its bridge is a genuine failure and the actionable
    // notice must appear exactly as before.
    const provider = buildPreviewProvider()
    const mounted = mountPanel(provider, { isBuilding: false, wakeAt: Date.now() - 120_000 })
    panel = mounted
    const iframe = await waitForIframe(mounted.container)
    fireFrameLoad(iframe)
    await vi.waitFor(() => expect(q(mounted.container, 'preview-blank-notice')).not.toBeNull(), {
      timeout: 60000,
    })
  }, 90_000)

  it('the overlay carries NO backdrop-filter (sampling the cross-origin OOPIF backdrop deadlocks the host renderer under software compositing — the whole-tab freeze)', async () => {
    // Reproduce the exact state the freeze needed: the status overlay shown over a once-loaded
    // preview (everLoaded true → the old code set `backdrop-filter: blur(2px)` HERE). The overlay
    // sits directly on top of the live cross-origin preview <iframe> (an out-of-process iframe);
    // a backdrop-filter must read that OOPIF's compositor surface across processes every frame,
    // which deadlocks the host main thread under GPU-less software compositing. isBuilding keeps
    // the overlay up over the unconfirmed app so we can inspect it after onLoad flips everLoaded.
    const { container, iframe } = await mountWithIframe(true)
    fireFrameLoad(iframe) // onLoad grace flips everLoaded → the state that used to add the blur
    await wait(3200) // past the onLoad grace
    const overlay = q(container, 'preview-overlay')
    expect(overlay).not.toBeNull()
    if (!(overlay instanceof HTMLElement)) throw new Error('the preview overlay is not an element')
    const style = (overlay.getAttribute('style') ?? '').toLowerCase()
    expect(style).not.toContain('backdrop-filter')
    expect(style).not.toContain('backdropfilter')
    expect(overlay.style.backdropFilter).toBe('')
  }, 8000)
})
