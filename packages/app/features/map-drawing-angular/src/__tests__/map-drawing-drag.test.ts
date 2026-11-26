// @vitest-environment jsdom
/**
 * The surface follows one pointer contact from its press to its release, the way
 * `@molecule/app-map-drawing-react` does through the `drag` binding of its surface `Box`: the
 * contact is followed outside the surface, it commits at the release position, an interruption
 * discards it, and a press that belongs to something else is left alone. Mounted through
 * Angular's real renderer in jsdom.
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
// `surface`), so tests can assert which cm.* class was applied without a real
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
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { MapShape } from '../types.js'

const { MapDrawing } = await import('../map-drawing.component.js')

/**
 * The host template every test mounts: one attribute-selector view with every input bound, and
 * the given markup projected into the map slot.
 *
 * @param slot - Markup carrying `slot="mapSlot"`, or an empty string for no map.
 * @returns The template.
 */
const template = (slot: string): string =>
  `<div mol-map-drawing [initialShapes]="p['initialShapes']" [onChange]="p['onChange']" [tools]="p['tools']" [activeTool]="p['activeTool']" [width]="p['width']" [height]="p['height']" [className]="p['className']">${slot}</div>`

/** No map under the surface. */
const NO_MAP = ''
/** A plain map under the surface. */
const MAP = '<div slot="mapSlot"><div data-map="">Map</div></div>'
/** A map whose controls each own a press, as a real map's zoom button and search field do. */
const MAP_WITH_CONTROLS =
  '<div slot="mapSlot"><div data-map="">' +
  '<button type="button">Zoom</button><a href="#nearby">Nearby</a><input data-search="" />' +
  '<label data-label=""><span data-in-label="">Label</span></label>' +
  '<div role="button" data-role-button=""></div><div role="link" data-role-link=""></div>' +
  '<div contenteditable="true" data-editable=""></div><textarea data-area=""></textarea>' +
  '<select data-select=""></select><div data-plain="">Plain map</div></div></div>'

/** A mounted spec host: its DOM, a props write, a change-detection flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection, as a parent's re-render does. */
  setProps(next: Record<string, unknown>): void
  /** Runs change detection, as a click or key press in a live app would. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The mounts of the current test, destroyed after it. */
const mounted: Mounted[] = []

/** How many spec hosts have been created, so each one's generated component ID is unique. */
let specHostCount = 0

/**
 * Mounts the surface through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @param slot - The markup projected into the map slot.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>, slot: string = NO_MAP): Promise<Mounted> {
  specHostCount += 1
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MapDrawing as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { [`data-spec-host-${specHostCount}`]: '' },
    template: template(slot),
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { onChange: vi.fn(), ...props }
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
  const spec: Mounted = {
    host,
    setProps: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    flush: () => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(spec)
  return spec
}

/**
 * Mounts a `MapDrawing` with the given props.
 *
 * @param props - Component props.
 * @param slot - The markup projected into the map slot.
 * @returns The host element.
 */
async function render(props: Record<string, unknown>, slot = NO_MAP): Promise<HTMLElement> {
  return (await mount(props, slot)).host
}

/**
 * Destroys one mounted host, as a page removing the surface does.
 *
 * @param host - The host element.
 */
async function unmount(host: HTMLElement): Promise<void> {
  const index = mounted.findIndex((spec) => spec.host === host)
  if (index < 0) return
  await mounted.splice(index, 1)[0].destroy()
}

/** Runs change detection on every mounted host. */
function flush(): void {
  for (const spec of mounted) spec.flush()
}

/**
 * Stub the surface element's bounding rect as a 200x200 box at the given
 * viewport position, so client coords map onto surface coords.
 *
 * @param container - The host element.
 * @param left - The box's left edge in the viewport.
 * @param top - The box's top edge in the viewport.
 */
