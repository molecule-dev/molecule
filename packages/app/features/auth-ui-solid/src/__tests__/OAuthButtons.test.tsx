// @vitest-environment jsdom
/**
 * Port of `@molecule/app-auth-ui-react`'s own unit tests: the config-driven
 * OAuth row and the callback outcome UI, rendered with Solid and asserted on
 * the same DOM and the same hook wiring.
 *
 * @module
 */

import { createComponent, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Stub the wired classmap so getClassMap() returns deterministic strings
// without requiring the full @molecule/app-ui-tailwind bond.
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
        // `textError` is a plain class string in the ClassMap contract, so the error's class
        // can be read back from the DOM.
        if (prop === 'textError') return 'textError'
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// `useOAuth` is hoisted so tests can vary the provider list.
const { mockUseOAuth } = vi.hoisted(() => ({ mockUseOAuth: vi.fn() }))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useOAuth: mockUseOAuth,
}))

vi.mock('@molecule/app-oauth-logos-solid', () => ({
  OAuthProviderLogo: (props: { provider: string }) => (
    <svg data-logo="" data-provider={props.provider} />
  ),
}))

const { OAuthButtons } = await import('../OAuthButtons.jsx')

const mounts: (() => void)[] = []

afterEach(() => {
  for (const dispose of mounts.splice(0)) dispose()
  document.body.innerHTML = ''
  // Each test scripts the hook itself; a reset keeps one test's calls and implementation out of the next.
  mockUseOAuth.mockReset()
})

/** Mounts a component and returns the container holding it. */
const mount = (component: () => JSX.Element): HTMLDivElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounts.push(render(component, container))
  return container
}

/** The mount's inner HTML with Solid's comment anchors stripped. */
const htmlOf = (container: HTMLDivElement): string =>
  container.innerHTML.replaceAll(/<!--[\s\S]*?-->/g, '')

/** One macrotask — enough for Solid's effects and promise continuations. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('OAuthButtons', () => {
  it('renders nothing when there are no providers', () => {
    mockUseOAuth.mockReturnValue({ providers: [], redirect: () => {} })
    const container = mount(() => createComponent(OAuthButtons, { oauthConfig: {} }))
    expect(htmlOf(container)).toBe('')
  })

  it('renders one button per provider with its brand logo', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github', 'google'], redirect: () => {} })
    const container = mount(() => createComponent(OAuthButtons, { oauthConfig: {} }))
    expect(container.querySelector('[data-provider="github"]')).not.toBeNull()
    expect(container.querySelector('[data-provider="google"]')).not.toBeNull()
    expect(container.querySelectorAll('button')).toHaveLength(2)
  })

  it('follows a changed oauthConfig prop on the same mount', async () => {
    // The hook gets the config as an accessor; this stand-in reads its providers from it
    // live, the way the real useOAuth does.
    mockUseOAuth.mockImplementation((config: () => { oauthProviders?: string[] }) => ({
      get providers() {
        return config().oauthProviders ?? []
      },
      redirect: () => {},
    }))
    const [config, setConfig] = createSignal<{ oauthProviders?: string[] }>({
      oauthProviders: ['github'],
    })
    const container = mount(() =>
      createComponent(OAuthButtons, {
        get oauthConfig() {
          return config()
        },
      }),
    )
    expect(container.querySelectorAll('button')).toHaveLength(1)
    setConfig({ oauthProviders: ['google', 'github'] })
    await tick()
    expect(container.querySelectorAll('button')).toHaveLength(2)
    expect(container.querySelector('[data-provider="google"]')).not.toBeNull()
    expect(mockUseOAuth).toHaveBeenCalledTimes(1)
  })

  it('renders the default "or continue with" divider text', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = mount(() => createComponent(OAuthButtons, { oauthConfig: {} }))
    expect(container.textContent).toContain('or continue with')
  })

  it('honours a custom divider default', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = mount(() =>
      createComponent(OAuthButtons, { oauthConfig: {}, dividerDefault: 'sign in with' }),
    )
    expect(container.textContent).toContain('sign in with')
  })

  it('gives each button an accessible "Continue with" label', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = mount(() => createComponent(OAuthButtons, { oauthConfig: {} }))
    expect(container.querySelector('button[aria-label^="Continue with"]')).not.toBeNull()
  })

  it('renders provider label text only when showLabels is true', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const labeled = mount(() =>
      createComponent(OAuthButtons, { oauthConfig: {}, showLabels: true }),
    )
    expect(labeled.textContent).toContain('GitHub')
    const unlabeled = mount(() => createComponent(OAuthButtons, { oauthConfig: {} }))
    expect(unlabeled.textContent).not.toContain('GitHub')
  })

  it('renders no error markup by default', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = mount(() => createComponent(OAuthButtons, { oauthConfig: {} }))
    expect(htmlOf(container)).not.toContain('oauth-error')
  })

  it('lays the group out as one column with no gap of its own, under the caller class', () => {
    mockUseOAuth.mockReturnValue({ providers: ['github'], redirect: () => {} })
    const container = mount(() =>
      createComponent(OAuthButtons, { oauthConfig: {}, className: 'oauth-row' }),
    )
    // The divider's own margin is the gap to what follows it, in a browser and in a native column.
    expect(container.firstElementChild?.getAttribute('class')).toBe('stack oauth-row')
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
    // The component passes its config as an accessor; read it when the test fires a callback.
    let captured: (() => HookCfg) | undefined
    mockUseOAuth.mockImplementation((cfg: () => HookCfg) => {
      captured = cfg
      return { providers: ['github'], redirect: () => {} }
    })
    const container = mount(() => createComponent(OAuthButtons, { oauthConfig: {}, ...props }))
    return { container, hookCfg: () => captured?.() }
  }

  it('renders a VISIBLE inline error (role=alert) when the OAuth exchange fails', async () => {
    const { container, hookCfg } = renderLive({})

    hookCfg()?.onError?.('OAuth state mismatch — possible CSRF attack')
    await tick()

    const errorEl = container.querySelector('[data-mol-id="oauth-error"]')
    expect(errorEl).not.toBeNull()
    expect(errorEl!.getAttribute('role')).toBe('alert')
    expect(errorEl!.textContent).toContain('OAuth state mismatch')
    // The error carries no margin of its own: the divider above it already set the gap.
    expect(errorEl!.getAttribute('class')).toBe('textError')
  })

  it('forwards exchange failures to the host onError as well', async () => {
    const onError = vi.fn()
    const { hookCfg } = renderLive({ onError })

    hookCfg()?.onError?.('denied')
    await tick()

    expect(onError).toHaveBeenCalledWith('denied')
  })

  it('fires the host onSuccess on a successful exchange and clears any prior error', async () => {
    const onSuccess = vi.fn()
    const { container, hookCfg } = renderLive({ onSuccess })

    hookCfg()?.onError?.('transient failure')
    await tick()
    expect(container.querySelector('[data-mol-id="oauth-error"]')).not.toBeNull()

    hookCfg()?.onSuccess?.()
    await tick()

    expect(onSuccess).toHaveBeenCalled()
    expect(container.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
  })
})
