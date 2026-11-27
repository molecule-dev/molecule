// @vitest-environment jsdom
import { act, isValidElement, type ReactNode, useImperativeHandle } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { setPublicDocumentUrl } from '../elements/Anchor.js'
import { GlyphIcon } from '../elements/GlyphIcon.js'
import { measureElement } from '../elements/measure.js'
import * as nativeElements from '../elements/Svg.js'

type Mouse = {
  nativeEvent: {
    button: number
    buttons: number
    clientX: number
    clientY: number
    pageX: number
    pageY: number
    pointerType: string
  }
  stopPropagation(): void
}

type ViewHandle = {
  measure(
    report: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void,
  ): void
}

type Props = {
  [name: string]: unknown
  ref?: React.Ref<ViewHandle>
  children?: ReactNode
  onPress?: (event: Mouse) => void
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void
  onPointerMoveCapture?: (event: Mouse) => void
  onPointerLeave?: () => void
}

const {
  host,
  drawing,
  rect,
  def,
  gradient,
  clip,
  group,
  pattern,
  image,
  svgText,
  glyph,
  stop,
  press,
  font,
} = vi.hoisted(() => ({
  host: vi.fn<(props: Props) => ReactNode>(),
  drawing: vi.fn<(props: Props) => ReactNode>(),
  rect: vi.fn<(props: Props) => ReactNode>(),
  def: vi.fn<(props: Props) => ReactNode>(),
  gradient: vi.fn<(props: Props) => ReactNode>(),
  clip: vi.fn<(props: Props) => ReactNode>(),
  group: vi.fn<(props: Props) => ReactNode>(),
  pattern: vi.fn<(props: Props) => ReactNode>(),
  image: vi.fn<(props: Props) => ReactNode>(),
  svgText: vi.fn<(props: Props) => ReactNode>(),
  glyph: vi.fn<(props: Props) => ReactNode>(),
  stop: function NativeStop(): null {
    return null
  },
  press: vi.fn<(props: Props) => ReactNode>(),
  font: vi.fn(),
}))

vi.mock('react-native', () => ({
  NativeModules: {},
  Platform: {
    OS: 'ios',
    select: ({ ios, default: fallback }: { ios?: string; default?: string }) => ios ?? fallback,
  },
  Pressable: press,
  Text: glyph,
  UIManager: { hasViewManagerConfig: () => false },
  View: host,
  processColor: (color: string) => (color === 'currentColor' ? undefined : 0xff102030),
  useWindowDimensions: () => ({ width: 375 }),
}))
vi.mock('react-native-external-keyboard', () => ({ ExternalKeyboardViewNative: press }))
vi.mock('react-native-svg', () => ({
  Svg: drawing,
  SvgXml: drawing,
  Defs: def,
  LinearGradient: gradient,
  Stop: stop,
  ClipPath: clip,
  G: group,
  Rect: rect,
  Pattern: pattern,
  Image: image,
  Text: svgText,
}))
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
    nativeRootText: 'inherited-ink',
    renderNativeTextColor: (classes: string, draw: (color: string) => unknown) =>
      draw(classes === 'inherited-ink' ? '#102030' : '#506070'),
  }),
}))
vi.mock('@molecule/app-fonts', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getFont: font,
}))

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  for (const mocked of [
    host,
    drawing,
    rect,
    def,
    gradient,
    clip,
    group,
    pattern,
    image,
    svgText,
    glyph,
    press,
  ]) {
    mocked.mockImplementation(({ children }) => children)
  }
  host.mockImplementation(({ children, ref }) => {
    useImperativeHandle(
      ref,
      () => ({
        measure: (report) => report(0, 0, 300, 100, 30, 20),
      }),
      [],
    )
    return children
  })
  root = createRoot(document.createElement('div'))
})
afterEach(() => {
  act(() => root.unmount())
  setPublicDocumentUrl(undefined)
  vi.unstubAllGlobals()
})

function captured(mock: typeof host, id: string): Props {
  const props = mock.mock.calls.findLast(([candidate]) => candidate.testID === id)?.[0]
  if (!props) throw new Error(`Missing native host "${id}"`)
  return props
}

function pointer(x: number, y: number, pointerType = 'mouse'): Mouse {
  return {
    nativeEvent: { clientX: x, clientY: y, pageX: x, pageY: y, pointerType, button: 0, buttons: 0 },
    stopPropagation: vi.fn(),
  }
}

