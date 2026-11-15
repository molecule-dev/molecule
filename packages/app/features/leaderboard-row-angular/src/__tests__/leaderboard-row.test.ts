// @vitest-environment jsdom
/**
 * Unit tests of `LeaderboardRow` — the port of
 * `@molecule/app-leaderboard-row-react/src/__tests__/leaderboard-row.test.tsx`.
 * The React suite renders the component with mocked UI dependencies and
 * asserts the markup; this port mounts the same mocked tree through Angular's
 * real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) with the same UI-package stubs, and
 * asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  // The same stub the React tests install for `@molecule/app-ui-react`:
  // an `<img data-avatar data-avatar-name>`. The `Component(...)` factory is
  // called as a plain function (no decorator syntax) so the hoisted mock
  // factory stays plain JavaScript.
  const Avatar = Component({
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'name'],
    template: `<img [attr.data-avatar]="src || ''" [attr.data-avatar-name]="name || ''" />`,
  })(
    class {
      constructor() {
        this.src = undefined
        this.name = undefined
      }
    },
  )
  return { Avatar }
})

const { LeaderboardRow } = await import('../leaderboard-row.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the LeaderboardRow through a JIT host template, written exactly the
 * way an Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [LeaderboardRow as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div mol-leaderboard-row [rank]="p['rank']" [name]="p['name']" [avatarSrc]="p['avatarSrc']" [score]="p['score']" [rankDelta]="p['rankDelta']" [subtitle]="p['subtitle']" [isMe]="p['isMe']" [onClick]="p['onClick']" [className]="p['className']"></div>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('LeaderboardRow', () => {
  it('renders the name, score, and avatar', async () => {
    const m = await render({ rank: 5, name: 'Zoe', score: '1,200' })
    const markup = m.host.innerHTML
    expect(markup).toContain('Zoe')
    expect(markup).toContain('1,200')
    expect(markup).toContain('data-avatar-name="Zoe"')
  })

  it('renders a medal for the top three ranks and #N for the rest', async () => {
    expect((await render({ rank: 1, name: 'A', score: '1' })).host.innerHTML).toContain('🥇')
    expect((await render({ rank: 2, name: 'A', score: '1' })).host.innerHTML).toContain('🥈')
    expect((await render({ rank: 3, name: 'A', score: '1' })).host.innerHTML).toContain('🥉')
    expect((await render({ rank: 8, name: 'A', score: '1' })).host.innerHTML).toContain('#8')
  })

  it('renders an up/down arrow for a non-zero rankDelta', async () => {
    const up = await render({ rank: 4, name: 'A', score: '1', rankDelta: 2 })
    expect(up.host.innerHTML).toContain('▲')
    // Inline colors go through CSSOM, so jsdom serializes the hex values as
    // `rgb(...)` — the same values React's static markup writes as hex.
    expect(up.host.innerHTML).toContain('color: rgb(34, 197, 94)')
    const down = await render({ rank: 4, name: 'A', score: '1', rankDelta: -3 })
    expect(down.host.innerHTML).toContain('▼')
    expect(down.host.innerHTML).toContain('color: rgb(239, 68, 68)')
  })

  it('renders no delta indicator when rankDelta is 0 or absent', async () => {
    expect(
      (await render({ rank: 4, name: 'A', score: '1', rankDelta: 0 })).host.innerHTML,
    ).not.toContain('▲')
    expect((await render({ rank: 4, name: 'A', score: '1' })).host.innerHTML).not.toContain('▼')
  })

  it('renders the subtitle when present', async () => {
    const m = await render({ rank: 4, name: 'A', score: '1', subtitle: 'Team Red' })
    expect(m.host.innerHTML).toContain('Team Red')
  })

  it('applies the highlight background when isMe is set', async () => {
    const me = await render({ rank: 4, name: 'A', score: '1', isMe: true })
    expect(me.host.innerHTML).toContain('rgba(96, 165, 250, 0.1)')
    const other = await render({ rank: 4, name: 'A', score: '1' })
    expect(other.host.innerHTML).not.toContain('rgba(96, 165, 250, 0.1)')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', async () => {
    const clickable = await render({ rank: 4, name: 'A', score: '1', onClick: () => {} })
    expect(clickable.host.innerHTML).toContain('cursorPointer')
    const plain = await render({ rank: 4, name: 'A', score: '1', className: 'lr-cls' })
    expect(plain.host.innerHTML).not.toContain('cursorPointer')
    expect(plain.host.innerHTML).toContain('lr-cls')
  })
})
