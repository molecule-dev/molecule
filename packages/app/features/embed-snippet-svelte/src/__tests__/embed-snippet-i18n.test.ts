// @vitest-environment jsdom
/**
 * i18n tests for the Svelte `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount in
 * jsdom, the bonded ClassMap and a context i18n provider whose `t` marks every
 * key. A default that bypassed t() would show up as plain English; the
 * generated embed code — code, not prose — carries HTML's `translate="no"`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setMoleculeContext } from '@molecule/app-svelte'

import EmbedSnippet from '../EmbedSnippet.svelte'
import Host from './fixtures/ContextHost.svelte'

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
const marks = (key: string): string => `«${key}»`
const marked = [
  'heading',
  'eyebrow',
  'copy',
  'copied',
  'aria.region',
  'controls.width',
  'controls.height',
  'controls.theme',
  'theme.light',
  'theme.dark',
  'theme.auto',
].map((name) => [`embedSnippet.${name}`, marks(`embedSnippet.${name}`)])

/** The i18n provider a wired app mounts above the snippet. */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: Object.fromEntries(marked) },
])

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts `<EmbedSnippet>` in a wired molecule context.
 *
 * @param props - The component's props.
 * @returns The host element the component rendered into.
 */
function renderSnippet(props: ComponentProps<typeof EmbedSnippet>): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host<ComponentProps<typeof EmbedSnippet>>, {
      target: host,
      props: {
        config: { i18n },
        setMoleculeContext,
        component: EmbedSnippet,
        props,
      },
    }),
  )
  flushSync()
  return host
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('EmbedSnippet i18n', () => {
  it('marks the generated embed code as never translatable', () => {
    const host = renderSnippet({ template: TEMPLATE })
    const pre = host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(pre?.getAttribute('translate')).toBe('no')
    // The code is the caller's template, not the component's prose: it does not
    // go through t(), so it stays exactly as substituted.
    expect(pre?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('takes the copy button label through i18n', async () => {
    const host = renderSnippet({ template: TEMPLATE })
    const button = host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    // The real Button pads the slot with whitespace: compare trimmed.
    expect(button.textContent?.trim()).toBe(marks('embedSnippet.copy'))
    button.click()
    // The "Copied!" swap happens in the clipboard promise's continuation.
    await Promise.resolve()
    flushSync()
    expect(button.textContent?.trim()).toBe(marks('embedSnippet.copied'))
  })

  it('takes the heading and eyebrow through i18n, and the props still override', () => {
    const markedHost = renderSnippet({ template: TEMPLATE })
    expect(markedHost.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      marks('embedSnippet.heading'),
    )
    expect(markedHost.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      marks('embedSnippet.eyebrow'),
    )

    const overridden = renderSnippet({
      template: TEMPLATE,
      heading: '3D Model',
      eyebrow: 'Share this view',
    })
    expect(overridden.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '3D Model',
    )
    expect(overridden.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Share this view',
    )
  })

  it('takes the control captions and the region label through i18n', () => {
    const host = renderSnippet({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: () => {},
    })
    expect(
      host.querySelector('[data-mol-id="embed-snippet-control-width"]')?.textContent,
    ).toContain(marks('embedSnippet.controls.width'))
    expect(
      host.querySelector('[data-mol-id="embed-snippet-control-height"]')?.textContent,
    ).toContain(marks('embedSnippet.controls.height'))
    expect(
      host.querySelector('[data-mol-id="embed-snippet-control-theme"]')?.textContent,
    ).toContain(marks('embedSnippet.controls.theme'))
    expect(
      host.querySelector('[data-mol-id="embed-snippet-input-width"]')?.getAttribute('aria-label'),
    ).toBe(marks('embedSnippet.controls.width'))
    expect(
      host.querySelector('[data-mol-id="embed-snippet-input-theme"]')?.getAttribute('aria-label'),
    ).toBe(marks('embedSnippet.controls.theme'))
    expect(host.querySelector('[data-mol-id="embed-snippet"]')?.getAttribute('aria-label')).toBe(
      marks('embedSnippet.aria.region'),
    )
  })
})
