// @vitest-environment jsdom
/**
 * Unit tests of `BadgeShelf` — the port of
 * `@molecule/app-reputation-badge-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer and asserts the
 * same DOM.
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

import type { Badge } from '../types.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

const { BadgeShelf } = await import('../badge-shelf.component.js')

/**
 * Permissive ClassMap stub — see `ReputationBadge.test.ts`.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_target, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler)
}

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param template - The host template (the component element).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountSpec(
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

/** The template that binds every {@link BadgeShelf} input. */
const SHELF_TEMPLATE = `<mol-badge-shelf
  [badges]="p['badges']"
  [limit]="p['limit']"
  [onClick]="p['onClick']"
  [className]="p['className']"
></mol-badge-shelf>`

const sampleBadges: Badge[] = [
  { id: 'b1', name: 'First Post', description: 'Made your first post', icon: '*' },
  { id: 'b2', name: 'Helpful', description: 'Received 10 upvotes', icon: '+' },
  { id: 'b3', name: 'Veteran', icon: 'V' },
  { id: 'b4', name: 'Editor', icon: 'E' },
  { id: 'b5', name: 'Marathoner', icon: 'M' },
  { id: 'b6', name: 'Legend', icon: 'L' },
  { id: 'b7', name: 'Champion', icon: 'C' },
]

const mounted: Mounted[] = []

/**
 * Mount a {@link BadgeShelf} with these props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mountSpec(SHELF_TEMPLATE, BadgeShelf as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('<BadgeShelf>', () => {
  it('returns null when no badges are supplied', async () => {
    const { host } = await render({ badges: [] })
    expect(host.querySelector('ul')).toBeNull()
  })

  it('renders all badges when count is below the default limit (5)', async () => {
    const { host } = await render({ badges: sampleBadges.slice(0, 3) })
    expect(host.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(3)
    expect(host.querySelector('[data-mol-id="badge-shelf-overflow"]')).toBeNull()
  })

  it('honors the default limit of 5 and shows an overflow chip for the rest', async () => {
    const { host } = await render({ badges: sampleBadges })
    expect(host.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(5)
    const overflow = host.querySelector('[data-mol-id="badge-shelf-overflow"]')
    expect(overflow).not.toBeNull()
    expect(overflow?.textContent).toBe('+2')
  })

  it('honors a custom limit', async () => {
    const { host } = await render({ badges: sampleBadges, limit: 2 })
    expect(host.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(2)
    expect(host.querySelector('[data-mol-id="badge-shelf-overflow"]')?.textContent).toBe('+5')
  })

  it('uses each badge id as a stable React key (data-badge-id attribute)', async () => {
    const { host } = await render({ badges: sampleBadges.slice(0, 3) })
    const ids = Array.from(host.querySelectorAll('[data-mol-id="badge-shelf-item"]')).map((el) =>
      el.getAttribute('data-badge-id'),
    )
    expect(ids).toEqual(['b1', 'b2', 'b3'])
  })

  it('renders a native title tooltip combining name + description', async () => {
    const { host } = await render({ badges: sampleBadges.slice(0, 1) })
    const item = host.querySelector('[data-mol-id="badge-shelf-item"]')
    expect(item?.querySelector('[title]')?.getAttribute('title')).toBe(
      'First Post — Made your first post',
    )
  })

  it('falls back to just the name when no description is provided', async () => {
    const { host } = await render({ badges: [{ id: 'x', name: 'Solo', icon: 'S' }] })
    expect(host.querySelector('[title]')?.getAttribute('title')).toBe('Solo')
  })

  it('renders an <img> when iconSrc is provided', async () => {
    const { host } = await render({
      badges: [{ id: 'i', name: 'Image Badge', iconSrc: 'data:image/png;base64,iVBORw0KGgo=' }],
    })
    const img = host.querySelector('[data-mol-id="badge-shelf-icon-img"]')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=')
  })

  it('renders the glyph fallback when no icon/iconSrc is provided', async () => {
    const { host } = await render({ badges: [{ id: 'g', name: 'Glyph' }] })
    expect(host.querySelector('[data-mol-id="badge-shelf-icon-glyph"]')).not.toBeNull()
  })

  it('renders interactive buttons when onClick is provided and invokes it with the badge', async () => {
    const onClick = vi.fn()
    const { host } = await render({ badges: sampleBadges.slice(0, 2), onClick })
    const buttons = host.querySelectorAll('[data-mol-id="badge-shelf-button"]')
    expect(buttons).toHaveLength(2)
    buttons[0]!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(sampleBadges[0])
  })

  it('passes null to onClick when the overflow chip is clicked', async () => {
    const onClick = vi.fn()
    const { host } = await render({ badges: sampleBadges, onClick })
    const overflowBtn = host.querySelector('[data-mol-id="badge-shelf-overflow-button"]')
    expect(overflowBtn).not.toBeNull()
    overflowBtn!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(null)
  })

  it('renders non-interactive spans when onClick is not provided', async () => {
    const { host } = await render({ badges: sampleBadges.slice(0, 2) })
    expect(host.querySelectorAll('[data-mol-id="badge-shelf-button"]')).toHaveLength(0)
  })

  it('labels each non-interactive badge as an image', async () => {
    const { host } = await render({ badges: sampleBadges.slice(0, 2) })
    const icons = host.querySelectorAll('[data-mol-id="badge-shelf-item"] span[role="img"]')
    expect(icons).toHaveLength(2)
    expect(icons[0]?.getAttribute('aria-label')).toBe('First Post')
    expect(icons[1]?.getAttribute('aria-label')).toBe('Helpful')
    expect(
      icons[0]
        ?.querySelector('[data-mol-id="badge-shelf-icon-glyph"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('emits an aria-label summarising the total number of badges', async () => {
    const { host } = await render({ badges: sampleBadges })
    expect(host.querySelector('[data-mol-id="badge-shelf"]')?.getAttribute('aria-label')).toBe(
      '7 badges earned',
    )
  })

  it('emits an aria-label on the overflow chip describing remaining count', async () => {
    const { host } = await render({ badges: sampleBadges })
    const overflow = host.querySelector('[data-mol-id="badge-shelf-overflow"]')
    expect(overflow?.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      'Show 2 more badges',
    )
  })
})
