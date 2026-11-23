// @vitest-environment jsdom
/**
 * Unit tests of `AnnotationPin` / `AnnotationLayer` — the port of
 * `@molecule/app-annotation-pin-react`'s own suite. The same names and the
 * same assertions, mounted through Angular's real renderer (the
 * `createApplication` + JIT host approach the other Angular feature ports
 * use) and asserted on the markup the components produce.
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

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond — the same mock the
// React tests use.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AnnotationLayer } from '../annotation-layer.component.js'
import { AnnotationPin } from '../annotation-pin.component.js'
import type { Pin } from '../types.js'

/** The host template for one AnnotationPin render: every prop is bound. */
const pinTemplate = `<div mol-annotation-pin
  [position]="p['position']"
  [label]="p['label']"
  [note]="p['note']"
  [selected]="p['selected']"
  [onClick]="p['onClick']"
  [popupSide]="p['popupSide']"
  [className]="p['className']"
  [normalised]="p['normalised']"
></div>`

/** The host template for one AnnotationLayer render, with projected content. */
const layerTemplate = (content: string): string => `<div mol-annotation-layer
  [pins]="p['pins']"
  [activePinId]="p['activePinId']"
  [onPinClick]="p['onPinClick']"
  [onSurfaceClick]="p['onSurfaceClick']"
  [normalised]="p['normalised']"
  [popupSide]="p['popupSide']"
  [className]="p['className']"
>${content}</div>`

