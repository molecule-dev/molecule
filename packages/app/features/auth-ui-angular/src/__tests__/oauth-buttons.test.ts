// @vitest-environment jsdom
/**
 * Ports of `@molecule/app-auth-ui-react/src/__tests__/auth-ui.test.tsx`:
 * every behavioral assertion of the React package's own suite, rendered here
 * with the same real-DOM approach the Angular conformance adapter uses.
 * `useOAuth` is mocked the way React's suite mocks `@molecule/app-react`'s —
 * the component under test calls the binding's hook, so the mock (with every
 * other binding export kept) captures the config and varies the providers.
 *
 * @module
 */

// Register Angular's JIT compiler facade before the binding module loads — it
// pulls in partially compiled Angular libraries whose decorators need it —
// and bond the reference ClassMap + i18n provider the conformance kit uses.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import type { Signal } from '@angular/core'
import { describe, expect, it, vi } from 'vitest'

import { getClassMap } from '@molecule/app-ui'

import { OAuthButtons } from '../index.js'
import { type RenderedFixture, renderFixture } from './render.js'

// `useOAuth` is hoisted so tests can vary the provider list.
const { mockUseOAuth } = vi.hoisted(() => ({ mockUseOAuth: vi.fn() }))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  // Every other binding export stays real; only the hook is mocked.
  ...(await importOriginal<object>()),
  useOAuth: mockUseOAuth,
}))

/** Renders the OAuth row with the given props. */
const renderRow = async (props: Record<string, unknown>): Promise<RenderedFixture> =>
  renderFixture(
    `<div mol-auth-oauth-buttons
      [oauthConfig]="p['oauthConfig']"
      [className]="p['className']"
      [iconSize]="p['iconSize']"
      [iconMode]="p['iconMode']"
      [showLabels]="p['showLabels']"
      [dividerKey]="p['dividerKey']"
      [dividerDefault]="p['dividerDefault']"
      (success)="p['onSuccess']?.()"
      (error)="p['onError']?.($event)"
    ></div>`,
    props,
    [OAuthButtons],
  )

describe('OAuthButtons', () => {
  it('renders nothing when there are no providers', async () => {
    mockUseOAuth.mockReturnValue({ providers: [], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {} })
    // React returns null: the host element is detached from the document
    // (it cannot be found by querySelector), leaving the parity wrapper empty.
    expect(fixture.host.querySelector('div[mol-auth-oauth-buttons]')).toBeNull()
    expect(fixture.host.textContent!.trim()).toBe('')
    await fixture.destroy()
  })

  it('leaves no element behind when it is removed while it renders nothing', async () => {
    const oauth = { providers: ['google'], redirect: () => {} }
    mockUseOAuth.mockReturnValue(oauth)
    const fixture = await renderFixture(
      `@if (p['shown']) {<div mol-auth-oauth-buttons [oauthConfig]="p['oauthConfig']"></div>}`,
      { shown: true, oauthConfig: {} },
      [OAuthButtons],
    )
    expect(fixture.host.querySelectorAll('button').length).toBe(1)
    oauth.providers = []
    await fixture.setProps({})
    expect(fixture.host.querySelector('*')).toBeNull()
    await fixture.setProps({ shown: false })
    // Not even the empty host element is left in the page.
    expect(fixture.host.querySelector('*')).toBeNull()
    await fixture.destroy()
  })

  it('renders one button per provider with its brand logo', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github', 'google'], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {} })
    const buttons = fixture.host.querySelectorAll('button[data-provider]')
    expect(buttons.length).toBe(2)
    expect(Array.from(buttons).map((b) => b.getAttribute('data-provider'))).toEqual([
      'github',
      'google',
    ])
    expect(fixture.host.querySelector('svg')).not.toBeNull()
    await fixture.destroy()
  })

  it('renders the default "or continue with" divider text', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {} })
    expect(fixture.host.textContent).toContain('or continue with')
    await fixture.destroy()
  })

  it('honours a custom divider default', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {}, dividerDefault: 'sign in with' })
    expect(fixture.host.textContent).toContain('sign in with')
    await fixture.destroy()
  })

  it('gives each button an accessible "Continue with" label', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {} })
    expect(fixture.host.querySelector('button')!.getAttribute('aria-label')).toContain(
      'Continue with',
    )
    await fixture.destroy()
  })

  it('renders provider label text only when showLabels is true', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const labeled = await renderRow({ oauthConfig: {}, showLabels: true })
    expect(labeled.host.textContent).toContain('GitHub')
    await labeled.destroy()
    const unlabeled = await renderRow({ oauthConfig: {} })
    expect(unlabeled.host.textContent).not.toContain('GitHub')
    await unlabeled.destroy()
  })

  it('renders no error markup by default', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {} })
    expect(fixture.host.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
    await fixture.destroy()
  })

  it('lays the group out as one column with no gap of its own, under the caller class', async () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const fixture = await renderRow({ oauthConfig: {}, className: 'oauth-row' })
    const cm = getClassMap()
    const group = fixture.host.querySelector('div[mol-auth-oauth-buttons]')!
    // The divider's own margin is the gap to what follows it, in a browser and in a native column.
    // Sorted: the DOM lists a host's classes in its own order.
    expect(group.className.split(/\s+/).sort()).toEqual(
      cm.cn(cm.stack(0), 'oauth-row').split(/\s+/).sort(),
    )
    await fixture.destroy()
  })
})

