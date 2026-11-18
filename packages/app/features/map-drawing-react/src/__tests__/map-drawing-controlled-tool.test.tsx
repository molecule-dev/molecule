/**
 * A CONTROLLED `activeTool` change discards an in-progress draft in the same
 * commit, while an uncontrolled re-render leaves the draft untouched.
 *
 * @module
 */

// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { MapDrawing } from '../MapDrawing.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Stub the surface element's bounding rect so client coords map cleanly onto a
 * synthetic 200x200 surface.
 *
 * @param container - Render container.
 */
function stubSurfaceRect(container: HTMLElement): void {
  const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
  surface.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<MapDrawing> controlled tool change', () => {
  it('discards an in-progress polygon draft when the activeTool prop changes', () => {
    const { container, rerender } = render(
      <Wrap>
        <MapDrawing onChange={() => {}} activeTool="polygon" />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 10 })
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    rerender(
      <Wrap>
        <MapDrawing onChange={() => {}} activeTool="circle" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).toBeNull()
  })

  it('keeps the draft when an uncontrolled re-render does not switch tools', () => {
    const { container, rerender } = render(
      <Wrap>
        <MapDrawing onChange={() => {}} />
      </Wrap>,
    )
    stubSurfaceRect(container)
    const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 10 })
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    rerender(
      <Wrap>
        <MapDrawing onChange={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
  })
})
