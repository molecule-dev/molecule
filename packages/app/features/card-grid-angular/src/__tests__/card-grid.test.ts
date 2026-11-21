// @vitest-environment jsdom
/**
 * Unit tests of `CardGrid` and `BentoGrid` — the port of
 * `@molecule/app-card-grid-react`'s own suite. The React suite renders the
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

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `grid`),
// so tests can assert which cm.* class was applied without a real bond.
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

const { BentoGrid } = await import('../bento-grid.component.js')
const { CardGrid } = await import('../card-grid.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts a JIT host template, written exactly the way an Angular app would
 * write it.
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('CardGrid', () => {
  it('renders its children', async () => {
    const m = await render(
      `<div mol-card-grid><div data-card></div></div>`,
      CardGrid as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-card=""')
  })

  it('forwards className', async () => {
    const m = await render(
      `<div mol-card-grid [className]="'grid-cls'">x</div>`,
      CardGrid as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('grid-cls')
  })
})

describe('BentoGrid', () => {
  it('renders each item content', async () => {
    const m = await render(
      `<ng-template #a><div data-a></div></ng-template>
       <ng-template #b><div data-b></div></ng-template>
       <div mol-bento-grid [items]="[{ id: 'a', content: a }, { id: 'b', content: b }]"></div>`,
      BentoGrid as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('data-a=""')
    expect(m.host.innerHTML).toContain('data-b=""')
  })

  it('uses column-span styles in the default (non-areas) mode', async () => {
    const m = await render(
      `<div mol-bento-grid [items]="[{ id: 'a', content: 'x', colSpan: 6, rowSpan: 2 }]"></div>`,
      BentoGrid as Type<unknown>,
    )
    expect(
      inlineStyleMismatch(m.host.innerHTML, { gridColumn: 'span 6', gridRow: 'span 2' }),
    ).toBeNull()
  })

  it('defaults col-span to 4 and row-span to 1 when unspecified', async () => {
    const m = await render(
      `<div mol-bento-grid [items]="[{ id: 'a', content: 'x' }]"></div>`,
      BentoGrid as Type<unknown>,
    )
    expect(
      inlineStyleMismatch(m.host.innerHTML, { gridColumn: 'span 4', gridRow: 'span 1' }),
    ).toBeNull()
  })

  it('uses grid-template-areas + per-item grid-area in areas mode', async () => {
    const m = await render(
      `<div mol-bento-grid [areas]="p['areas']" [items]="[{ id: 'a', content: 'x', area: 'a' }]"></div>`,
      BentoGrid as Type<unknown>,
      // The CSS value React writes is a (single-quoted) CSS string.
      { areas: "'a a b'" },
    )
    expect(m.host.innerHTML).toContain('grid-template-areas')
    expect(inlineStyleMismatch(m.host.innerHTML, { gridArea: 'a' })).toBeNull()
    expect(inlineStyleMismatch(m.host.innerHTML, { gridColumn: 'span 4' })).not.toBeNull()
  })

  it('forwards className', async () => {
    const m = await render(
      `<div mol-bento-grid [className]="'bento-cls'" [items]="[{ id: 'a', content: 'x' }]"></div>`,
      BentoGrid as Type<unknown>,
    )
    expect(m.host.innerHTML).toContain('bento-cls')
  })
})
