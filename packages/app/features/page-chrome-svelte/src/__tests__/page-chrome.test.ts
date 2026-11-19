// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `PageHeader` and `HeroSection` — a port of
 * `@molecule/app-page-chrome-react/src/__tests__/page-chrome.test.tsx`: the
 * same behavioral assertions, rendered with Svelte in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

const { default: HeroSection } = await import('../HeroSection.svelte')
const { default: PageHeader } = await import('../PageHeader.svelte')

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Mounts one component into jsdom and returns its markup and teardown. */
const render = <Props extends object>(
  component: Component<Props>,
  props: NoInfer<Props>,
): { markup: string; done: () => Promise<void> } => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component, { target, props })
  flushSync()
  return {
    markup: target.innerHTML,
    done: async () => {
      await unmount(instance)
      target.remove()
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('HeroSection', () => {
  it('renders the title inside an <h1>', async () => {
    const view = render(HeroSection, { title: 'Welcome' })
    expect(view.markup).toContain('<h1')
    expect(view.markup).toContain('Welcome')
    await view.done()
  })

  it('renders the eyebrow when present and omits it otherwise', async () => {
    const present = render(HeroSection, { title: 'T', eyebrow: 'NEW' })
    expect(present.markup).toContain('NEW')
    await present.done()
    const absent = render(HeroSection, { title: 'T' })
    expect(absent.markup).not.toContain('NEW')
    await absent.done()
  })

  it('renders the description when present and omits it otherwise', async () => {
    const present = render(HeroSection, { title: 'T', description: 'desc-x' })
    expect(present.markup).toContain('desc-x')
    await present.done()
    const absent = render(HeroSection, { title: 'T' })
    expect(absent.markup).not.toContain('<p')
    await absent.done()
  })

  it('renders the primary and secondary action slots', async () => {
    const view = render(HeroSection, {
      title: 'T',
      primaryAction: raw('<button data-primary></button>'),
      secondaryAction: raw('<button data-secondary></button>'),
    })
    expect(view.markup).toContain('data-primary=""')
    expect(view.markup).toContain('data-secondary=""')
    await view.done()
  })

  it('renders the media slot when present and omits it otherwise', async () => {
    const present = render(HeroSection, { title: 'T', media: raw('<img data-media>') })
    expect(present.markup).toContain('data-media=""')
    await present.done()
    const absent = render(HeroSection, { title: 'T' })
    expect(absent.markup).not.toContain('data-media')
    await absent.done()
  })

  it('sets data-mol-id and forwards className', async () => {
    const view = render(HeroSection, { title: 'T', dataMolId: 'hero-x', className: 'hero-cls' })
    expect(view.markup).toContain('data-mol-id="hero-x"')
    expect(view.markup).toContain('hero-cls')
    await view.done()
  })
})

describe('PageHeader', () => {
  it('renders the title inside an <h1>', async () => {
    const view = render(PageHeader, { title: 'Dashboard' })
    expect(view.markup).toContain('<h1')
    expect(view.markup).toContain('Dashboard')
    await view.done()
  })

  it('renders the subtitle when present and omits it otherwise', async () => {
    const present = render(PageHeader, { title: 'T', subtitle: 'sub-x' })
    expect(present.markup).toContain('sub-x')
    await present.done()
    const absent = render(PageHeader, { title: 'T' })
    expect(absent.markup).not.toContain('<p')
    await absent.done()
  })

  it('renders the icon, breadcrumbs, actions, and meta slots', async () => {
    const view = render(PageHeader, {
      title: 'T',
      icon: raw('<i data-icon></i>'),
      breadcrumbs: raw('<nav data-crumbs></nav>'),
      actions: raw('<button data-actions></button>'),
      meta: raw('<span data-meta></span>'),
    })
    expect(view.markup).toContain('data-icon=""')
    expect(view.markup).toContain('data-crumbs=""')
    expect(view.markup).toContain('data-actions=""')
    expect(view.markup).toContain('data-meta=""')
    await view.done()
  })

  it('omits the meta row when meta is absent', async () => {
    const view = render(PageHeader, { title: 'T' })
    expect(view.markup).not.toContain('data-meta')
    await view.done()
  })

  it('emphasis="extrabold" emits the 4xl extrabold weight via cm.fontWeight', async () => {
    const view = render(PageHeader, { title: 'T', emphasis: 'extrabold' })
    expect(view.markup).toContain('text-4xl')
    expect(view.markup).toContain('font-extrabold')
    expect(view.markup).not.toContain('tracking-tight')
    await view.done()
  })

  it('emphasis="normal" (default) emits the 3xl bold weight, never font-extrabold', async () => {
    const view = render(PageHeader, { title: 'T' })
    expect(view.markup).toContain('text-3xl')
    expect(view.markup).toContain('font-bold')
    expect(view.markup).not.toContain('font-extrabold')
    await view.done()
  })

  it('sets data-mol-id and forwards className', async () => {
    const view = render(PageHeader, { title: 'T', dataMolId: 'ph-x', className: 'ph-cls' })
    expect(view.markup).toContain('data-mol-id="ph-x"')
    expect(view.markup).toContain('ph-cls')
    await view.done()
  })
})
