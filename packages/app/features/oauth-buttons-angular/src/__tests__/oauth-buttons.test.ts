// @vitest-environment jsdom
/**
 * Ports of `@molecule/app-oauth-buttons-react/src/__tests__/OAuthButtons.test.tsx`:
 * every behavioral assertion of the React package's own suite, rendered here
 * with the same real-DOM approach the Angular conformance adapter uses
 * (real ClassMap bond and i18n provider, no module mocks).
 *
 * @module
 */

// Register Angular's JIT compiler facade before the binding module loads — it
// pulls in partially compiled Angular libraries whose decorators need it —
// and bond the reference ClassMap + i18n provider the conformance kit uses.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { describe, expect, it, vi } from 'vitest'

import { getClassMap } from '@molecule/app-ui'

import { OAuthButtons, OAuthDivider } from '../index.js'
import { renderFixture } from './render.js'

// The real ClassMap bond, for assertions that a composed token is present
// (class strings are never written in code, so the test reads the bond).
const cm = (): ReturnType<typeof getClassMap> => getClassMap()

/** Renders the button row with the given props. */
const renderRow = async (
  props: Record<string, unknown>,
): Promise<ReturnType<typeof renderFixture>> =>
  renderFixture(
    `<div mol-oauth-buttons
      [providers]="p['providers']"
      [onSelect]="p['onSelect']"
      [layout]="p['layout']"
      [iconSize]="p['iconSize']"
      [iconMode]="p['iconMode']"
      [brandButtons]="p['brandButtons']"
      [showLabels]="p['showLabels']"
      [className]="p['className']"
      (success)="p['onSuccess']?.($event)"
    ></div>`,
    props,
    [OAuthButtons],
  )

/** Renders the divider with the given props. */
const renderDivider = async (
  props: Record<string, unknown> = {},
): Promise<ReturnType<typeof renderFixture>> =>
  renderFixture(
    `<div mol-oauth-divider [labelKey]="p['labelKey']" [labelDefault]="p['labelDefault']" [className]="p['className']"></div>`,
    props,
    [OAuthDivider],
  )

