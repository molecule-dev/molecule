// @vitest-environment jsdom
/**
 * The mounted click-interceptor's upgrade-CTA behavior: the default new-tab
 * flow vs. a host taking over via `onUpgradeIntercept` (e.g. an in-app modal).
 *
 * Port of `@molecule/app-auth-modal-react/src/__tests__/AuthModalMount.test.tsx`.
 *
 * @module
 */

// Register Angular's JIT compiler facade and bond the reference ClassMap + i18n
// provider the components read, before any component class loads.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { flush, type RenderedFixture, renderFixture } from './render.js'
import { ButtonStub, IconStub, ModalStub, OAuthButtonsStub, OAuthDividerStub } from './stubs.js'

const refreshMock = vi.fn()

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refresh: refreshMock }),
  useAuthClient: () => ({ isAuthenticated: () => true, getUser: () => null }),
  useLogin: () => ({ status: 'idle', error: null, login: vi.fn() }),
  useSignup: () => ({ status: 'idle', error: null, signup: vi.fn() }),
  useI18nError: () => () => null,
  useOAuth: () => ({ providers: [], loginViaPopup: vi.fn() }),
  useTranslation: () => ({
    t: (key: string, _values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-auth-shell-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuthFormState: () => ({ fields: () => ({}), setField: vi.fn(), clear: vi.fn() }),
}))

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const stubs = await import('./stubs.js')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Modal: stubs.ModalStub,
    Icon: stubs.IconStub,
    Button: stubs.ButtonStub,
  }
})

vi.mock('@molecule/app-oauth-buttons-angular', async (importOriginal) => {
  const stubs = await import('./stubs.js')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    OAuthButtons: stubs.OAuthButtonsStub,
    OAuthDivider: stubs.OAuthDividerStub,
  }
})

// The AuthModal itself (forms, OAuth buttons) is out of scope here — the
// interceptor is what's under test, and the modal only mounts once opened.
vi.mock('../auth-modal.component.js', async () => ({
  AuthModal: (await import('./stubs.js')).AuthModalStub,
}))

import { AuthModalMount } from '../auth-modal-mount.component.js'

const OAUTH_CONFIG = {}

/** Fixtures still mounted when the current test started, torn down in afterEach. */
const mounted: RenderedFixture[] = []

/**
 * Mounts the mount + a same-origin CTA anchor, returns a handle: whether the
 * last plain left-click on the anchor was prevented.
 *
 * @param href - The anchor's target.
 * @param props - Extra mount props (e.g. `onUpgradeIntercept`).
 * @returns The click handle.
 */
