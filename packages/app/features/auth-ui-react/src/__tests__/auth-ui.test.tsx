// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// React requires this flag for act() outside a test-renderer harness.
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// `useOAuth` is hoisted so tests can vary the provider list.
const { mockUseOAuth } = vi.hoisted(() => ({ mockUseOAuth: vi.fn() }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useOAuth: mockUseOAuth,
}))

vi.mock('@molecule/app-oauth-logos-react', () => ({
  OAuthProviderLogo: ({ provider }: { provider: string }) =>
    createElement('svg', { 'data-logo': '', 'data-provider': provider }),
}))

const { OAuthButtons } = await import('../OAuthButtons.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('OAuthButtons', () => {
  it('renders nothing when there are no providers', () => {
    mockUseOAuth.mockReturnValue({ providers: [], redirect: () => {} })
    expect(html(createElement(OAuthButtons, { oauthConfig: {} }))).toBe('')
  })

  it('renders one button per provider with its brand logo', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github', 'google'], redirect: () => {} })
    const markup = html(createElement(OAuthButtons, { oauthConfig: {} }))
    expect(markup).toContain('data-provider="github"')
    expect(markup).toContain('data-provider="google"')
    expect(markup.match(/<button/g) ?? []).toHaveLength(2)
  })

  it('renders the default "or continue with" divider text', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    expect(html(createElement(OAuthButtons, { oauthConfig: {} }))).toContain('or continue with')
  })

  it('honours a custom divider default', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const markup = html(
      createElement(OAuthButtons, { oauthConfig: {}, dividerDefault: 'sign in with' }),
    )
    expect(markup).toContain('sign in with')
  })

  it('gives each button an accessible "Continue with" label', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const markup = html(createElement(OAuthButtons, { oauthConfig: {} }))
    expect(markup).toContain('aria-label="Continue with')
  })

  it('renders provider label text only when showLabels is true', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const labeled = html(createElement(OAuthButtons, { oauthConfig: {}, showLabels: true }))
    expect(labeled).toContain('GitHub')
    const unlabeled = html(createElement(OAuthButtons, { oauthConfig: {} }))
    expect(unlabeled).not.toContain('GitHub')
  })

  it('renders no error markup by default', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const markup = html(createElement(OAuthButtons, { oauthConfig: {} }))
    expect(markup).not.toContain('oauth-error')
  })
})

describe('OAuthButtons — callback outcome UI', () => {
  /**
   * Live (client) render so the hook's async onError/onSuccess — fired from
   * useOAuth's callback-exchange effect in the real flow — can update state
   * after mount, exactly like a failed `?code&state` exchange does.
   */
  type HookCfg = { onError?: (m: string) => void; onSuccess?: () => void }
  const renderLive = (
    props: Record<string, unknown>,
  ): { container: HTMLDivElement; hookCfg: () => HookCfg | undefined } => {
    let captured: HookCfg | undefined
    mockUseOAuth.mockImplementation((cfg?: HookCfg) => {
      captured = cfg
      return { providers: ['github'], redirect: () => {} }
    })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => root.render(createElement(OAuthButtons, { oauthConfig: {}, ...props })))
    return { container, hookCfg: () => captured }
  }

  it('renders a VISIBLE inline error (role=alert) when the OAuth exchange fails', () => {
    const { container, hookCfg } = renderLive({})

    act(() => hookCfg()?.onError?.('OAuth state mismatch — possible CSRF attack'))

    const errorEl = container.querySelector('[data-mol-id="oauth-error"]')
    expect(errorEl).not.toBeNull()
    expect(errorEl!.getAttribute('role')).toBe('alert')
    expect(errorEl!.textContent).toContain('OAuth state mismatch')
  })

  it('forwards exchange failures to the host onError as well', () => {
    const onError = vi.fn()
    const { hookCfg } = renderLive({ onError })

    act(() => hookCfg()?.onError?.('denied'))

    expect(onError).toHaveBeenCalledWith('denied')
  })

  it('fires the host onSuccess on a successful exchange and clears any prior error', () => {
    const onSuccess = vi.fn()
    const { container, hookCfg } = renderLive({ onSuccess })

    act(() => hookCfg()?.onError?.('transient failure'))
    expect(container.querySelector('[data-mol-id="oauth-error"]')).not.toBeNull()

    act(() => hookCfg()?.onSuccess?.())

    expect(onSuccess).toHaveBeenCalled()
    expect(container.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
  })
})
