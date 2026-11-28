// @vitest-environment jsdom
/**
 * Unit tests for the Vue config-driven `<OAuthButtons />` — a port of
 * `@molecule/app-auth-ui-react/src/__tests__/auth-ui.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup and events the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `useOAuth` is hoisted so tests can vary the provider list.
const { mockUseOAuth } = vi.hoisted(() => ({ mockUseOAuth: vi.fn() }))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    textError: 'cm-textError',
    oauthButtonGroup: 'cm-oauthButtonGroup',
    oauthButton: 'cm-oauthButton',
    oauthButtonIcon: 'cm-oauthButtonIcon',
    oauthProviderLabel: 'cm-oauthProviderLabel',
    oauthDivider: 'cm-oauthDivider',
    flex: () => 'cm-flex',
    flex1: 'cm-flex1',
    separator: () => 'cm-separator',
    stack: () => 'cm-stack',
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
  }),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useOAuth: mockUseOAuth,
}))

vi.mock('@molecule/app-oauth-logos-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    OAuthProviderLogo: defineComponent({
      name: 'OAuthProviderLogo',
      props: { provider: { type: String, required: true } },
      setup: (props) => () => h('svg', { 'data-logo': '', 'data-provider': props.provider }),
    }),
  }
})

import { createApp, defineComponent, h, type MaybeRefOrGetter, nextTick, toValue } from 'vue'

import type { OAuthButtonsProps } from '../OAuthButtons.js'

const { OAuthButtons } = await import('../OAuthButtons.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts {@link OAuthButtons} and returns its host and the markup it produced. */
const render = (props: OAuthButtonsProps) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(OAuthButtons, props) }))
  app.mount(host)
  return { host, markup: () => host.innerHTML, unmount: () => app.unmount() }
}

/** The visible markup: Vue's comment placeholders stripped, as in the kit's snapshots. */
const visibleMarkup = (host: HTMLElement): string => host.innerHTML.replace(/<!--[\s\S]*?-->/g, '')

describe('OAuthButtons', () => {
  it('renders nothing when there are no providers', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: [] }, redirect: () => {} })
    const { host, unmount } = render({ oauthConfig: {} })
    expect(visibleMarkup(host)).toBe('')
    unmount()
  })

  it('renders one button per provider with its brand logo', () => {
    mockUseOAuth.mockReturnValue({
      providers: { value: ['github', 'google'] },
      redirect: () => {},
    })
    const { host, unmount } = render({ oauthConfig: {} })
    const markup = visibleMarkup(host)
    expect(markup).toContain('data-provider="github"')
    expect(markup).toContain('data-provider="google"')
    expect(markup.match(/<button/g) ?? []).toHaveLength(2)
    unmount()
  })

  it('renders the default "or continue with" divider text', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: ['github'] }, redirect: () => {} })
    const { host, unmount } = render({ oauthConfig: {} })
    expect(visibleMarkup(host)).toContain('or continue with')
    unmount()
  })

  it('honours a custom divider default', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: ['github'] }, redirect: () => {} })
    const { host, unmount } = render({ oauthConfig: {}, dividerDefault: 'sign in with' })
    expect(visibleMarkup(host)).toContain('sign in with')
    unmount()
  })

  it('gives each button an accessible "Continue with" label', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: ['github'] }, redirect: () => {} })
    const { host, unmount } = render({ oauthConfig: {} })
    expect(visibleMarkup(host)).toContain('aria-label="Continue with')
    unmount()
  })

  it('renders provider label text only when showLabels is true', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: ['github'] }, redirect: () => {} })
    const labeled = render({ oauthConfig: {}, showLabels: true })
    expect(labeled.host.querySelector('button')?.textContent).toBe('GitHub')
    labeled.unmount()
    const unlabeled = render({ oauthConfig: {} })
    const button = unlabeled.host.querySelector('button')
    expect(button?.textContent).toBe('')
    expect(button?.getAttribute('aria-label')).toBe('Continue with GitHub')
    unlabeled.unmount()
  })

  it('renders no error markup by default', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: ['github'] }, redirect: () => {} })
    const { host, unmount } = render({ oauthConfig: {} })
    expect(visibleMarkup(host)).not.toContain('oauth-error')
    unmount()
  })

  it('lays the group out as one column with no gap of its own, under the caller class', () => {
    mockUseOAuth.mockReturnValue({ providers: { value: ['github'] }, redirect: () => {} })
    const { host, unmount } = render({ oauthConfig: {}, className: 'oauth-row' })
    // The divider's own margin is the gap to what follows it, in a browser and in a native column.
    expect(host.firstElementChild?.getAttribute('class')).toBe('cm-stack oauth-row')
    unmount()
  })
})

describe('OAuthButtons — callback outcome UI', () => {
  /**
   * Live (client) mount so the listeners' async onError/onSuccess — fired from
   * useOAuth's callback-exchange effect in the real flow — can update state
   * after mount, exactly like a failed `?code&state` exchange does.
   */
  type HookCfg = { onError?: (m: string) => void; onSuccess?: () => void }
  const renderLive = (
    props: Pick<OAuthButtonsProps, 'onError' | 'onSuccess'>,
  ): { host: HTMLDivElement; hookCfg: () => HookCfg | undefined; unmount: () => void } => {
    // The component passes a getter over its props, so its current value is read.
    let captured: MaybeRefOrGetter<HookCfg | undefined>
    mockUseOAuth.mockImplementation((cfg: MaybeRefOrGetter<HookCfg | undefined>) => {
      captured = cfg
      return { providers: { value: ['github'] }, redirect: () => {} }
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(OAuthButtons, { oauthConfig: {}, ...props }) }),
    )
    app.mount(host)
    return { host, hookCfg: () => toValue(captured), unmount: () => app.unmount() }
  }

  it('renders a VISIBLE inline error (role=alert) when the OAuth exchange fails', async () => {
    const { host, hookCfg, unmount } = renderLive({})

    hookCfg()?.onError?.('OAuth state mismatch — possible CSRF attack')
    await nextTick()

    const errorEl = host.querySelector('[data-mol-id="oauth-error"]')
    expect(errorEl).not.toBeNull()
    expect(errorEl!.getAttribute('role')).toBe('alert')
    expect(errorEl!.textContent).toContain('OAuth state mismatch')
    // The error carries no margin of its own: the divider above it already set the gap.
    expect(errorEl!.getAttribute('class')).toBe('cm-textError')
    unmount()
  })

  it('forwards exchange failures to the host onError as well', async () => {
    const onError = vi.fn()
    const { hookCfg, unmount } = renderLive({ onError })

    hookCfg()?.onError?.('denied')
    await nextTick()

    expect(onError).toHaveBeenCalledWith('denied')
    unmount()
  })

  it('fires the host onSuccess on a successful exchange and clears any prior error', async () => {
    const onSuccess = vi.fn()
    const { host, hookCfg, unmount } = renderLive({ onSuccess })

    hookCfg()?.onError?.('transient failure')
    await nextTick()
    expect(host.querySelector('[data-mol-id="oauth-error"]')).not.toBeNull()

    hookCfg()?.onSuccess?.()
    await nextTick()

    expect(onSuccess).toHaveBeenCalled()
    expect(host.querySelector('[data-mol-id="oauth-error"]')).toBeNull()
    unmount()
  })
})