async function renderWithCta(
  href: string,
  props: Record<string, unknown> = {},
): Promise<{ prevented(): boolean }> {
  const fixture = await renderFixture(
    `<a href="${href}" data-testid="cta">CTA</a><mol-auth-modal-mount
      [oauthConfig]="p['oauthConfig']"
      [onBeforeAuth]="p['onBeforeAuth']"
      [onAuthenticated]="p['onAuthenticated']"
      [onUpgradeReturn]="p['onUpgradeReturn']"
      [onUpgradeIntercept]="p['onUpgradeIntercept']"
    ></mol-auth-modal-mount>`,
    { oauthConfig: OAUTH_CONFIG, ...props },
    [AuthModalMount, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
  )
  await flush(fixture)
  mounted.push(fixture)
  const anchor = document.querySelector('[data-testid="cta"]') as HTMLAnchorElement
  return {
    prevented(): boolean {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
      anchor.dispatchEvent(event)
      return event.defaultPrevented
    },
  }
}

describe('AuthModalMount upgrade-CTA interception', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockReturnValue(null)
  })

  afterEach(async () => {
    // A left-mounted interceptor's document click listener would consume the
    // next test's click (preventDefault included), so each unmounts first.
    for (const fixture of mounted.splice(0)) await fixture.destroy()
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('opens the upgrade path in a new tab by default', async () => {
    const { prevented } = await renderWithCta('/pricing')
    expect(prevented()).toBe(true)
    expect(window.open).toHaveBeenCalledWith('/pricing', '_blank', 'noopener,noreferrer')
  })

  it('hands the click to onUpgradeIntercept instead of opening a tab', async () => {
    const onUpgradeIntercept = vi.fn()
    const { prevented } = await renderWithCta('/pricing', { onUpgradeIntercept })
    expect(prevented()).toBe(true)
    expect(onUpgradeIntercept).toHaveBeenCalledWith('/pricing')
    expect(window.open).not.toHaveBeenCalled()
  })

  it('passes the matched path (e.g. /billing) to the host', async () => {
    const onUpgradeIntercept = vi.fn()
    const { prevented } = await renderWithCta('/billing', { onUpgradeIntercept })
    prevented()
    expect(onUpgradeIntercept).toHaveBeenCalledWith('/billing')
  })

  it('a click right after a remount reaches the mounted interceptor', async () => {
    // A host that changes layout remounts the mount under another parent. A click right after
    // that DOM change must reach the mounted instance and open the modal; one that reached the
    // unmounted instance's listener prevented the navigation and opened nothing (React,
    // 2026-11-23). The observer clicks in that window: right after the DOM change.
    const fixture = await renderFixture(
      `@if (p['phase'] === 'first') {<div><mol-auth-modal-mount [oauthConfig]="p['oauthConfig']"></mol-auth-modal-mount></div>} @else {<section><mol-auth-modal-mount [oauthConfig]="p['oauthConfig']"></mol-auth-modal-mount></section>}`,
      { oauthConfig: OAUTH_CONFIG, phase: 'first' },
      [AuthModalMount, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
    )
    mounted.push(fixture)
    await flush(fixture)
    // After the fixture: rendering it empties document.body.
    const anchor = document.body.appendChild(document.createElement('a'))
    anchor.setAttribute('href', '/signup')
    const prevented = new Promise<boolean>((resolve) => {
      const observer = new MutationObserver(() => {
        observer.disconnect()
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
        anchor.dispatchEvent(event)
        resolve(event.defaultPrevented)
      })
      observer.observe(fixture.host, { childList: true, subtree: true })
    })
    const remounted = fixture.setProps({ phase: 'second' })
    expect(await prevented).toBe(true)
    await remounted
    await flush(fixture)
    expect(fixture.host.querySelector('section [data-testid="auth-modal"]')).not.toBeNull()
  })

  it('leaves unrelated links alone either way', async () => {
    const onUpgradeIntercept = vi.fn()
    const { prevented } = await renderWithCta('/dashboard', { onUpgradeIntercept })
    expect(prevented()).toBe(false)
    expect(onUpgradeIntercept).not.toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const fixture = await renderFixture(
      `<i>a</i><a href="/login" data-testid="cta">CTA</a><mol-auth-modal-mount [oauthConfig]="p['oauthConfig']"></mol-auth-modal-mount><i>b</i>`,
      { oauthConfig: OAUTH_CONFIG },
      [AuthModalMount, ModalStub, IconStub, ButtonStub, OAuthButtonsStub, OAuthDividerStub],
    )
    mounted.push(fixture)
    await flush(fixture)
    const tags = (): string[] =>
      Array.from(fixture.host.children).map((child) => child.tagName.toLowerCase())
    // Closed: React renders nothing at all (`<></>`).
    expect(tags()).toEqual(['i', 'a', 'i'])
    document
      .querySelector('[data-testid="cta"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    await flush(fixture)
    // Open: React's root is the AuthModal. The stub keeps its own host element
    // (the real port renders the modal's root in front of it, like React).
    expect(tags()).toEqual(['i', 'a', 'mol-auth-modal', 'i'])
    expect(fixture.host.querySelector('mol-auth-modal-mount')).toBeNull()
  })
})
