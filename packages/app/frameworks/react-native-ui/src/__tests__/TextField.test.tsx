// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NativeClassSplit, UIClassMapNativeSplit } from '@molecule/app-ui'

import { TextField } from '../elements/TextField.js'

interface TextInputProps {
  style: ReadonlyArray<{ height?: number; minHeight?: number; maxHeight?: number } | undefined>
  onContentSizeChange?: (event: { nativeEvent: { contentSize: { height: number } } }) => void
}

const { input, screen } = vi.hoisted(() => ({
  input: vi.fn<(props: TextInputProps) => null>(() => null),
  screen: { width: 639 },
}))

let classMap: UIClassMapNativeSplit
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => classMap,
}))
vi.mock('react-native', () => ({
  Platform: { select: ({ default: value }: { default: string }) => value },
  TextInput: input,
  useWindowDimensions: () => screen,
}))

const split: NativeClassSplit = {
  view: '',
  text: '',
  display: null,
  lines: null,
  weight: null,
  lineHeight: { '': 21.25, sm: 24, md: 30 },
}

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  input.mockClear()
  screen.width = 639
  classMap = { nativeBreakpoints: { sm: 640, md: 768 }, splitForNative: () => split }
  root = createRoot(document.createElement('div'))
})
afterEach(() => {
  act(() => root.unmount())
  vi.unstubAllGlobals()
})

/** Returns the growing style the native input receives after the ClassMap and caller styles. */
const growStyle = () => input.mock.lastCall?.[0].style.at(-1)

describe('TextField autoGrow on native', () => {
  it('uses the widest reached breakpoint and updates the bounds when the window resizes', () => {
    const render = (width: number): void => {
      screen.width = width
      act(() => root.render(<TextField as="textarea" autoGrow={{ minRows: 3 }} />))
    }
    render(639)
    expect(growStyle()?.height).toBe(63.75)
    render(640)
    expect(growStyle()?.height).toBe(72)
    render(768)
    expect(growStyle()?.height).toBe(90)
    render(767)
    expect(growStyle()?.height).toBe(72)
  })

  it('uses the default line height when the ClassMap supplies no text metrics', () => {
    classMap = {}
    act(() => root.render(<TextField as="textarea" autoGrow={{ minRows: 3 }} />))
    expect(growStyle()?.height).toBe(72)
  })

  it.each([
    { minRows: 3, maxRows: undefined },
    { minRows: 2, maxRows: 6 },
    { minRows: 2, maxRows: 2 },
    { minRows: 6, maxRows: 2 },
    { minRows: 3, maxRows: 0 },
  ])('matches the CSS row bounds for $minRows minimum and $maxRows maximum', (rows) => {
    act(() => root.render(<TextField as="textarea" autoGrow={rows} />))
    const measure = input.mock.lastCall?.[0].onContentSizeChange
    if (!measure) throw new Error('Missing native content size handler')

    const line = 21.25
    const cssMin = Math.min(rows.minRows, rows.maxRows ?? Infinity) * line
    const cssMax = rows.maxRows === undefined ? Infinity : rows.maxRows * line
    expect(growStyle()?.minHeight).toBe(cssMin)
    expect(growStyle()?.maxHeight).toBe(rows.maxRows === undefined ? undefined : cssMax)
    for (const content of [0, 42.5, 76, 200]) {
      act(() => measure({ nativeEvent: { contentSize: { height: content } } }))
      expect(growStyle()?.height).toBe(Math.max(cssMin, Math.min(content, cssMax)))
    }
  })
})
