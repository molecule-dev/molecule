// @vitest-environment jsdom
/**
 * Port of `@molecule/app-oauth-buttons-react`'s own unit tests to Svelte:
 * the button row's providers, dedupe, select/success flow, layouts, brand
 * colors and labels, and the divider — the same behavioral assertions,
 * rendered with a real mount (jsdom).
 *
 * React's tests stub the wired classmap (deterministic token strings) and
 * `useTranslation`; the Svelte port stubs the classmap the same way and
 * bonds the real simple i18n provider (empty dictionaries), whose `t`
 * returns the `defaultValue` with `{{provider}}` interpolated — the same
 * behavior React's stub encoded.
 */
import { type Component, flushSync, mount, unmount } from 'svelte'
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

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import OAuthButtons from '../OAuthButtons.svelte'
import OAuthDivider from '../OAuthDivider.svelte'

// The bonded provider `useI18nProvider()` falls back to (React's
// useI18nProvider contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

/** The component mounted by the running test, torn down after each. */
let instance: ReturnType<typeof mount> | null = null

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

/** Mounts a component into a fresh container and returns the container. */
const render = (
  component: Component<Record<string, unknown>>,
  props: Record<string, unknown> = {},
): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  instance = mount(component, { target: container, props })
  flushSync()
  return container
}

