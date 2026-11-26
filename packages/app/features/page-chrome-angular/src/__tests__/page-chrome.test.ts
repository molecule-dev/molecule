// @vitest-environment jsdom
/**
 * Unit tests of `PageHeader` and `HeroSection` — the port of
 * `@molecule/app-page-chrome-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token, with the
// real `@molecule/app-ui-tailwind` resolvers for `fontWeight` / `textSize`
// (so the emphasis assertions can only pass when the weight is derived from
// the argument) — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { HeroSection } = await import('../hero-section.component.js')
const { PageHeader } = await import('../page-header.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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
  appRef.tick()
  return {
    host,
    setProps: (next) => {
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

/** The component element's serialized start tag (class attribute included). */
const openTag = (host: HTMLElement, selector: string): string => {
  const el = host.querySelector(selector)
  if (!el) throw new Error(`no ${selector} rendered`)
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<${el.tagName.toLowerCase()} ${attrs}>`.replace(' ="', '="')
}

const mounted: Mounted[] = []

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    template,
    (template.includes('mol-hero-section') ? HeroSection : PageHeader) as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('HeroSection', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of media', async () => {
    const m = await render(
      `<section mol-hero-section><span slot="title">Title</span>@for (x of p['xs']; track x) {<b slot="media">{{ x }}</b>}</section>`,
      { xs: [1, 3] },
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders the title inside an <h1>', async () => {
    const m = await render(`<section mol-hero-section><span slot="title">Welcome</span></section>`)
    expect(m.host.innerHTML).toContain('<h1')
    expect(m.host.innerHTML).toContain('Welcome')
  })

  it('renders the eyebrow when present and omits it otherwise', async () => {
    const present = await render(
      `<section mol-hero-section><span slot="title">T</span><span slot="eyebrow">NEW</span></section>`,
    )
    expect(present.host.innerHTML).toContain('NEW')
    const absent = await render(`<section mol-hero-section><span slot="title">T</span></section>`)
    expect(absent.host.innerHTML).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', async () => {
    const present = await render(
      `<section mol-hero-section><span slot="title">T</span><span slot="description">desc-x</span></section>`,
    )
    expect(present.host.innerHTML).toContain('desc-x')
    const absent = await render(`<section mol-hero-section><span slot="title">T</span></section>`)
    expect(absent.host.innerHTML).not.toContain('<p')
  })

  it('renders the primary and secondary action slots', async () => {
    const m = await render(
      `<section mol-hero-section><span slot="title">T</span><button slot="primaryAction" data-primary></button><button slot="secondaryAction" data-secondary></button></section>`,
    )
    expect(m.host.innerHTML).toContain('data-primary')
    expect(m.host.innerHTML).toContain('data-secondary')
  })

  it('renders the media slot when present and omits it otherwise', async () => {
    const present = await render(
      `<section mol-hero-section><span slot="title">T</span><img slot="media" data-media alt=""></section>`,
    )
    expect(present.host.innerHTML).toContain('data-media')
    const absent = await render(`<section mol-hero-section><span slot="title">T</span></section>`)
    expect(absent.host.innerHTML).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render(
      `<section mol-hero-section [className]="p['className']" [dataMolId]="p['dataMolId']"><span slot="title">T</span></section>`,
      { dataMolId: 'hero-x', className: 'hero-cls' },
    )
    const tag = openTag(m.host, '[mol-hero-section]')
    expect(tag).toContain('data-mol-id="hero-x"')
    expect(tag).toContain('hero-cls')
  })
  it('shows and removes the media wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<section mol-hero-section><span slot="title">T</span>@if (p['on']) {<img slot="media" data-media alt="">}</section>`,
      { on: false },
    )
    // React renders the media column only while media exists.
    expect(m.host.querySelector('[data-media]')).toBeNull()
    expect(m.host.querySelectorAll('[mol-hero-section] > div')).toHaveLength(1)
    m.setProps({ on: true })
    const media = m.host.querySelector('[data-media]')
    expect(media?.parentElement?.tagName).toBe('DIV')
    expect(m.host.querySelectorAll('[mol-hero-section] > div')).toHaveLength(2)
    m.setProps({ on: false })
    expect(m.host.querySelector('[data-media]')).toBeNull()
    expect(m.host.querySelectorAll('[mol-hero-section] > div')).toHaveLength(1)
  })
})

