// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/EmbedSnippet.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount in jsdom
 * against the bonded ClassMap and i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type Component, type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import EmbedSnippet from '../EmbedSnippet.svelte'
import Controlled from './fixtures/ControlledSnippet.svelte'

vi.mock('@molecule/app-clipboard', () => ({ copyTextWithFallback: vi.fn(async () => true) }))

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts a component and returns the element it rendered into.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The host element the component rendered into.
 */
function mountComponent<Props extends object>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

/**
 * Mounts `<EmbedSnippet>` with the given props.
 *
 * @param props - The component's props.
 * @returns The host element the component rendered into.
 */
function renderSnippet(props: ComponentProps<typeof EmbedSnippet>): HTMLElement {
  return mountComponent(EmbedSnippet, props)
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet>', () => {
  it('renders a region with mol-id, language attribute, and aria-label', () => {
    const host = renderSnippet({ template: TEMPLATE, language: 'iframe' })
    const panel = host.querySelector('[data-mol-id="embed-snippet"]')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-mol-language')).toBe('iframe')
    expect(panel?.getAttribute('aria-label')).toBe('Embed code (iframe)')
  })

  it('substitutes placeholders into the rendered <pre>', () => {
    const host = renderSnippet({
      template: TEMPLATE,
      values: { width: 640, height: '480px', theme: 'dark' },
    })
    const code = host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
  })

  it('substitutes empty strings when values are absent', () => {
    const host = renderSnippet({ template: TEMPLATE })
    const code = host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('renders a heading and eyebrow with translated defaults', () => {
    const host = renderSnippet({ template: TEMPLATE })
    expect(host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Copy embed code',
    )
  })

  it('respects heading + eyebrow overrides', () => {
    const host = renderSnippet({
      template: TEMPLATE,
      heading: '3D Model',
      eyebrow: 'Share this view',
    })
    expect(host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '3D Model',
    )
    expect(host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Share this view',
    )
  })

  it('does not render controls row when controls prop is omitted', () => {
    const host = renderSnippet({ template: TEMPLATE })
    expect(host.querySelector('[data-mol-id="embed-snippet-controls"]')).toBeNull()
  })

  it('renders width/height/theme controls when configured', () => {
    const host = renderSnippet({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: () => {},
    })
    expect(host.querySelector('[data-mol-id="embed-snippet-controls"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embed-snippet-input-height"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embed-snippet-input-theme"]')).not.toBeNull()
  })

  it('only renders the controls that are enabled', () => {
    const host = renderSnippet({
      template: TEMPLATE,
      controls: { width: true },
      values: { width: 640 },
      onChange: () => {},
    })
    expect(host.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embed-snippet-input-height"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="embed-snippet-input-theme"]')).toBeNull()
  })

  it('fires onChange when the width input is edited', () => {
    const onChange = vi.fn()
    const host = renderSnippet({
      template: TEMPLATE,
      controls: { width: true },
      values: { width: 640, height: 480, theme: 'dark' },
      onChange,
    })
    const input = host.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    input.value = '800'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ width: '800', height: 480, theme: 'dark' })
  })

  it('fires onChange when the theme select is changed', () => {
    const onChange = vi.fn()
    const host = renderSnippet({
      template: TEMPLATE,
      controls: { theme: true },
      values: { theme: 'light' },
      onChange,
    })
    const select = host.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    select.value = 'dark'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('lets a controlled wrapper update the rendered snippet on change', () => {
    const host = mountComponent(Controlled, {})
    const widthInput = host.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    widthInput.value = '900'
    widthInput.dispatchEvent(new Event('input', { bubbles: true }))
    flushSync()
    const code = host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toContain('width="900"')
  })

  it('uses caller-supplied theme options when provided', () => {
    const host = renderSnippet({
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
    const select = host.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    const optionLabels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(optionLabels).toEqual(['Sunrise', 'Midnight'])
  })

  it('calls copyTextWithFallback with the rendered snippet on copy', async () => {
    vi.mocked(copyTextWithFallback).mockClear()
    const onCopy = vi.fn()
    const host = renderSnippet({
      template: TEMPLATE,
      values: { width: 640, height: 480, theme: 'dark' },
      onCopy,
    })
    const button = host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    flushSync()
    expect(copyTextWithFallback).toHaveBeenCalledTimes(1)
    expect(vi.mocked(copyTextWithFallback).mock.calls[0]![0]).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(onCopy.mock.calls[0]![0]).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
    expect(button.textContent?.trim()).toBe('Copied!')
  })

  it('shows no copied feedback when copyTextWithFallback resolves false', async () => {
    const copyMock = vi.mocked(copyTextWithFallback)
    copyMock.mockClear()
    copyMock.mockResolvedValueOnce(false)
    const onCopy = vi.fn()
    const host = renderSnippet({
      template: TEMPLATE,
      values: { width: 640, height: 480, theme: 'dark' },
      onCopy,
    })
    const button = host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    flushSync()
    expect(copyTextWithFallback).toHaveBeenCalledTimes(1)
    expect(onCopy).not.toHaveBeenCalled()
    expect(button.textContent?.trim()).toBe('Copy')
  })

  it('honours a custom mol-id prefix', () => {
    const host = renderSnippet({ template: TEMPLATE, molId: 'my-embed' })
    expect(host.querySelector('[data-mol-id="my-embed"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="my-embed-code"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="my-embed-copy-button"]')).not.toBeNull()
  })

  it('appends className to the panel root', () => {
    const host = renderSnippet({ template: TEMPLATE, className: 'my-extra-class' })
    const panel = host.querySelector('[data-mol-id="embed-snippet"]') as HTMLElement
    expect(panel.className).toContain('my-extra-class')
  })
})
