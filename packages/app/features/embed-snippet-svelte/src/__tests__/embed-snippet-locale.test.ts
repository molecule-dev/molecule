// @vitest-environment jsdom
/**
 * Locale-switch test for the Svelte `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-locale.test.tsx`:
 * switching the bonded provider's locale re-renders every translated label,
 * while the generated embed code — marked `translate="no"` — keeps the caller's
 * template untouched.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getProvider } from '@molecule/app-i18n'

import EmbedSnippet from '../EmbedSnippet.svelte'

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts `<EmbedSnippet>` against the bonded ClassMap and i18n provider.
 *
 * @param props - The component's props.
 * @returns The host element the component rendered into.
 */
function renderSnippet(props: Record<string, unknown> = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(EmbedSnippet, { target: host, props }))
  flushSync()
  return host
}

afterEach(async () => {
  await getProvider().setLocale('en')
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet> locale switch', () => {
  it('switching the locale changes the translated labels', async () => {
    const host = renderSnippet({ template: TEMPLATE })
    expect(host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    // The real Button pads the slot with whitespace: compare trimmed.
    expect(
      host.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent?.trim(),
    ).toBe('Copy')

    // The kit's pseudo locale: the bonded provider brackets every translated
    // string, so a label that skipped t() would stay plain.
    await getProvider().setLocale('en-XA')
    flushSync()
    expect(host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '⟦Embed code⟧',
    )
    expect(host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      '⟦Copy embed code⟧',
    )
    expect(
      host.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent?.trim(),
    ).toBe('⟦Copy⟧')
    // The embed code is code, not prose: the switch leaves it as written.
    expect(host.querySelector('[data-mol-id="embed-snippet-code"]')?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
    expect(
      host.querySelector('[data-mol-id="embed-snippet-code"]')?.getAttribute('translate'),
    ).toBe('no')
  })
})
