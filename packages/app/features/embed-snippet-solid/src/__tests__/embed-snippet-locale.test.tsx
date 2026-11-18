// @vitest-environment jsdom
/**
 * Locale-switch test for the Solid `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-locale.test.tsx`:
 * switching the bonded provider's locale re-renders every translated label,
 * while the generated embed code — marked `translate="no"` — keeps the caller's
 * template untouched.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getProvider } from '@molecule/app-i18n'

import { EmbedSnippet } from '../EmbedSnippet.jsx'
import type { EmbedSnippetProps } from '../types.js'

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** The render disposers of the mounts made during one test. */
const disposers: Array<() => void> = []

/**
 * Mounts `<EmbedSnippet>` with the given props.
 *
 * @param props - The component's props.
 * @returns The container the component rendered into.
 */
function renderSnippet(props: EmbedSnippetProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <EmbedSnippet {...props} />, container))
  return container
}

afterEach(async () => {
  await getProvider().setLocale('en')
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet> locale switch', () => {
  it('switching the locale changes the translated labels', async () => {
    const container = renderSnippet({ template: TEMPLATE })
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      'Copy',
    )

    // The kit's pseudo locale: the bonded provider brackets every translated
    // string, so a label that skipped t() would stay plain.
    await getProvider().setLocale('en-XA')
    await Promise.resolve()
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '⟦Embed code⟧',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      '⟦Copy embed code⟧',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-copy-button"]')?.textContent).toBe(
      '⟦Copy⟧',
    )
    // The embed code is code, not prose: the switch leaves it as written.
    expect(container.querySelector('[data-mol-id="embed-snippet-code"]')?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
    expect(
      container.querySelector('[data-mol-id="embed-snippet-code"]')?.getAttribute('translate'),
    ).toBe('no')
  })
})