describe('OAuthButtons — callback outcome UI', () => {
  /**
   * Live render so the hook's async onError/onSuccess — fired from
   * useOAuth's callback exchange in the real flow — can update state
   * after mount, exactly like a failed `?code&state` exchange does.
   * The captured value is the config the component passed to `useOAuth`.
   */
  type HookCfg = { onError?: (m: string) => void; onSuccess?: () => void }
  const renderLive = async (
    props: Record<string, unknown>,
  ): Promise<{ fixture: RenderedFixture; hookCfg: () => HookCfg | undefined }> => {
    // The component passes a signal over its input, so its current value is read.
    let captured: Signal<HookCfg> | undefined
    mockUseOAuth.mockImplementation((cfg: Signal<HookCfg>) => {
      captured = cfg
      return { providers: ['github'], redirect: () => {} }
    })
    const fixture = await renderRow({ oauthConfig: {}, ...props })
    return { fixture, hookCfg: () => captured?.() }
  }

  it('renders a VISIBLE inline error (role=alert) when the OAuth exchange fails', async () => {
    const { fixture, hookCfg } = await renderLive({})

    hookCfg()?.onError?.('OAuth state mismatch — possible CSRF attack')
    await fixture.refresh()

    const errorEl = fixture.host.querySelector('[data-mol-id="oauth-error"]')
    expect(errorEl).not.toBeNull()
    expect(errorEl!.getAttribute('role')).toBe('alert')
    expect(errorEl!.textContent).toContain('OAuth state mismatch')
    // The error carries no margin of its own: the divider above it already set the gap.
    expect(errorEl!.className.split(/\s+/)).toEqual(getClassMap().textError.split(/\s+/))
    await fixture.destroy()
  })

  it('forwards exchange failures to the host onError as well', async () => {
    const onError = vi.fn()
    const { fixture, hookCfg } = await renderLive({ onError })

    hookCfg()?.onError?.('denied')
    await fixture.refresh()

    expect(onError).toHaveBeenCalledWith('denied')
    await fixture.destroy()
  })

  it('fires the host onSuccess on a successful exchange and clears any prior error', async () => {
    const onSuccess = vi.fn()
    const { fixture, hookCfg } = await renderLive({ onSuccess })

    hookCfg()?.onError?.('transient failure')
    await fixture.refresh()
    expect(fixture.host.querySelector('[data-mol-id="oauth-error"]')).not.toBeNull()

    hookCfg()?.onSuccess?.()
    await fixture.refresh()

    expect(onSuccess).toHaveBeenCalled()
    expect(fixture.host.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
    await fixture.destroy()
  })
})