describe('PageHeader', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of subtitle', async () => {
    const m = await render(
      `<header mol-page-header><span slot="title">Title</span>@for (x of p['xs']; track x) {<b slot="subtitle">{{ x }}</b>}</header>`,
      { xs: [1, 3] },
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('p b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders the title inside an <h1>', async () => {
    const m = await render(`<header mol-page-header><span slot="title">Dashboard</span></header>`)
    expect(m.host.innerHTML).toContain('<h1')
    expect(m.host.innerHTML).toContain('Dashboard')
  })

  it('renders the subtitle when present and omits it otherwise', async () => {
    const present = await render(
      `<header mol-page-header><span slot="title">T</span><span slot="subtitle">sub-x</span></header>`,
    )
    expect(present.host.innerHTML).toContain('sub-x')
    const absent = await render(`<header mol-page-header><span slot="title">T</span></header>`)
    expect(absent.host.innerHTML).not.toContain('<p')
  })

  it('renders the icon, breadcrumbs, actions, and meta slots', async () => {
    const m = await render(
      `<header mol-page-header><span slot="title">T</span><i slot="icon" data-icon></i><nav slot="breadcrumbs" data-crumbs></nav><button slot="actions" data-actions></button><span slot="meta" data-meta></span></header>`,
    )
    expect(m.host.innerHTML).toContain('data-icon')
    expect(m.host.innerHTML).toContain('data-crumbs')
    expect(m.host.innerHTML).toContain('data-actions')
    expect(m.host.innerHTML).toContain('data-meta')
  })

  it('omits the meta row when meta is absent', async () => {
    const m = await render(`<header mol-page-header><span slot="title">T</span></header>`)
    expect(m.host.innerHTML).not.toContain('data-meta')
  })

  it('emphasis="extrabold" emits the 4xl extrabold weight via cm.fontWeight', async () => {
    const m = await render(
      `<header mol-page-header [emphasis]="p['emphasis']"><span slot="title">T</span></header>`,
      { emphasis: 'extrabold' },
    )
    expect(m.host.innerHTML).toContain('text-4xl')
    expect(m.host.innerHTML).toContain('font-extrabold')
    expect(m.host.innerHTML).not.toContain('tracking-tight')
  })

  it('emphasis="normal" (default) emits the 3xl bold weight, never font-extrabold', async () => {
    const m = await render(`<header mol-page-header><span slot="title">T</span></header>`)
    expect(m.host.innerHTML).toContain('text-3xl')
    expect(m.host.innerHTML).toContain('font-bold')
    expect(m.host.innerHTML).not.toContain('font-extrabold')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render(
      `<header mol-page-header [className]="p['className']" [dataMolId]="p['dataMolId']"><span slot="title">T</span></header>`,
      { dataMolId: 'ph-x', className: 'ph-cls' },
    )
    const tag = openTag(m.host, '[mol-page-header]')
    expect(tag).toContain('data-mol-id="ph-x"')
    expect(tag).toContain('ph-cls')
  })

  it('shows and removes the subtitle wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<header mol-page-header><span slot="title">T</span>@if (p['on']) {<span slot="subtitle" data-sub>s</span>}</header>`,
      { on: false },
    )
    // React renders the subtitle paragraph only while a subtitle exists.
    expect(m.host.querySelector('p')).toBeNull()
    m.setProps({ on: true })
    const paragraph = m.host.querySelector('p')
    expect(paragraph).not.toBeNull()
    expect(paragraph!.querySelector('[data-sub]')).not.toBeNull()
    m.setProps({ on: false })
    expect(m.host.querySelector('p')).toBeNull()
    expect(m.host.querySelector('[data-sub]')).toBeNull()
  })
})
