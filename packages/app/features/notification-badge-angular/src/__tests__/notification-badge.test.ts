// @vitest-environment jsdom
/**
 * Unit tests of the Angular `NotificationBadge`, `NotificationDot` and
 * `NotificationWrapper` — the port of
 * `@molecule/app-notification-badge-react`'s own suite. The React suite renders
 * the components to markup and asserts it; this port mounts the same tree
 * through Angular's real renderer (the `createApplication` + JIT host approach
 * the conformance kit's Angular adapter uses) and asserts the same markup
 * strings.
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

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings, every other access
// yields its key as a string token, so emitted classNames are inspectable —
// the same mock the React tests use.
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

import { NotificationBadge } from '../notification-badge.component.js'
import { NotificationDot } from '../notification-dot.component.js'
import { NotificationWrapper } from '../notification-wrapper.component.js'

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

const mounted: Mounted[] = []

/**
 * Mounts a component and tracks it for teardown.
 *
 * @param template - The host template.
 * @param component - The component class.
 * @param props - The props the host template binds.
 * @returns The mounted host.
 */
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

/** The host template for {@link NotificationBadge} (every input bound). */
const BADGE = `<span mol-notification-badge [count]="p['count']" [hideOnZero]="p['hideOnZero']" [max]="p['max']" [variant]="p['variant']" [className]="p['className']"></span>`

/** The host template for {@link NotificationDot} (every input bound). */
const DOT = `<span mol-notification-dot [visible]="p['visible']" [variant]="p['variant']" [size]="p['size']" [position]="p['position']" [className]="p['className']"></span>`

/**
 * The host template for {@link NotificationWrapper}, with the given projected
 * child markup.
 *
 * @param children - The projected child markup.
 * @returns The host template.
 */
const WRAPPER = (children: string): string =>
  `<span mol-notification-wrapper [count]="p['count']" [hideOnZero]="p['hideOnZero']" [variant]="p['variant']" [placement]="p['placement']" [className]="p['className']">${children}</span>`

describe('NotificationBadge', () => {
  it('renders the count', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 5 })
    expect(m.host.innerHTML).toContain('>5<')
  })

  it('renders nothing when count is 0 (hideOnZero default)', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 0 })
    expect(m.host.innerHTML).toBe('')
  })

  it('renders nothing for a negative count under the default hideOnZero', async () => {
    const m = await render(BADGE, NotificationBadge, { count: -3 })
    expect(m.host.innerHTML).toBe('')
  })

  it('renders a 0 badge when hideOnZero is false', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 0, hideOnZero: false })
    expect(m.host.innerHTML).toContain('>0<')
  })

  it('clamps to "99+" by default when count exceeds the max', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 250 })
    expect(m.host.innerHTML).toContain('99+')
  })

  it('honours a custom max for the overflow display', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 12, max: 9 })
    expect(m.host.innerHTML).toContain('9+')
  })

  it('shows the raw count when it equals the max (no overflow)', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 99 })
    expect(m.host.innerHTML).toContain('>99<')
  })

  it('sets aria-label to the true count even when display overflows', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 250 })
    expect(m.host.innerHTML).toContain('aria-label="250"')
  })

  it('maps each variant to its background token', async () => {
    for (const [variant, bg] of [
      ['error', 'bg-error'],
      ['warning', 'bg-warning'],
      ['info', 'bg-info'],
      ['success', 'bg-success'],
      ['neutral', 'bg-surface-secondary'],
    ] as const) {
      const m = await render(BADGE, NotificationBadge, { count: 1, variant })
      expect(m.host.innerHTML).toContain(bg)
    }
  })

  it('gives the neutral variant a visible surface (never the phantom bg-outline)', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 1, variant: 'neutral' })
    const markup = m.host.innerHTML
    // A real, theme-defined surface token — visible in light and dark themes.
    expect(markup).toContain('bg-surface-secondary')
    // The old phantom class no theme defines must not resurface.
    expect(markup).not.toContain('bg-outline')
    // Sanity: the emitted class list is non-empty.
    expect(markup).toMatch(/class="[^"]*bg-surface-secondary[^"]*"/)
  })

  it('defaults to the error variant', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 1 })
    expect(m.host.innerHTML).toContain('bg-error')
  })

  it('forwards className', async () => {
    const m = await render(BADGE, NotificationBadge, { count: 1, className: 'badge-cls' })
    expect(m.host.innerHTML).toContain('badge-cls')
  })
})