/** Lets a click handler's promise chain settle (the handshake microtasks). */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('<OAuthButtons />', () => {
  it('renders one <button> per provider with provider data attributes', () => {
    const container = render(OAuthButtons, { providers: ['google', 'github', 'gitlab'] })
    expect(container.querySelector('button[aria-label="Continue with Google"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Continue with GitHub"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Continue with GitLab"]')).not.toBeNull()
    expect(container.querySelector('button[data-provider="google"]')).not.toBeNull()
    expect(container.querySelector('button[data-provider="github"]')).not.toBeNull()
    expect(container.querySelector('button[data-provider="gitlab"]')).not.toBeNull()
  })

  it('returns null when providers list is empty', () => {
    // React asserts `container.firstChild === null` (the component returned
    // null). Svelte's mount stamps comment anchors for the root `{#if}`
    // block, so the exact DOM-equivalent is "no element content at all".
    const container = render(OAuthButtons, { providers: [] })
    expect(container.firstElementChild).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('de-duplicates providers while preserving order', () => {
    const container = render(OAuthButtons, { providers: ['google', 'github', 'google'] })
    expect(container.querySelectorAll('button')).toHaveLength(2)
    expect([...container.querySelectorAll('button')].map((b) => b.dataset.provider)).toEqual([
      'google',
      'github',
    ])
  })

  it('invokes onSelect with the canonical provider id on click', () => {
    const onSelect = vi.fn()
    const container = render(OAuthButtons, { providers: ['github', 'google'], onSelect })
    container.querySelector<HTMLButtonElement>('button[data-provider="github"]')?.click()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('fires onSuccess with the provider id when an inline onSelect promise resolves', async () => {
    // An inline flow (popup/PKCE, e.g. an auth bond's signInWithProvider) returns
    // a promise that settles when the handshake completes.
    const onSelect = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    const container = render(OAuthButtons, { providers: ['github', 'google'], onSelect, onSuccess })
    container.querySelector<HTMLButtonElement>('button[data-provider="github"]')?.click()
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledExactlyOnceWith('github'))
  })

  it('does NOT fire onSuccess for a fire-and-navigate (void) onSelect', async () => {
    // redirect(provider) returns void and navigates away — there is nothing to
    // await, so onSuccess must not fire (completion is observed elsewhere).
    const onSelect = vi.fn(() => undefined)
    const onSuccess = vi.fn()
    const container = render(OAuthButtons, { providers: ['github'], onSelect, onSuccess })
    container.querySelector<HTMLButtonElement>('button[data-provider="github"]')?.click()
    await settle()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does NOT fire onSuccess when the inline onSelect promise rejects', async () => {
    // A failed/aborted handshake — onSuccess must stay unfired; the initiating
    // onSelect handler owns error surfacing.
    const onSelect = vi.fn().mockRejectedValue(new Error('handshake failed'))
    const onSuccess = vi.fn()
    const container = render(OAuthButtons, { providers: ['github'], onSelect, onSuccess })
    container.querySelector<HTMLButtonElement>('button[data-provider="github"]')?.click()
    await settle()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('renders the group as the root element (no redundant wrapper div)', () => {
    const container = render(OAuthButtons, { providers: ['google'] })
    expect(container.firstElementChild?.getAttribute('data-mol-id')).toBe('oauth-buttons')
  })

  it('composes className onto the button-group element', () => {
    const container = render(OAuthButtons, { providers: ['google'], className: 'extra-cls' })
    const group = container.querySelector('[data-mol-id="oauth-buttons"]')
    expect(group?.className).toContain('cm-oauthButtonGroup')
    expect(group?.className).toContain('extra-cls')
  })

  it('renders horizontal layout by default (no inline grid override)', () => {
    const container = render(OAuthButtons, { providers: ['google'] })
    const group = container.querySelector<HTMLElement>('[data-mol-id="oauth-buttons"]')
    expect(group?.dataset.layout).toBe('horizontal')
    expect(group?.style.display).not.toBe('grid')
  })

  it('switches to grid layout with 2 columns when >4 providers', () => {
    const container = render(OAuthButtons, {
      providers: ['google', 'github', 'gitlab', 'twitter', 'apple'],
      layout: 'grid',
    })
    const group = container.querySelector<HTMLElement>('[data-mol-id="oauth-buttons"]')
    expect(group?.style.display).toBe('grid')
    expect(group?.style.gridTemplateColumns).toContain('repeat(2,')
  })

  it('switches to column flex direction in vertical layout', () => {
    const container = render(OAuthButtons, {
      providers: ['google', 'github'],
      layout: 'vertical',
    })
    const group = container.querySelector<HTMLElement>('[data-mol-id="oauth-buttons"]')
    expect(group?.style.flexDirection).toBe('column')
    for (const btn of [...container.querySelectorAll<HTMLElement>('button')]) {
      expect(btn.style.width).toBe('100%')
    }
  })

  it('applies brand-spec inline background colors when brandButtons is set', () => {
    const container = render(OAuthButtons, { providers: ['github'], brandButtons: true })
    const button = container.querySelector<HTMLElement>('button[data-provider="github"]')
    // jsdom normalizes hex colors to rgb() — check for either form.
    expect(button?.style.background.toLowerCase()).toMatch(/#24292f|rgb\(36,\s*41,\s*47\)/)
  })

  it('omits brand colors by default — independent of iconMode', () => {
    // iconMode controls the logo, not the button surface: brand-mode
    // logos still get a ClassMap-neutral button unless brandButtons is set.
    const container = render(OAuthButtons, { providers: ['github'], iconMode: 'brand' })
    const button = container.querySelector<HTMLElement>('button[data-provider="github"]')
    expect(button?.style.background).toBe('')
  })

  it('renders provider labels next to logos when showLabels is true', () => {
    const container = render(OAuthButtons, { providers: ['google'], showLabels: true })
    expect(container.querySelector('span.cm-oauthProviderLabel')?.textContent).toBe('Google')
    expect(container.textContent).toContain('Google')
  })

  it('hides provider labels by default (icon-only row)', () => {
    const container = render(OAuthButtons, { providers: ['google'] })
    // aria-labels are attributes, not text: the only 'Google' text would be a label span.
    expect(container.textContent).not.toContain('Google')
  })
})

describe('<OAuthDivider />', () => {
  it('renders the default "or continue with" label', () => {
    const container = render(OAuthDivider)
    expect(container.textContent).toContain('or continue with')
  })

  it('honours a custom label default', () => {
    const container = render(OAuthDivider, { labelDefault: 'sign in with' })
    expect(container.textContent).toContain('sign in with')
  })

  it('composes className onto the divider wrapper', () => {
    const container = render(OAuthDivider, { className: 'extra-cls' })
    const wrapper = container.querySelector('div')
    expect(wrapper?.className).toContain('cm-oauthDivider')
    expect(wrapper?.className).toContain('extra-cls')
  })
})