it('feeds real native stops concrete inherited ink and preserves definition IDs and units', () => {
  const { Svg, SvgDefs, SvgLinearGradient, SvgClipPath, SvgPattern, G, Rect } = nativeElements
  act(() =>
    root.render(
      <Svg>
        <SvgDefs>
          <SvgLinearGradient
            id="ink"
            x1={0}
            x2="90%"
            gradientUnits="userSpaceOnUse"
            stops={[
              { offset: '50%', stopColor: 'currentColor' },
              { offset: '50%', stopColor: 'currentColor', stopOpacity: 0.25 },
              { offset: 1, stopColor: '#aabbcc', stopOpacity: 0 },
            ]}
          />
          <SvgClipPath id="played">
            <Rect width={50} height={30} />
          </SvgClipPath>
          <SvgPattern
            id="tile"
            x={0}
            y="10%"
            width={2}
            height="5%"
            patternUnits="objectBoundingBox"
          >
            <Rect width={1} height={1} />
          </SvgPattern>
        </SvgDefs>
        <G clipPath="url(#played)" fill="url(#ink)" data-testid="waveform">
          <Rect width={100} height={30} />
        </G>
      </Svg>,
    ),
  )
  expect(def).toHaveBeenCalledOnce()
  expect(clip.mock.lastCall?.[0]).toMatchObject({ id: 'played' })
  expect(pattern.mock.lastCall?.[0]).toMatchObject({
    id: 'tile',
    x: 0,
    y: '10%',
    width: 2,
    height: '5%',
    patternUnits: 'objectBoundingBox',
  })
  expect(captured(group, 'waveform')).toMatchObject({ clipPath: 'url(#played)', fill: 'url(#ink)' })
  const paint = gradient.mock.lastCall?.[0]
  expect(paint).toMatchObject({ id: 'ink', x1: 0, x2: '90%', gradientUnits: 'userSpaceOnUse' })
  expect(
    Array.isArray(paint?.children)
      ? paint.children.map((child: ReactNode) => {
          if (!isValidElement(child)) throw new Error('A gradient stop must be a native element')
          expect(child.type).toBe(stop)
          return child.props
        })
      : undefined,
  ).toEqual([
    { offset: '50%', stopColor: '#102030', stopOpacity: undefined },
    { offset: '50%', stopColor: '#102030', stopOpacity: 0.25 },
    { offset: 1, stopColor: '#aabbcc', stopOpacity: 0 },
  ])
})

it('keeps metadata on the native owner, follows IDs and hides decorative graphics', () => {
  const { Svg, Rect } = nativeElements
  const click = vi.fn()
  act(() =>
    root.render(
      <>
        <Svg
          metadata={{ title: 'Default name', description: { id: 'details', text: 'Logo details' } }}
          aria-label="QR label"
          aria-describedby="details"
          role="img"
          data-testid="qr"
          translate="no"
          webShapeRendering="crispEdges"
        />
        <Svg metadata={{ title: 'Decorative provider' }} aria-hidden="true" data-testid="logo" />
        <Svg metadata={{ title: 'Heatmap' }} data-testid="map">
          <Rect
            width={9}
            height={9}
            aria-labelledby="cell-name"
            metadata={{ title: 'Fallback', description: { text: 'Monday' } }}
            role="button"
            tabIndex={0}
            onClick={click}
            data-testid="cell"
          />
          <Rect
            width={9}
            height={9}
            metadata={{
              title: 'Other cell',
              description: { id: 'cell-name', text: 'Named by ID' },
            }}
            data-testid="other"
          />
          <Rect
            width={9}
            height={9}
            metadata={{ title: 'Hidden' }}
            aria-hidden="true"
            tabIndex={0}
            data-testid="hidden"
          />
        </Svg>
      </>,
    ),
  )
  expect(captured(drawing, 'qr')).toMatchObject({
    accessibilityLabel: 'QR label',
    accessibilityHint: 'Logo details',
  })
  expect(captured(drawing, 'qr')).not.toHaveProperty('translate')
  expect(captured(drawing, 'qr')).not.toHaveProperty('webShapeRendering')
  expect(captured(drawing, 'logo')).toMatchObject({ accessible: false, 'aria-hidden': true })
  expect(captured(drawing, 'map')).toMatchObject({
    accessible: true,
    accessibilityLabel: 'Heatmap',
  })
  const proxy = captured(press, 'cell-focus')
  expect(proxy).toMatchObject({
    'aria-label': 'Named by ID',
    'aria-labelledby': 'cell-name',
    accessibilityHint: 'Monday',
    accessible: true,
    focusable: true,
  })
  expect(captured(press, 'other-focus')).toMatchObject({ 'aria-label': 'Other cell' })
  expect(press.mock.calls.some(([props]) => props.testID === 'hidden-focus')).toBe(false)
  expect(captured(rect, 'cell')).not.toHaveProperty('metadata')
  act(() => proxy.onAccessibilityAction?.({ nativeEvent: { actionName: 'activate' } }))
  expect(click).toHaveBeenCalledOnce()
})

