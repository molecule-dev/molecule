// @vitest-environment jsdom
import { act, type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { View } from 'react-native'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Box } from '../elements/Box.js'
import { Pressable } from '../elements/Pressable.js'
import { ScrollArea } from '../elements/ScrollArea.js'
import { G, Path, Svg, SvgText } from '../elements/Svg.js'
import { Text } from '../elements/Text.js'
import { TextField } from '../elements/TextField.js'

interface Touch {
  nativeEvent: { pageX?: number; pageY?: number; button?: number }
  stopPropagation(): void
}

interface ViewProps {
  children?: ReactNode
  testID?: string
  style?: unknown
  role?: string
  text?: string
  'aria-label'?: string
  'aria-level'?: number
  accessibilityLanguage?: string
  accessibilityLabel?: string
  accessibilityActions?: { name: string; label?: string }[]
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void
  onLongPress?: (event: Touch) => void
  onPointerDown?: (event: Touch) => void
  onPressIn?: (event: Touch) => void
  onPressOut?: (event: Touch) => void
  onTouchStart?: (event: Touch) => void
  onPress?: (event: Touch) => void
  onKeyDownPress?: (event: {
    nativeEvent: { keyCode: number; unicodeChar: string }
    stopPropagation(): void
  }) => void
}

interface InputProps extends ViewProps {
  onPlainTextPaste?: (event: { nativeEvent: { text: string } }) => void
  onChangeText?: (text: string) => void
}

const {
  view,
  press,
  input,
  nativeText,
  svg,
  group,
  path,
  svgText,
  readText,
  alert,
  platform,
  scroll,
  keyboard,
  keyboardConfig,
} = vi.hoisted(() => ({
  view: vi.fn<(props: ViewProps) => ReactNode>(),
  press: vi.fn<(props: ViewProps) => ReactNode>(),
  scroll: vi.fn<(props: ViewProps) => ReactNode>(),
  keyboard: vi.fn<(props: ViewProps) => ReactNode>(),
  keyboardConfig: { available: false },
  input: vi.fn<(props: InputProps) => ReactNode>(),
  nativeText: vi.fn<(props: ViewProps) => ReactNode>(),
  svg: vi.fn<(props: ViewProps) => ReactNode>(),
  group: vi.fn<(props: ViewProps) => ReactNode>(),
  path: vi.fn<(props: ViewProps) => ReactNode>(),
  svgText: vi.fn<(props: ViewProps) => ReactNode>(),
  readText: vi.fn<() => Promise<string>>(),
  alert: vi.fn(),
  platform: { OS: 'ios', select: ({ default: value }: { default: unknown }) => value },
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))
vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  readText,
}))
vi.mock('react-native', () => ({
  Alert: { alert },
  Platform: platform,
  View: view,
  ScrollView: scroll,
  UIManager: { hasViewManagerConfig: () => keyboardConfig.available },
  Pressable: press,
  TextInput: input,
  Text: nativeText,
  useWindowDimensions: () => ({ width: 375 }),
}))
vi.mock('../elements/rangeKeyboard.js', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
  getNativeKeyboardView: () => (keyboardConfig.available ? keyboard : undefined),
}))
vi.mock('react-native-svg', () => ({
  Svg: svg,
  SvgXml: svg,
  G: group,
  Path: path,
  Text: svgText,
  Circle: path,
  Ellipse: path,
  Line: path,
  Polygon: path,
  Polyline: path,
  Rect: path,
}))

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  platform.OS = 'ios'
  keyboardConfig.available = false
  for (const host of [
    view,
    press,
    scroll,
    keyboard,
    input,
    nativeText,
    svg,
    group,
    path,
    svgText,
  ]) {
    host.mockImplementation(({ children }) => children)
  }
  root = createRoot(document.createElement('div'))
})
afterEach(() => {
  act(() => root.unmount())
  vi.unstubAllGlobals()
})

function lastHost(host: typeof view, id: string): ViewProps {
  const props = host.mock.calls.findLast(([candidate]) => candidate.testID === id)?.[0]
  if (!props) throw new Error(`Missing native view "${id}"`)
  return props
}

const touch = (): Touch => ({
  nativeEvent: { pageX: 10, pageY: 20 },
  stopPropagation: vi.fn(),
})

