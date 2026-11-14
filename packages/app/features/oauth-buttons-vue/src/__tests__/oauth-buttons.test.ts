// @vitest-environment jsdom
/**
 * Unit tests for the Vue `<OAuthButtons />` row and `<OAuthDivider />` — a
 * port of `@molecule/app-oauth-buttons-react/src/__tests__/OAuthButtons.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup and events the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Stub the wired classmap so getClassMap() returns deterministic strings
// without requiring the full @molecule/app-ui-tailwind bond.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    oauthButtonGroup: 'cm-oauthButtonGroup',
    oauthButton: 'cm-oauthButton',
    oauthButtonIcon: 'cm-oauthButtonIcon',
    oauthProviderLabel: 'cm-oauthProviderLabel',
    oauthDivider: 'cm-oauthDivider',
    oauthDividerLine: 'cm-oauthDividerLine',
    oauthDividerText: 'cm-oauthDividerText',
    flex: () => 'cm-flex',
    flex1: 'cm-flex1',
    separator: () => 'cm-separator',
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
  }),
}))

// Stub useTranslation so we don't need an i18n provider context.
// Returns the defaultValue with {{provider}} interpolated, mirroring
// real provider behavior for our purposes.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values?: Record<string, unknown>,
      options?: { defaultValue?: string },
    ): string => {
      let out = options?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
      }
      return out
    },
  }),
}))

import { createApp, defineComponent, h, nextTick } from 'vue'

import { OAuthButtons } from '../OAuthButtons.js'
import { OAuthDivider } from '../OAuthDivider.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts a component and returns its host root plus the markup it produced. */
const render = (component: Parameters<typeof h>[0], props: Record<string, unknown>) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props) }))
  app.mount(host)
  return { host, markup: () => host.innerHTML, unmount: () => app.unmount() }
}

/** The visible markup: Vue's comment placeholders stripped, as in the kit's snapshots. */
const visibleMarkup = (host: HTMLElement): string => host.innerHTML.replace(/<!--[\s\S]*?-->/g, '')

