// @vitest-environment jsdom
import type { Ref } from 'react'
import { act, type ReactNode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'
import { setProvider as setFilePicker } from '@molecule/app-file-picker'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-react'
import { MapDrawing } from '@molecule/app-map-drawing-react'
import { I18nProvider } from '@molecule/app-react'
import { SpreadsheetGrid, type SpreadsheetSelection } from '@molecule/app-spreadsheet-grid-react'
import type { ElementHandle } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'
import { FloatingInput } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { Box } from '../elements/Box.js'
import { Pressable } from '../elements/Pressable.js'
import { useRevealElement } from '../elements/reveal.js'
import { ScrollArea } from '../elements/ScrollArea.js'
import { G, Svg } from '../elements/Svg.js'

type Touch = {
  identifier: string
  pageX: number
  pageY: number
  locationX: number
  locationY: number
  timestamp?: number
}
type TouchEvent = {
  nativeEvent: Touch & { touches: Touch[]; changedTouches: Touch[] }
  persist(): void
  stopPropagation(): void
}
type Pointer = {
  nativeEvent: {
    pointerId: number
    timestamp?: number
    pageX: number
    pageY: number
    altKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
    metaKey: boolean
  }
}
type HostProps = {
  children?: ReactNode
  testID?: string
  style?: unknown
  onLayout?: (event: { nativeEvent: { layout: { width: number; height: number } } }) => void
  horizontal?: boolean
  selectTextOnFocus?: boolean
  onChangeText?: (value: string) => void
  onStartShouldSetResponder?: (event: TouchEvent) => boolean
  onResponderGrant?: (event: TouchEvent) => void
  onResponderStart?: (event: TouchEvent) => void
  onPointerDownCapture?: (event: Pointer) => void
  onPointerMoveCapture?: (event: Pointer) => void
  onPointerUpCapture?: (event: Pointer) => void
  onResponderMove?: (event: TouchEvent) => void
  onResponderEnd?: (event: TouchEvent) => void
  onResponderRelease?: (event: TouchEvent) => void
  onResponderTerminate?: () => void
  onResponderTerminationRequest?: () => boolean
  onScroll?: (event: {
    nativeEvent: {
      contentOffset: { x: number; y: number }
      contentSize?: { width: number; height: number }
      layoutMeasurement?: { width: number; height: number }
      contentInset?: { left: number; right: number; top: number; bottom: number }
    }
  }) => void
  onTouchStart?: (event: TouchEvent) => void
  onPress?: (event: TouchEvent) => void
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void
  accessibilityActions?: Array<{ name: string; label?: string }>
}

const native = vi.hoisted(() => ({
  props: new WeakMap<HTMLElement, HostProps>(),
  frame: { pageX: 30, pageY: 20, windowX: 100, windowY: 75, width: 40, height: 50 },
  pending: Array<() => void>(),
  defer: false,
  scrollTo: vi.fn(),
  focus: vi.fn(),
  readText: vi.fn<() => Promise<string>>(),
  alert: vi.fn(),
}))

vi.mock('@molecule/app-clipboard', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  readText: native.readText,
}))

vi.mock('@react-native-community/slider', () => ({ default: () => null }))

