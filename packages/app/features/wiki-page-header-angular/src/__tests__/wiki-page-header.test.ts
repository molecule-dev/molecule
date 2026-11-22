// @vitest-environment jsdom
/**
 * Unit tests of `WikiPageHeader` — the port of
 * `@molecule/app-wiki-page-header-react`'s own suite. The React suite renders
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI-component marker the React tests mock `@molecule/app-ui-react`
// with: Button renders `data-button`.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size'],
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
  }
})

const { WikiPageHeader } = await import('../wiki-page-header.component.js')

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
 * @param component - The component type.
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
  // The second tick applies the first view's withdrawals (the optional meta
  // spans render optimistically).
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
  `<header mol-wiki-page-header [title]="p['title']" [breadcrumb]="p['breadcrumb']" [version]="p['version']" [updatedAt]="p['updatedAt']" [updatedBy]="p['updatedBy']" [tags]="p['tags']" [onEdit]="p['onEdit']" [onHistory]="p['onHistory']" [extraActions]="p['extraActions']" [className]="p['className']">${children}</header>`

const render = async (props: Record<string, unknown> = {}, children = ''): Promise<Mounted> => {
  const m = await mount(header(children), WikiPageHeader as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('WikiPageHeader', () => {
  it('renders the title inside an <h1>', async () => {
    const m = await render({ title: 'Getting Started' })
    expect(m.host.innerHTML).toContain('<h1')
    expect(m.host.innerHTML).toContain('Getting Started')
  })

  it('renders the breadcrumb slot', async () => {
    const m = await render({ title: 'T' }, '<nav slot="breadcrumb" data-crumb></nav>')
    expect(m.host.innerHTML).toContain('data-crumb=""')
  })

  it('renders the version, updatedAt, and updatedBy meta', async () => {
    const m = await render({
      title: 'T',
      version: 'v23',
      updatedAt: '2 days ago',
      updatedBy: 'Jane',
    })
    expect(m.host.innerHTML).toContain('v23')
    expect(m.host.innerHTML).toContain('Updated')
    expect(m.host.innerHTML).toContain('2 days ago')
    expect(m.host.innerHTML).toContain('Jane')
  })

  it('renders the Edit / History buttons only when their handlers are supplied', async () => {
    const withActions = await render({ title: 'T', onEdit: () => {}, onHistory: () => {} })
    expect(withActions.host.innerHTML).toContain('Edit')
    expect(withActions.host.innerHTML).toContain('History')
    const without = await render({ title: 'T' })
    expect(without.host.innerHTML).not.toContain('Edit')
    expect(without.host.innerHTML).not.toContain('History')
  })

  it('renders the tags and extraActions slots', async () => {
    const m = await render(
      { title: 'T' },
      '<span slot="tags" data-tags></span><button slot="extraActions" data-extra></button>',
    )
    expect(m.host.innerHTML).toContain('data-tags=""')
    expect(m.host.innerHTML).toContain('data-extra=""')
  })

  it('forwards className', async () => {
    const m = await render({ title: 'T', className: 'wph-cls' })
    expect(m.host.innerHTML).toContain('wph-cls')
  })
})