describe('<OAuthButtons />', () => {
  it('renders one <button> per provider with provider data attributes', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['google', 'github', 'gitlab'] })
    const labels = [...host.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    expect(labels).toEqual(['Continue with Google', 'Continue with GitHub', 'Continue with GitLab'])
    expect([...host.querySelectorAll('button')].map((b) => b.dataset.provider)).toEqual([
      'google',
      'github',
      'gitlab',
    ])
    unmount()
  })

  it('returns null when providers list is empty', () => {
    const { host, unmount } = render(OAuthButtons, { providers: [] })
    expect(visibleMarkup(host)).toBe('')
    unmount()
  })

  it('de-duplicates providers while preserving order', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['google', 'github', 'google'] })
    expect(host.querySelectorAll('button')).toHaveLength(2)
    unmount()
  })

  it('invokes onSelect with the canonical provider id on click', () => {
    const onSelect = vi.fn()
    const { host, unmount } = render(OAuthButtons, { providers: ['github', 'google'], onSelect })
    const button = [...host.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Continue with GitHub',
    )
    button?.dispatchEvent(new MouseEvent('click'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    unmount()
  })

  it('fires onSuccess with the provider id when an inline onSelect promise resolves', async () => {
    // An inline flow (popup/PKCE, e.g. an auth bond's signInWithProvider) returns
    // a promise that settles when the handshake completes.
    const onSelect = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    const { host, unmount } = render(OAuthButtons, {
      providers: ['github', 'google'],
      onSelect,
      onSuccess,
    })
    const button = [...host.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Continue with GitHub',
    )
    button?.dispatchEvent(new MouseEvent('click'))
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledExactlyOnceWith('github'))
    unmount()
  })

  it('does NOT fire onSuccess for a fire-and-navigate (void) onSelect', async () => {
    // redirect(provider) returns void and navigates away — there is nothing to
    // await, so onSuccess must not fire (completion is observed elsewhere).
    const onSelect = vi.fn(() => undefined)
    const onSuccess = vi.fn()
    const { host, unmount } = render(OAuthButtons, { providers: ['github'], onSelect, onSuccess })
    host.querySelector('button')?.dispatchEvent(new MouseEvent('click'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    expect(onSuccess).not.toHaveBeenCalled()
    unmount()
  })

  it('does NOT fire onSuccess when the inline onSelect promise rejects', async () => {
    // A failed/aborted handshake — onSuccess must stay unfired; the initiating
    // onSelect handler owns error surfacing.
    const onSelect = vi.fn().mockRejectedValue(new Error('handshake failed'))
    const onSuccess = vi.fn()
    const { host, unmount } = render(OAuthButtons, { providers: ['github'], onSelect, onSuccess })
    host.querySelector('button')?.dispatchEvent(new MouseEvent('click'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSuccess).not.toHaveBeenCalled()
    unmount()
  })

  it('renders the group as the root element (no redundant wrapper div)', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['google'] })
    expect((host.firstChild as HTMLElement | null)?.getAttribute('data-mol-id')).toBe(
      'oauth-buttons',
    )
    unmount()
  })

  it('composes className onto the button-group element', () => {
    const { host, unmount } = render(OAuthButtons, {
      providers: ['google'],
      className: 'extra-cls',
    })
    const group = host.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.className).toContain('cm-oauthButtonGroup')
    expect(group.className).toContain('extra-cls')
    unmount()
  })

  it('renders horizontal layout by default (no inline grid override)', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['google'] })
    const group = host.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.dataset.layout).toBe('horizontal')
    expect(group.style.display).not.toBe('grid')
    unmount()
  })

  it('switches to grid layout with 2 columns when >4 providers', () => {
    const { host, unmount } = render(OAuthButtons, {
      providers: ['google', 'github', 'gitlab', 'twitter', 'apple'],
      layout: 'grid',
    })
    const group = host.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.style.display).toBe('grid')
    expect(group.style.gridTemplateColumns).toContain('repeat(2,')
    unmount()
  })

  it('switches to column flex direction in vertical layout', async () => {
    const { host, unmount } = render(OAuthButtons, {
      providers: ['google', 'github'],
      layout: 'vertical',
    })
    await nextTick()
    const group = host.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.style.flexDirection).toBe('column')
    const buttons = host.querySelectorAll('button')
    for (const btn of Array.from(buttons)) {
      expect((btn as HTMLElement).style.width).toBe('100%')
    }
    unmount()
  })

  it('applies brand-spec inline background colors when brandButtons is set', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['github'], brandButtons: true })
    const button = host.querySelector('button[data-provider="github"]') as HTMLElement
    // jsdom normalizes hex colors to rgb() — check for either form.
    expect(button.style.background.toLowerCase()).toMatch(/#24292f|rgb\(36,\s*41,\s*47\)/)
    unmount()
  })

  it('omits brand colors by default — independent of iconMode', () => {
    // iconMode controls the logo, not the button surface: brand-mode
    // logos still get a ClassMap-neutral button unless brandButtons is set.
    const { host, unmount } = render(OAuthButtons, { providers: ['github'], iconMode: 'brand' })
    const button = host.querySelector('button[data-provider="github"]') as HTMLElement
    expect(button.style.background).toBe('')
    unmount()
  })

  it('renders provider labels next to logos when showLabels is true', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['google'], showLabels: true })
    expect(host.textContent).toContain('Google')
    unmount()
  })

  it('hides provider labels by default (icon-only row)', () => {
    const { host, unmount } = render(OAuthButtons, { providers: ['google'] })
    expect(host.textContent).not.toContain('Google')
    unmount()
  })
})

describe('<OAuthDivider />', () => {
  it('renders the default "or continue with" label', () => {
    const { host, unmount } = render(OAuthDivider, {})
    expect(host.textContent).toContain('or continue with')
    unmount()
  })

  it('honours a custom label default', () => {
    const { host, unmount } = render(OAuthDivider, { labelDefault: 'sign in with' })
    expect(host.textContent).toContain('sign in with')
    unmount()
  })

  it('composes className onto the divider wrapper', () => {
    const { host, unmount } = render(OAuthDivider, { className: 'extra-cls' })
    const wrapper = host.firstChild as HTMLElement
    expect(wrapper.className).toContain('cm-oauthDivider')
    expect(wrapper.className).toContain('extra-cls')
    unmount()
  })
})
