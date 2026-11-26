// @vitest-environment jsdom
/**
 * Unit tests of `EmbedSnippet` — the port of
 * `@molecule/app-embed-snippet-react`'s own suite. The React suite renders the
 * component with the bonded ClassMap and i18n provider and asserts the markup;
 * this port mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserts the same markup strings.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'

import { EmbedSnippet } from '../embed-snippet.component.js'
import type { EmbedSnippetValues } from '../types.js'

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [EmbedSnippet],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<section
      mol-embed-snippet
      [template]="p['template']"
      [controls]="p['controls']"
      [values]="p['values']"
      [language]="p['language']"
      [heading]="p['heading']"
      [eyebrow]="p['eyebrow']"
      [feedbackMs]="p['feedbackMs']"
      [molId]="p['molId']"
      [className]="p['className']"
      [onChange]="p['onChange']"
      [onCopy]="p['onCopy']"
    ></section>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts `EmbedSnippet` with the given props.
 *
 * @param props - The component's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<EmbedSnippet>', () => {
  it('renders a region with mol-id, language attribute, and aria-label', async () => {
    const m = await render({ template: TEMPLATE, language: 'iframe' })
    const panel = m.host.querySelector('[data-mol-id="embed-snippet"]')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-mol-language')).toBe('iframe')
    expect(panel?.getAttribute('aria-label')).toBe('Embed code (iframe)')
  })

  it('substitutes placeholders into the rendered <pre>', async () => {
    const m = await render({
      template: TEMPLATE,
      values: { width: 640, height: '480px', theme: 'dark' },
    })
    const code = m.host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="640px" height="480px" data-theme="dark" />',
    )
  })

  it('substitutes empty strings when values are absent', async () => {
    const m = await render({ template: TEMPLATE })
    const code = m.host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('renders a heading and eyebrow with translated defaults', async () => {
    const m = await render({ template: TEMPLATE })
    expect(m.host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      'Embed code',
    )
    expect(m.host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Copy embed code',
    )
  })

  it('respects heading + eyebrow overrides', async () => {
    const m = await render({
      template: TEMPLATE,
      heading: '3D Model',
      eyebrow: 'Share this view',
    })
    expect(m.host.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '3D Model',
    )
    expect(m.host.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      'Share this view',
    )
  })

  it('does not render controls row when controls prop is omitted', async () => {
    const m = await render({ template: TEMPLATE })
    expect(m.host.querySelector('[data-mol-id="embed-snippet-controls"]')).toBeNull()
  })

  it('renders width/height/theme controls when configured', async () => {
    const m = await render({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: () => {},
    })
    expect(m.host.querySelector('[data-mol-id="embed-snippet-controls"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="embed-snippet-input-height"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="embed-snippet-input-theme"]')).not.toBeNull()
  })

  it('only renders the controls that are enabled', async () => {
    const m = await render({
      template: TEMPLATE,
      controls: { width: true },
      values: { width: 640 },
      onChange: () => {},
    })
    expect(m.host.querySelector('[data-mol-id="embed-snippet-input-width"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="embed-snippet-input-height"]')).toBeNull()
    expect(m.host.querySelector('[data-mol-id="embed-snippet-input-theme"]')).toBeNull()
  })

  it('fires onChange when the width input is edited', async () => {
    const onChange = vi.fn()
    const m = await render({
      template: TEMPLATE,
      controls: { width: true },
      values: { width: 640, height: 480, theme: 'dark' },
      onChange,
    })
    const input = m.host.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    input.value = '800'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ width: '800', height: 480, theme: 'dark' })
  })

  it('fires onChange when the theme select is changed', async () => {
    const onChange = vi.fn()
    const m = await render({
      template: TEMPLATE,
      controls: { theme: true },
      values: { theme: 'light' },
      onChange,
    })
    const select = m.host.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    select.value = 'dark'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('lets a controlled wrapper update the rendered snippet on change', async () => {
    const holder: { mount?: Mounted } = {}
    const m = await render({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: (next: EmbedSnippetValues) => {
        void holder.mount?.setProps({ values: next })
      },
    })
    holder.mount = m
    const widthInput = m.host.querySelector(
      '[data-mol-id="embed-snippet-input-width"]',
    ) as HTMLInputElement
    widthInput.value = '900'
    widthInput.dispatchEvent(new Event('input', { bubbles: true }))
    const code = m.host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(code?.textContent).toContain('width="900"')
  })

  it('uses caller-supplied theme options when provided', async () => {
    const m = await render({
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
    const select = m.host.querySelector(
      '[data-mol-id="embed-snippet-input-theme"]',
    ) as HTMLSelectElement
    const optionLabels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(optionLabels).toEqual(['Sunrise', 'Midnight'])
  })

  it('calls copyTextWithFallback with the rendered snippet on copy', async () => {
    vi.mocked(copyTextWithFallback).mockClear()
    const onCopy = vi.fn()
    const m = await render({
      template: TEMPLATE,
      values: { width: 640, height: 480, theme: 'dark' },
      onCopy,
    })
    const button = m.host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await m.setProps({})
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
    const m = await render({
      template: TEMPLATE,
      values: { width: 640, height: 480, theme: 'dark' },
      onCopy,
    })
    const button = m.host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await m.setProps({})
    expect(copyTextWithFallback).toHaveBeenCalledTimes(1)
    expect(onCopy).not.toHaveBeenCalled()
    expect(button.textContent?.trim()).toBe('Copy')
  })

  it('honours a custom mol-id prefix', async () => {
    const m = await render({ template: TEMPLATE, molId: 'my-embed' })
    expect(m.host.querySelector('[data-mol-id="my-embed"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="my-embed-code"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="my-embed-copy-button"]')).not.toBeNull()
  })

  it('appends className to the panel root', async () => {
    const m = await render({ template: TEMPLATE, className: 'my-extra-class' })
    const panel = m.host.querySelector('[data-mol-id="embed-snippet"]') as HTMLElement
    expect(panel.className).toContain('my-extra-class')
  })
})
