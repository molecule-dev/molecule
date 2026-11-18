// @vitest-environment jsdom
/**
 * Unit tests for the Solid `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/EmbedSnippet.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom against the
 * bonded ClassMap and i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import { EmbedSnippet } from '../EmbedSnippet.jsx'
import type { EmbedSnippetProps, EmbedSnippetValues } from '../types.js'

vi.mock('@molecule/app-clipboard', () => ({ copyTextWithFallback: vi.fn(async () => true) }))

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** The render disposers of the mounts made during one test. */
const disposers: Array<() => void> = []

/**
 * Mounts one root component and returns the element it produced.
 *
 * @param root - The root component to mount.
 * @returns The container the component rendered into.
 */
function mount(root: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(root, container))
  return container
}

/**
 * Mounts `<EmbedSnippet>` with the given props.
 *
 * @param props - The component's props.
 * @returns The container the component rendered into.
 */
function renderSnippet(props: EmbedSnippetProps): HTMLElement {
  return mount(() => <EmbedSnippet {...props} />)
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet>', () => {
  it('renders a region with mol-id, language attribute, and aria-label', () => {
    const container = renderSnippet({ template: TEMPLATE, language: 'iframe' })
    const panel = container.querySelector('[data-mol-id="embed-snippet"]')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-mol-language')).toBe('iframe')
    expect(panel?.getAttribute('aria-label')).toBe('Embed code (iframe)')
  })

  it('substitutes placeholders into the rendered <pre>', () => {
    const values: EmbedSnippetValues = { width: 640, height: '480px', theme: 'dark' }
    const container = renderSnippet({ template: TEMPLATE, values })
    const code = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
  })

  it('substitutes empty strings when values are absent', () => {
    const container = renderSnippet({ template: TEMPLATE })
    const code = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('renders a heading and eyebrow with translated defaults', () => {
    const container = renderSnippet({ template: TEMPLATE })
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Copy embed code',
    )
  })

  it('respects heading + eyebrow overrides', () => {
    const container = renderSnippet({
      template: TEMPLATE,
      heading: '3D Model',
      eyebrow: 'Share this view',
    })
    expect(container.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '3D Model',
    )
    expect(container.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Share this view',
    )
  })

  it('does not render controls row when controls prop is omitted', () => {
    const container = renderSnippet({ template: TEMPLATE })
    expect(container.querySelector('[data-mol-id="embed-snippet-controls"]')).toBeNull()
  })

  it('renders width/height/theme controls when configured', () => {
    const container = renderSnippet({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: () => {},
    })
    expect(container.querySelector('[data-mol-id="embed-snippet-controls"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-height"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-theme"]')).not.toBeNull()
  })

  it('only renders the controls that are enabled', () => {
    const container = renderSnippet({
      template: TEMPLATE,
      controls: { width: true },
      values: { width: 640 },
      onChange: () => {},
    })
    expect(container.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-height"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="embed-snippet-input-theme"]')).toBeNull()
  })

  it('fires onChange when the width input is edited', () => {
    const onChange = vi.fn()
    const container = renderSnippet({
      template: TEMPLATE,
      controls: { width: true },
      values: { width: 640, height: 480, theme: 'dark' },
      onChange,
    })
    const input = container.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    input.value = '800'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ width: '800', height: 480, theme: 'dark' })
  })

  it('fires onChange when the theme select is changed', () => {
    const onChange = vi.fn()
    const container = renderSnippet({
      template: TEMPLATE,
      controls: { theme: true },
      values: { theme: 'light' },
      onChange,
    })
    const select = container.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    select.value = 'dark'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('lets a controlled wrapper update the rendered snippet on change', () => {
    /** A wrapper that passes its own signal as `values` + `onChange`. */
    function Controlled(): JSX.Element {
      const [values, setValues] = createSignal<EmbedSnippetValues>({
        width: 640,
        height: 480,
        theme: 'light',
      })
      return (
        <EmbedSnippet
          template={TEMPLATE}
          controls={{ width: true, height: true, theme: true }}
          values={values()}
          onChange={setValues}
        />
      )
    }
    const container = mount(() => <Controlled />)
    const widthInput = container.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    widthInput.value = '900'
    widthInput.dispatchEvent(new Event('input', { bubbles: true }))
    const code = container.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toContain('width="900"')
  })

  it('uses caller-supplied theme options when provided', () => {
    const container = renderSnippet({
      template: TEMPLATE,
      controls: {
        theme: [
          { value: 'sunrise', label: 'Sunrise' },
          { value: 'midnight', label: 'Midnight' },
        ],
      },
      values: { theme: 'sunrise' },
      onChange: () => {},
    })
    const select = container.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    const optionLabels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(optionLabels).toEqual(['Sunrise', 'Midnight'])
  })

  it('calls copyTextWithFallback with the rendered snippet on copy', async () => {
    vi.mocked(copyTextWithFallback).mockClear()
    const onCopy = vi.fn()
    const container = renderSnippet({
      template: TEMPLATE,
      values: { width: 640, height: 480, theme: 'dark' },
      onCopy,
    })
    const button = container.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(copyTextWithFallback).toHaveBeenCalledTimes(1)
    expect(vi.mocked(copyTextWithFallback).mock.calls[0]![0]).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(onCopy.mock.calls[0]![0]).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
    expect(button.textContent).toBe('Copied!')
  })

  it('shows no copied feedback when copyTextWithFallback resolves false', async () => {
    const copyMock = vi.mocked(copyTextWithFallback)
    copyMock.mockClear()
    copyMock.mockResolvedValueOnce(false)
    const onCopy = vi.fn()
    const container = renderSnippet({
      template: TEMPLATE,
      values: { width: 640, height: 480, theme: 'dark' },
      onCopy,
    })
    const button = container.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(copyTextWithFallback).toHaveBeenCalledTimes(1)
    expect(onCopy).not.toHaveBeenCalled()
    expect(button.textContent).toBe('Copy')
  })

  it('honours a custom mol-id prefix', () => {
    const container = renderSnippet({ template: TEMPLATE, molId: 'my-embed' })
    expect(container.querySelector('[data-mol-id="my-embed"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="my-embed-code"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="my-embed-copy-button"]')).not.toBeNull()
  })

  it('appends className to the panel root', () => {
    const container = renderSnippet({ template: TEMPLATE, className: 'my-extra-class' })
    const panel = container.querySelector('[data-mol-id="embed-snippet"]') as HTMLElement
    expect(panel.className).toContain('my-extra-class')
  })
})