vi.mock('react-native', async () => {
  const { createElement, useImperativeHandle } = await import('react')
  function Host({ ref, ...props }: HostProps & { ref?: Ref<object> }) {
    const frame = () => {
      if (props.testID === 'transformed-group')
        return { pageX: 100, pageY: 110, windowX: 170, windowY: 165, width: 20, height: 25 }
      if (props.testID === 'spreadsheet-grid-cell-A1')
        return { pageX: 78, pageY: 48, windowX: 148, windowY: 103, width: 96, height: 28 }
      return native.frame
    }
    useImperativeHandle(
      ref,
      () => ({
        focus: native.focus,
        blur() {},
        scrollTo: native.scrollTo,
        ...(props.testID === 'viewport' && {
          getNativeScrollRef: () => ({
            measureInWindow(callback: (...values: number[]) => void) {
              callback(100, 50, 100, 60)
            },
          }),
        }),
        measure(callback: (...values: number[]) => void) {
          const { pageX, pageY, width, height } = frame()
          const send = () => callback(0, 0, width, height, pageX, pageY)
          if (native.defer) native.pending.push(send)
          else send()
        },
        measureInWindow(callback: (...values: number[]) => void) {
          const { windowX, windowY, width, height } = frame()
          const send = () => callback(windowX, windowY, width, height)
          if (native.defer) native.pending.push(send)
          else send()
        },
      }),
      [],
    )
    return createElement(
      'div',
      {
        'data-testid': props.testID,
        ref: (node: HTMLElement | null) => {
          if (node) native.props.set(node, props)
        },
      },
      props.children,
    )
  }
  return {
    View: Host,
    Image: Host,
    StyleSheet: { create: (styles: object) => styles },
    Pressable: Host,
    ScrollView: (props: Parameters<typeof Host>[0]) =>
      createElement(Host, { ...props, testID: props.horizontal ? 'viewport-x' : 'viewport' }),
    Text: Host,
    TextInput: Host,
    Alert: { alert: native.alert },
    I18nManager: { isRTL: false },
    Platform: { OS: 'ios', select: ({ default: value }: { default: unknown }) => value },
    processColor: (color: unknown) => (typeof color === 'string' ? 0 : undefined),
    useWindowDimensions: () => ({ width: 640, height: 480 }),
  }
})

vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})

vi.mock('react-native-external-keyboard', () => ({ ExternalKeyboardViewNative: () => null }))

vi.mock('react-native-svg', async () => {
  const { View } = await import('react-native')
  return {
    Circle: View,
    Ellipse: View,
    G: View,
    Line: View,
    Path: View,
    Polygon: View,
    Polyline: View,
    Rect: View,
    Svg: View,
    SvgXml: View,
    Text: View,
  }
})

function touch(identifier: string, pageX: number, pageY: number): Touch {
  return { identifier, pageX, pageY, locationX: 999, locationY: 888 }
}

function event(contact: Touch, touches = [contact], changedTouches = [contact]): TouchEvent {
  return {
    nativeEvent: { ...contact, touches, changedTouches },
    persist() {},
    stopPropagation() {},
  }
}

let container: HTMLElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  setClassMap(classMap)
  native.scrollTo.mockClear()
  native.focus.mockClear()
  native.readText.mockReset()
  native.alert.mockClear()
  Object.assign(native.frame, {
    pageX: 30,
    pageY: 20,
    windowX: 100,
    windowY: 75,
    width: 40,
    height: 50,
  })
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  native.defer = false
  native.pending.length = 0
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function render(children: ReactNode) {
  act(() => root.render(children))
}

function host(id: string): HostProps {
  const node = container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const props = node && native.props.get(node)
  if (!props) throw new Error(`Missing native host ${id}`)
  return props
}

describe('native grid layout', () => {
  it('honours the image gallery column spans and aspect ratio, with class spans as fallback', () => {
    const gridClasses = classMap.grid({ cols: 12, gap: 'md', responsive: false })
    setClassMap({
      ...classMap,
      splitForNative: (classes, text) => ({
        view: classes,
        text,
        display: null,
        weight: null,
        lines: null,
        ...(classes.includes(gridClasses) && {
          grid: { columns: { '': 12 }, columnGap: { '': 16 }, rowGap: {}, alignItems: {} },
        }),
        ...(classes.includes('fallback-span') && { span: { '': 4 } }),
      }),
    })
    render(
      <Box as="div" data-mol-id="gallery" className={gridClasses}>
        <Pressable
          as="div"
          data-mol-id="upload"
          webStyle={{ gridColumn: 'span 8 / span 8', aspectRatio: '16 / 9' }}
        />
        <Box as="div" data-mol-id="thumbnails" webStyle={{ gridColumn: 'span 4 / span 4' }} />
        <Box
          as="div"
          data-mol-id="fallback"
          className="fallback-span"
          webStyle={{ gridColumn: 'auto', aspectRatio: '16 / 0' }}
        />
      </Box>,
    )

    const row = container.querySelector('[data-testid="gallery"] > div')
    if (!(row instanceof HTMLElement)) throw new Error('Missing native grid row')
    act(() =>
      native.props.get(row)?.onLayout?.({ nativeEvent: { layout: { width: 1184, height: 600 } } }),
    )
    expect(host('upload').style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 784 }),
        expect.objectContaining({ aspectRatio: 16 / 9 }),
      ]),
    )
    expect(host('thumbnails').style).toEqual(expect.arrayContaining([{ width: 384 }]))
    expect(host('fallback').style).toEqual(expect.arrayContaining([{ width: 384 }]))
    expect(host('fallback').style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ aspectRatio: expect.anything() })]),
    )
  })
})

