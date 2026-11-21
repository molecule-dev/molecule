// @vitest-environment jsdom
/**
 * Unit tests of the Angular `SlideThumbnail` — the port of
 * `@molecule/app-slide-thumbnail-react`'s own suite. The React suite renders
 * the component and asserts the markup; this port mounts the same mocked tree
 * through Angular's real renderer (the same `createApplication` + JIT host
 * approach the conformance kit's Angular adapter uses) and asserts the same
 * markup strings.
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

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { SlideThumbnail } = await import('../slide-thumbnail.component.js')

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
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
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

/**
 * The host template every case renders: the tile with its four scalar props
 * bound, and whatever projected content the test writes inside it.
 *
 * @param children - The projected preview markup.
 * @returns The host template.
 */
const tile = (children = ''): string =>
  `<button mol-slide-thumbnail [index]="p['index']" [active]="p['active']" [aspect]="p['aspect']" [width]="p['width']" [className]="p['className']">${children}</button>`

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}, children = ''): Promise<Mounted> => {
  const m = await mount(tile(children), SlideThumbnail as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('SlideThumbnail', () => {
  it('renders a button labelled with the slide index', async () => {
    const markup = (await render({ index: 4 })).host.innerHTML
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('aria-label="Slide 4"')
    expect(markup).toContain('>4<')
  })

  it('renders the live-preview children', async () => {
    const markup = (await render({ index: 1 }, '<div data-preview></div>')).host.innerHTML
    expect(markup).toContain('data-preview=""')
  })

  it('applies an active outline + aria-current only when active', async () => {
    const active = (await render({ index: 1, active: true })).host.innerHTML
    expect(active).toContain('aria-current="true"')
    expect(inlineStyleMismatch(active, { outline: '2px solid currentColor' })).toBeNull()
    const inactive = (await render({ index: 1 })).host.innerHTML
    expect(inactive).not.toContain('aria-current="true"')
  })

  it('locks the aspect ratio via inline style (default 16/9)', async () => {
    expect((await render({ index: 1 })).host.innerHTML).toContain('aspect-ratio: 16 / 9')
    expect((await render({ index: 1, aspect: '4/3' })).host.innerHTML).toContain(
      'aspect-ratio: 4 / 3',
    )
  })

  it('sizes the tile from the width prop (default 160)', async () => {
    expect((await render({ index: 1 })).host.innerHTML).toContain('width: 160px')
    expect((await render({ index: 1, width: 240 })).host.innerHTML).toContain('width: 240px')
  })

  it('forwards className', async () => {
    const markup = (await render({ index: 1, className: 'st-cls' })).host.innerHTML
    expect(markup).toContain('st-cls')
  })
})