function stubSurfaceRect(container: HTMLElement, left = 0, top = 0): void {
  surfaceOf(container).getBoundingClientRect = () =>
    ({
      left,
      top,
      width: 200,
      height: 200,
      right: left + 200,
      bottom: top + 200,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
}

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel'

/** What a dispatched pointer says about itself beyond its position. */
interface PointerInit {
  /** The pointer the browser gives the contact. */
  pointerId?: number
  /** The button that changed: 0 for the primary button. */
  button?: number
  /** The kind of device. A value makes `isPrimary` decide the press. */
  pointerType?: string
  /** Whether this is the first contact of its kind on the surface. */
  isPrimary?: boolean
}

/**
 * Dispatch a browser pointer event at an element or at the window, then run
 * change detection.
 *
 * @param target - Element or window to dispatch on.
 * @param type - Event type.
 * @param x - Viewport X.
 * @param y - Viewport Y.
 * @param init - The contact the event reports.
 */
function pointer(
  target: Element | Window,
  type: PointerType,
  x = 0,
  y = 0,
  init: PointerInit = {},
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: init.pointerId ?? 1,
      button: init.button ?? 0,
      pointerType: init.pointerType ?? '',
      isPrimary: init.isPrimary ?? false,
    }),
  )
  flush()
}

/**
 * Dispatch a double-click on an element.
 *
 * @param target - Element to dispatch on.
 */
function doubleClick(target: Element): void {
  target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
  flush()
}

/**
 * Dispatch a cancelable `touchmove` with the given number of touches on the page.
 *
 * @param count - How many fingers the event reports.
 * @returns Whether a listener cancelled it.
 */
function touchMove(count: number): boolean {
  const touches = Array.from({ length: count }, (_, index) => ({
    clientX: 10 + index,
    clientY: 20 + index,
  }))
  const event = new Event('touchmove', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: touches })
  document.body.dispatchEvent(event)
  return event.defaultPrevented
}

/**
 * The surface element of a render.
 *
 * @param container - The host element.
 * @returns The surface element.
 */
function surfaceOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
}

/**
 * The open circle draft as its center and radius.
 *
 * @param container - The host element.
 * @returns The draft's `cx`, `cy` and `r`, or `null` when none is open.
 */
function circleDraft(container: HTMLElement): string | null {
  const draft = container.querySelector('[data-mol-id="map-drawing-draft-circle"]')
  return draft
    ? `cx=${draft.getAttribute('cx')} cy=${draft.getAttribute('cy')} r=${draft.getAttribute('r')}`
    : null
}

/**
 * The open path draft: which kind, its points and how many vertices it has.
 *
 * @param container - The host element.
 * @returns The draft's id, points and vertex count, or `null` when none is open.
 */
function pathDraft(container: HTMLElement): {
  id: string | null
  points: string | null
  vertices: number
} | null {
  const draft = container.querySelector(
    '[data-mol-id="map-drawing-draft-polygon"], [data-mol-id="map-drawing-draft-line"]',
  )
  return draft
    ? {
        id: draft.getAttribute('data-mol-id'),
        points: draft.getAttribute('points'),
        vertices: container.querySelectorAll('[data-mol-id="map-drawing-draft-vertex"]').length,
      }
    : null
}

/**
 * The open marquee rectangle as its position and size.
 *
 * @param container - The host element.
 * @returns The rectangle's `x`, `y`, `width` and `height`, or `null` when none is open.
 */
function selectionRect(container: HTMLElement): string | null {
  const rect = container.querySelector('[data-mol-id="map-drawing-selection-rect"]')
  return rect
    ? `x=${rect.getAttribute('x')} y=${rect.getAttribute('y')} w=${rect.getAttribute('width')} h=${rect.getAttribute('height')}`
    : null
}

/**
 * Whether the toolbar's cancel-draft button is disabled.
 *
 * @param container - The host element.
 * @returns `true` while no draft is open.
 */
function cancelDisabled(container: HTMLElement): boolean {
  return (
    container.querySelector('[data-mol-id="map-drawing-tool-cancel-draft"]') as HTMLButtonElement
  ).disabled
}

