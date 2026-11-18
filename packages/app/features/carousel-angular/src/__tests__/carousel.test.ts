// @vitest-environment jsdom
/**
 * Unit tests of `Carousel` — the port of
 * `@molecule/app-carousel-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
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

// `t(key, values, opts)` interpolates `{{name}}` into the supplied
// `defaultValue`, as the i18n core does.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

// The Button marker the React suite's mock provides: a native `button` that
// forwards its class and its React-shaped inline style, so arrow positioning is
// observable in the rendered markup.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: [
        'variant',
        'color',
        'size',
        'loading',
        'loadingText',
        'fullWidth',
        'className',
        'style',
        'testId',
        'disabled',
        'type',
      ],
      host: {
        '[class]': 'className ?? null',
        '[style]': 'styleText()',
        '[attr.type]': 'type ?? "button"',
      },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button color. */
        color?: string
        /** Button size. */
        size?: string
        /** Loading state. */
        loading?: boolean
        /** Loading label. */
        loadingText?: string
        /** Full width. */
        fullWidth?: boolean
        /** Extra classes. */
        className?: string
        /** Inline style object (React camelCase). */
        style?: Record<string, unknown>
        /** `data-testid`. */
        testId?: string
        /** Disabled. */
        disabled?: boolean
        /** `type`. */
        type?: string

        /**
         * Serializes the React-shaped inline style the way React writes it.
         * @returns The declaration string.
         */
        styleText(): string | null {
          if (!this.style) return null
          const parts: string[] = []
          for (const [key, value] of Object.entries(this.style)) {
            if (value === null || value === undefined || value === false) continue
            const name = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
            const text = typeof value === 'number' ? `${value}px` : String(value)
            parts.push(`${name}: ${text}`)
          }
          return parts.length ? parts.join('; ') : null
        }
      },
    ),
  }
})

const { Carousel } = await import('../carousel.component.js')

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
  /** Runs a check, lets effects settle, and checks again (the slide count lands in between). */
  const flush = async (): Promise<void> => {
    appRef.tick()
    await Promise.resolve()
    appRef.tick()
  }
  await flush()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      await flush()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The component element's serialized start tag (class attribute included). */
const openTag = (host: HTMLElement): string => {
  const el = host.querySelector('[mol-carousel]')
  if (!el) throw new Error('no Carousel host rendered')
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<div ${attrs}>`.replace(' ="', '="')
}

/** The slide wrappers, in order. */
const wrappers = (host: HTMLElement): Element[] =>
  Array.from(host.querySelectorAll('[data-mol-id="carousel-slide"]'))

/**
 * The host template for a carousel with `n` slide elements.
 *
 * @param n - How many slides to project.
 * @returns The host template.
 */
const template = (n: number): string =>
  `<div mol-carousel [index]="p['index']" [showArrows]="p['showArrows']" [showDots]="p['showDots']" [className]="p['className']">${Array.from(
    { length: n },
    (_, i) => `<div data-slide="${i}">slide-${i}</div>`,
  ).join('')}</div>`

const mounted: Mounted[] = []

/**
 * Mounts the carousel with the given props.
 *
 * @param props - The component props.
 * @param slides - How many slides to project.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, slides = 0): Promise<Mounted> => {
  const m = await mount(template(slides), Carousel as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('Carousel', () => {
  it('renders nothing when there are no slides', async () => {
    const m = await render({}, 0)
    expect(m.host.querySelector('[mol-carousel]')).toBeNull()
  })

  it('renders every slide', async () => {
    const m = await render({}, 3)
    const markup = m.host.innerHTML
    expect(markup).toContain('slide-0')
    expect(markup).toContain('slide-1')
    expect(markup).toContain('slide-2')
  })

  it('marks non-active slides aria-hidden', async () => {
    const m = await render({}, 3)
    // slides 1 and 2 hidden, slide 0 active. Scoped to the slide wrappers so
    // decorative `aria-hidden` elsewhere (the dot glyphs) cannot skew the count.
    expect(wrappers(m.host).length).toBe(3)
    expect(wrappers(m.host).filter((w) => w.getAttribute('aria-hidden') === 'true').length).toBe(2)
  })

  it('renders prev/next arrows when showArrows and there is more than one slide', async () => {
    const m = await render({}, 3)
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
  })

  it('pins the prev arrow left and the next arrow right, both vertically centered', async () => {
    // Regression: both arrows used `cm.position('absolute')` with no offsets,
    // so they stacked at the same spot (top-left).
    const markup = (await render({}, 3)).host.innerHTML
    const firstClose = markup.indexOf('</button>')
    const rest = markup.slice(firstClose + '</button>'.length)
    const prev = markup.slice(0, firstClose)
    const next = rest.slice(0, rest.indexOf('</button>'))

    expect(prev).toContain('aria-label="Previous"')
    expect(prev).toContain('left: 8px')
    expect(prev).not.toContain('right: 8px')

    expect(next).toContain('aria-label="Next"')
    expect(next).toContain('right: 8px')
    expect(next).not.toContain('left: 8px')

    // Both arrows are vertically centered (offset + translate), not stacked.
    expect((markup.match(/top: 50%/g) ?? []).length).toBe(2)
    expect((markup.match(/translateY\(-50%\)/g) ?? []).length).toBe(2)
  })

  it('omits the arrows when showArrows is false', async () => {
    const m = await render({ showArrows: false }, 3)
    expect(m.host.innerHTML).not.toContain('aria-label="Previous"')
  })

  it('omits the arrows for a single slide', async () => {
    const m = await render({}, 1)
    expect(m.host.innerHTML).not.toContain('aria-label="Next"')
  })

  it('renders the dot strip with aria-current on the active slide', async () => {
    const m = await render({}, 3)
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="Go to slide 1"')
    expect(markup).toContain('aria-current="true"')
  })

  it('omits the dot strip when showDots is false', async () => {
    const m = await render({ showDots: false }, 3)
    expect(m.host.innerHTML).not.toContain('Go to slide')
  })

  it('honours a controlled index', async () => {
    const m = await render({ index: 2 }, 3)
    // dot 3 (index 2) is current
    const current = m.host.querySelector('[data-mol-id="carousel-dot"][aria-current="true"]')
    expect(current?.getAttribute('aria-label')).toBe('Go to slide 3')
  })

  it('forwards className', async () => {
    const m = await render({ className: 'car-cls' }, 2)
    expect(openTag(m.host)).toContain('car-cls')
  })
})