describe('the native image gallery', () => {
  it('adds a bonded picker preview to the slot that opened the chooser', async () => {
    vi.stubGlobal('HTMLImageElement', undefined)
    setIconSet({ upload: { paths: [] }, image: { paths: [] }, trash: { paths: [] } })
    const pickFiles = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          name: 'été 2026.png',
          type: 'image/png',
          size: 4,
          arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
          appendTo: vi.fn(),
        },
      ])
    setFilePicker({ pickFiles })
    const onChange = vi.fn()
    try {
      render(
        <I18nProvider provider={createSimpleI18nProvider('en')}>
          <ImageGalleryEditor
            slots={['https://example.invalid/existing.png', null]}
            onChange={onChange}
          />
        </I18nProvider>,
      )
      const activateSlot = () =>
        host('image-gallery-editor-slot-1').onPress?.(event(touch('1', 5, 4)))
      await act(async () => activateSlot())
      expect(onChange).not.toHaveBeenCalled()
      await act(async () => activateSlot())
      expect(pickFiles).toHaveBeenCalledTimes(2)
      expect(pickFiles).toHaveBeenLastCalledWith({ accept: 'image/*', includeRejected: true })
      expect(onChange).toHaveBeenCalledExactlyOnceWith([
        'https://example.invalid/existing.png',
        'data:image/png;base64,iVBORw==',
      ])
    } finally {
      unbond('file-picker')
      unbond('icons')
    }
  })
})