describe('OAuthButtons', () => {
  it('renders one <button> per provider with provider data attributes', async () => {
    const fixture = await renderRow({ providers: ['google', 'github', 'gitlab'] })
    const buttons = fixture.host.querySelectorAll('button')
    expect(buttons.length).toBe(3)
    const providers = Array.from(buttons).map((b) => b.getAttribute('data-provider'))
    expect(providers).toEqual(['google', 'github', 'gitlab'])
    expect(
      Array.from(buttons).map((b) => b.getAttribute('aria-label')!.startsWith('Continue with ')),
    ).toEqual([true, true, true])
    await fixture.destroy()
  })

  it('returns null when providers list is empty', async () => {
    const fixture = await renderRow({ providers: [] })
    // React returns null: the host element is detached from the document.
    expect(document.querySelector('[data-mol-id="oauth-buttons"]')).toBeNull()
    await fixture.destroy()
  })

  it('de-duplicates providers while preserving order', async () => {
    const fixture = await renderRow({ providers: ['google', 'github', 'google'] })
    expect(fixture.host.querySelectorAll('button').length).toBe(2)
    await fixture.destroy()
  })

  it('invokes onSelect with the canonical provider id on click', async () => {
    const onSelect = vi.fn()
    const fixture = await renderRow({ providers: ['github', 'google'], onSelect })
    fixture.host
      .querySelector('button[data-provider="github"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    await fixture.destroy()
  })

  it('fires onSuccess with the provider id when an inline onSelect promise resolves', async () => {
    // An inline flow (popup/PKCE, e.g. an auth bond's signInWithProvider) returns
    // a promise that settles when the handshake completes.
    const onSuccess = vi.fn()
    const fixture = await renderRow({
      providers: ['github', 'google'],
      onSelect: () => Promise.resolve(undefined),
      onSuccess,
    })
    fixture.host.querySelector('button[data-provider="github"]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith('github')
    await fixture.destroy()
  })

  it('does NOT fire onSuccess for a fire-and-navigate (void) onSelect', async () => {
    // redirect(provider) returns void and navigates away — there is nothing to
    // await, so success must not fire (completion is observed elsewhere).
    const onSelect = vi.fn(() => undefined)
    const onSuccess = vi.fn()
    const fixture = await renderRow({ providers: ['github'], onSelect, onSuccess })
    fixture.host.querySelector('button[data-provider="github"]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    expect(onSuccess).not.toHaveBeenCalled()
    await fixture.destroy()
  })

  it('does NOT fire onSuccess when the inline onSelect promise rejects', async () => {
    // A failed/aborted handshake — success must stay unfired; the initiating
    // onSelect handler owns error surfacing.
    const onSuccess = vi.fn()
    const fixture = await renderRow({
      providers: ['github'],
      onSelect: () => Promise.reject(new Error('handshake failed')),
      onSuccess,
    })
    fixture.host.querySelector('button[data-provider="github"]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSuccess).not.toHaveBeenCalled()
    await fixture.destroy()
  })

  it('renders the group as the root element (no redundant wrapper div)', async () => {
    const fixture = await renderRow({ providers: ['google'] })
    expect(fixture.host.querySelector('[data-mol-id="oauth-buttons"]')).not.toBeNull()
    await fixture.destroy()
  })

  it('composes className onto the button-group element', async () => {
    const fixture = await renderRow({ providers: ['google'], className: 'extra-cls' })
    const group = fixture.host.querySelector('[data-mol-id="oauth-buttons"]')!
    expect(group.classList.contains('extra-cls')).toBe(true)
    // A ClassMap token may expand to several classes; each must be present.
    const tokenClasses = cm().oauthButtonGroup.split(/\s+/)
    expect(tokenClasses.map((cls) => group.classList.contains(cls))).toEqual(
      tokenClasses.map(() => true),
    )
    await fixture.destroy()
  })

  it('renders horizontal layout by default (no inline grid override)', async () => {
    const fixture = await renderRow({ providers: ['google'] })
    const group = fixture.host.querySelector('[data-mol-id="oauth-buttons"]')!
    expect(group.getAttribute('data-layout')).toBe('horizontal')
    expect(group.style.display).not.toBe('grid')
    await fixture.destroy()
  })

  it('switches to grid layout with 2 columns when >4 providers', async () => {
    const fixture = await renderRow({
      providers: ['google', 'github', 'gitlab', 'twitter', 'apple'],
      layout: 'grid',
    })
    const group = fixture.host.querySelector('[data-mol-id="oauth-buttons"]')!
    expect(group.style.display).toBe('grid')
    expect(group.style.gridTemplateColumns).toContain('repeat(2,')
    await fixture.destroy()
  })

  it('switches to column flex direction in vertical layout', async () => {
    const fixture = await renderRow({ providers: ['google', 'github'], layout: 'vertical' })
    const group = fixture.host.querySelector('[data-mol-id="oauth-buttons"]')!
    expect(group.style.flexDirection).toBe('column')
    for (const btn of Array.from(fixture.host.querySelectorAll('button'))) {
      expect((btn as HTMLElement).style.width).toBe('100%')
    }
    await fixture.destroy()
  })

  it('applies brand-spec inline background colors when brandButtons is set', async () => {
    const fixture = await renderRow({ providers: ['github'], brandButtons: true })
    const button = fixture.host.querySelector('button[data-provider="github"]') as HTMLElement
    // jsdom normalizes hex colors to rgb() — check for either form.
    expect(button.style.background.toLowerCase()).toMatch(/#24292f|rgb\(36,\s*41,\s*47\)/)
    await fixture.destroy()
  })

  it('omits brand colors by default — independent of iconMode', async () => {
    // iconMode controls the logo, not the button surface: brand-mode
    // logos still get a ClassMap-neutral button unless brandButtons is set.
    const fixture = await renderRow({ providers: ['github'], iconMode: 'brand' })
    const button = fixture.host.querySelector('button[data-provider="github"]') as HTMLElement
    expect(button.style.background).toBe('')
    await fixture.destroy()
  })

  it('renders provider labels next to logos when showLabels is true', async () => {
    const fixture = await renderRow({ providers: ['google'], showLabels: true })
    expect(fixture.host.textContent).toContain('Google')
    await fixture.destroy()
  })

  it('hides provider labels by default (icon-only row)', async () => {
    const fixture = await renderRow({ providers: ['google'] })
    expect(fixture.host.textContent).not.toContain('Google')
    await fixture.destroy()
  })
})

describe('OAuthDivider', () => {
  it('renders the default "or continue with" label', async () => {
    const fixture = await renderDivider()
    expect(fixture.host.textContent).toContain('or continue with')
    await fixture.destroy()
  })

  it('honours a custom label default', async () => {
    const fixture = await renderDivider({ labelDefault: 'sign in with' })
    expect(fixture.host.textContent).toContain('sign in with')
    await fixture.destroy()
  })

  it('composes className onto the divider wrapper', async () => {
    const fixture = await renderDivider({ className: 'extra-cls' })
    const wrapper = fixture.host.querySelector('div[mol-oauth-divider]')!
    expect(wrapper.classList.contains('extra-cls')).toBe(true)
    // A ClassMap token may expand to several classes; each must be present.
    const tokenClasses = cm().oauthDivider.split(/\s+/)
    expect(tokenClasses.map((cls) => wrapper.classList.contains(cls))).toEqual(
      tokenClasses.map(() => true),
    )
    await fixture.destroy()
  })
})
