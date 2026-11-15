// @vitest-environment jsdom
/**
 * Unit tests of `PresenceDot` and `AvatarWithPresence` — the port of
 * `@molecule/app-presence-indicator-react`'s own suite. The React suite renders
 * the components with a mocked ClassMap and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings. Inline styles are set
 * through the CSSOM, so jsdom serializes them as `rgb(...)`/`0px` (the same
 * values React's runtime mount produces).
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

const { AvatarWithPresence } = await import('../avatar-with-presence.component.js')
const { PresenceDot } = await import('../presence-dot.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts one component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param component - The component class under test.
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(
  component: Type<unknown>,
  template: string,
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

/** Mounts a `PresenceDot` with the given inputs. */
const renderDot = (props: Record<string, unknown> = {}): Promise<Mounted> =>
  render(
    PresenceDot as Type<unknown>,
    `<span mol-presence-dot [status]="p['status']" [size]="p['size']" [position]="p['position']" [corner]="p['corner']" [ariaLabel]="p['ariaLabel']" [className]="p['className']"></span>`,
    props,
  )

/** Mounts an `AvatarWithPresence` with the given inputs and projected content. */
const renderAvatar = (props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> =>
  render(
    AvatarWithPresence as Type<unknown>,
    `<span mol-avatar-with-presence [status]="p['status']" [corner]="p['corner']" [dotSize]="p['dotSize']" [className]="p['className']">${projected}</span>`,
    props,
  )

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('PresenceDot', () => {
  it('renders role="status" with a default presence aria-label', async () => {
    const markup = (await renderDot({ status: 'online' })).host.innerHTML
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Presence: online"')
  })

  it('honours a custom ariaLabel', async () => {
    const markup = (await renderDot({ status: 'away', ariaLabel: 'User is away' })).host.innerHTML
    expect(markup).toContain('aria-label="User is away"')
  })

  it('colors the dot by status', async () => {
    expect((await renderDot({ status: 'online' })).host.innerHTML).toContain('rgb(34, 197, 94)')
    expect((await renderDot({ status: 'away' })).host.innerHTML).toContain('rgb(234, 179, 8)')
    expect((await renderDot({ status: 'busy' })).host.innerHTML).toContain('rgb(239, 68, 68)')
    expect((await renderDot({ status: 'offline' })).host.innerHTML).toContain('rgb(148, 163, 184)')
  })

  it('positions absolutely at the given corner when position="overlay"', async () => {
    const markup = (await renderDot({ status: 'online', position: 'overlay', corner: 'top-left' }))
      .host.innerHTML
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 0px')
    expect(markup).toContain('left: 0px')
  })

  it('stays inline (no absolute positioning) by default', async () => {
    const markup = (await renderDot({ status: 'online' })).host.innerHTML
    expect(markup).not.toContain('position: absolute')
  })

  it('forwards className', async () => {
    const markup = (await renderDot({ status: 'online', className: 'dot-cls' })).host.innerHTML
    expect(markup).toContain('dot-cls')
  })
})

describe('AvatarWithPresence', () => {
  it('renders its children', async () => {
    const markup = (await renderAvatar({}, '<img data-avatar />')).host.innerHTML
    expect(markup).toContain('data-avatar')
  })

  it('overlays a presence dot when status is given and omits it otherwise', async () => {
    const withStatus = await renderAvatar({ status: 'online' }, 'x')
    expect(withStatus.host.innerHTML).toContain('role="status"')
    const without = await renderAvatar({}, 'x')
    expect(without.host.innerHTML).not.toContain('role="status"')
  })

  it('forwards className', async () => {
    const markup = (await renderAvatar({ className: 'awp-cls' }, 'x')).host.innerHTML
    expect(markup).toContain('awp-cls')
  })
})
