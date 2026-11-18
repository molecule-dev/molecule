// @vitest-environment jsdom
/**
 * Locale-switch test for the Vue `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-locale.test.tsx`:
 * switching the bonded provider's locale re-renders every translated label,
 * while the generated embed code — marked `translate="no"` — keeps the caller's
 * template untouched.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { getProvider } from '@molecule/app-i18n'

import { EmbedSnippet } from '../EmbedSnippet.js'
import type { EmbedSnippetProps } from '../types.js'

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** The apps mounted during one test, unmounted in `afterEach`. */
const mounted: Array<() => void> = []

/**
 * Mounts `<EmbedSnippet>` with the given props.
 *
 * @param props - The component's props.
 * @returns The host element the app rendered into.
 */
function render(props: EmbedSnippetProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(EmbedSnippet, props) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  return host
}

afterEach(async () => {
  await getProvider().setLocale('en')
  for (const unmount of mounted.splice(0)) unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet> locale switch', () => {
  it('switching the locale changes the translated labels', async () => {
    const host = render({ template: TEMPLATE })
    expect(host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(host.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      'Copy',
    )

    // The kit's pseudo locale: the bonded provider brackets every translated
    // string, so a label that skipped t() would stay plain.
    await getProvider().setLocale('en-XA')
    await nextTick()
    expect(host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '⟦Embed code⟧',
    )
    expect(host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      '⟦Copy embed code⟧',
    )
    expect(host.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      '⟦Copy⟧',
    )
    // The embed code is code, not prose: the switch leaves it as written.
    expect(host.querySelector('[data-mol-id="embed-snippet-code"]')?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
    expect(
      host.querySelector('[data-mol-id="embed-snippet-code"]')?.getAttribute('translate'),
    ).toBe('no')
  })
})
