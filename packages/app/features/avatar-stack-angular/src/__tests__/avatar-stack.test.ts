// @vitest-environment jsdom
/**
 * Unit tests of the Angular `AvatarStack` and `UserChip` — the port of
 * `@molecule/app-avatar-stack-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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
import type * as AppUiAngular from '@molecule/app-ui-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
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

// `Avatar` is the only `@molecule/app-ui-angular` component dependency — stub
// it to an inspectable `<img>`-bearing div carrying the supplied src + name,
// the same markers the React suite's `@molecule/app-ui-react` stub renders.
// Everything else (the `ElementPropsWriter` UserChip writes its link props
// with, `styleText`) is the real bundle.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AppUiAngular>()
  const { Component } = await import('@angular/core')
  return {
    ...actual,
    Avatar: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-avatar]',
      standalone: true,
      inputs: ['src', 'alt', 'name', 'size'],
      host: {
        '[attr.data-avatar]': 'src ?? ""',
        '[attr.data-avatar-name]': 'name ?? ""',
      },
      template: '',
    })(
      class MockAvatar {
        /** Image source. */
        src?: string
        /** Alt text. */
        alt?: string
        /** Display name. */
        name?: string
        /** Size preset. */
        size?: unknown
      },
    ),
  }
})

const { AvatarStack } = await import('../avatar-stack.component.js')
const { UserChip } = await import('../user-chip.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props into the host and re-renders. */
  setProps(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
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

const mounted: Mounted[] = []

const stackTemplate = `<div mol-avatar-stack [people]="p['people']" [max]="p['max']" [size]="p['size']" [className]="p['className']"></div>`

const renderStack = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(stackTemplate, AvatarStack as Type<unknown>, props)
  mounted.push(m)
  return m
}

const chipTemplate = `<div mol-user-chip [name]="p['name']" [src]="p['src']" [size]="p['size']" [className]="p['className']"><span slot="subtitle" data-subtitle>admin</span><span slot="trailing" data-trail></span></div>`

const renderChip = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(chipTemplate, UserChip as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const people = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Carol' },
  { name: 'Dave' },
  { name: 'Eve' },
  { name: 'Frank' },
]

describe('AvatarStack', () => {
  it('renders one avatar per person up to the default max of 4', async () => {
    const m = await renderStack({ people: people.slice(0, 4) })
    expect(m.host.innerHTML.split('data-avatar-name=').length - 1).toBe(4)
  })

  it('caps visible avatars at max and summarises the rest in a "+N" chip', async () => {
    const m = await renderStack({ people, max: 4 })
    expect(m.host.innerHTML.split('data-avatar-name=').length - 1).toBe(4)
    expect(m.host.innerHTML).toContain('+2')
    expect(m.host.innerHTML).toContain('aria-label="+2 more"')
  })

  it('renders no overflow chip when people fit within max', async () => {
    const m = await renderStack({ people: people.slice(0, 3), max: 4 })
    expect(m.host.innerHTML).not.toContain('aria-label="+')
  })

  it('overlaps avatars with a valid negative left margin, skipping the first', async () => {
    // Regression: overlap used `cm.sp('ml', -2 as 0)`, which emitted the
    // invalid Tailwind class `ml--2`, so avatars never actually overlapped.
    // Angular writes the style through the element's style object, so jsdom
    // serializes the declaration with a space after the colon.
    const m = await renderStack({ people: people.slice(0, 3) })
    // 3 avatars → 2 overlaps: the first sits flush, each later one pulls left.
    expect(m.host.innerHTML.split('margin-left: -0.5rem').length - 1).toBe(2)
    // the invalid class must never appear
    expect(m.host.innerHTML).not.toContain('ml--2')
  })

  it('overlaps the "+N" chip onto the stack too', async () => {
    const m = await renderStack({ people, max: 4 })
    // 4 avatars (3 overlaps) + 1 overflow chip overlap = 4 negative margins.
    expect(m.host.innerHTML.split('margin-left: -0.5rem').length - 1).toBe(4)
    expect(m.host.innerHTML).not.toContain('ml--2')
  })

  it('forwards className', async () => {
    const m = await renderStack({ people: people.slice(0, 2), className: 'stack-cls' })
    expect(m.host.innerHTML).toContain('stack-cls')
  })
})

describe('UserChip', () => {
  it('renders the name', async () => {
    const m = await renderChip({ name: 'Alice' })
    expect(m.host.innerHTML).toContain('Alice')
  })

  it('renders the avatar carrying the name', async () => {
    const m = await renderChip({ name: 'Alice', src: 'a.png' })
    expect(m.host.innerHTML).toContain('data-avatar="a.png"')
    expect(m.host.innerHTML).toContain('data-avatar-name="Alice"')
  })

  it('renders the subtitle when present and omits it otherwise', async () => {
    const withSubtitle = await renderChip({ name: 'A' })
    expect(withSubtitle.host.innerHTML).toContain('admin')
    const without = await mount(
      `<div mol-user-chip [name]="p['name']"></div>`,
      UserChip as Type<unknown>,
      { name: 'A' },
    )
    mounted.push(without)
    // only the name span renders, no second text span
    expect(without.host.innerHTML.split('<span').length - 1).toBe(1)
  })

  it('renders the subtitle span for a subtitle a consumer projects after the first render, and drops it again', async () => {
    const m = await mount(
      `<div mol-user-chip [name]="p['name']">@if (p['late']) {<em slot="subtitle" data-late-subtitle>admin</em>}</div>`,
      UserChip as Type<unknown>,
      { name: 'A' },
    )
    mounted.push(m)
    const spans = (): number => m.host.innerHTML.split('<span').length - 1
    expect(spans()).toBe(1)
    m.setProps({ late: true })
    expect(spans()).toBe(2)
    expect(m.host.querySelector('[data-late-subtitle]')?.parentElement?.tagName).toBe('SPAN')
    m.setProps({ late: false })
    expect(spans()).toBe(1)
  })

  it('renders the trailing slot', async () => {
    const m = await renderChip({ name: 'A' })
    expect(m.host.innerHTML).toContain('data-trail')
  })

  it('forwards className', async () => {
    const m = await renderChip({ name: 'A', className: 'chip-cls' })
    expect(m.host.innerHTML).toContain('chip-cls')
  })
})