describe('native element interaction', () => {
  it('delivers the FloatingInput value through the native renderer without an event target', () => {
    const onValueChange = vi.fn()
    render(
      <FloatingInput placeholder="Email" testId="floating-value" onValueChange={onValueChange} />,
    )
    act(() => host('floating-value').onChangeText?.('été@example.org'))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('été@example.org')
  })

  it('starts and ends a stationary touch inside a modal using matched window and root coordinates', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    render(<Box as="div" data-mol-id="drag" drag={{ onStart, onEnd }} />)
    const binding = host('drag')
    const contact = touch('1', 37, 28)
    expect(binding.onStartShouldSetResponder?.(event(contact))).toBe(true)
    act(() => {
      binding.onResponderGrant?.(event(contact))
      binding.onResponderRelease?.(event(contact, []))
    })
    const point = expect.objectContaining({
      x: 7,
      y: 8,
      dx: 0,
      dy: 0,
      bounds: { x: 100, y: 75, width: 40, height: 50 },
    })
    expect(onStart).toHaveBeenCalledExactlyOnceWith(point)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(point)
  })

  it('buffers outside moves and release in order while frame measurement is pending', () => {
    const trace = vi.fn()
    native.defer = true
    render(
      <Pressable
        as="div"
        data-mol-id="drag"
        drag={{
          onStart: (point) => trace('start', point),
          onMove: (point) => trace('move', point),
          onEnd: (point) => trace('end', point),
        }}
      />,
    )
    const binding = host('drag')
    const down = touch('1', 38, 39)
    const move = touch('1', 100, 10)
    act(() => {
      binding.onResponderGrant?.(event(down))
      Object.assign(native.frame, { pageX: 25, pageY: 17, windowX: 95, windowY: 72 })
      binding.onResponderMove?.(event(move))
      binding.onResponderRelease?.(event(touch('1', 102, 9), []))
    })
    expect(trace).not.toHaveBeenCalled()
    act(() =>
      native.pending
        .splice(0)
        .reverse()
        .forEach((measure) => measure()),
    )
    expect(trace.mock.calls).toEqual([
      ['start', expect.objectContaining({ x: 8, y: 19, dx: 0, dy: 0 })],
      ['move', expect.objectContaining({ x: 75, y: -7, dx: 62, dy: -29 })],
      ['end', expect.objectContaining({ x: 77, y: -8, dx: 64, dy: -30 })],
    ])
  })

  it('ignores a second finger and ends when the initiating finger lifts', async () => {
    const onMove = vi.fn()
    const onEnd = vi.fn()
    render(<Box as="div" data-mol-id="drag" drag={{ onStart: vi.fn(), onMove, onEnd }} />)
    const binding = host('drag')
    const first = touch('1', 35, 25)
    const second = touch('2', 300, 40)
    await act(async () => {
      binding.onResponderGrant?.(event(first))
      binding.onResponderStart?.(event(second, [first, second]))
      binding.onResponderMove?.(event(second, [first, second]))
      binding.onResponderMove?.(event(second, [first, second], [first, second]))
      binding.onResponderMove?.(event(touch('1', 43, 34), [first, second]))
      binding.onResponderEnd?.(event(touch('1', 48, 39), [second]))
    })
    act(() => binding.onResponderRelease?.(event(second, [])))
    expect(onMove).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ dx: 8, dy: 9 }))
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ dx: 13, dy: 14 }))
  })

  it.each(['cancel', 'end'])(
    'takes over once through %s and rebases in a measured viewport',
    async (terminal) => {
      const trace = vi.fn()
      native.defer = true
      render(
        <Svg viewBox="0 0 20 20">
          <G
            data-mol-id="transformed-group"
            transform="translate(40 30)"
            drag={{
              onStart: (point) => trace('start', point),
              onMove: (point) => trace('move', point),
              onEnd: (point) => trace('end', point),
              onCancel: terminal === 'cancel' ? (point) => trace('cancel', point) : undefined,
            }}
            zoom={{ wheel: 'off', onZoom: (point) => trace('zoom', point) }}
          />
        </Svg>,
      )
      const binding = host('transformed-group')
      const first = touch('1', 40, 30)
      const second = touch('2', 80, 30)
      const outward = touch('2', 100, 30)
      const rotatedFirst = touch('1', 60, 10)
      const rotatedSecond = touch('2', 60, 70)
      await act(async () => {
        binding.onResponderGrant?.(event(first))
        binding.onResponderStart?.(event(first))
        binding.onResponderStart?.(event(second, [first, second]))
        expect(binding.onResponderTerminationRequest?.()).toBe(false)
        Object.assign(native.frame, { pageX: 25, pageY: 14, windowX: 95, windowY: 69 })
        binding.onResponderMove?.(event(outward, [first, outward]))
        binding.onResponderMove?.(
          event(rotatedFirst, [rotatedFirst, rotatedSecond], [rotatedFirst, rotatedSecond]),
        )
        binding.onResponderEnd?.(event(rotatedFirst, [rotatedSecond]))
        binding.onResponderMove?.(event(touch('2', 65, 80)))
        binding.onResponderRelease?.(event(touch('2', 70, 85), []))
      })
      expect(trace).not.toHaveBeenCalled()
      act(() =>
        native.pending
          .splice(0)
          .reverse()
          .forEach((measure) => measure()),
      )
      expect(trace.mock.calls).toEqual([
        ['start', expect.objectContaining({ x: 10, y: 10, dx: 0, dy: 0 })],
        [terminal, expect.objectContaining({ x: 10, y: 10, dx: 0, dy: 0 })],
        ['zoom', { kind: 'pinch', from: { x: 30, y: 10 }, at: { x: 45, y: 16 }, factor: 1.5 }],
        ['zoom', { kind: 'pinch', from: { x: 45, y: 16 }, at: { x: 35, y: 26 }, factor: 1 }],
        ['start', expect.objectContaining({ x: 35, y: 56, dx: 0, dy: 0 })],
        ['move', expect.objectContaining({ x: 40, y: 66, dx: 5, dy: 10 })],
        ['end', expect.objectContaining({ x: 45, y: 71, dx: 10, dy: 15 })],
      ])
    },
  )

  it('does not restart an acquired drag after the native responder cancels a pinch', async () => {
    const trace = vi.fn()
    render(
      <Box
        as="div"
        data-mol-id="pinch-cancel"
        drag={{
          onStart: () => trace('start'),
          onCancel: () => trace('cancel'),
          onEnd: () => trace('end'),
        }}
        zoom={{ wheel: 'all', onZoom: () => trace('pinch') }}
        onClick={() => trace('tap')}
      />,
    )
    const binding = host('pinch-cancel')
    const first = touch('1', 40, 30)
    const second = touch('2', 60, 40)
    await act(async () => {
      binding.onResponderGrant?.(event(first))
      binding.onResponderStart?.(event(second, [first, second]))
      binding.onResponderEnd?.(event(first, [second]))
      binding.onResponderTerminate?.()
      binding.onResponderRelease?.(event(second, []))
    })
    expect(trace.mock.calls).toEqual([['start'], ['cancel']])
  })

  it('scales translated child content from the top-left without transforming the outer frame', () => {
    render(
      <Box as="div" data-mol-id="untransformed-frame">
        <Box
          as="div"
          data-mol-id="zoom-content"
          style={{ contentTransform: { translateX: -12, translateY: 20, scale: 2 } }}
        />
      </Box>,
    )
    expect(host('zoom-content').style).toContainEqual({
      transform: [{ translateX: -12 }, { translateY: 20 }, { scale: 2 }],
      transformOrigin: [0, 0, 0],
    })
    expect(host('untransformed-frame').style).not.toContainEqual(
      expect.objectContaining({ transform: expect.anything() }),
    )
  })

  it('uses modifiers from the corresponding W3C pointer packets without a sticky key', async () => {
    const trace = vi.fn()
    render(
      <Box
        as="div"
        data-mol-id="modifiers"
        drag={{
          onStart: (point) => trace(point),
          onMove: (point) => trace(point),
          onEnd: (point) => trace(point),
        }}
      />,
    )
    const binding = host('modifiers')
    await act(async () => {
      binding.onResponderGrant?.(event({ ...touch('7', 40, 30), timestamp: 123 }))
      binding.onPointerDownCapture?.({
        nativeEvent: {
          pointerId: 7,
          pageX: 40,
          pageY: 30,
          timestamp: 123,
          altKey: true,
          ctrlKey: true,
          shiftKey: false,
          metaKey: false,
        },
      })
    })
    await act(async () => {
      binding.onPointerMoveCapture?.({
        nativeEvent: {
          pointerId: 1234,
          pageX: 45,
          pageY: 35,
          altKey: false,
          ctrlKey: false,
          shiftKey: true,
          metaKey: true,
        },
      })
      binding.onResponderMove?.(event({ ...touch('7', 45, 35), timestamp: 124 }))
      binding.onResponderRelease?.(event({ ...touch('7', 50, 40), timestamp: 125 }, []))
    })
    expect(trace.mock.calls).toEqual([
      [expect.objectContaining({ altKey: true, ctrlKey: true, shiftKey: false, metaKey: false })],
      [expect.objectContaining({ altKey: false, ctrlKey: false, shiftKey: true, metaKey: true })],
      [expect.objectContaining({ altKey: false, ctrlKey: false, shiftKey: false, metaKey: false })],
    ])
  })

  it('cancels with the last position if the responder terminates after responder-end', async () => {
    const onMove = vi.fn()
    const onCancel = vi.fn()
    const onEnd = vi.fn()
    render(<Box as="div" data-mol-id="drag" drag={{ onStart: vi.fn(), onMove, onCancel, onEnd }} />)
    const binding = host('drag')
    const first = touch('1', 35, 25)
    const other = touch('2', 300, 30)
    await act(async () => {
      binding.onResponderGrant?.(event(first))
      binding.onResponderMove?.(event(touch('1', 42, 35)))
      binding.onResponderEnd?.(event(touch('1', 100, 100), [other]))
      binding.onResponderTerminate?.()
    })
    expect(onCancel).toHaveBeenCalledExactlyOnceWith(onMove.mock.calls[0][0])
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('composes touch observation, drag, primary tap, and secondary accessibility action', () => {
    const observe = vi.fn()
    const onStart = vi.fn()
    const onClick = vi.fn()
    const run = vi.fn()
    const outside = vi.fn()
    const hover = vi.fn()
    render(
      <Box as="div" data-mol-id="root">
        <Box
          as="div"
          data-mol-id="drag"
          onTouchStart={observe}
          onPressOutside={outside}
          onMouseEnter={hover}
          drag={{ onStart }}
          onClick={onClick}
          secondaryAction={{ label: 'Finish', run }}
        />
        <Pressable as="button" data-mol-id="other" onClick={onClick} />
      </Box>,
    )
    const binding = host('drag')
    const other = host('other')
    const start = event(touch('1', 35, 25))
    const end = event(touch('1', 35, 25), [])
    act(() => {
      for (let tap = 0; tap < 2; tap++) {
        binding.onTouchStart?.(start)
        host('root').onTouchStart?.(start)
        binding.onResponderGrant?.(start)
        binding.onResponderRelease?.(end)
      }
      host('root').onTouchStart?.(start)
      other.onPress?.(end)
      binding.onAccessibilityAction?.({ nativeEvent: { actionName: 'secondaryAction' } })
      binding.onAccessibilityAction?.({ nativeEvent: { actionName: 'activate' } })
    })
    expect(observe).toHaveBeenCalledTimes(2)
    expect(outside).toHaveBeenCalledTimes(1)
    expect(hover).not.toHaveBeenCalled()
    expect(onStart).toHaveBeenCalledTimes(2)
    expect(onClick).toHaveBeenCalledTimes(3)
    expect(binding.accessibilityActions).toContainEqual({
      name: 'secondaryAction',
      label: 'Finish',
    })
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('gives a transformed SVG group the viewport and one responder for tap and drag', () => {
    const onStart = vi.fn()
    const onClick = vi.fn()
    render(
      <Svg viewBox="0 0 20 20">
        <G
          data-mol-id="transformed-group"
          transform="translate(40 30)"
          drag={{ onStart }}
          onClick={onClick}
        />
      </Svg>,
    )
    const binding = host('transformed-group')
    const contact = touch('1', 35, 25)
    expect(binding.onPress).toBeUndefined()
    act(() => {
      binding.onResponderGrant?.(event(contact))
      binding.onResponderRelease?.(event(contact, []))
    })
    expect(onStart).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ x: 5, y: 5 }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('lets a swipe go to the scroller and begins a long-press drag on the original contact', () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    const onEnd = vi.fn()
    render(<Box as="div" data-mol-id="drag" drag={{ onStart, onEnd, touchStart: 'longPress' }} />)
    const binding = host('drag')
    const down = touch('1', 35, 25)
    act(() => {
      binding.onResponderGrant?.(event(down))
      binding.onResponderMove?.(event(touch('1', 35, 90)))
      expect(binding.onResponderTerminationRequest?.()).toBe(true)
      binding.onResponderTerminate?.()
      vi.advanceTimersByTime(600)
    })
    expect(onStart).not.toHaveBeenCalled()
    act(() => {
      binding.onResponderGrant?.(event(down))
      vi.advanceTimersByTime(600)
      expect(binding.onResponderTerminationRequest?.()).toBe(false)
      binding.onResponderRelease?.(event(touch('1', 36, 28), []))
    })
    expect(onStart).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ x: 5, y: 5, dx: 0 }))
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ x: 6, y: 8, dx: 1 }))
  })

  it('finishes a real MapDrawing line after the second contact of a double tap', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <MapDrawing activeTool="line" onChange={onChange} />
      </I18nProvider>,
    )
    const surface = host('map-drawing-surface')
    function tap(x: number, y: number): void {
      const contact = touch('1', x, y)
      surface.onResponderGrant?.(event(contact))
      surface.onResponderRelease?.(event(contact, []))
    }
    act(() => {
      tap(35, 25)
      vi.advanceTimersByTime(400)
      tap(45, 35)
      tap(47, 36)
    })
    expect(onChange).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        kind: 'line',
        geometry: {
          type: 'LineString',
          coordinates: [
            [5, 5],
            [15, 15],
            [17, 16],
          ],
        },
      }),
    ])
    expect(container.querySelector('[data-testid="map-drawing-draft-line"]')).toBeNull()
  })

  it('reveals a row against the scroll viewport by the minimum necessary distance', () => {
    function Row({ active }: { active: boolean }) {
      const ref = useRef<ElementHandle>(null)
      const reveal = useRevealElement()
      useEffect(() => {
        if (active && ref.current) reveal(ref.current)
      }, [active, reveal])
      return <Box as="li" ref={ref} data-mol-id="row" />
    }
    const renderRow = (active: boolean): void => {
      render(
        <ScrollArea as="ul">
          <Row active={active} />
        </ScrollArea>,
      )
    }
    renderRow(false)
    host('viewport').onScroll?.({ nativeEvent: { contentOffset: { x: 0, y: 35 } } })
    Object.assign(native.frame, { windowY: 95, height: 30 })
    renderRow(true)
    expect(native.scrollTo).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 50, animated: false })
    renderRow(false)
    Object.assign(native.frame, { windowY: 65, height: 30 })
    renderRow(true)
    expect(native.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('lets a pressable keep primary activation while offering a secondary tap and assistive action', () => {
    vi.useFakeTimers()
    const onClick = vi.fn()
    const run = vi.fn()
    render(
      <Pressable
        as="button"
        data-mol-id="layer-name"
        onClick={onClick}
        secondaryAction={{ label: 'Rename layer', run }}
      >
        Layer
      </Pressable>,
    )
    const binding = host('layer-name')
    const contact = touch('1', 35, 25)
    act(() => {
      for (let tap = 0; tap < 2; tap++) {
        binding.onResponderGrant?.(event(contact))
        binding.onResponderRelease?.(event(contact, []))
      }
    })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(binding.accessibilityActions).toContainEqual({
      name: 'secondaryAction',
      label: 'Rename layer',
    })
    act(() => binding.onAccessibilityAction?.({ nativeEvent: { actionName: 'secondaryAction' } }))
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps the spreadsheet swipe scrollable and drags across both scrolled axes from a frozen cell', async () => {
    vi.useFakeTimers()
    const onSelectionChange = vi.fn<(selection: SpreadsheetSelection) => void>()
    const onCellChange = vi.fn()
    const atA1 = { r1: 0, c1: 0, r2: 0, c2: 0 }
    render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <SpreadsheetGrid
          rows={30}
          columns={20}
          frozenRows={1}
          frozenCols={1}
          cells={new Map([['A1', 'frozen']])}
          selection={atA1}
          onSelectionChange={onSelectionChange}
          onCellChange={onCellChange}
        />
      </I18nProvider>,
    )
    const a1 = host('spreadsheet-grid-cell-A1')
    const down = event(touch('1', 90, 55))
    const far = event(touch('1', 180, 80))
    act(() => {
      a1.onResponderGrant?.(down)
      a1.onResponderMove?.(far)
      expect(a1.onResponderTerminationRequest?.()).toBe(true)
      a1.onResponderTerminate?.()
      vi.advanceTimersByTime(600)
    })
    expect(onSelectionChange).not.toHaveBeenCalled()
    function scrollView(id: string, x: number, y: number): void {
      host(id).onScroll?.({
        nativeEvent: {
          contentOffset: { x, y },
          contentSize: { width: 1728, height: 784 },
          layoutMeasurement: { width: 576, height: 304 },
          contentInset: { left: 0, right: 0, top: 0, bottom: 0 },
        },
      })
    }
    act(() => {
      scrollView('viewport-x', 192, 0)
      scrollView('viewport', 0, 56)
      a1.onResponderGrant?.(down)
      vi.advanceTimersByTime(600)
      expect(a1.onResponderTerminationRequest?.()).toBe(false)
      a1.onResponderMove?.(far)
      a1.onResponderTerminate?.()
      a1.onResponderMove?.(event(touch('1', 260, 200)))
    })
    expect(onSelectionChange.mock.calls).toEqual([[atA1], [{ ...atA1, r2: 3, c2: 3 }]])
    expect(native.alert).not.toHaveBeenCalled()
    expect(container.textContent).toContain('frozen')
    const d4 = host('spreadsheet-grid-cell-D4')
    act(() => d4.onAccessibilityAction?.({ nativeEvent: { actionName: 'secondaryAction' } }))
    expect(host('spreadsheet-grid-editor-D4').selectTextOnFocus).toBe(true)
    expect(native.focus).toHaveBeenCalledTimes(1)
    native.readText.mockResolvedValue('7\t8\n9\t10')
    await act(async () => {
      host('spreadsheet-grid-cell-A1').onAccessibilityAction?.({
        nativeEvent: { actionName: 'paste' },
      })
    })
    expect(native.readText).toHaveBeenCalledTimes(1)
    expect(onCellChange.mock.calls).toEqual([
      ['A1', 7],
      ['B1', 8],
      ['A2', 9],
      ['B2', 10],
    ])
  })
})
