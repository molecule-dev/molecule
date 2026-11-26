// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ShareLinkCard` and its internal `CopyLinkField` —
 * a port of `@molecule/app-share-link-card-react/src/__tests__/share-link-card.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom), the
 * bonded ClassMap and the bonded i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setMoleculeContext } from '@molecule/app-svelte'

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

import { copyTextWithFallback } from '@molecule/app-clipboard'

import CopyLinkField from '../CopyLinkField.svelte'
import ShareLinkCard from '../ShareLinkCard.svelte'

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts a component with the given props and returns the host element.
 *
 * @param component - The component under test.
 * @param props - Its props.
 * @returns The host element holding the rendered markup.
 */
function render<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  // The composition root the conformance Host installs: no services, so the
  // component reads the bonded providers exactly as an app would.
  setMoleculeContext({})
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('CopyLinkField', () => {
  it('renders a read-only input carrying the value', () => {
    const host = render(CopyLinkField, { value: 'https://x.test/abc' })
    const input = host.querySelector('input')
    expect(input?.getAttribute('value')).toBe('https://x.test/abc')
    expect(input?.hasAttribute('readonly')).toBe(true)
  })

  it('renders the Copy button with its default label', () => {
    const host = render(CopyLinkField, { value: 'https://x.test' })
    const button = host.querySelector('button')
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('Copy')
  })

  it('forwards className', () => {
    const host = render(CopyLinkField, { value: 'u', className: 'clf-cls' })
    expect(host.querySelector('div')?.getAttribute('class')).toContain('clf-cls')
  })

  it('names the url field with an accessible label', () => {
    const host = render(CopyLinkField, { value: 'u' })
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Share link')
  })

  it('copies the value when the copy button is clicked', async () => {
    const host = render(CopyLinkField, { value: 'https://x.test/abc' })
    const button = host.querySelector('button') as HTMLButtonElement
    button.click()
    await vi.waitFor(() => expect(button.textContent).toContain('Copied!'))
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const host = render(CopyLinkField, { value: 'https://x.test/abc' })
    const button = host.querySelector('button') as HTMLButtonElement
    button.click()
    await vi.waitFor(() =>
      expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/abc'),
    )
    flushSync()
    expect(button.textContent).toContain('Copy')
    expect(button.textContent).not.toContain('Copied!')
  })
})

describe('ShareLinkCard', () => {
  it('renders the title in an <h3> and the description', () => {
    const host = render(ShareLinkCard, {
      url: 'u',
      title: raw('Share this'),
      description: raw('desc-x'),
    })
    expect(host.querySelector('h3')?.textContent).toContain('Share this')
    expect(host.querySelector('p')?.textContent).toContain('desc-x')
  })

  it('omits the header when neither title nor description is given', () => {
    const host = render(ShareLinkCard, { url: 'u' })
    expect(host.querySelector('header')).toBeNull()
  })

  it('renders the CopyLinkField carrying the url', () => {
    const host = render(ShareLinkCard, { url: 'https://x.test/share' })
    expect(host.querySelector('input')?.getAttribute('value')).toBe('https://x.test/share')
  })

  it('renders the QR slot only when showQR and qr are both set', () => {
    const shown = render(ShareLinkCard, {
      url: 'u',
      showQR: true,
      qr: raw('<span data-qr></span>'),
    })
    expect(shown.querySelector('[data-qr]')).not.toBeNull()
    const hidden = render(ShareLinkCard, { url: 'u', qr: raw('<span data-qr></span>') })
    expect(hidden.querySelector('[data-qr]')).toBeNull()
  })

  it('renders the password-protect toggle row with the default label when configured', () => {
    const host = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {} },
    })
    expect(host.querySelector('button[role="switch"]')).not.toBeNull()
    expect(host.textContent).toContain('Password protect')
  })

  it('honours a custom password-protect label', () => {
    const host = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: true, onChange: () => {}, label: 'Require a password' },
    })
    expect(host.textContent).toContain('Require a password')
  })

  it('names the password switch from its visible label', () => {
    const host = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {} },
    })
    const switchButton = host.querySelector('button[role="switch"]')
    const labelId = switchButton?.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId ?? '')?.textContent).toContain('Password protect')
  })

  it('falls back to an i18n name for a switch with an empty label', () => {
    const host = render(ShareLinkCard, {
      url: 'u',
      passwordProtect: { enabled: false, onChange: () => {}, label: '' },
    })
    const switchButton = host.querySelector('button[role="switch"]')
    expect(switchButton?.hasAttribute('aria-labelledby')).toBe(false)
    expect(switchButton?.getAttribute('aria-label')).toBe('Password protect')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const host = render(ShareLinkCard, {
      url: 'u',
      dataMolId: 'share-x',
      className: 'slc-cls',
    })
    const card = host.querySelector('[data-mol-id="share-x"]')
    expect(card).not.toBeNull()
    expect(card?.getAttribute('class')).toContain('slc-cls')
  })
})
