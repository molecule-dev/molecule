// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { EmbedSnippet } from '../EmbedSnippet.js'
import type { EmbedSnippetValues } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('<EmbedSnippet>', () => {
  it('renders a region with mol-id, language attribute, and aria-label', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} language="iframe" />
      </Wrap>,
    )
    const panel = container.querySelector('[data-mol-id="embed-snippet"]') as HTMLElement | null
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-mol-language')).toBe('iframe')
    expect(panel?.getAttribute('aria-label')).toBe('Embed code (iframe)')
  })

  it('substitutes placeholders into the rendered <pre>', () => {
    const values: EmbedSnippetValues = { width: 640, height: '480px', theme: 'dark' }
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} values={values} />
      </Wrap>,
    )
    const code = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
  })

  it('substitutes empty strings when values are absent', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} />
      </Wrap>,
    )
    const code = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('renders a heading and eyebrow with translated defaults', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Copy embed code',
    )
  })

  it('respects heading + eyebrow overrides', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} heading="3D Model" eyebrow="Share this view" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '3D Model',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Share this view',
    )
  })

  it('does not render controls row when controls prop is omitted', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-controls"]')).toBeNull()
  })

  it('renders width/height/theme controls when configured', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet
          template={TEMPLATE}
          controls={{ width: true, height: true, theme: true }}
          values={{ width: 640, height: 480, theme: 'light' }}
          onChange={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-controls"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-height"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-theme"]')).not.toBeNull()
  })

  it('only renders the controls that are enabled', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet
          template={TEMPLATE}
          controls={{ width: true }}
          values={{ width: 640 }}
          onChange={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-height"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-theme"]')).toBeNull()
  })

  it('fires onChange when the width input is edited', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <EmbedSnippet
          template={TEMPLATE}
          controls={{ width: true }}
          values={{ width: 640, height: 480, theme: 'dark' }}
          onChange={onChange}
        />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '800' } })
    expect(onChange).toHaveBeenCalledWith({ width: '800', height: 480, theme: 'dark' })
  })

  it('fires onChange when the theme select is changed', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Wrap>
        <EmbedSnippet
          template={TEMPLATE}
          controls={{ theme: true }}
          values={{ theme: 'light' }}
          onChange={onChange}
        />
      </Wrap>,
    )
    const select = container.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'dark' } })
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('lets a controlled wrapper update the rendered snippet on change', () => {
    function Controlled() {
      const [v, setV] = useState<EmbedSnippetValues>({ width: 640, height: 480, theme: 'light' })
      return (
        <EmbedSnippet
          template={TEMPLATE}
          controls={{ width: true, height: true, theme: true }}
          values={v}
          onChange={setV}
        />
      )
    }
    const { container } = render(
      <Wrap>
        <Controlled />
      </Wrap>,
    )
    const widthInput = container.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    fireEvent.change(widthInput, { target: { value: '900' } })
    const code = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toContain('width="900"')
  })

  it('uses caller-supplied theme options when provided', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet
          template={TEMPLATE}
          controls={{
            theme: [
              { value: 'sunrise', label: 'Sunrise' },
              { value: 'midnight', label: 'Midnight' },
            ],
          }}
          values={{ theme: 'sunrise' }}
          onChange={() => {}}
        />
      </Wrap>,
    )
    const select = container.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    const optionLabels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(optionLabels).toEqual(['Sunrise', 'Midnight'])
  })

  it('calls navigator.clipboard.writeText with the rendered snippet on copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const onCopy = vi.fn()
    const { container } = render(
      <Wrap>
        <EmbedSnippet
          template={TEMPLATE}
          values={{ width: 640, height: 480, theme: 'dark' }}
          onCopy={onCopy}
        />
      </Wrap>,
    )
    const button = container.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    fireEvent.click(button)
    await Promise.resolve()
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(onCopy.mock.calls[0][0]).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
  })

  it('does not throw when navigator.clipboard is unavailable', () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} values={{ width: 640 }} />
      </Wrap>,
    )
    const button = container.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('honours a custom mol-id prefix', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} molId="my-embed" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="my-embed"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="my-embed-code"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="my-embed-copy-button"]')).not.toBeNull()
  })

  it('appends className to the panel root', () => {
    const { container } = render(
      <Wrap>
        <EmbedSnippet template={TEMPLATE} className="my-extra-class" />
      </Wrap>,
    )
    const panel = container.querySelector('[data-mol-id="embed-snippet"]') as HTMLElement
    expect(panel.className).toContain('my-extra-class')
  })
})