/** A mounted spec host: the body element and a teardown. */
interface Mounted {
  /** The element the spec host rendered into. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

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
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
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
  mounted.push(m)
  return m
}

/**
 * Renders an {@link AnnotationPin} with the given props.
 *
 * @param props - The props to bind.
 * @returns The mounted host.
 */
const renderPin = (props: Record<string, unknown>): Promise<Mounted> =>
  mount(pinTemplate, AnnotationPin as Type<unknown>, props)

/**
 * Renders an {@link AnnotationLayer} with the given props.
 *
 * @param props - The props to bind.
 * @param content - Projected surface content.
 * @returns The mounted host.
 */
const renderLayer = (props: Record<string, unknown>, content = ''): Promise<Mounted> =>
  mount(layerTemplate(content), AnnotationLayer as Type<unknown>, props)

const samplePins: Pin[] = [
  { id: 'a', position: { x: 0.25, y: 0.25 }, label: 1, note: 'Alpha note' },
  { id: 'b', position: { x: 0.5, y: 0.5 }, label: 2, note: 'Bravo note' },
  { id: 'c', position: { x: 0.75, y: 0.75 }, label: 3 },
]

describe('<AnnotationPin>', () => {
  it('renders a marker button with the supplied label and aria-label', async () => {
    const m = await renderPin({ position: { x: 0.5, y: 0.5 }, label: 7 })
    const marker = m.host.querySelector('[data-mol-id="annotation-pin-marker"]') as HTMLElement
    expect(marker.getAttribute('data-mol-id')).toBe('annotation-pin-marker')
    expect(marker.getAttribute('aria-label')).toBe('Annotation pin')
    expect(marker.getAttribute('aria-expanded')).toBe('false')
    expect(m.host.querySelector('[data-mol-id="annotation-pin-label"]')?.textContent).toBe('7')
  })

  it('positions the wrapper using % when normalised (default)', async () => {
    const m = await renderPin({ position: { x: 0.4, y: 0.6 }, label: 1 })
    const wrapper = m.host.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(wrapper?.style.left).toBe('40%')
    expect(wrapper?.style.top).toBe('60%')
  })

  it('positions the wrapper using px when normalised=false', async () => {
    const m = await renderPin({ position: { x: 120, y: 80 }, label: 1, normalised: false })
    const wrapper = m.host.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(wrapper?.style.left).toBe('120px')
    expect(wrapper?.style.top).toBe('80px')
  })

  it('hides the popup when not selected', async () => {
    const m = await renderPin({ position: { x: 0.5, y: 0.5 }, label: 1, note: 'hello' })
    expect(m.host.querySelector('[data-mol-id="annotation-pin-popup"]')).toBeNull()
  })

  it('renders the popup with note body when selected', async () => {
    const m = await renderPin({
      position: { x: 0.5, y: 0.5 },
      label: 1,
      note: 'hello',
      selected: true,
    })
    const popup = m.host.querySelector('[data-mol-id="annotation-pin-popup"]') as HTMLElement | null
    expect(popup).not.toBeNull()
    expect(popup?.getAttribute('aria-label')).toBe('Annotation details')
    expect(popup?.getAttribute('data-popup-side')).toBe('right')
    expect(
      m.host.querySelector('[data-mol-id="annotation-pin-popup-body"]')?.textContent,
    ).toContain('hello')
    const marker = m.host.querySelector(
      '[data-mol-id="annotation-pin-marker"]',
    ) as HTMLElement | null
    expect(marker?.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders an empty-state body when selected without a note', async () => {
    const m = await renderPin({ position: { x: 0.5, y: 0.5 }, label: 1, selected: true })
    expect(
      m.host.querySelector('[data-mol-id="annotation-pin-popup-empty"]')?.textContent,
    ).toContain('No notes')
  })

  it('uses the popupSide prop on the popup data attribute', async () => {
    const m = await renderPin({
      position: { x: 0.5, y: 0.5 },
      label: 1,
      note: 'x',
      selected: true,
      popupSide: 'top',
    })
    const popup = m.host.querySelector('[data-mol-id="annotation-pin-popup"]') as HTMLElement | null
    expect(popup?.getAttribute('data-popup-side')).toBe('top')
  })

  it('fires onClick when the marker is clicked', async () => {
    const onClick = vi.fn()
    const m = await renderPin({ position: { x: 0.5, y: 0.5 }, label: 1, onClick })
    const marker = m.host.querySelector('[data-mol-id="annotation-pin-marker"]') as HTMLElement
    marker.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('keeps a consumer list in order when an item is inserted in the middle of the label slot', async () => {
    const m = await mount(
      `<div mol-annotation-pin [position]="p['position']">@for (x of p['xs']; track x) {<b slot="label">{{ x }}</b>}</div>`,
      AnnotationPin as Type<unknown>,
      { position: { x: 0.5, y: 0.5 }, xs: ['a', 'c'] },
    )
    const shown = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('[data-mol-id="annotation-pin-label"] b')).map(
        (el) => el.textContent,
      )
    expect(shown()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(shown()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(shown()).toEqual(['a', 'c'])
  })

  it('shows and removes the note wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-annotation-pin [position]="p['position']" [selected]="true">@if (p['on']) {<span slot="note" data-note>Note</span>}</div>`,
      AnnotationPin as Type<unknown>,
      { position: { x: 0.5, y: 0.5 }, on: false },
    )
    const note = (): HTMLElement | null => m.host.querySelector('[data-note]')
    // No note prop and no projected node: React renders the empty state.
    expect(note()).toBeNull()
    expect(m.host.textContent).toContain('No notes for this pin.')
    await m.setProps({ on: true })
    // The projected note renders bare inside the popup in the same pass.
    expect(note()).not.toBeNull()
    expect(note()?.isConnected).toBe(true)
    expect(m.host.textContent).not.toContain('No notes for this pin.')
    await m.setProps({ on: false })
    expect(note()).toBeNull()
    expect(m.host.textContent).toContain('No notes for this pin.')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><div mol-annotation-pin [position]="p['position']" [selected]="p['selected']"><b slot="label" data-label>L</b></div><i>b</i>`,
      AnnotationPin as Type<unknown>,
      { position: { x: 0.5, y: 0.5 }, selected: false },
    )
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // The host IS React's root <div>; the host stays between the siblings.
    expect(children()).toEqual(['i', 'div', 'i'])
    // The projected label is a direct child of the label span — no capture span remains.
    const labelSpan = m.host.querySelector('[data-mol-id="annotation-pin-label"]') as HTMLElement
    const projected = m.host.querySelector('[data-label]') as HTMLElement
    expect(projected.parentElement).toBe(labelSpan)
    // Toggling `selected` adds the popup inside the host, without adding a sibling.
    expect(m.host.querySelector('[data-mol-id="annotation-pin-popup"]')).toBeNull()
    await m.setProps({ selected: true })
    expect(children()).toEqual(['i', 'div', 'i'])
    expect(m.host.querySelector('[data-mol-id="annotation-pin-popup"]')).not.toBeNull()
  })
})

describe('<AnnotationLayer>', () => {
  it('wraps children and renders one pin per entry', async () => {
    const m = await renderLayer(
      { pins: samplePins },
      '<img src="/x.png" alt="" data-mol-id="surface-img" />',
    )
    expect(m.host.querySelector('[data-mol-id="surface-img"]')).not.toBeNull()
    const pinNodes = m.host.querySelectorAll('[data-mol-id="annotation-pin"]')
    expect(pinNodes.length).toBe(3)
  })

  it('renders the popup only for the active pin', async () => {
    const m = await renderLayer({ pins: samplePins, activePinId: 'b' })
    const popups = m.host.querySelectorAll('[data-mol-id="annotation-pin-popup"]')
    expect(popups.length).toBe(1)
    expect(popups[0]!.textContent).toContain('Bravo note')
  })

  it('fires onPinClick(id) when a pin marker is clicked', async () => {
    const onPinClick = vi.fn()
    const m = await renderLayer({ pins: samplePins, onPinClick })
    const markers = m.host.querySelectorAll('[data-mol-id="annotation-pin-marker"]')
    ;(markers[1] as HTMLElement).click()
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith('b')
  })

  it('does not fire onSurfaceClick when a pin marker is clicked', async () => {
    const onPinClick = vi.fn()
    const onSurfaceClick = vi.fn()
    const m = await renderLayer({ pins: samplePins, onPinClick, onSurfaceClick })
    const markers = m.host.querySelectorAll('[data-mol-id="annotation-pin-marker"]')
    ;(markers[0] as HTMLElement).click()
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('renders the add-pin surface button when onSurfaceClick is set', async () => {
    const m = await renderLayer({ pins: [], onSurfaceClick: vi.fn() })
    const addPin = m.host.querySelector(
      '[data-mol-id="annotation-layer-add-pin"]',
    ) as HTMLButtonElement | null
    expect(addPin?.getAttribute('aria-label')).toBe('Add annotation pin')
    expect(addPin?.getAttribute('role')).toBeNull() // a native button — keyboard reachable by default
  })

  it('does not render the add-pin button (a dead tab stop) without onSurfaceClick', async () => {
    const m = await renderLayer({ pins: [] })
    expect(m.host.querySelector('[data-mol-id="annotation-layer-add-pin"]')).toBeNull()
  })

  /**
   * Stub the add-pin button's box (jsdom default getBoundingClientRect
   * returns 0×0) for a realistic test of the coordinate maths. The
   * button covers the layer, so this is the layer's box.
   *
   * @param host - Rendered host.
   * @param rect - Box to return.
   * @returns The add-pin button element.
   */
  function stubAddPinButton(host: HTMLElement, rect: DOMRect): HTMLElement {
    const addPin = host.querySelector('[data-mol-id="annotation-layer-add-pin"]') as HTMLElement
    addPin.getBoundingClientRect = (() => rect) as () => DOMRect
    return addPin
  }

  it('fires onSurfaceClick with normalised coordinates when the surface is clicked', async () => {
    const onSurfaceClick = vi.fn()
    const m = await renderLayer({ pins: [], onSurfaceClick })
    const addPin = stubAddPinButton(m.host, { left: 0, top: 0, width: 200, height: 100 } as DOMRect)
    // detail: 1 — a pointer-initiated click.
    addPin.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 25,
        detail: 1,
      }),
    )
    expect(onSurfaceClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 0.25, y: 0.25 })
  })

  it('fires onSurfaceClick with raw px when normalised=false', async () => {
    const onSurfaceClick = vi.fn()
    const m = await renderLayer({ pins: [], onSurfaceClick, normalised: false })
    const addPin = stubAddPinButton(m.host, {
      left: 10,
      top: 5,
      width: 200,
      height: 100,
    } as DOMRect)
    addPin.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 60,
        clientY: 25,
        detail: 1,
      }),
    )
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 50, y: 20 })
  })

  it('places a pin at the surface centre on keyboard activation (Enter/Space → detail 0)', async () => {
    const onSurfaceClick = vi.fn()
    const m = await renderLayer({ pins: [], onSurfaceClick })
    const addPin = stubAddPinButton(m.host, { left: 0, top: 0, width: 200, height: 100 } as DOMRect)
    // jsdom does not implement native button activation, so it cannot
    // synthesize the Enter/Space keydown → click pair. Browsers deliver
    // that click with `detail === 0` and no coordinates — fire exactly
    // that event to exercise the keyboard branch.
    addPin.click()
    expect(onSurfaceClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 0.5, y: 0.5 })
  })

  it('places a keyboard-activated pin at the centre in raw px when normalised=false', async () => {
    const onSurfaceClick = vi.fn()
    const m = await renderLayer({ pins: [], onSurfaceClick, normalised: false })
    const addPin = stubAddPinButton(m.host, {
      left: 10,
      top: 5,
      width: 200,
      height: 100,
    } as DOMRect)
    addPin.click()
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 100, y: 50 })
  })

  it('does not fire onSurfaceClick if the click target is inside a pin (e.g. via popup)', async () => {
    const onSurfaceClick = vi.fn()
    const m = await renderLayer({ pins: samplePins, activePinId: 'a', onSurfaceClick })
    const popup = m.host.querySelector('[data-mol-id="annotation-pin-popup"]') as HTMLElement
    popup.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('forwards normalised=false to child pins (positions in px)', async () => {
    const m = await renderLayer({
      pins: [{ id: 'p', position: { x: 30, y: 40 } }],
      normalised: false,
    })
    const pin = m.host.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(pin?.style.left).toBe('30px')
    expect(pin?.style.top).toBe('40px')
  })

  it('uses translated region aria-label', async () => {
    const m = await renderLayer({ pins: [] })
    const layer = m.host.querySelector('[data-mol-id="annotation-layer"]')
    expect(layer?.getAttribute('aria-label')).toBe('Annotation layer')
  })
})
