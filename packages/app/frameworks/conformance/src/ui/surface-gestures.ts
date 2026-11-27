import { describe, expect, it } from 'vitest'

import type { ElementDrag, ElementDragProps, ElementZoomSample } from '@molecule/app-ui'

import { capturePage, pixelCaptureDir, writePixelCapture } from './pixel-capture.js'

type Framework = 'react' | 'vue' | 'svelte' | 'solid' | 'angular'
type MountSurface = (container: HTMLElement, options: ElementDrag | ElementDragProps) => () => void

/** Locates the mounted outer frame and gives it a nonzero viewport offset. */
function surface(): HTMLElement {
  const host = document.querySelector<HTMLElement>('[data-testid="gesture-surface"]')
  if (!host) throw new Error('The kit did not mount the gesture surface')
  host.getBoundingClientRect = () => new DOMRect(40, 60, 160, 120)
  return host
}

/** Dispatches one hardware-shaped touch pointer event. */
function touch(
  target: EventTarget,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
  isPrimary = pointerId === 1,
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      pointerId,
      isPrimary,
      clientX,
      clientY,
    }),
  )
}

/** Dispatches a cancelable wheel event with line units. */
function wheel(target: EventTarget, ctrlKey = true): boolean {
  return target.dispatchEvent(
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 73,
      clientY: 92,
      deltaY: -3,
      deltaMode: 1,
      ctrlKey,
    }),
  )
}

/** Mounts a case, captures its pages and releases every test host. */
function setup(
  mount: MountSurface,
  framework: Framework,
  name: string,
  options: ElementDrag | ElementDragProps,
  test: () => void,
): void {
  const container = document.createElement('div')
  container.setAttribute('data-parity-unwrap', '')
  document.body.append(container)
  try {
    const unmount = mount(container, options)
    try {
      const before = pixelCaptureDir() ? capturePage(document) : undefined
      test()
      if (before) {
        writePixelCapture(framework, {
          reference: '@molecule/app-ui-react',
          component: 'GestureSurface',
          case: name,
          pages: [before, capturePage(document)],
        })
      }
    } finally {
      unmount()
    }
  } finally {
    container.remove()
  }
}

/**
 * Runs the same DOM and ordered gesture assertions against the React reference and every web kit.
 *
 * @param framework - The framework running the fixture.
 * @param mount - Mounts a section with a nested, focusable button and returns its cleanup.
 */
export function runSurfaceGestureConformance(framework: Framework, mount: MountSurface): void {
  describe('surface gesture conformance', () => {
    it('delivers focal wheel in the outer frame and lets ordinary wheel scroll', () => {
      const trace: ElementZoomSample[] = []
      setup(
        mount,
        framework,
        'focal wheel',
        { zoom: { wheel: 'ctrl', onZoom: (sample) => trace.push(sample) } },
        () => {
          const host = surface()
          const button = host.querySelector('button')
          if (!button) throw new Error('The kit did not mount the child button')
          button.getBoundingClientRect = () => new DOMRect(70, 80, 40, 20)
          button.focus()

          expect(wheel(button, false)).toBe(true)
          expect(wheel(button)).toBe(false)
          expect(trace).toEqual([{ kind: 'wheel', at: { x: 33, y: 32 }, deltaY: -3, deltaMode: 1 }])
          expect(document.activeElement).toBe(button)
          expect(host.localName).toBe('section')
          expect(host.getAttribute('aria-label')).toBe('Editing surface')
          expect(button.textContent).toBe('Edit')
          expect(host.hasAttribute('zoom')).toBe(false)
        },
      )
    })

    it('keeps the initiating contact when a second finger touches an ordinary drag', () => {
      const trace: unknown[] = []
      const drag: ElementDrag = {
        onStart: ({ x, y, dx, dy }) => trace.push(['start', x, y, dx, dy]),
        onMove: ({ x, y, dx, dy }) => trace.push(['move', x, y, dx, dy]),
        onEnd: ({ x, y, dx, dy }) => trace.push(['end', x, y, dx, dy]),
        onCancel: () => trace.push(['cancel']),
      }
      setup(mount, framework, 'ordinary drag', drag, () => {
        const host = surface()
        const button = host.querySelector('button')
        if (!button) throw new Error('The kit did not mount the child button')
        touch(button, 'pointerdown', 1, 52, 68)
        touch(window, 'pointerup', 1, 52, 68)
        expect(trace).toEqual([])
        touch(host, 'pointerdown', 1, 60, 80)
        touch(host, 'pointerdown', 2, 100, 90)
        touch(window, 'pointermove', 2, 110, 90)
        touch(window, 'pointerup', 2, 110, 90)
        touch(window, 'pointermove', 1, 220, 121)
        touch(window, 'pointerup', 1, 222, 123)
        expect(trace).toEqual([
          ['start', 20, 20, 0, 0],
          ['move', 180, 61, 160, 41],
          ['end', 182, 63, 162, 43],
        ])
      })
    })

    it.each(['cancel', 'end'])(
      'closes drag once through %s, then rebases a surviving contact',
      (terminal) => {
        const trace: unknown[] = []
        const drag: ElementDrag = {
          onStart: ({ x, y, dx, dy }) => trace.push(['start', x, y, dx, dy]),
          onMove: ({ x, y, dx, dy }) => trace.push(['move', x, y, dx, dy]),
          onEnd: ({ x, y, dx, dy }) => trace.push(['end', x, y, dx, dy]),
          onCancel: terminal === 'cancel' ? ({ x, y }) => trace.push(['cancel', x, y]) : undefined,
        }
        setup(
          mount,
          framework,
          `pinch takeover through ${terminal}`,
          { drag, zoom: { wheel: 'all', onZoom: (sample) => trace.push(sample) } },
          () => {
            const host = surface()
            touch(host, 'pointerdown', 1, 60, 80)
            touch(host, 'pointerdown', 2, 100, 80)
            expect(wheel(host)).toBe(true)
            touch(window, 'pointermove', 2, 120, 80)
            touch(host, 'pointerdown', 3, 160, 80)
            touch(window, 'pointermove', 3, 170, 80)
            touch(window, 'pointerup', 1, 60, 80)
            touch(window, 'pointermove', 3, 195, 80)
            touch(window, 'pointerup', 2, 120, 80)
            touch(window, 'pointermove', 3, 205, 90)
            touch(window, 'pointerup', 3, 210, 92)

            // Lifting both contacts without a new move must never start a phantom drag.
            touch(host, 'pointerdown', 1, 60, 80)
            touch(host, 'pointerdown', 2, 100, 80)
            touch(window, 'pointerup', 1, 60, 80)
            touch(window, 'pointerup', 2, 100, 80)
            expect(trace).toEqual([
              ['start', 20, 20, 0, 0],
              terminal === 'cancel' ? ['cancel', 20, 20] : ['end', 20, 20, 0, 0],
              { kind: 'pinch', from: { x: 40, y: 20 }, at: { x: 50, y: 20 }, factor: 1.5 },
              { kind: 'pinch', from: { x: 105, y: 20 }, at: { x: 117.5, y: 20 }, factor: 1.5 },
              ['start', 155, 20, 0, 0],
              ['move', 165, 30, 10, 10],
              ['end', 170, 32, 15, 12],
              ['start', 20, 20, 0, 0],
              terminal === 'cancel' ? ['cancel', 20, 20] : ['end', 20, 20, 0, 0],
            ])
          },
        )
      },
    )
  })
}
