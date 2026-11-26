// @vitest-environment jsdom
/**
 * Angular `<PhotoLightbox>` index resets — the port of
 * `@molecule/app-photo-lightbox-react/src/__tests__/photo-lightbox-reset.test.tsx`:
 * opening the lightbox (or handing it a new `initialIndex`) rewinds to that
 * photo before the first frame the user sees, so it is never the previous
 * session's photo.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type * as UI from '@molecule/app-ui-angular'

beforeEach(() => setIconSet({ 'x-mark': { paths: [] } }))

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        return token === 'modal' || token === 'position' || token === 'button' ? () => token : token
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
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  const Button = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['variant', 'size', 'className', 'style', 'type'],
    template: '<ng-content></ng-content>',
  })(class MockButton {})
  return { ...(await importOriginal<typeof UI>()), Button }
})

const { PhotoLightbox } = await import('../photo-lightbox.component.js')

/** A mounted spec host: its DOM, prop writes, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Writes props (this framework's `rerender`) and runs change detection. */
  setProps(patch: Record<string, unknown>): void
  /** Runs change detection after an event outside Angular's bindings. */
  tick(): void
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
    host,
    setProps(patch: Record<string, unknown>): void {
      ref.instance.p = { ...ref.instance.p, ...patch }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick(): void {
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

/** The dialog's photo counter, e.g. "2 / 3". */
const counter = (m: Mounted): string =>
  m.host.ownerDocument.querySelector('[role="dialog"]')?.textContent ?? ''

/** Sends one keydown from the lightbox. */
const press = (m: Mounted, key: string): void => {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) throw new Error('Expected a lightbox')
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  m.tick()
}

const photos = [
  { src: '/1.jpg', alt: 'first' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('<PhotoLightbox> index reset', () => {
  it('shows initialIndex on the first open frame', async () => {
    const m = await render({
      photos,
      open: false,
      onClose: () => {},
      initialIndex: undefined,
      onIndexChange: undefined,
    })
    m.setProps({ photos, open: true, onClose: () => {}, initialIndex: 2 })
    expect(counter(m)).toContain('3 / 3')
  })

  it('rewinds to initialIndex when reopened after navigating', async () => {
    const m = await render({
      photos,
      open: true,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    expect(counter(m)).toContain('1 / 3')
    press(m, 'ArrowRight')
    press(m, 'ArrowRight')
    expect(counter(m)).toContain('3 / 3')
    m.setProps({
      photos,
      open: false,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    m.setProps({ photos, open: true, onClose: () => {}, initialIndex: 1, onIndexChange: undefined })
    expect(counter(m)).toContain('2 / 3')
  })

  it('follows a new initialIndex while open', async () => {
    const m = await render({
      photos,
      open: true,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    press(m, 'ArrowRight')
    expect(counter(m)).toContain('2 / 3')
    m.setProps({ photos, open: true, onClose: () => {}, initialIndex: 2, onIndexChange: undefined })
    expect(counter(m)).toContain('3 / 3')
  })
})
