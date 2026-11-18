// @vitest-environment jsdom
/**
 * i18n tests for `EmbedSnippet` — the strings around the generated embed code.
 * A `t` that marks every key proves the component's own text goes through i18n
 * (a default that bypassed t() would show up as plain English), an explicit
 * `heading` / `eyebrow` prop still overrides it, and the generated embed code —
 * code, not prose — carries HTML's `translate="no"`, so browser translators and
 * the conformance kit's pseudo-locale check leave it alone.
 *
 * @module
 */

import { act, fireEvent, render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-clipboard', () => ({ copyTextWithFallback: vi.fn(async () => true) }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The button marker, carrying the id and the click the component binds.
vi.mock('@molecule/app-ui-react', () => ({
  Button: (props: { children?: ReactNode; onClick?: () => void; 'data-mol-id'?: string }) =>
    createElement(
      'button',
      { 'data-mol-id': props['data-mol-id'], onClick: props.onClick, type: 'button' },
      props.children,
    ),
}))

const { EmbedSnippet } = await import('../EmbedSnippet.js')

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

describe('EmbedSnippet i18n', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('marks the generated embed code as never translatable', () => {
    const { container } = render(<EmbedSnippet template={TEMPLATE} />)
    const pre = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(pre?.getAttribute('translate')).toBe('no')
    // The code is the caller's template, not the component's prose: it does not
    // go through t(), so it stays exactly as substituted.
    expect(pre?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('takes the copy button label through i18n', async () => {
    const { container } = render(<EmbedSnippet template={TEMPLATE} />)
    const button = container.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    expect(button.textContent).toBe('«embedSnippet.copy»')
    fireEvent.click(button)
    // The "Copied!" swap happens in the copy promise's continuation.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(button.textContent).toBe('«embedSnippet.copied»')
  })

  it('takes the heading and eyebrow through i18n, and the props still override', () => {
    const marked = render(<EmbedSnippet template={TEMPLATE} />)
    expect(
      marked.container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent,
    ).toBe('«embedSnippet.heading»')
    expect(
      marked.container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent,
    ).toBe('«embedSnippet.eyebrow»')

    const overridden = render(
      <EmbedSnippet template={TEMPLATE} heading="3D Model" eyebrow="Share this view" />,
    )
    expect(
      overridden.container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent,
    ).toBe('3D Model')
    expect(
      overridden.container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent,
    ).toBe('Share this view')
  })

  it('takes the control captions and the region label through i18n', () => {
    const { container } = render(
      <EmbedSnippet
        template={TEMPLATE}
        controls={{ width: true, height: true, theme: true }}
        values={{ width: 640, height: 480, theme: 'light' }}
        onChange={() => {}}
      />,
    )
    expect(
      container.querySelector('[data-mol-id="embed-snippet-control-width"]')?.textContent,
    ).toContain('«embedSnippet.controls.width»')
    expect(
      container.querySelector('[data-mol-id="embed-snippet-control-height"]')?.textContent,
    ).toContain('«embedSnippet.controls.height»')
    expect(
      container.querySelector('[data-mol-id="embed-snippet-control-theme"]')?.textContent,
    ).toContain('«embedSnippet.controls.theme»')
    expect(
      container
        .querySelector('[data-mol-id="embed-snippet-input-width"]')
        ?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.controls.width»')
    expect(
      container
        .querySelector('[data-mol-id="embed-snippet-input-theme"]')
        ?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.controls.theme»')
    expect(
      container.querySelector('[data-mol-id="embed-snippet"]')?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.aria.region»')
  })
})
