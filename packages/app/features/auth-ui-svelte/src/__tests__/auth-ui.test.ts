// @vitest-environment jsdom
/**
 * Port of `@molecule/app-auth-ui-react`'s own unit tests to Svelte: the same
 * behavioral assertions, rendered with a real mount (jsdom).
 *
 * React's tests mock `useOAuth` so tests can vary the provider list and fire
 * the callback outcome handlers; the Svelte port mocks
 * `@molecule/app-svelte`'s `useOAuth` the same way (same call contract), and
 * stubs the wired classmap for deterministic token strings.
 */
import { flushSync, mount, unmount } from 'svelte'
import { get, type Readable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // The row's components call `useTranslation`; the wrapper calls `useOAuth`.
  // `t` returns the defaultValue with {{values}} interpolated, mirroring the
  // real provider for our purposes.
  useTranslation: () => ({
    t: (
      _key: string,
      values?: Record<string, unknown>,
      opts?: { defaultValue?: string },
    ): string => {
      let out = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
      }
      return out
    },
  }),
  useOAuth: mockUseOAuth,
}))

vi.mock('@molecule/app-oauth-logos-svelte', async () => ({
  OAuthProviderLogo: (await import('./LogoStub.svelte')).default,
}))

import OAuthButtons from '../OAuthButtons.svelte'

/** The component mounted by the running test, torn down after each. */
let instance: ReturnType<typeof mount> | null = null

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  mockUseOAuth.mockReset()
  document.body.innerHTML = ''
})

describe('OAuthButtons', () => {
  it('renders nothing when there are no providers', () => {
    mockUseOAuth.mockReturnValue({ providers: [], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, { target: container, props: { oauthConfig: {} } })
    flushSync()
    expect(container.querySelector('div')).toBeNull()
  })

  it('renders one button per provider with its brand logo', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github', 'google'], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, { target: container, props: { oauthConfig: {} } })
    flushSync()
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('button[data-provider]')]
    expect(buttons.map((b) => b.dataset.provider)).toEqual(['github', 'google'])
    expect(buttons).toHaveLength(2)
    expect(container.querySelector('svg[data-logo]')).not.toBeNull()
  })

  it('renders the default "or continue with" divider text', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, { target: container, props: { oauthConfig: {} } })
    flushSync()
    expect(container.textContent).toContain('or continue with')
  })

  it('honours a custom divider default', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, {
      target: container,
      props: { oauthConfig: {}, dividerDefault: 'sign in with' },
    })
    flushSync()
    expect(container.textContent).toContain('sign in with')
  })

  it('gives each button an accessible "Continue with" label', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, { target: container, props: { oauthConfig: {} } })
    flushSync()
    const label = container.querySelector('button')?.getAttribute('aria-label') ?? ''
    expect(label.startsWith('Continue with')).toBe(true)
  })

  it('renders provider label text only when showLabels is true', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, {
      target: container,
      props: { oauthConfig: {}, showLabels: true },
    })
    flushSync()
    expect(container.textContent).toContain('GitHub')
    // aria-labels are attributes, not text: unlabeled text must not contain the name.
    const unlabeled = document.createElement('div')
    document.body.appendChild(unlabeled)
    const second = mount(OAuthButtons, { target: unlabeled, props: { oauthConfig: {} } })
    flushSync()
    expect(unlabeled.textContent).not.toContain('GitHub')
    void second
  })

  it('renders no error markup by default', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, { target: container, props: { oauthConfig: {} } })
    flushSync()
    expect(container.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
  })
})

describe('OAuthButtons — callback outcome UI', () => {
  /**
   * Live (client) render so the hook's async onError/onSuccess — fired from
   * useOAuth's callback-exchange in the real flow — can update state after
   * mount, exactly like a failed `?code&state` exchange does. The mock hands
   * back the config it was called with, the way React's test captured it: the
   * component passes a store over its props, so its current value is read.
   */
  type HookCfg = { onError?: (m: string) => void; onSuccess?: () => void }
  const renderLive = (
    props: Record<string, unknown>,
  ): { container: HTMLDivElement; hookCfg: () => HookCfg | undefined } => {
    let captured: Readable<HookCfg> | undefined
    mockUseOAuth.mockImplementation((cfg: Readable<HookCfg>) => {
      captured = cfg
      return { providers: ['github'], redirect: () => {} }
    })
    const container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(OAuthButtons, { target: container, props: { oauthConfig: {}, ...props } })
    flushSync()
    return { container, hookCfg: () => (captured ? get(captured) : undefined) }
  }

  it('renders a VISIBLE inline error (role=alert) when the OAuth exchange fails', () => {
    const { container, hookCfg } = renderLive({})

    hookCfg()?.onError?.('OAuth state mismatch — possible CSRF attack')
    flushSync()

    const errorEl = container.querySelector('[data-mol-id="oauth-error"]')
    expect(errorEl).not.toBeNull()
    expect(errorEl!.getAttribute('role')).toBe('alert')
    expect(errorEl!.textContent).toContain('OAuth state mismatch')
  })

  it('forwards exchange failures to the host onError as well', () => {
    const onError = vi.fn()
    const { hookCfg } = renderLive({ onError })

    hookCfg()?.onError?.('denied')

    expect(onError).toHaveBeenCalledWith('denied')
  })

  it('fires the host onSuccess on a successful exchange and clears any prior error', () => {
    const onSuccess = vi.fn()
    const { container, hookCfg } = renderLive({ onSuccess })

    hookCfg()?.onError?.('transient failure')
    flushSync()
    expect(container.querySelector('[data-mol-id="oauth-error"]')).not.toBeNull()

    hookCfg()?.onSuccess?.()
    flushSync()

    expect(onSuccess).toHaveBeenCalled()
    expect(container.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
  })
})