describe('NotificationDot', () => {
  it('renders by default (visible defaults to true)', async () => {
    const m = await render(DOT, NotificationDot)
    expect(m.host.innerHTML).toContain('<span')
  })

  it('renders nothing when visible is false', async () => {
    const m = await render(DOT, NotificationDot, { visible: false })
    expect(m.host.innerHTML).toBe('')
  })

  it('is aria-hidden (presence indicator, not announced)', async () => {
    const m = await render(DOT, NotificationDot)
    expect(m.host.innerHTML).toContain('aria-hidden="true"')
  })

  it('maps each variant to its background token', async () => {
    const success = await render(DOT, NotificationDot, { variant: 'success' })
    expect(success.host.innerHTML).toContain('bg-success')
    const neutral = await render(DOT, NotificationDot, { variant: 'neutral' })
    expect(neutral.host.innerHTML).toContain('bg-surface-secondary')
  })

  it('gives the neutral dot a visible surface (never the phantom bg-outline)', async () => {
    const m = await render(DOT, NotificationDot, { variant: 'neutral' })
    expect(m.host.innerHTML).toContain('bg-surface-secondary')
    expect(m.host.innerHTML).not.toContain('bg-outline')
  })

  it('defaults to an 8px inline dot', async () => {
    const m = await render(DOT, NotificationDot)
    expect(m.host.innerHTML).toContain('width: 8px')
    expect(m.host.innerHTML).toContain('display: inline-block')
  })

  it('honours a custom size', async () => {
    const m = await render(DOT, NotificationDot, { size: 14 })
    expect(m.host.innerHTML).toContain('width: 14px')
  })

  it('absolutely positions at the corner when position="corner"', async () => {
    const m = await render(DOT, NotificationDot, { position: 'corner' })
    expect(m.host.innerHTML).toContain('position: absolute')
    expect(m.host.innerHTML).toContain('top: 2px')
    expect(m.host.innerHTML).toContain('right: 2px')
  })

  it('forwards className', async () => {
    const m = await render(DOT, NotificationDot, { className: 'dot-cls' })
    expect(m.host.innerHTML).toContain('dot-cls')
  })
})

describe('NotificationWrapper', () => {
  it('renders its child', async () => {
    const m = await render(WRAPPER('<button data-child>inbox</button>'), NotificationWrapper, {
      count: 3,
    })
    expect(m.host.innerHTML).toContain('data-child')
    expect(m.host.innerHTML).toContain('inbox')
  })

  it('renders the badge alongside the child when count > 0', async () => {
    const m = await render(WRAPPER('x'), NotificationWrapper, { count: 3 })
    expect(m.host.innerHTML).toContain('>3<')
  })

  it('hides the badge when count is 0 (hideOnZero default) but still renders the child', async () => {
    const m = await render(WRAPPER('child-text'), NotificationWrapper, { count: 0 })
    expect(m.host.innerHTML).toContain('child-text')
    expect(m.host.innerHTML).not.toContain('aria-label="0"')
  })

  it('positions top-right by default (top + right offsets)', async () => {
    const m = await render(WRAPPER('x'), NotificationWrapper, { count: 1 })
    expect(m.host.innerHTML).toContain('top: -4px')
    expect(m.host.innerHTML).toContain('right: -4px')
  })

  it('positions bottom-left when placement="bottom-left"', async () => {
    const m = await render(WRAPPER('x'), NotificationWrapper, {
      count: 1,
      placement: 'bottom-left',
    })
    expect(m.host.innerHTML).toContain('bottom: -4px')
    expect(m.host.innerHTML).toContain('left: -4px')
  })

  it('forwards the variant down to the badge', async () => {
    const m = await render(WRAPPER('x'), NotificationWrapper, { count: 1, variant: 'info' })
    expect(m.host.innerHTML).toContain('bg-info')
  })

  it('forwards className onto the relative wrapper', async () => {
    const m = await render(WRAPPER('x'), NotificationWrapper, { count: 1, className: 'wrap-cls' })
    expect(m.host.innerHTML).toContain('wrap-cls')
  })
})
