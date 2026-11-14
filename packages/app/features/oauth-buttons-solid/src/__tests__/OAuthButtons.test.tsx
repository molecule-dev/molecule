// @vitest-environment jsdom
/**
 * Port of `@molecule/app-oauth-buttons-react`'s own unit tests: the button
 * row and the divider, rendered with Solid and asserted on the same DOM and
 * the same select/success flow.
 *
 * @module
 */

import { createComponent, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-solid', () => ({
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

// Stub the canonical logos so the row's own markup is what's asserted.
vi.mock('@molecule/app-oauth-logos-solid', () => ({
  OAuthProviderLogo: (props: { provider: string }) => (
    <svg data-logo="" data-provider={props.provider} />
  ),
}))

import { OAuthButtons } from '../OAuthButtons.jsx'
import { OAuthDivider } from '../OAuthDivider.jsx'

const mounts: (() => void)[] = []

afterEach(() => {
  for (const dispose of mounts.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts a component and returns the container holding it. */
const mount = (component: () => JSX.Element): HTMLDivElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounts.push(render(component, container))
  return container
}

/** One macrotask — enough for a resolved/rejected promise continuation. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('<OAuthButtons />', () => {
  it('renders one <button> per provider with provider data attributes', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['google', 'github', 'gitlab'] }),
    )
    const names = ['Google', 'GitHub', 'GitLab']
    for (const name of names) {
      expect(container.querySelector(`button[aria-label="Continue with ${name}"]`)).not.toBeNull()
    }
  })

  it('returns null when providers list is empty', () => {
    const container = mount(() => createComponent(OAuthButtons, { providers: [] }))
    expect(container.firstChild).toBeNull()
  })

  it('de-duplicates providers while preserving order', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['google', 'github', 'google'] }),
    )
    expect(container.querySelectorAll('button')).toHaveLength(2)
  })

  it('invokes onSelect with the canonical provider id on click', () => {
    const onSelect = vi.fn()
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['github', 'google'], onSelect }),
    )
    ;(
      container.querySelector('button[aria-label="Continue with GitHub"]') as HTMLButtonElement
    ).click()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('fires onSuccess with the provider id when an inline onSelect promise resolves', async () => {
    // An inline flow (popup/PKCE, e.g. an auth bond's signInWithProvider) returns
    // a promise that settles when the handshake completes.
    const onSelect = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['github', 'google'], onSelect, onSuccess }),
    )
    ;(
      container.querySelector('button[aria-label="Continue with GitHub"]') as HTMLButtonElement
    ).click()
    await tick()
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('does NOT fire onSuccess for a fire-and-navigate (void) onSelect', async () => {
    // redirect(provider) returns void and navigates away — there is nothing to
    // await, so onSuccess must not fire (completion is observed elsewhere).
    const onSelect = vi.fn(() => undefined)
    const onSuccess = vi.fn()
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['github'], onSelect, onSuccess }),
    )
    ;(
      container.querySelector('button[aria-label="Continue with GitHub"]') as HTMLButtonElement
    ).click()
    await tick()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does NOT fire onSuccess when the inline onSelect promise rejects', async () => {
    // A failed/aborted handshake — onSuccess must stay unfired; the initiating
    // onSelect handler owns error surfacing.
    const onSelect = vi.fn().mockRejectedValue(new Error('handshake failed'))
    const onSuccess = vi.fn()
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['github'], onSelect, onSuccess }),
    )
    ;(
      container.querySelector('button[aria-label="Continue with GitHub"]') as HTMLButtonElement
    ).click()
    await tick()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('renders the group as the root element (no redundant wrapper div)', () => {
    const container = mount(() => createComponent(OAuthButtons, { providers: ['google'] }))
    const root = container.firstElementChild as HTMLElement
    expect(root?.dataset.molId).toBe('oauth-buttons')
  })

  it('composes className onto the button-group element', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['google'], className: 'extra-cls' }),
    )
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.className).toContain('cm-oauthButtonGroup')
    expect(group.className).toContain('extra-cls')
  })

  it('renders horizontal layout by default (no inline grid override)', () => {
    const container = mount(() => createComponent(OAuthButtons, { providers: ['google'] }))
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.dataset.layout).toBe('horizontal')
    expect(group.style.display).not.toBe('grid')
  })

  it('switches to grid layout with 2 columns when >4 providers', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, {
        providers: ['google', 'github', 'gitlab', 'twitter', 'apple'],
        layout: 'grid',
      }),
    )
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.style.display).toBe('grid')
    expect(group.style.gridTemplateColumns).toContain('repeat(2,')
  })

  it('switches to column flex direction in vertical layout', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['google', 'github'], layout: 'vertical' }),
    )
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.style.flexDirection).toBe('column')
    const buttons = container.querySelectorAll('button')
    for (const btn of Array.from(buttons)) {
      expect((btn as HTMLElement).style.width).toBe('100%')
    }
  })

  it('applies brand-spec inline background colors when brandButtons is set', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['github'], brandButtons: true }),
    )
    const button = container.querySelector('button[data-provider="github"]') as HTMLElement
    // jsdom normalizes hex colors to rgb() — check for either form.
    expect(button.style.background.toLowerCase()).toMatch(/#24292f|rgb\(36,\s*41,\s*47\)/)
  })

  it('omits brand colors by default — independent of iconMode', () => {
    // iconMode controls the logo, not the button surface: brand-mode
    // logos still get a ClassMap-neutral button unless brandButtons is set.
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['github'], iconMode: 'brand' }),
    )
    const button = container.querySelector('button[data-provider="github"]') as HTMLElement
    expect(button.style.background).toBe('')
  })

  it('renders provider labels next to logos when showLabels is true', () => {
    const container = mount(() =>
      createComponent(OAuthButtons, { providers: ['google'], showLabels: true }),
    )
    expect([...container.querySelectorAll('span')].some((s) => s.textContent === 'Google')).toBe(
      true,
    )
  })

  it('hides provider labels by default (icon-only row)', () => {
    const container = mount(() => createComponent(OAuthButtons, { providers: ['google'] }))
    expect([...container.querySelectorAll('span')].some((s) => s.textContent === 'Google')).toBe(
      false,
    )
  })
})

describe('<OAuthDivider />', () => {
  it('renders the default "or continue with" label', () => {
    const container = mount(() => createComponent(OAuthDivider, {}))
    expect(container.textContent).toContain('or continue with')
  })

  it('honours a custom label default', () => {
    const container = mount(() => createComponent(OAuthDivider, { labelDefault: 'sign in with' }))
    expect(container.textContent).toContain('sign in with')
  })

  it('composes className onto the divider wrapper', () => {
    const container = mount(() => createComponent(OAuthDivider, { className: 'extra-cls' }))
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('cm-oauthDivider')
    expect(wrapper.className).toContain('extra-cls')
  })
})