it('uses an available font from the CSS list and shares Anchor image URL resolution', async () => {
  const { Svg, SvgImage, SvgText } = nativeElements
  const data = 'data:image/png;base64,aGVsbG8='
  font.mockImplementation((role: string) =>
    role === 'sans' ? { family: 'App, Sans', nativeFiles: { 'App, Sans': 1 } } : undefined,
  )
  setPublicDocumentUrl('https://graphics.example/ui/preview.html')
  await act(async () =>
    root.render(
      <Svg>
        <SvgImage
          href="/logo.png"
          width="25%"
          height={8}
          x={1}
          y={0}
          preserveAspectRatio="none"
          data-testid="root-image"
        />
        <SvgImage href="art/mark.png" width={8} height={8} data-testid="relative" />
        <SvgImage href={data} width={8} height={8} data-testid="inline" />
        <SvgText fontFamily={`"Unavailable", 'App, Sans', serif`} data-testid="custom">
          Custom
        </SvgText>
        <SvgText fontFamily="Unavailable, monospace" data-testid="mono">
          Mono
        </SvgText>
        <SvgText fontFamily="'Unavailable', system-ui" data-testid="system">
          System
        </SvgText>
      </Svg>,
    ),
  )
  await act(async () => vi.dynamicImportSettled())
  expect(captured(image, 'root-image')).toMatchObject({
    href: 'https://graphics.example/logo.png',
    x: 1,
    y: 0,
    width: '25%',
    height: 8,
    preserveAspectRatio: 'none',
  })
  expect(captured(image, 'relative')).toMatchObject({
    href: 'https://graphics.example/ui/art/mark.png',
  })
  expect(captured(image, 'inline')).toMatchObject({ href: data })
  expect(captured(svgText, 'custom')).toMatchObject({ fontFamily: 'App, Sans' })
  expect(captured(svgText, 'mono')).toMatchObject({ fontFamily: 'Menlo' })
  expect(captured(svgText, 'system').fontFamily).toBeUndefined()
})

it('renders a glyph when its font becomes available without changing hook order', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const codepoint = vi.fn((name: string) => (name === 'check' ? 0x2713 : undefined))
  try {
    font.mockReturnValue(undefined)
    act(() => root.render(<GlyphIcon name="check" data-testid="icon" />))
    expect(glyph).not.toHaveBeenCalled()

    font.mockReturnValue({ family: 'Available Icons', glyphs: { codepoint } })
    act(() => root.render(<GlyphIcon name="check" data-testid="icon" />))
    expect(captured(glyph, 'icon').children).toBe('✓')
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/order of Hooks|Rendered more hooks/i)

    act(() => root.render(<GlyphIcon name="unknown" data-testid="icon" />))
    expect(glyph).toHaveBeenCalledTimes(1)
  } finally {
    error.mockRestore()
  }
})

it('hit-tests hover at the canvas using the view box, leaving touch and keyboard activation on the cell', () => {
  const { Svg, Rect } = nativeElements
  const hover = vi.fn()
  const hoverBlocked = vi.fn()
  const click = vi.fn()
  act(() =>
    root.render(
      <Svg width={300} height={100} viewBox="10 20 100 100">
        <Rect
          x={10}
          y={20}
          width={20}
          height={20}
          pointerEvents="none"
          style={{ pointerEvents: 'auto' }}
          onMouseEnter={hover}
          onClick={click}
          role="button"
          tabIndex={0}
          data-testid="cell"
        />
        <Rect
          x={30}
          y={20}
          width={20}
          height={20}
          pointerEvents="none"
          onMouseEnter={hoverBlocked}
          onClick={click}
          data-testid="blocked"
        />
      </Svg>,
    ),
  )
  const canvas = host.mock.lastCall?.[0]
  expect(canvas?.onPointerMoveCapture).toBeTypeOf('function')
  expect(captured(rect, 'cell')).toMatchObject({ pointerEvents: 'auto' })
  expect(captured(rect, 'blocked')).toMatchObject({ pointerEvents: 'none', onPress: undefined })
  expect(captured(rect, 'cell')).not.toHaveProperty('onMouseEnter')
  act(() => {
    canvas?.onPointerMoveCapture?.(pointer(135, 25, 'touch'))
    canvas?.onPointerMoveCapture?.(pointer(35, 25))
  })
  expect(hover).not.toHaveBeenCalled()
  act(() => {
    canvas?.onPointerMoveCapture?.(pointer(135, 25))
    canvas?.onPointerMoveCapture?.(pointer(145, 25))
    canvas?.onPointerMoveCapture?.(pointer(155, 25))
    canvas?.onPointerMoveCapture?.(pointer(135, 25))
    canvas?.onPointerLeave?.()
    canvas?.onPointerMoveCapture?.(pointer(135, 25))
  })
  expect(hover).toHaveBeenCalledTimes(3)
  expect(hoverBlocked).not.toHaveBeenCalled()
  act(() => captured(rect, 'cell').onPress?.(pointer(135, 25, 'touch')))
  act(() =>
    captured(press, 'cell-focus').onAccessibilityAction?.({
      nativeEvent: { actionName: 'activate' },
    }),
  )
  expect(click).toHaveBeenCalledTimes(2)
})

it('measures the viewport through the native scroll wrapper for a viewport observer', async () => {
  const measureInWindow = vi.fn()
  const wrapper = {
    measureInWindow,
    getNativeScrollRef: () => ({
      measureInWindow: (report: (x: number, y: number, w: number, h: number) => void) => {
        report(30, 20, 300, 100)
      },
    }),
  }
  const observer = vi.fn()
  measureElement(wrapper, observer)
  const bounds = { x: 30, y: 20, width: 300, height: 100 }
  expect(observer).toHaveBeenCalledExactlyOnceWith(bounds)
  expect(measureInWindow).not.toHaveBeenCalled()
  await expect(measureElement(wrapper)).resolves.toEqual(bounds)
})
