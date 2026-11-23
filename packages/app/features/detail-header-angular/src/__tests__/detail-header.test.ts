// @vitest-environment jsdom
/**
 * Unit tests of `DetailHeader` — the port of
 * `@molecule/app-detail-header-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this
 * port mounts the same mocked tree through Angular's real renderer (the same
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `page`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
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

// React-style inline style serialization for the host's `[style]` binding —
// camelCase keys become kebab-case, numbers gain `px` unless unitless.
vi.mock('@molecule/app-ui-angular', () => ({
  styleText: (style: Record<string, unknown>): string | null => {
    const unitless = new Set(['zIndex', 'fontWeight', 'opacity', 'order', 'flexGrow'])
    const parts = Object.entries(style).map(([key, value]) => {
      const name = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      const text =
        typeof value === 'number'
          ? unitless.has(key)
            ? String(value)
            : `${value}px`
          : String(value)
      return `${name}: ${text}`
    })
    return parts.length ? parts.join('; ') : null
  },
}))

const { DetailHeader } = await import('../detail-header.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
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
  // The second tick applies the first view's withdrawals (the optional
  // subtitle paragraph and meta row render optimistically).
  appRef.tick()
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** The header's bindings template, shared by every render below. */
const header = (children = ''): string =>
  `<header mol-detail-header [title]="p['title']" [subtitle]="p['subtitle']" [sticky]="p['sticky']" [className]="p['className']" [dataMolId]="p['dataMolId']">${children}</header>`

const render = async (props: Record<string, unknown> = {}, children = ''): Promise<Mounted> => {
  const m = await mount(header(children), DetailHeader as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('DetailHeader', () => {
  it('renders the title inside an <h1>', async () => {
    const m = await render({ title: 'Invoice #42' })
    expect(m.host.innerHTML).toContain('<h1')
    expect(m.host.innerHTML).toContain('Invoice #42')
  })

  it('renders the subtitle when present and omits it otherwise', async () => {
    const withSubtitle = await render({ title: 'T', subtitle: 'due soon' })
    expect(withSubtitle.host.innerHTML).toContain('due soon')
    const plain = await render({ title: 'T' })
    expect(plain.host.innerHTML).not.toContain('<p')
  })

  it('renders the leading, status, search, and actions slots', async () => {
    const m = await render(
      { title: 'T' },
      '<span slot="leading" data-leading></span><span slot="status" data-status></span><span slot="search" data-search></span><span slot="actions" data-actions></span>',
    )
    expect(m.host.innerHTML).toContain('data-leading=""')
    expect(m.host.innerHTML).toContain('data-status=""')
    expect(m.host.innerHTML).toContain('data-search=""')
    expect(m.host.innerHTML).toContain('data-actions=""')
  })

  it('renders the meta row when present and omits it otherwise', async () => {
    const withMeta = await render({ title: 'T' }, '<span slot="meta" data-meta></span>')
    expect(withMeta.host.innerHTML).toContain('data-meta=""')
    const plain = await render({ title: 'T' })
    expect(plain.host.innerHTML).not.toContain('data-meta')
  })

  it('applies the sticky inline style only when sticky is set', async () => {
    const sticky = await render({ title: 'T', sticky: true })
    expect(sticky.host.innerHTML).toContain('position: sticky')
    const plain = await render({ title: 'T' })
    expect(plain.host.innerHTML).not.toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render({ title: 'T', dataMolId: 'dh-x', className: 'dh-cls' })
    expect(m.host.innerHTML).toContain('data-mol-id="dh-x"')
    expect(m.host.innerHTML).toContain('dh-cls')
  })
})