/**
 * Whether the toolbar's delete button is disabled.
 *
 * @param container - The host element.
 * @returns `true` while no shape is selected.
 */
function deleteDisabled(container: HTMLElement): boolean {
  return (container.querySelector('[data-mol-id="map-drawing-tool-delete"]') as HTMLButtonElement)
    .disabled
}

/**
 * Clicks the toolbar's delete button.
 *
 * @param container - The host element.
 */
function clickDelete(container: HTMLElement): void {
  ;(container.querySelector('[data-mol-id="map-drawing-tool-delete"]') as HTMLButtonElement).click()
  flush()
}

/**
 * The shapes of one `onChange` call, without the ids the component mints.
 *
 * @param onChange - The change callback.
 * @param call - Which call, from 0.
 * @returns The shapes it reported.
 */
function shapes(onChange: ReturnType<typeof vi.fn>, call = 0): unknown[] {
  return (
    (onChange.mock.calls[call]?.[0] as MapShape[] | undefined)?.map((shape) => ({
      kind: shape.kind,
      geometry: shape.geometry,
      properties: shape.properties,
    })) ?? []
  )
}

/**
 * The geometries of every `onChange` call, in order.
 *
 * @param onChange - The change callback.
 * @returns Each call's geometries.
 */
function geometries(onChange: ReturnType<typeof vi.fn>): unknown[] {
  return onChange.mock.calls.map(([list]) => (list as MapShape[]).map((shape) => shape.geometry))
}

/** Three pins whose positions the marquee cases rely on. */
const seedPins: MapShape[] = [
  { id: 'a', kind: 'pin', geometry: { type: 'Point', coordinates: [10, 10] } },
  { id: 'b', kind: 'pin', geometry: { type: 'Point', coordinates: [50, 50] } },
  { id: 'c', kind: 'pin', geometry: { type: 'Point', coordinates: [150, 150] } },
]

afterEach(async () => {
  for (const spec of mounted.splice(0)) await spec.destroy()
  document.body.innerHTML = ''
})

