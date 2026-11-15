// @vitest-environment jsdom
/**
 * Unit tests for the Vue `PageHeader` and `HeroSection` — a port of
 * `@molecule/app-page-chrome-react/src/__tests__/page-chrome.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, with the
// real `@molecule/app-ui-tailwind` resolvers for `fontWeight` / `textSize`
// (so the emphasis assertions can only pass when the weight is derived from
// the argument) — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (prop === 'fontWeight') {
          return (w: string) => `font-${w}`
        }
        if (prop === 'textSize') {
          return (s: string) => `text-${s}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { HeroSection } from '../HeroSection.js'
import { PageHeader } from '../PageHeader.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders one component with the given props and returns the markup it produced. */
const render = (
  component: typeof PageHeader | typeof HeroSection,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('HeroSection', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render(HeroSection, { title: 'Welcome' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Welcome')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(render(HeroSection, { title: 'T', eyebrow: 'NEW' })).toContain('NEW')
    expect(render(HeroSection, { title: 'T' })).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(render(HeroSection, { title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(render(HeroSection, { title: 'T' })).not.toContain('<p')
  })

  it('renders the primary and secondary action slots', () => {
    const markup = render(HeroSection, {
      title: 'T',
      primaryAction: h('button', { 'data-primary': '' }),
      secondaryAction: h('button', { 'data-secondary': '' }),
    })
    expect(markup).toContain('data-primary=""')
    expect(markup).toContain('data-secondary=""')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = render(HeroSection, { title: 'T', media: h('img', { 'data-media': '' }) })
    expect(withMedia).toContain('data-media=""')
    expect(render(HeroSection, { title: 'T' })).not.toContain('data-media')
  })

  it('renders node props passed as same-named slots', () => {
    const markup = render(
      HeroSection,
      {},
      {
        title: () => ['Slot title'],
        media: () => [h('img', { 'data-media': '' })],
      },
    )
    expect(markup).toContain('Slot title')
    expect(markup).toContain('data-media=""')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render(HeroSection, { title: 'T', dataMolId: 'hero-x', className: 'hero-cls' })
    expect(markup).toContain('data-mol-id="hero-x"')
    expect(markup).toContain('hero-cls')
  })
})

describe('PageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render(PageHeader, { title: 'Dashboard' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Dashboard')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(render(PageHeader, { title: 'T', subtitle: 'sub-x' })).toContain('sub-x')
    expect(render(PageHeader, { title: 'T' })).not.toContain('<p')
  })

  it('renders the icon, breadcrumbs, actions, and meta slots', () => {
    const markup = render(PageHeader, {
      title: 'T',
      icon: h('i', { 'data-icon': '' }),
      breadcrumbs: h('nav', { 'data-crumbs': '' }),
      actions: h('button', { 'data-actions': '' }),
      meta: h('span', { 'data-meta': '' }),
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-crumbs=""')
    expect(markup).toContain('data-actions=""')
    expect(markup).toContain('data-meta=""')
  })

  it('omits the meta row when meta is absent', () => {
    const markup = render(PageHeader, { title: 'T' })
    expect(markup).not.toContain('data-meta')
  })

  it('emphasis="extrabold" emits the 4xl extrabold weight via cm.fontWeight', () => {
    const extrabold = render(PageHeader, { title: 'T', emphasis: 'extrabold' })
    expect(extrabold).toContain('text-4xl')
    expect(extrabold).toContain('font-extrabold')
    expect(extrabold).not.toContain('tracking-tight')
  })

  it('emphasis="normal" (default) emits the 3xl bold weight, never font-extrabold', () => {
    const normal = render(PageHeader, { title: 'T' })
    expect(normal).toContain('text-3xl')
    expect(normal).toContain('font-bold')
    expect(normal).not.toContain('font-extrabold')
  })

  it('renders node props passed as same-named slots', () => {
    const markup = render(
      PageHeader,
      {},
      {
        title: () => ['Slot title'],
        actions: () => [h('button', { 'data-actions': '' })],
      },
    )
    expect(markup).toContain('Slot title')
    expect(markup).toContain('data-actions=""')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render(PageHeader, { title: 'T', dataMolId: 'ph-x', className: 'ph-cls' })
    expect(markup).toContain('data-mol-id="ph-x"')
    expect(markup).toContain('ph-cls')
  })
})
