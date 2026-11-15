// @vitest-environment jsdom
/**
 * Unit tests of `LeaderboardList` — the port of
 * `@molecule/app-leaderboard-list-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

const { LeaderboardList } = await import('../leaderboard-list.component.js')

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
/** Hosts mounted so far: each gets its own id, so two mounts never share a component id (NG0912). */
let hostCount = 0

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
    // Angular derives a component id from the definition, so two mounts of the
    // same selector collide (NG0912); the extra host attribute separates them.
    host: { 'data-parity-host': String(++hostCount) },
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

/** The component element's serialized start tag (class attribute included). */
const openTag = (host: HTMLElement): string => {
  const el = host.querySelector('[mol-leaderboard-list]')
  if (!el) throw new Error('no LeaderboardList host rendered')
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<div ${attrs}>`.replace(' ="', '="')
}

const mounted: Mounted[] = []

const render = async (content: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-leaderboard-list [className]="p['className']">${content}</div>`,
    LeaderboardList as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('LeaderboardList', () => {
  it('renders its children', async () => {
    const m = await render('<div data-row="a"></div><div data-row="b"></div>')
    expect(m.host.innerHTML).toContain('data-row="a"')
    expect(m.host.innerHTML).toContain('data-row="b"')
  })

  it('renders the title and actions when present and omits the header otherwise', async () => {
    const withHeader = await render(
      '<h3 slot="title">Top players</h3><button slot="actions" data-actions type="button"></button><div data-row></div>',
    )
    expect(withHeader.host.innerHTML).toContain('Top players')
    expect(withHeader.host.innerHTML).toContain('data-actions')
    const without = await render('<div data-row></div>')
    expect(without.host.querySelector('header')).toBeNull()
  })

  it('renders the emptyState when there are no children', async () => {
    const m = await render('<p slot="emptyState" data-empty>No entries</p>')
    expect(m.host.innerHTML).toContain('data-empty')
    expect(m.host.innerHTML).toContain('No entries')
    expect(m.host.querySelector('[data-row]')).toBeNull()
  })

  it('forwards className', async () => {
    const m = await render('<div data-row></div>', { className: 'll-cls' })
    // Angular's style-merging reorders the tokens; compare as a set.
    const classes = (openTag(m.host).match(/class="([^"]*)"/)?.[1] ?? '')
      .split(' ')
      .filter((c) => c.length > 0)
      .sort()
    expect(classes).toEqual(['ll-cls', 'stack'])
  })
})