describe('<MapDrawing> drag', () => {
  it('commits a circle from the release position when the pointer never moved', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50)
    pointer(surface, 'pointerup', 90, 50)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [50, 50] },
        properties: { radiusMeters: 40 },
      },
    ])
    expect(circleDraft(container)).toBeNull()
    expect(cancelDisabled(container)).toBe(true)
  })

  it('follows the pointer outside the surface while dragging a circle', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=0')

    pointer(window, 'pointermove', 180, 50)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=130')

    pointer(document.body, 'pointermove', 50, -90)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=140')

    pointer(document.body, 'pointerup', 50, 190)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [50, 50] },
        properties: { radiusMeters: 140 },
      },
    ])
  })

  it('reports every position relative to a surface that is not at the origin', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container, 100, 60)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 150, 110)
    pointer(window, 'pointermove', 350, 110)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=200')

    pointer(window, 'pointerup', 250, 110)
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [50, 50] },
        properties: { radiusMeters: 100 },
      },
    ])

    const marquee = await render({ initialShapes: seedPins, onChange, activeTool: 'select' })
    stubSurfaceRect(marquee, 100, 60)
    pointer(surfaceOf(marquee), 'pointerdown', 100, 60)
    pointer(window, 'pointermove', 220, 180)
    expect(selectionRect(marquee)).toBe('x=0 y=0 w=120 h=120')
    expect(cancelDisabled(marquee)).toBe(false)
  })

  it('selects from the marquee release position, with or without a pointer move', async () => {
    const onChange = vi.fn()
    const container = await render({ initialShapes: seedPins, onChange, activeTool: 'select' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    // No pointer move at all: the marquee spans the press and the release.
    pointer(surface, 'pointerdown', 0, 0)
    expect(selectionRect(container)).toBe('x=0 y=0 w=0 h=0')
    pointer(surface, 'pointerup', 120, 120)
    expect(selectionRect(container)).toBeNull()
    expect(cancelDisabled(container)).toBe(true)
    expect(deleteDisabled(container)).toBe(false)
    clickDelete(container)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]?.[0] as MapShape[]).map((shape) => shape.id)).toEqual(['c'])

    // The marquee follows the pointer outside the surface and releases there.
    const outside = await render({ initialShapes: seedPins, onChange, activeTool: 'select' })
    stubSurfaceRect(outside)
    pointer(surfaceOf(outside), 'pointerdown', 0, 0)
    expect(selectionRect(outside)).toBe('x=0 y=0 w=0 h=0')
    pointer(window, 'pointermove', 80, 40)
    expect(selectionRect(outside)).toBe('x=0 y=0 w=80 h=40')
    pointer(window, 'pointermove', 300, 60)
    expect(selectionRect(outside)).toBe('x=0 y=0 w=300 h=60')
    pointer(window, 'pointermove', -40, 260)
    expect(selectionRect(outside)).toBe('x=-40 y=0 w=40 h=260')
    pointer(window, 'pointerup', 220, 180)
    expect(selectionRect(outside)).toBeNull()
    expect(deleteDisabled(outside)).toBe(false)
    clickDelete(outside)
    expect(onChange).toHaveBeenCalledTimes(2)
    // That marquee took in every pin, so nothing is left.
    expect((onChange.mock.calls[1]?.[0] as MapShape[]).map((shape) => shape.id)).toEqual([])
    expect(deleteDisabled(outside)).toBe(true)
  })

  it('places a pin at the press and leaves a second pointer alone until the first releases', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'pin' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 10, 20)
    // A second finger while the first is down: the first contact still owns the surface.
    pointer(surface, 'pointerdown', 30, 40, { pointerId: 2 })
    expect(geometries(onChange)).toEqual([[{ type: 'Point', coordinates: [10, 20] }]])

    pointer(window, 'pointerup', 30, 40, { pointerId: 2 })
    // The first pointer releases far outside: a pin never waits for its release.
    pointer(window, 'pointerup', 300, 300)
    expect(onChange).toHaveBeenCalledTimes(1)

    pointer(surface, 'pointerdown', 30, 40)
    pointer(surface, 'pointerup', 30, 40)
    expect(geometries(onChange)).toEqual([
      [{ type: 'Point', coordinates: [10, 20] }],
      [
        { type: 'Point', coordinates: [10, 20] },
        { type: 'Point', coordinates: [30, 40] },
      ],
    ])
    expect(container.querySelectorAll('[data-shape-kind="pin"]')).toHaveLength(2)
  })

  it('ignores a press from a non-primary button', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'pin' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    for (const button of [2, 1, -1]) {
      pointer(surface, 'pointerdown', 10, 20, { button })
      pointer(surface, 'pointerup', 10, 20, { button })
    }
    expect(onChange).not.toHaveBeenCalled()

    const polygon = await render({ onChange, activeTool: 'polygon' })
    stubSurfaceRect(polygon)
    pointer(surfaceOf(polygon), 'pointerdown', 10, 20, { button: 2 })
    expect(pathDraft(polygon)).toBeNull()
    expect(cancelDisabled(polygon)).toBe(true)

    // The primary button still presses.
    pointer(surface, 'pointerdown', 10, 20)
    pointer(surface, 'pointerup', 10, 20)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ignores a press on a control inside the map slot', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'pin' }, MAP_WITH_CONTROLS)
    stubSurfaceRect(container)

    // A control keeps its press: the link, not the surface, takes it.
    const controls = [
      'button',
      'a',
      'input',
      '[data-label]',
      '[data-in-label]',
      '[data-role-button]',
      '[data-role-link]',
      '[data-editable]',
      '[data-area]',
      '[data-select]',
    ]
    for (const selector of controls) {
      const control = container.querySelector(selector) as Element
      pointer(control, 'pointerdown', 10, 20)
      pointer(control, 'pointerup', 10, 20)
    }
    expect(onChange).not.toHaveBeenCalled()
    expect(cancelDisabled(container)).toBe(true)

    // The rest of the slot is the map: a press there places a pin.
    const map = [
      '[data-plain]',
      '[data-map]',
      '[data-mol-id="map-drawing-slot"]',
      '[data-mol-id="map-drawing-overlay"]',
    ]
    for (const selector of map) {
      const spot = container.querySelector(selector) as Element
      pointer(spot, 'pointerdown', 10, 20)
      pointer(spot, 'pointerup', 10, 20)
    }
    expect(onChange).toHaveBeenCalledTimes(map.length)
  })

  it('ignores a non-primary pointer', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'pin' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    // A second finger, and a pointer its host reports as not the primary one.
    for (const init of [
      { pointerId: 2, pointerType: 'touch', isPrimary: false },
      { pointerId: 1, pointerType: 'mouse', isPrimary: false },
    ]) {
      pointer(surface, 'pointerdown', 10, 20, init)
      pointer(surface, 'pointerup', 10, 20, init)
    }
    expect(onChange).not.toHaveBeenCalled()

    const touch = { pointerType: 'touch', isPrimary: true }
    pointer(surface, 'pointerdown', 10, 20, touch)
    pointer(surface, 'pointerup', 10, 20, touch)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ignores other pointers while a drag is in progress', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50)
    pointer(window, 'pointermove', 120, 120, { pointerId: 2 })
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=0')

    pointer(surface, 'pointerdown', 100, 100, { pointerId: 2 })
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=0')

    pointer(window, 'pointerup', 120, 120, { pointerId: 2 })
    pointer(window, 'pointercancel', 0, 0, { pointerId: 2 })
    expect(onChange).not.toHaveBeenCalled()
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=0')

    // The contact's own pointer still commits it, where that pointer releases.
    pointer(window, 'pointerup', 80, 90)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [50, 50] },
        properties: { radiusMeters: 50 },
      },
    ])
  })

  it('restarts the circle where the same pointer presses again', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50)
    pointer(window, 'pointermove', 80, 50)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=30')

    // The release never reached the surface: the next press starts a new circle there.
    pointer(surface, 'pointerdown', 70, 70)
    expect(circleDraft(container)).toBe('cx=70 cy=70 r=0')

    pointer(surface, 'pointerup', 80, 90)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [70, 70] },
        properties: { radiusMeters: Math.sqrt(500) },
      },
    ])
  })

  it('discards a circle draft when the window loses focus', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50)
    pointer(surface, 'pointermove', 80, 90)
    window.dispatchEvent(new Event('blur'))
    flush()

    expect(circleDraft(container)).toBeNull()
    expect(cancelDisabled(container)).toBe(true)
    pointer(window, 'pointerup', 80, 90)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('discards a circle draft when the pointer capture is lost', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50, { pointerId: 7 })
    pointer(surface, 'pointermove', 80, 50, { pointerId: 7 })
    // A capture lost for another pointer is not this contact's.
    surface.dispatchEvent(new Event('lostpointercapture'))
    flush()
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=30')

    surface.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: 7 }))
    flush()
    expect(circleDraft(container)).toBeNull()
    expect(cancelDisabled(container)).toBe(true)

    pointer(window, 'pointerup', 80, 50, { pointerId: 7 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('takes pointer capture on the surface and releases it when the drag ends', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)
    // jsdom has no pointer capture, so the surface reports what it is asked to do.
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.assign(surface, { setPointerCapture, releasePointerCapture })

    pointer(surface, 'pointerdown', 50, 50, { pointerId: 7 })
    expect(setPointerCapture.mock.calls).toEqual([[7]])

    pointer(window, 'pointermove', 80, 50, { pointerId: 7 })
    expect(releasePointerCapture).not.toHaveBeenCalled()

    pointer(window, 'pointerup', 80, 50, { pointerId: 7 })
    expect(releasePointerCapture.mock.calls).toEqual([[7]])
    expect(shapes(onChange)).toHaveLength(1)

    // A press that carries no pointer id captures nothing, and still draws.
    const withoutId = Object.assign(new Event('pointerdown', { bubbles: true }), {
      clientX: 50,
      clientY: 50,
    })
    surface.dispatchEvent(withoutId)
    flush()
    expect(setPointerCapture).toHaveBeenCalledTimes(1)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=0')
    // Its release carries no id either: that contact ends, with nothing captured to give back.
    surface.dispatchEvent(new Event('pointerup', { bubbles: true }))
    flush()
    expect(circleDraft(container)).toBeNull()
    expect(releasePointerCapture.mock.calls).toEqual([[7]])

    // An interruption gives the capture back without a release.
    pointer(surface, 'pointerdown', 50, 50, { pointerId: 8 })
    expect(setPointerCapture.mock.calls).toEqual([[7], [8]])
    pointer(window, 'pointercancel', 0, 0, { pointerId: 8 })
    expect(releasePointerCapture.mock.calls).toEqual([[7], [8]])
    expect(circleDraft(container)).toBeNull()
  })

  it('keeps drawing when the browser rejects pointer capture', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)
    Object.assign(surface, {
      setPointerCapture: () => {
        throw new DOMException('No active pointer with that id', 'NotFoundError')
      },
      releasePointerCapture: vi.fn(),
    })

    pointer(surface, 'pointerdown', 50, 50, { pointerId: 9 })
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=0')

    pointer(window, 'pointermove', 80, 50, { pointerId: 9 })
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=30')

    pointer(window, 'pointerup', 90, 50, { pointerId: 9 })
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [50, 50] },
        properties: { radiusMeters: 40 },
      },
    ])
    expect(cancelDisabled(container)).toBe(true)
  })

  it('cancels a one-finger touchmove only during a touch drag', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    expect(touchMove(1)).toBe(false)

    const touch = { pointerType: 'touch', isPrimary: true }
    pointer(surface, 'pointerdown', 50, 50, touch)
    expect(touchMove(1)).toBe(true)
    expect(touchMove(2)).toBe(false)

    pointer(window, 'pointerup', 80, 50, touch)
    expect(touchMove(1)).toBe(false)
    expect(shapes(onChange)[0]).toEqual(
      expect.objectContaining({ properties: { radiusMeters: 30 } }),
    )

    // A mouse drag never takes the touch.
    const mouse = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(mouse)
    pointer(surfaceOf(mouse), 'pointerdown', 50, 50)
    expect(touchMove(1)).toBe(false)
    pointer(surfaceOf(mouse), 'pointerup', 90, 50)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('commits while the release is still in the window capture phase', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)
    const order: string[] = []
    onChange.mockImplementation(() => {
      order.push('commit')
    })
    const overlay = container.querySelector('[data-mol-id="map-drawing-overlay"]') as Element
    const onOverlayCapture = (): void => {
      order.push('overlay capture')
    }
    const onOverlayBubble = (): void => {
      order.push('overlay bubble')
    }
    const onDocumentBubble = (): void => {
      order.push('document bubble')
    }
    overlay.addEventListener('pointerup', onOverlayCapture, true)
    overlay.addEventListener('pointerup', onOverlayBubble)
    document.addEventListener('pointerup', onDocumentBubble)

    pointer(surface, 'pointerdown', 50, 50)
    pointer(overlay, 'pointerup', 90, 50)

    overlay.removeEventListener('pointerup', onOverlayCapture, true)
    overlay.removeEventListener('pointerup', onOverlayBubble)
    document.removeEventListener('pointerup', onDocumentBubble)
    expect(order).toEqual(['commit', 'overlay capture', 'overlay bubble', 'document bubble'])
  })

  it('commits nothing on a release with no contact in progress', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(window, 'pointerup', 80, 50)
    pointer(surface, 'pointerup', 80, 50)
    expect(onChange).not.toHaveBeenCalled()
    expect(circleDraft(container)).toBeNull()
    expect(cancelDisabled(container)).toBe(true)

    // The next press still starts a contact, which commits where it releases.
    pointer(surface, 'pointerdown', 50, 50)
    pointer(window, 'pointerup', 90, 50)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(shapes(onChange)[0]).toEqual(
      expect.objectContaining({ properties: { radiusMeters: 40 } }),
    )
  })

  it('commits nothing when the draft is cancelled mid-drag', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)

    pointer(surface, 'pointerdown', 50, 50)
    pointer(surface, 'pointermove', 80, 90)
    ;(
      container.querySelector('[data-mol-id="map-drawing-tool-cancel-draft"]') as HTMLButtonElement
    ).click()
    flush()
    expect(circleDraft(container)).toBeNull()
    expect(cancelDisabled(container)).toBe(true)

    // The pointer is still down: neither its next move nor its release draws anything.
    pointer(window, 'pointermove', 90, 90)
    pointer(window, 'pointerup', 90, 90)
    expect(onChange).not.toHaveBeenCalled()
    expect(circleDraft(container)).toBeNull()

    // The next press starts a clean contact that follows the pointer again.
    pointer(surface, 'pointerdown', 50, 50)
    pointer(window, 'pointermove', 150, 50)
    expect(circleDraft(container)).toBe('cx=50 cy=50 r=100')
    pointer(window, 'pointerup', 150, 50)
    expect(shapes(onChange)).toEqual([
      {
        kind: 'circle',
        geometry: { type: 'Point', coordinates: [50, 50] },
        properties: { radiusMeters: 100 },
      },
    ])
  })

  it('commits nothing when the tool switches during a drag', async () => {
    const onChange = vi.fn()

    // The parent switches the controlled tool while the pointer is down.
    const controlled = await mount({ onChange, activeTool: 'circle' })
    const surface = surfaceOf(controlled.host)
    stubSurfaceRect(controlled.host)
    pointer(surface, 'pointerdown', 50, 50)
    pointer(window, 'pointermove', 80, 90)
    expect(circleDraft(controlled.host)).toBe('cx=50 cy=50 r=50')

    controlled.setProps({ activeTool: 'polygon' })
    expect(circleDraft(controlled.host)).toBeNull()
    expect(cancelDisabled(controlled.host)).toBe(true)
    pointer(window, 'pointerup', 80, 90)
    expect(onChange).not.toHaveBeenCalled()

    for (const [x, y] of [
      [10, 10],
      [60, 10],
    ]) {
      pointer(surface, 'pointerdown', x, y)
      pointer(surface, 'pointerup', x, y)
    }
    expect(pathDraft(controlled.host)).toEqual({
      id: 'map-drawing-draft-polygon',
      points: '10,10 60,10',
      vertices: 2,
    })

    // The toolbar switches the uncontrolled tool while the pointer is down.
    const toolbar = await render({ onChange })
    const toolbarSurface = surfaceOf(toolbar)
    stubSurfaceRect(toolbar)
    pointer(toolbarSurface, 'pointerdown', 50, 50)
    pointer(toolbarSurface, 'pointerup', 50, 50)
    pointer(toolbarSurface, 'pointerdown', 80, 90)
    pointer(toolbarSurface, 'pointermove', 100, 90)
    ;(toolbar.querySelector('[data-mol-id="map-drawing-tool-circle"]') as HTMLButtonElement).click()
    flush()
    expect(pathDraft(toolbar)).toBeNull()
    expect(toolbarSurface.getAttribute('data-active-tool')).toBe('circle')

    pointer(window, 'pointerup', 100, 90)
    expect(onChange).not.toHaveBeenCalled()

    pointer(toolbarSurface, 'pointerdown', 10, 10)
    expect(circleDraft(toolbar)).toBe('cx=10 cy=10 r=0')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('leaves path vertices alone when the pointer is cancelled or another pointer presses', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'polygon' })
    stubSurfaceRect(container)
    const surface = surfaceOf(container)
    const two = { id: 'map-drawing-draft-polygon', points: '10,10 100,10', vertices: 2 }

    pointer(surface, 'pointerdown', 10, 10)
    pointer(surface, 'pointerup', 10, 10)
    pointer(surface, 'pointerdown', 100, 10)
    // Another pointer pressing while this one is down adds no vertex.
    pointer(surface, 'pointerdown', 150, 150, { pointerId: 2 })
    pointer(window, 'pointerup', 150, 150, { pointerId: 2 })
    expect(pathDraft(container)).toEqual(two)

    // Interrupted: the contact ends, the vertices stay.
    pointer(window, 'pointercancel')
    expect(pathDraft(container)).toEqual(two)
    expect(cancelDisabled(container)).toBe(false)
    window.dispatchEvent(new Event('blur'))
    flush()
    expect(pathDraft(container)).toEqual(two)
    expect(onChange).not.toHaveBeenCalled()

    // The draft is still open: one more vertex and a double-click finish it.
    pointer(surface, 'pointerdown', 100, 100)
    pointer(surface, 'pointerup', 100, 100)
    doubleClick(surface)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(shapes(onChange)[0]).toEqual({
      kind: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [10, 10],
            [100, 10],
            [100, 100],
            [10, 10],
          ],
        ],
      },
    })
    expect(pathDraft(container)).toBeNull()
  })

  it('does not finish a path on a double-click that was already prevented', async () => {
    const onChange = vi.fn()
    const container = await render({ onChange, activeTool: 'polygon' }, MAP)
    stubSurfaceRect(container)
    const surface = surfaceOf(container)
    const map = container.querySelector('[data-map]') as Element
    map.addEventListener('dblclick', (event) => event.preventDefault())

    for (const [x, y] of [
      [10, 10],
      [100, 10],
      [100, 100],
    ]) {
      pointer(surface, 'pointerdown', x, y)
      pointer(surface, 'pointerup', x, y)
    }
    // The map claims this double-click: the draft stays open.
    doubleClick(map)
    expect(onChange).not.toHaveBeenCalled()
    expect(pathDraft(container)).toEqual({
      id: 'map-drawing-draft-polygon',
      points: '10,10 100,10 100,100',
      vertices: 3,
    })

    doubleClick(surface)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(pathDraft(container)).toBeNull()
  })

  it('stops following the pointer once the drag has ended or the surface unmounted', async () => {
    const onChange = vi.fn()
    const ended = await render({ onChange, activeTool: 'circle' })
    stubSurfaceRect(ended)
    pointer(surfaceOf(ended), 'pointerdown', 50, 50)
    pointer(surfaceOf(ended), 'pointerup', 90, 50)
    expect(onChange).toHaveBeenCalledTimes(1)
    const markup = ended.innerHTML

    pointer(window, 'pointermove', 150, 150)
    pointer(window, 'pointerup', 150, 150)
    pointer(window, 'pointercancel')
    window.dispatchEvent(new Event('blur'))
    flush()
    expect(ended.innerHTML).toBe(markup)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(cancelDisabled(ended)).toBe(true)

    const later = vi.fn()
    const gone = await render({ onChange: later, activeTool: 'circle' })
    stubSurfaceRect(gone)
    pointer(surfaceOf(gone), 'pointerdown', 50, 50)
    pointer(window, 'pointermove', 80, 90)
    expect(circleDraft(gone)).toBe('cx=50 cy=50 r=50')
    await unmount(gone)

    pointer(window, 'pointerup', 80, 90)
    pointer(window, 'pointercancel')
    window.dispatchEvent(new Event('blur'))
    flush()
    expect(later).not.toHaveBeenCalled()
  })
})
