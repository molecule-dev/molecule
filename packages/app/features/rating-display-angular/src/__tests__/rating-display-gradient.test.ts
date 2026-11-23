// @vitest-environment jsdom
/**
 * Component test for the Angular `RatingDisplay`'s star gradients — a port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-gradient.test.tsx`:
 * each star's fill gradient gets its own distinct id and the star's `fill`
 * points at that id, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the other port tests use).
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
// so no real bond is needed — the same mock the other port tests use.
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

describe('<RatingDisplay> star gradient ids', () => {
  it('gives every star a distinct gradient id and points its fill at it', async () => {
    const m = await render({ value: 3 })
    const markup = m.host.innerHTML
    const ids = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map((match) => match[1])
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    const refs = [...markup.matchAll(/fill="url\(#([^)]+)\)"/g)].map((match) => match[1])
    expect(refs).toEqual(ids)
  })
})
