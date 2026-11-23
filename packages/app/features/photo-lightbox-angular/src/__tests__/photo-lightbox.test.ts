// @vitest-environment jsdom
/**
 * Unit tests of `PhotoLightbox` — the port of
 * `@molecule/app-photo-lightbox-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
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

import { provideDomPlacement } from '@molecule/app-angular'

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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The button mock the React tests install for `@molecule/app-ui-react`: a
// plain native button carrying the class and aria label it was handed (the
// real Angular Button's icon-wrapper class bindings need a real ClassMap,
// which this suite deliberately replaces with a token proxy).
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  const Button = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['variant', 'size', 'className', 'style', 'type'],
    template: '<ng-content></ng-content>',
  })(class MockButton {})
  return { Button }
})

const { PhotoLightbox } = await import('../photo-lightbox.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly innerHTML: string
  /** The spec host element. */
  readonly host: HTMLElement
  /** Merges props over the current ones and re-renders. */
  setProps(next: Record<string, unknown>): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** How many spec hosts have been created (a distinct selector per mount). */
let hostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${hostCount++}`,
    standalone: true,
    imports: [PhotoLightbox as Type<unknown>],
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
    get innerHTML() {
      return host.innerHTML
    },
    host,
    setProps: (next: Record<string, unknown>) => {
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
 * Mounts a `PhotoLightbox` with the given props through the app-style host
 * template and returns the host.
 *
 * @param props - The lightbox's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(
    `<div mol-photo-lightbox [photos]="p['photos']" [open]="p['open']" [onClose]="p['onClose']" [initialIndex]="p['initialIndex']" [onIndexChange]="p['onIndexChange']"></div>`,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const photos = [
  { src: '/1.jpg', alt: 'first', caption: 'Caption one' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('PhotoLightbox', () => {
  it('renders nothing when closed', async () => {
    const m = await render({ photos, open: false, onClose: () => {} })
    expect(m.innerHTML).not.toContain('role="dialog"')
    // useHostPresence leaves an empty comment where the host was, where React leaves ''.
    expect(m.innerHTML.replace('<!---->', '')).toBe('')
  })

  it('shows again when a prop change reopens it', async () => {
    const m = await render({ photos, open: true })
    expect(m.host.querySelector('[role="dialog"]')).not.toBeNull()
    m.setProps({ open: false })
    expect(m.host.querySelector('[role="dialog"]')).toBeNull()
    m.setProps({ open: true })
    expect(m.host.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('leaves no element behind when it is removed while closed', async () => {
    const m = await mount(
      `@if (p['shown']) {<div mol-photo-lightbox [photos]="p['photos']" [open]="p['open']"></div>}`,
      { shown: true, photos, open: false },
    )
    mounted.push(m)
    expect(m.host.querySelector('[role="dialog"]')).toBeNull()
    m.setProps({ shown: false })
    // Not even the empty host element is left in the page.
    expect(m.host.querySelector('*')).toBeNull()
  })

  it('renders nothing when there are no photos', async () => {
    const m = await render({ photos: [], open: true, onClose: () => {} })
    expect(m.innerHTML).not.toContain('role="dialog"')
    // useHostPresence leaves an empty comment where the host was, where React leaves ''.
    expect(m.innerHTML.replace('<!---->', '')).toBe('')
  })

  it('renders the active photo and a modal dialog when open', async () => {
    const m = await render({ photos, open: true, onClose: () => {} })
    expect(m.innerHTML).toContain('role="dialog"')
    expect(m.innerHTML).toContain('aria-modal="true"')
    expect(m.innerHTML).toContain('src="/1.jpg"')
  })

  it('respects initialIndex', async () => {
    const m = await render({ photos, open: true, onClose: () => {}, initialIndex: 1 })
    expect(m.innerHTML).toContain('src="/2.jpg"')
  })

  it('renders the caption when the active photo has one', async () => {
    const m = await render({ photos, open: true, onClose: () => {} })
    expect(m.innerHTML).toContain('<figcaption')
    expect(m.innerHTML).toContain('Caption one')
  })

  it('renders prev/next arrows + a counter for multi-photo galleries', async () => {
    const m = await render({ photos, open: true, onClose: () => {} })
    expect(m.innerHTML).toContain('aria-label="Previous"')
    expect(m.innerHTML).toContain('aria-label="Next"')
    expect(m.innerHTML).toContain('1 / 3')
  })

  it('omits the arrows for a single-photo gallery', async () => {
    const m = await render({ photos: [photos[0]], open: true, onClose: () => {} })
    expect(m.innerHTML).not.toContain('aria-label="Previous"')
  })

  it('always renders a close button', async () => {
    const m = await render({ photos, open: true, onClose: () => {} })
    expect(m.innerHTML).toContain('aria-label="Close"')
  })

  it('wraps the dialog in a presentation backdrop that closes on its own click', async () => {
    const m = await render({ photos, open: true, onClose: () => {} })
    // The host element IS the backdrop (React's root); the dialog sits inside it.
    const backdrop = document.querySelector('div[mol-photo-lightbox]') as HTMLElement
    expect(backdrop.getAttribute('role')).toBe('presentation')
    expect(backdrop.firstElementChild?.getAttribute('role')).toBe('dialog')
    expect(m.innerHTML).toContain('aria-modal="true"')
  })
})
