// @vitest-environment jsdom
/**
 * Unit tests for the Solid `PageHeader` and `HeroSection` — a port of
 * `@molecule/app-page-chrome-react/src/__tests__/page-chrome.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

const { HeroSection } = await import('../HeroSection.jsx')
const { PageHeader } = await import('../PageHeader.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mount with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('HeroSection', () => {
  it('renders the title inside an <h1>', () => {
    const container = mount(() => <HeroSection title="Welcome" />)
    expect(container.innerHTML).toContain('<h1')
    expect(container.innerHTML).toContain('Welcome')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(mount(() => <HeroSection title="T" eyebrow="NEW" />).innerHTML).toContain('NEW')
    expect(mount(() => <HeroSection title="T" />).innerHTML).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(mount(() => <HeroSection title="T" description="desc-x" />).innerHTML).toContain(
      'desc-x',
    )
    expect(mount(() => <HeroSection title="T" />).innerHTML).not.toContain('<p')
  })

  it('renders the primary and secondary action slots', () => {
    const container = mount(() => (
      <HeroSection
        title="T"
        primaryAction={<button data-primary="" />}
        secondaryAction={<button data-secondary="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-primary=""')
    expect(container.innerHTML).toContain('data-secondary=""')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = mount(() => <HeroSection title="T" media={<img data-media="" />} />)
    expect(withMedia.innerHTML).toContain('data-media=""')
    expect(mount(() => <HeroSection title="T" />).innerHTML).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => <HeroSection title="T" dataMolId="hero-x" className="hero-cls" />)
    expect(container.innerHTML).toContain('data-mol-id="hero-x"')
    expect(container.innerHTML).toContain('hero-cls')
  })
})

describe('PageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const container = mount(() => <PageHeader title="Dashboard" />)
    expect(container.innerHTML).toContain('<h1')
    expect(container.innerHTML).toContain('Dashboard')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(mount(() => <PageHeader title="T" subtitle="sub-x" />).innerHTML).toContain('sub-x')
    expect(mount(() => <PageHeader title="T" />).innerHTML).not.toContain('<p')
  })

  it('renders the icon, breadcrumbs, actions, and meta slots', () => {
    const container = mount(() => (
      <PageHeader
        title="T"
        icon={<i data-icon="" />}
        breadcrumbs={<nav data-crumbs="" />}
        actions={<button data-actions="" />}
        meta={<span data-meta="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-icon=""')
    expect(container.innerHTML).toContain('data-crumbs=""')
    expect(container.innerHTML).toContain('data-actions=""')
    expect(container.innerHTML).toContain('data-meta=""')
  })

  it('omits the meta row when meta is absent', () => {
    const container = mount(() => <PageHeader title="T" />)
    expect(container.innerHTML).not.toContain('data-meta')
  })

  it('emphasis="extrabold" emits the 4xl extrabold weight via cm.fontWeight', () => {
    const extrabold = mount(() => <PageHeader title="T" emphasis="extrabold" />).innerHTML
    expect(extrabold).toContain('text-4xl')
    expect(extrabold).toContain('font-extrabold')
    expect(extrabold).not.toContain('tracking-tight')
  })

  it('emphasis="normal" (default) emits the 3xl bold weight, never font-extrabold', () => {
    const normal = mount(() => <PageHeader title="T" />).innerHTML
    expect(normal).toContain('text-3xl')
    expect(normal).toContain('font-bold')
    expect(normal).not.toContain('font-extrabold')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => <PageHeader title="T" dataMolId="ph-x" className="ph-cls" />)
    expect(container.innerHTML).toContain('data-mol-id="ph-x"')
    expect(container.innerHTML).toContain('ph-cls')
  })
})
