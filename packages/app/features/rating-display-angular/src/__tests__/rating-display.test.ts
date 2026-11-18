// @vitest-environment jsdom
/**
 * Unit tests of `RatingDisplay` — the port of
 * `@molecule/app-rating-display-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
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

const { RatingDisplay } = await import('../rating-display.component.js')

/** The host template binding every input, as an app would write it. */
const TEMPLATE = `<span mol-rating-display [value]="p['value']" [max]="p['max']" [reviewCount]="p['reviewCount']" [size]="p['size']" [ariaLabel]="p['ariaLabel']" [className]="p['className']" [onChange]="p['onChange']" [onReviewsClick]="p['onReviewsClick']"></span>`

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
 * Mounts `RatingDisplay` with the given props.
 *
 * @param props - The rating-display props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(TEMPLATE, RatingDisplay as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('RatingDisplay', () => {
  it('renders one star svg per max with role="img" and a default aria-label', async () => {
    const m = await render({ value: 3.5, max: 5 })
    expect(m.host.querySelectorAll('svg')).toHaveLength(5)
    expect(m.host.innerHTML).toContain('role="img"')
    expect(m.host.innerHTML).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('honours a custom ariaLabel', async () => {
    const m = await render({ value: 4, ariaLabel: 'Four stars' })
    expect(m.host.innerHTML).toContain('aria-label="Four stars"')
  })

  it('renders the review count as plain text by default', async () => {
    const m = await render({ value: 4, reviewCount: 128 })
    expect(m.host.textContent).toContain('(128)')
    expect(m.host.querySelectorAll('button')).toHaveLength(0)
  })

  it('renders the review count as a button when onReviewsClick is supplied', async () => {
    const m = await render({ value: 4, reviewCount: 128, onReviewsClick: () => {} })
    expect(m.host.querySelectorAll('button')).toHaveLength(1)
    expect(m.host.textContent).toContain('(128)')
  })

  it('renders interactive star buttons when onChange is supplied', async () => {
    const m = await render({ value: 2, max: 5, onChange: () => {} })
    expect(m.host.querySelectorAll('button')).toHaveLength(5)
    expect(m.host.innerHTML).toContain('aria-label="Rate 1 of 5"')
    expect(m.host.innerHTML).toContain('aria-label="Rate 5 of 5"')
  })

  it('forwards className', async () => {
    const m = await render({ value: 3, className: 'rd-cls' })
    expect(m.host.innerHTML).toContain('rd-cls')
  })

  it('keeps the rating label and role on the inner stars span, not the root', async () => {
    const m = await render({ value: 3.5, max: 5 })
    expect(m.host.innerHTML.match(/role="img"/g) ?? []).toHaveLength(1)
    expect(m.host.innerHTML).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('groups the interactive stars under the rating label with pressed states', async () => {
    const m = await render({ value: 2.4, max: 5, onChange: () => {} })
    expect(m.host.innerHTML.match(/role="group"/g) ?? []).toHaveLength(1)
    expect(m.host.innerHTML.match(/role="img"/g) ?? []).toHaveLength(0)
    expect(m.host.innerHTML).toContain('aria-label="Rating: 2.4 of 5"')
    // Math.round(2.4) = 2: the first two stars pressed, the other three not.
    expect(m.host.innerHTML.match(/aria-pressed="true"/g) ?? []).toHaveLength(2)
    expect(m.host.innerHTML.match(/aria-pressed="false"/g) ?? []).toHaveLength(3)
  })
})