it('hides the native box from layout, hit-testing and accessibility without remounting it', () => {
  const mount = vi.fn()
  function Counter(): ReactElement {
    const [count] = useState(1)
    useEffect(() => {
      mount()
    }, [])
    return (
      <Text as="span" translate="no">
        {count}
      </Text>
    )
  }
  const render = (hidden: boolean): void => {
    act(() =>
      root.render(
        <Box as="div" data-testid="box" hidden={hidden}>
          <Counter />
        </Box>,
      ),
    )
  }
  render(false)
  render(true)
  const hidden = lastHost(view, 'box')
  expect(hidden.style).toContainEqual({ display: 'none' })
  expect(hidden).toMatchObject({
    pointerEvents: 'none',
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  })
  render(false)
  expect(lastHost(view, 'box').style).not.toContainEqual({ display: 'none' })
  expect(mount).toHaveBeenCalledOnce()
  expect(nativeText.mock.lastCall?.[0]).not.toHaveProperty('translate')

  view.mockClear()
  act(() =>
    root.render(
      <Box as="div">
        <Box as="span" hidden>
          <Text as="span">Inline</Text>
        </Box>
      </Box>,
    ),
  )
  // The synthesized inline line must contribute no strut height either.
  expect(view.mock.calls.map(([props]) => props.style)).toContainEqual([
    { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
    { display: 'none' },
  ])
})

it('maps platform input hints and focus selection while preserving omitted defaults', () => {
  const render = (): void => {
    act(() =>
      root.render(
        <>
          <TextField
            as="input"
            type="search"
            spellCheck={false}
            autoCorrect="off"
            enterKeyHint="search"
            selectTextOnFocus
          />
          <TextField as="input" enterKeyHint="previous" />
          <TextField as="input" enterKeyHint="enter" />
          <TextField as="input" />
        </>,
      ),
    )
  }
  render()
  expect(input.mock.calls[0]?.[0]).toMatchObject({
    autoCorrect: false,
    spellCheck: false,
    enterKeyHint: 'search',
    selectTextOnFocus: true,
  })
  expect(input.mock.calls[1]?.[0]).toHaveProperty('enterKeyHint', undefined)
  expect(input.mock.calls[2]?.[0]).toHaveProperty('enterKeyHint', 'enter')
  expect(input.mock.calls[3]?.[0]).toMatchObject({
    autoCorrect: undefined,
    spellCheck: undefined,
    enterKeyHint: undefined,
    selectTextOnFocus: undefined,
  })
  platform.OS = 'android'
  input.mockClear()
  render()
  expect(input.mock.calls[0]?.[0]).toHaveProperty('spellCheck', undefined)
  expect(input.mock.calls[1]?.[0]).toHaveProperty('enterKeyHint', 'previous')
  expect(input.mock.calls[2]?.[0]).toHaveProperty('enterKeyHint', undefined)
})

it('announces depth and one-based grid values without replacing the existing name or role', () => {
  act(() =>
    root.render(
      <>
        <Text as="h2" aria-label="Title" aria-level={4} data-testid="heading">
          Title
        </Text>
        <Box as="div" role="treeitem" aria-label="Trace" aria-level={3} data-testid="item" />
        <Box as="div" role="columnheader" aria-colindex={1} data-testid="first">
          A
        </Box>
        <Box
          as="div"
          role="grid"
          aria-label="Sheet"
          aria-rowcount={7}
          aria-colcount={4}
          data-testid="sheet"
        />
      </>,
    ),
  )
  expect(lastHost(nativeText, 'heading')).toMatchObject({ role: 'heading', 'aria-level': 4 })
  expect(lastHost(view, 'item')).toMatchObject({ role: 'treeitem', 'aria-label': 'Trace, Level 3' })
  expect(lastHost(view, 'first')).toMatchObject({
    role: 'columnheader',
    'aria-label': 'A, Column number 1',
  })
  expect(lastHost(view, 'sheet')).toMatchObject({
    role: 'grid',
    'aria-label': 'Sheet, 7 rows, 4 columns',
  })
})

it.each(['ios', 'android'])('forwards language to %s accessibility hosts', (os) => {
  platform.OS = os

  act(() =>
    root.render(
      <>
        <Text as="span" aria-live="polite" lang="es-MX" data-testid="cue">
          Buenos días
        </Text>
        <Box as="div" lang="fr-CA" aria-label="Bonjour" data-testid="label" />
        <Text as="span" data-testid="ambient">
          Default language
        </Text>
      </>,
    ),
  )

  expect(lastHost(nativeText, 'cue')).toMatchObject({
    accessibilityLanguage: 'es-MX',
    'aria-live': 'polite',
  })
  expect(lastHost(view, 'label')).toMatchObject({
    accessibilityLanguage: 'fr-CA',
    'aria-label': 'Bonjour',
  })
  expect(lastHost(nativeText, 'cue')).not.toHaveProperty('lang')
  expect(lastHost(nativeText, 'ambient').accessibilityLanguage).toBeUndefined()
})

it('uses the Android Text live-region prop for caption updates', () => {
  platform.OS = 'android'

  act(() =>
    root.render(
      <>
        <Text as="span" aria-live="polite" data-testid="cue">
          Active caption
        </Text>
        <Text as="span" aria-live="off" data-testid="silent">
          Silent caption
        </Text>
      </>,
    ),
  )

  expect(lastHost(nativeText, 'cue')).toHaveProperty('accessibilityLiveRegion', 'polite')
  expect(lastHost(nativeText, 'silent')).toHaveProperty('accessibilityLiveRegion', 'none')
})

it('routes actual native paste separately from typing, autofill or IME', () => {
  const grid = vi.fn()
  const slot = vi.fn()
  const change = vi.fn()
  act(() =>
    root.render(
      <Box as="div" onPasteText={grid}>
        <TextField
          as="input"
          data-testid="slot"
          maxLength={1}
          onPasteText={slot}
          onValueChange={change}
        />
        <TextField as="input" data-testid="cell" />
      </Box>,
    ),
  )
  const field = input.mock.calls.find(([props]) => props.testID === 'slot')?.[0]
  expect(field).toMatchObject({ maxLength: 1, consumePlainTextPaste: true })
  expect(field?.onPlainTextPaste).toBeTypeOf('function')
  const paste = (text: string): void =>
    act(() => field?.onPlainTextPaste?.({ nativeEvent: { text } }))
  paste('ABC123')
  paste('Q')
  paste('')
  expect(slot.mock.calls).toEqual([['ABC123'], ['Q']])
  expect(grid).not.toHaveBeenCalled()
  expect(change).not.toHaveBeenCalled()
  act(() => field?.onChangeText?.('世界'))
  expect(change.mock.calls).toEqual([['世界']])
  expect(slot).toHaveBeenCalledTimes(2)
  const editor = input.mock.calls.find(([props]) => props.testID === 'cell')?.[0]
  act(() => editor?.onPlainTextPaste?.({ nativeEvent: { text: 'x\ty\nz\tw' } }))
  expect(grid.mock.calls).toEqual([['x\ty\nz\tw']])
})

it('requests plain text only when the focused grid or cell Paste action activates', async () => {
  const paste = vi.fn()
  readText.mockResolvedValueOnce('a\tb\nc\td').mockResolvedValueOnce('X')
  act(() =>
    root.render(
      <Box as="div" role="grid" tabIndex={0} data-testid="grid" onPasteText={paste}>
        <Box as="div" role="gridcell" tabIndex={0} data-testid="focus-cell" />
      </Box>,
    ),
  )
  const grid = lastHost(press, 'grid')
  const cell = lastHost(press, 'focus-cell')
  expect(readText).not.toHaveBeenCalled()
  expect(grid.accessibilityActions).toContainEqual({ name: 'paste', label: 'Paste' })
  expect(cell.accessibilityActions).toContainEqual({ name: 'paste', label: 'Paste' })
  await act(async () => grid.onAccessibilityAction?.({ nativeEvent: { actionName: 'paste' } }))
  act(() => cell.onLongPress?.(touch()))
  expect(alert).toHaveBeenCalledOnce()
  expect(readText).toHaveBeenCalledOnce()
  await act(async () => cell.onAccessibilityAction?.({ nativeEvent: { actionName: 'paste' } }))
  expect(readText).toHaveBeenCalledTimes(2)
  expect(paste.mock.calls).toEqual([['a\tb\nc\td'], ['X']])
})

it('uses context long press, secondary activation and a screen reader action', () => {
  const context = vi.fn()
  const click = vi.fn()
  act(() =>
    root.render(
      <Box as="div" onContextMenu={context}>
        <Pressable as="button" data-testid="card" onClick={click}>
          File
        </Pressable>
      </Box>,
    ),
  )
  const card = lastHost(press, 'card')
  expect(card.onLongPress).toBeTypeOf('function')
  expect(click).not.toHaveBeenCalled()
  act(() => card.onLongPress?.(touch()))
  expect(context).toHaveBeenCalledTimes(1)
  expect(click).not.toHaveBeenCalled()
  const secondary = { ...touch(), nativeEvent: { button: 2 } }
  act(() => card.onPointerDown?.(secondary))
  expect(context).toHaveBeenCalledTimes(2)
  act(() => card.onAccessibilityAction?.({ nativeEvent: { actionName: 'contextMenu' } }))
  expect(context).toHaveBeenCalledTimes(3)
  expect(context.mock.calls.map(([event]) => event.button)).toEqual([2, 2, 2])
})

it('selects on native press-in once and observes outside touches at the enclosing Box', () => {
  const click = vi.fn()
  const down = vi.fn((event: { preventDefault(): void }) => event.preventDefault())
  const outside = vi.fn()
  act(() =>
    root.render(
      <Box as="div" data-testid="root">
        <Box as="div" data-testid="popup" onPressOutside={outside}>
          <ScrollArea as="ul" role="listbox">
            <Pressable
              as="li"
              role="option"
              data-testid="option"
              tabIndex={-1}
              onClick={click}
              onMouseDown={down}
            >
              Suggestion
            </Pressable>
          </ScrollArea>
        </Box>
      </Box>,
    ),
  )
  const area = lastHost(view, 'root')
  const popup = lastHost(view, 'popup')
  const option = lastHost(press, 'option')
  expect(scroll.mock.lastCall?.[0]).toHaveProperty('keyboardShouldPersistTaps', 'handled')
  const inside = touch()
  act(() => {
    option.onPressIn?.(inside)
    popup.onTouchStart?.(inside)
    area.onTouchStart?.(inside)
    option.onPressOut?.(inside)
    option.onPress?.(inside)
  })
  expect(option).toMatchObject({ focusable: false })
  expect(down).toHaveBeenCalledOnce()
  expect(click).not.toHaveBeenCalled()
  expect(outside).not.toHaveBeenCalled()
  act(() => area.onTouchStart?.(touch()))
  expect(outside).toHaveBeenCalledOnce()
})

it.each<{ direction: 'row' | 'column' }>([{ direction: 'row' }, { direction: 'column' }])(
  'keeps a view-box-only SVG intrinsically sized in a flex $direction',
  ({ direction }) => {
    act(() =>
      root.render(
        <View style={{ flexDirection: direction, alignItems: 'center' }}>
          <Svg viewBox="0 0 24 24" data-testid="intrinsic-svg" />
        </View>,
      ),
    )

    const drawing = lastHost(svg, 'intrinsic-svg')
    expect(drawing).not.toHaveProperty('width')
    expect(drawing).not.toHaveProperty('height')
  },
)

it('maps SVG paint and press to shapes and keeps word Enter inert in the focus targets', () => {
  const node = vi.fn()
  const word = vi.fn()
  const arrowOnly = vi.fn()
  const draw = (key: string, hidden = false): ReactElement => (
    <Svg
      key={key}
      width={30}
      height={30}
      aria-hidden={hidden}
      data-testid="canvas"
      webStyle={{ position: 'absolute', left: 10, opacity: 0.5 }}
    >
      <G
        role="button"
        aria-label="Node"
        data-testid="graph"
        tabIndex={0}
        onClick={node}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') node()
        }}
      >
        <Path
          d="M0 0L3 4"
          data-testid="edge"
          style={{ stroke: 'red', pointerEvents: 'none' }}
          webStyle={{ cursor: 'pointer' }}
        />
      </G>
      <SvgText dominantBaseline="central" data-testid="word" tabIndex={0} onClick={word}>
        Word
      </SvgText>
      <Path
        d="M0 0L3 4"
        role="button"
        tabIndex={0}
        data-testid="click-first"
        onClick={arrowOnly}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') arrowOnly()
        }}
      />
    </Svg>
  )
  act(() => root.render(draw('fallback')))
  const graphShape = lastHost(group, 'graph')
  const wordShape = lastHost(svgText, 'word')
  expect(graphShape).toMatchObject({ accessibilityLabel: 'Node' })
  expect(wordShape).toMatchObject({ alignmentBaseline: 'central' })
  expect(lastHost(path, 'edge')).toMatchObject({ stroke: 'red', pointerEvents: 'none' })
  expect(lastHost(path, 'edge')).not.toHaveProperty('webStyle')
  expect(lastHost(svg, 'canvas')).toMatchObject({ width: '100%', height: '100%' })
  expect(lastHost(svg, 'canvas')).not.toHaveProperty('style')
  const graphProxy = lastHost(press, 'graph-focus')
  const wordProxy = lastHost(press, 'word-focus')
  expect(graphProxy).toMatchObject({ role: 'button', focusable: true, 'aria-label': 'Node' })
  act(() => graphProxy.onPress?.(touch()))
  expect(node).toHaveBeenCalledOnce()
  act(() => wordProxy.onPress?.(touch()))
  expect(word).not.toHaveBeenCalled()
  act(() => wordShape.onPress?.(touch()))
  expect(word).toHaveBeenCalledOnce()
  const clickFirst = lastHost(press, 'click-first-focus')
  act(() => clickFirst.onAccessibilityAction?.({ nativeEvent: { actionName: 'activate' } }))
  expect(arrowOnly).toHaveBeenCalledOnce()

  keyboardConfig.available = true
  act(() => root.render(draw('hardware')))
  const nativeKeys = lastHost(keyboard, 'graph-focus')
  for (const keyCode of [40, 44]) {
    act(() =>
      nativeKeys.onKeyDownPress?.({
        nativeEvent: { keyCode, unicodeChar: '' },
        stopPropagation: vi.fn(),
      }),
    )
  }
  expect(node).toHaveBeenCalledTimes(3)
  keyboard.mockClear()
  act(() => root.render(draw('hardware', true)))
  expect(keyboard).not.toHaveBeenCalled()
  expect(view.mock.lastCall?.[0]).toMatchObject({
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  })
})
