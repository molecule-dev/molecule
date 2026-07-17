import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
    cn: (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c.length > 0).join(' '),
  }),
}))

// Stub useTranslation so we don't need an i18n provider context.
// Returns the defaultValue with {{provider}} interpolated, mirroring
// real provider behavior for our purposes.
vi.mock('@molecule/app-react', () => ({
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

import { OAuthButtons } from '../OAuthButtons.js'
import { OAuthDivider } from '../OAuthDivider.js'

describe('<OAuthButtons />', () => {
  it('renders one <button> per provider with provider data attributes', () => {
    render(<OAuthButtons providers={['google', 'github', 'gitlab']} />)
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Continue with GitHub/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Continue with GitLab/ })).toBeDefined()
  })

  it('returns null when providers list is empty', () => {
    const { container } = render(<OAuthButtons providers={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('de-duplicates providers while preserving order', () => {
    render(<OAuthButtons providers={['google', 'github', 'google']} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('invokes onSelect with the canonical provider id on click', () => {
    const onSelect = vi.fn()
    render(<OAuthButtons providers={['github', 'google']} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/ }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
  })

  it('fires onSuccess with the provider id when an inline onSelect promise resolves', async () => {
    // An inline flow (popup/PKCE, e.g. an auth bond's signInWithProvider) returns
    // a promise that settles when the handshake completes.
    const onSelect = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    render(
      <OAuthButtons providers={['github', 'google']} onSelect={onSelect} onSuccess={onSuccess} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/ }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledExactlyOnceWith('github'))
  })

  it('does NOT fire onSuccess for a fire-and-navigate (void) onSelect', async () => {
    // redirect(provider) returns void and navigates away — there is nothing to
    // await, so onSuccess must not fire (completion is observed elsewhere).
    const onSelect = vi.fn(() => undefined)
    const onSuccess = vi.fn()
    render(<OAuthButtons providers={['github']} onSelect={onSelect} onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/ }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('github')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does NOT fire onSuccess when the inline onSelect promise rejects', async () => {
    // A failed/aborted handshake — onSuccess must stay unfired; the initiating
    // onSelect handler owns error surfacing.
    const onSelect = vi.fn().mockRejectedValue(new Error('handshake failed'))
    const onSuccess = vi.fn()
    render(<OAuthButtons providers={['github']} onSelect={onSelect} onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: /Continue with GitHub/ }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('renders the group as the root element (no redundant wrapper div)', () => {
    const { container } = render(<OAuthButtons providers={['google']} />)
    expect((container.firstChild as HTMLElement)?.dataset.molId).toBe('oauth-buttons')
  })

  it('composes className onto the button-group element', () => {
    const { container } = render(<OAuthButtons providers={['google']} className="extra-cls" />)
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.className).toContain('cm-oauthButtonGroup')
    expect(group.className).toContain('extra-cls')
  })

  it('renders horizontal layout by default (no inline grid override)', () => {
    const { container } = render(<OAuthButtons providers={['google']} />)
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.dataset.layout).toBe('horizontal')
    expect(group.style.display).not.toBe('grid')
  })

  it('switches to grid layout with 2 columns when >4 providers', () => {
    const { container } = render(
      <OAuthButtons providers={['google', 'github', 'gitlab', 'twitter', 'apple']} layout="grid" />,
    )
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.style.display).toBe('grid')
    expect(group.style.gridTemplateColumns).toContain('repeat(2,')
  })

  it('switches to column flex direction in vertical layout', () => {
    const { container } = render(
      <OAuthButtons providers={['google', 'github']} layout="vertical" />,
    )
    const group = container.querySelector('[data-mol-id="oauth-buttons"]') as HTMLElement
    expect(group.style.flexDirection).toBe('column')
    const buttons = container.querySelectorAll('button')
    for (const btn of Array.from(buttons)) {
      expect((btn as HTMLElement).style.width).toBe('100%')
    }
  })

  it('applies brand-spec inline background colors when brandButtons is set', () => {
    const { container } = render(<OAuthButtons providers={['github']} brandButtons />)
    const button = container.querySelector('button[data-provider="github"]') as HTMLElement
    // jsdom normalizes hex colors to rgb() — check for either form.
    expect(button.style.background.toLowerCase()).toMatch(/#24292f|rgb\(36,\s*41,\s*47\)/)
  })

  it('omits brand colors by default — independent of iconMode', () => {
    // iconMode controls the logo, not the button surface: brand-mode
    // logos still get a ClassMap-neutral button unless brandButtons is set.
    const { container } = render(<OAuthButtons providers={['github']} iconMode="brand" />)
    const button = container.querySelector('button[data-provider="github"]') as HTMLElement
    expect(button.style.background).toBe('')
  })

  it('renders provider labels next to logos when showLabels is true', () => {
    render(<OAuthButtons providers={['google']} showLabels />)
    expect(screen.getByText('Google')).toBeDefined()
  })

  it('hides provider labels by default (icon-only row)', () => {
    render(<OAuthButtons providers={['google']} />)
    expect(screen.queryByText('Google')).toBeNull()
  })
})

describe('<OAuthDivider />', () => {
  it('renders the default "or continue with" label', () => {
    render(<OAuthDivider />)
    expect(screen.getByText('or continue with')).toBeDefined()
  })

  it('honours a custom label default', () => {
    render(<OAuthDivider labelDefault="sign in with" />)
    expect(screen.getByText('sign in with')).toBeDefined()
  })

  it('composes className onto the divider wrapper', () => {
    const { container } = render(<OAuthDivider className="extra-cls" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('cm-oauthDivider')
    expect(wrapper.className).toContain('extra-cls')
  })
})
