// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { createRef, type ReactElement, useId } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, expectTypeOf, it, vi } from 'vitest'

import type { ElementHandle, SvgGroupProps, SvgMarkupProps } from '@molecule/app-ui'
import * as elements from '@molecule/app-ui-react/elements'

it('serializes definitions, ordered stops, clips, tiles, images and text as literal SVG', () => {
  const { Svg, SvgDefs, SvgClipPath, SvgLinearGradient, SvgPattern, G, Rect, SvgImage, SvgText } =
    elements
  const actual = renderToStaticMarkup(
    <Svg viewBox="0 0 50 40" webShapeRendering="crispEdges" translate="no">
      <SvgDefs>
        <SvgLinearGradient
          id="ink"
          x1={0}
          y1="15%"
          x2={40}
          y2="85%"
          gradientUnits="userSpaceOnUse"
          stops={[
            { offset: '50%', stopColor: 'currentColor' },
            { offset: '50%', stopColor: 'currentColor', stopOpacity: 0.25 },
          ]}
        />
        <SvgClipPath id="crop">
          <Rect width={25} height={40} />
        </SvgClipPath>
        <SvgPattern id="tile" x={0} y="10%" width={4} height="20%" patternUnits="objectBoundingBox">
          <Rect width={1} height={1} fill="url(#ink)" />
        </SvgPattern>
      </SvgDefs>
      <G clipPath="url(#crop)">
        <Rect width={50} height={40} fill="url(#tile)" />
        <SvgImage href="/logo.png" x={4} y="10%" width={10} height={8} preserveAspectRatio="none" />
      </G>
      <SvgText fontFamily="'A Family', system-ui">Label</SvgText>
    </Svg>,
  )
  expect(actual).toBe(
    '<svg viewBox="0 0 50 40" translate="no" shape-rendering="crispEdges">' +
      '<defs><linearGradient id="ink" x1="0" y1="15%" x2="40" y2="85%" gradientUnits="userSpaceOnUse">' +
      '<stop offset="50%" stop-color="currentColor"></stop>' +
      '<stop offset="50%" stop-color="currentColor" stop-opacity="0.25"></stop></linearGradient>' +
      '<clipPath id="crop"><rect width="25" height="40"></rect></clipPath>' +
      '<pattern id="tile" x="0" y="10%" width="4" height="20%" patternUnits="objectBoundingBox">' +
      '<rect width="1" height="1" fill="url(#ink)"></rect></pattern></defs>' +
      '<g clip-path="url(#crop)"><rect width="50" height="40" fill="url(#tile)"></rect>' +
      '<image href="/logo.png" x="4" y="10%" width="10" height="8" preserveAspectRatio="none"></image></g>' +
      '<text font-family="&#x27;A Family&#x27;, system-ui">Label</text></svg>',
  )
  expectTypeOf<Extract<'metadata', keyof SvgMarkupProps>>().toEqualTypeOf<never>()
  expectTypeOf<SvgGroupProps['clipPath']>().toEqualTypeOf<`url(#${string})` | undefined>()
})

it('owns metadata at the canvas and cell and forwards the cell hover and hit-testing props', () => {
  const { Svg, Rect } = elements
  const enter = vi.fn()
  const { container, getByRole } = render(
    <Svg
      aria-describedby="details"
      metadata={{ title: 'Map', description: { id: 'details', text: 'Overview' } }}
    >
      <Rect
        width={9}
        height={9}
        role="button"
        aria-label="Cell"
        metadata={{ title: 'Cell', description: { text: 'Monday' } }}
        pointerEvents="none"
        onMouseEnter={enter}
        style={{ pointerEvents: 'auto' }}
        webStyle={{ cursor: 'pointer' }}
      />
    </Svg>,
  )
  const canvas = container.querySelector('svg')
  expect(canvas?.outerHTML).toBe(
    '<svg aria-describedby="details"><title>Map</title><desc id="details">Overview</desc>' +
      '<rect width="9" height="9" role="button" aria-label="Cell" pointer-events="none" style="pointer-events: auto; cursor: pointer;">' +
      '<title>Cell</title><desc>Monday</desc></rect></svg>',
  )
  const cell = getByRole('button', { name: 'Cell' })
  fireEvent.mouseEnter(cell)
  expect(enter).toHaveBeenCalledOnce()
})

it('keeps same-page drawing references local and leaves markup content intact', () => {
  const { Svg, SvgMarkup, SvgDefs, SvgClipPath, G, Rect } = elements
  function Drawing(): ReactElement {
    const id = useId()
    return (
      <Svg aria-hidden="true" translate="no">
        <SvgDefs>
          <SvgClipPath id={id}>
            <Rect width={9} height={9} />
          </SvgClipPath>
        </SvgDefs>
        <G clipPath={`url(#${id})`}>
          <Rect width={9} height={9} />
        </G>
      </Svg>
    )
  }
  const { container } = render(
    <>
      <Drawing />
      <Drawing />
      <SvgMarkup
        markup={'<title>From markup</title><rect width="2" height="3"/>'}
        webShapeRendering="geometricPrecision"
      />
    </>,
  )
  const [first, second, markup] = Array.from(container.querySelectorAll('svg'))
  const ids = [first, second].map((svg) => {
    const id = svg.querySelector('clipPath')?.id
    expect(id).toBeTruthy()
    expect(svg.querySelector('g')?.getAttribute('clip-path')).toBe(`url(#${id})`)
    return id
  })
  expect(ids[0]).not.toBe(ids[1])
  expect(markup?.outerHTML).toBe(
    '<svg shape-rendering="geometricPrecision"><title>From markup</title><rect width="2" height="3"></rect></svg>',
  )
})

it('reports the SVG viewport synchronously when a click observer needs its bounds', async () => {
  const ref = createRef<ElementHandle>()
  const markupRef = createRef<ElementHandle>()
  const { Svg, SvgMarkup, measureElement } = elements
  // The kit also peers on React 18, which passes component refs through forwardRef.
  expect(Svg).toHaveProperty('$$typeof', Symbol.for('react.forward_ref'))
  expect(SvgMarkup).toHaveProperty('$$typeof', Symbol.for('react.forward_ref'))
  const { container } = render(
    <>
      <Svg ref={ref} />
      <SvgMarkup ref={markupRef} markup="<path />" />
    </>,
  )
  const svg = container.querySelector('svg')
  const handle = ref.current
  if (!svg || !handle) throw new Error('Missing SVG viewport')
  expect(markupRef.current).toBe(container.querySelector('svg:last-child'))
  svg.getBoundingClientRect = () => new DOMRect(20, 30, 200, 40)
  const observed = vi.fn()
  measureElement(handle, observed)
  const bounds = { x: 20, y: 30, width: 200, height: 40 }
  expect(observed).toHaveBeenCalledExactlyOnceWith(bounds)
  await expect(measureElement(handle)).resolves.toEqual(bounds)
})
