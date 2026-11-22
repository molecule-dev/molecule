// @vitest-environment jsdom
/**
 * i18n tests for the Vue `EmbedSnippet` — a port of
 * `@molecule/app-embed-snippet-react/src/__tests__/embed-snippet-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. A `t` that
 * marks every key proves the component's own text goes through i18n, an
 * explicit `heading` / `eyebrow` prop still overrides it, and the generated
 * embed code — code, not prose — carries HTML's `translate="no"`.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { EmbedSnippetProps } from '../types.js'

// The clipboard core, mocked so a copy succeeds without a browser clipboard.
vi.mock('@molecule/app-clipboard', () => ({ copyTextWithFallback: vi.fn(async () => true) }))

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React tests use.
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The button marker, carrying the id and the click the component binds.
vi.mock('@molecule/app-ui-vue', () => ({
  Button: defineComponent({
    name: 'MockButton',
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => h('button', { type: 'button', ...attrs }, slots.default?.())
    },
  }),
}))

const { EmbedSnippet } = await import('../EmbedSnippet.js')

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

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('EmbedSnippet i18n', () => {
  it('marks the generated embed code as never translatable', () => {
    const host = render({ template: TEMPLATE })
    const pre = host.querySelector('[data-mol-id="embed-snippet-code"]')
    expect(pre?.getAttribute('translate')).toBe('no')
    // The code is the caller's template, not the component's prose: it does not
    // go through t(), so it stays exactly as substituted.
    expect(pre?.textContent).toBe(
      '<iframe src="https://example.com/embed" width="" height="" data-theme="" />',
    )
  })

  it('takes the copy button label through i18n', async () => {
    const host = render({ template: TEMPLATE })
    const button = host.querySelector(
      '[data-mol-id="embed-snippet-copy-button"]',
    ) as HTMLButtonElement
    expect(button.textContent).toBe('«embedSnippet.copy»')
    button.click()
    // The "Copied!" swap happens in the clipboard promise's continuation; Vue
    // flushes the re-render on the microtask queue.
    await nextTick()
    await nextTick()
    expect(button.textContent).toBe('«embedSnippet.copied»')
  })

  it('takes the heading and eyebrow through i18n, and the props still override', () => {
    const marked = render({ template: TEMPLATE })
    expect(marked.querySelector('[data-mol-id="embed-snippet-heading"]')?.textContent).toBe(
      '«embedSnippet.heading»',
    )
    expect(marked.querySelector('[data-mol-id="embed-snippet-eyebrow"]')?.textContent).toBe(
      '«embedSnippet.eyebrow»',
    )

    const overridden = render({
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
    const host = render({
      template: TEMPLATE,
      controls: { width: true, height: true, theme: true },
      values: { width: 640, height: 480, theme: 'light' },
      onChange: () => {},
    })
    expect(
      host.querySelector('[data-mol-id="embed-snippet-control-width"]')?.textContent,
    ).toContain('«embedSnippet.controls.width»')
    expect(
      host.querySelector('[data-mol-id="embed-snippet-control-height"]')?.textContent,
    ).toContain('«embedSnippet.controls.height»')
    expect(
      host.querySelector('[data-mol-id="embed-snippet-control-theme"]')?.textContent,
    ).toContain('«embedSnippet.controls.theme»')
    expect(
      host.querySelector('[data-mol-id="embed-snippet-input-width"]')?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.controls.width»')
    expect(
      host.querySelector('[data-mol-id="embed-snippet-input-theme"]')?.getAttribute('aria-label'),
    ).toBe('«embedSnippet.controls.theme»')
    expect(host.querySelector('[data-mol-id="embed-snippet"]')?.getAttribute('aria-label')).toBe(
      '«embedSnippet.aria.region»',
    )
  })
})
