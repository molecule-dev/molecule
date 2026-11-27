import { createElement, Fragment, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { cssInterop } = vi.hoisted(() => ({
  cssInterop: vi.fn(
    (component: (props: object) => unknown) => (props: object) =>
      component({ ...props, style: { color: '#123456' } }),
  ),
}))
vi.mock('nativewind', () => ({ cssInterop }))
vi.mock('react-native-svg', () => ({
  Svg: function Svg(): null {
    return null
  },
  SvgXml: function SvgXml(): null {
    return null
  },
}))

describe('the React Native entry', () => {
  it("registers react-native-svg's canvases so their classes style them", async () => {
    const svg = await import('react-native-svg')
    const native = await import('../native.js')
    expect(cssInterop).toHaveBeenCalledWith(svg.Svg, { className: 'style' })
    expect(cssInterop).toHaveBeenCalledWith(svg.SvgXml, { className: 'style' })
    expect(native.classMap).toBeDefined()
  })

  it('passes computed native class color back to the drawing without rendering a view', async () => {
    const { classMap } = await import('../native.js')
    const draw = vi.fn((color) => createElement(Fragment, null, color))
    const output = classMap.renderNativeTextColor?.('inherited', draw)
    if (!isValidElement(output)) throw new Error('Expected a native style wrapper')
    expect(renderToStaticMarkup(output)).toBe('#123456')
    expect(draw).toHaveBeenCalledExactlyOnceWith('#123456')
  })
})
