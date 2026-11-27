// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  createContext,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useRef,
  useState,
} from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { RouterContext } from '@molecule/app-react'
import {
  createReactNavigationRouter,
  type NavigationRef,
} from '@molecule/app-routing-react-navigation'
import type { ElementHandle, OverlayLayerOptions } from '@molecule/app-ui'

import { Box } from '../elements/Box.js'
import { Pressable } from '../elements/Pressable.js'
import { ScrollArea } from '../elements/ScrollArea.js'
import { Text } from '../elements/Text.js'
import {
  OverlayBackdrop,
  OverlayHost,
  OverlayPortal,
  ToastMessage,
  useAnchoredPosition,
  useHistoryPop,
  useOverlayLayer,
  useViewportMatch,
} from '../platform/index.js'

interface NativeModalProps {
  children: ReactNode
  visible: boolean
  transparent: boolean
  presentationStyle?: string
  onShow(): void
  onDismiss(): void
  onRequestClose(): void
}

interface MockNode {
  tag: number
  focus(): void
  blur(): void
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void
}

const native = vi.hoisted(() => ({
  platform: { OS: 'android', select: ({ default: value }: { default: unknown }) => value },
  width: 767,
  nextTag: 0,
  back: new Set<() => boolean>(),
  modals: new Map<Element, NativeModalProps>(),
  layout: new Set<() => void>(),
  escape: new Set<() => void>(),
  accessFocus: vi.fn(),
  announce: vi.fn(),
  announceQueued: vi.fn(),
  measure: vi.fn<(id: string, callback: Parameters<MockNode['measureInWindow']>[0]) => void>(),
}))

vi.mock('@molecule/app-ui', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))

vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})

vi.mock('react-native', async () => {
  const { createElement, useImperativeHandle, useLayoutEffect, useRef } = await import('react')
  interface HostProps {
    children?: ReactNode
    id?: string
    role?: string
    tabIndex?: number
    testID?: string
    accessible?: boolean
    'aria-label'?: string
    accessibilityHint?: string
    accessibilityViewIsModal?: boolean
    importantForAccessibility?: string
    pointerEvents?: string
    onPress?: () => void
    onFocus?: () => void
    onTouchStart?: () => void
    onTouchEnd?: () => void
    onTouchCancel?: () => void
    onLayout?: () => void
    onAccessibilityEscape?: () => void
    keyboardShouldPersistTaps?: string
    ref?: Ref<MockNode>
  }
  const host =
    (tag: string, pressable = false) =>
    (props: HostProps): ReactElement => {
      const node = useRef<HTMLElement>(null)
      useImperativeHandle(
        props.ref,
        () => ({
          tag: ++native.nextTag,
          focus: () => node.current?.focus(),
          blur: () => node.current?.blur(),
          measureInWindow: (callback) => native.measure(props.testID ?? 'plane', callback),
        }),
        [],
      )
      useLayoutEffect(() => {
        const { onLayout, onAccessibilityEscape } = props
        if (onLayout) native.layout.add(onLayout)
        if (onAccessibilityEscape) native.escape.add(onAccessibilityEscape)
        return () => {
          if (onLayout) native.layout.delete(onLayout)
          if (onAccessibilityEscape) native.escape.delete(onAccessibilityEscape)
        }
      }, [props])
      return createElement(
        tag,
        {
          ref: node,
          id: props.id,
          role: props.role,
          tabIndex: props.tabIndex,
          'data-testid': props.testID,
          'aria-label': props['aria-label'],
          'data-hint': props.accessibilityHint,
          'data-background': props.importantForAccessibility,
          'data-pointer-events': props.pointerEvents,
          'data-modal-scope': props.accessibilityViewIsModal ? '' : undefined,
          'data-backdrop': pressable && props.accessible === false ? '' : undefined,
          'data-scroll': props.keyboardShouldPersistTaps,
          onClick: props.onPress,
          onFocus: props.onFocus,
          onTouchStart: props.onTouchStart,
          onTouchEnd: props.onTouchEnd,
          onTouchCancel: props.onTouchCancel,
        },
        props.children,
      )
    }
  function Modal(props: NativeModalProps): ReactElement {
    const ref = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
      const node = ref.current
      if (!node) return
      native.modals.set(node, props)
      return () => {
        native.modals.delete(node)
      }
    }, [props])
    return (
      <div ref={ref} data-native-modal={String(props.visible)}>
        {props.children}
      </div>
    )
  }
  return {
    Modal,
    View: host('div'),
    Pressable: host('button', true),
    ScrollView: host('div'),
    Text: host('span'),
    StyleSheet: { absoluteFill: {}, create: (styles: object) => styles },
    Platform: native.platform,
    useWindowDimensions: () => ({ width: native.width, height: 600, scale: 2 }),
    Keyboard: {
      metrics: () => undefined,
      addListener: () => ({ remove() {} }),
    },
    findNodeHandle: (node: MockNode) => {
      if (native.platform.OS === 'web') throw new Error('findNodeHandle is not supported on web')
      return node.tag
    },
    AccessibilityInfo: {
      setAccessibilityFocus: native.accessFocus,
      announceForAccessibility: native.announce,
      announceForAccessibilityWithOptions: native.announceQueued,
    },
    BackHandler: {
      addEventListener: (_event: string, callback: () => boolean) => {
        native.back.add(callback)
        return { remove: () => native.back.delete(callback) }
      },
    },
  }
})

let frames: Map<number, FrameRequestCallback>

beforeEach(() => {
  native.platform.OS = 'android'
  native.width = 767
  frames = new Map()
  vi.clearAllMocks()
  let frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})

/** Advances one native frame after processing show, layout or dismissal. */
function frame(): void {
  const queued = [...frames.values()]
  frames.clear()
  act(() => queued.forEach((callback) => callback(0)))
}

afterEach(() => {
  cleanup()
  frame()
  vi.unstubAllGlobals()
})

it('announces the effective Toast priority once per presentation and leaves Back and presses available', () => {
  native.platform.OS = 'ios'
  const background = vi.fn()
  const tree = (occasional: string) => (
    <OverlayHost>
      <Pressable as="button" onClick={background}>
        Page button
      </Pressable>
      <ToastMessage
        role="alert"
        aria-live="polite"
        spokenContent={<Text as="strong">Quiet save</Text>}
        className={occasional}
      />
      <ToastMessage role="status" aria-live="assertive" aria-label="Immediate" />
      <ToastMessage role="alert" aria-live="off" spokenContent="Skip this" />
    </OverlayHost>
  )
  const view = render(tree('first'))
  expect(native.announceQueued.mock.calls).toEqual([
    ['Quiet save', { queue: true }],
    ['Immediate', { queue: false }],
  ])
  view.rerender(tree('second'))
  expect(native.announceQueued).toHaveBeenCalledTimes(2)
  expect(native.announce).not.toHaveBeenCalled()
  expect(native.back.size).toBe(0)
  fireEvent.click(screen.getByText('Page button'))
  expect(background).toHaveBeenCalledOnce()
  view.unmount()

  native.platform.OS = 'android'
  render(<ToastMessage role="status" spokenContent="Saved" />)
  expect(native.announce).toHaveBeenCalledExactlyOnceWith('Saved')
  expect(native.announceQueued).toHaveBeenCalledTimes(2)
})

it('dismisses on a committed same-path pop and keeps a same-path push or replacement open', () => {
  const base = { name: 'Home', key: 'home-1' }
  let current = [base]
  let changed: () => void = () => {}
  const navigationRef: NavigationRef = {
    isReady: () => true,
    getState: () => ({ routes: current, index: current.length - 1 }),
    getCurrentRoute: () => current.at(-1),
    canGoBack: () => current.length > 1,
    goBack: () => {
      current = [base]
      changed()
    },
    navigate: () => {},
    dispatch: () => {},
    addListener: (_, listener) => {
      changed = listener
      return () => {
        changed = () => {}
      }
    },
  }
  const router = createReactNavigationRouter({ navigationRef, linking: { screens: { Home: '/' } } })
  const close = vi.fn()
  function Observe(): ReactElement {
    useHistoryPop(close)
    return <Text as="p">Disclosed</Text>
  }
  const view = render(
    <RouterContext.Provider value={router}>
      <Observe />
    </RouterContext.Provider>,
  )
  try {
    act(() => {
      current = [base, { name: 'Home', key: 'home-2' }]
      changed()
      current = [base, { name: 'Home', key: 'home-3' }]
      changed()
    })
    expect(close).not.toHaveBeenCalled()
    act(() => router.back())
    expect(close).toHaveBeenCalledOnce()
  } finally {
    view.unmount()
    router.destroy()
  }
})

function Positioned({
  open,
  listFallback = false,
}: {
  open: boolean
  listFallback?: boolean
}): ReactElement {
  const anchor = useRef<ElementHandle>(null)
  const surfaceRef = useRef<ElementHandle>(null)
  const [surface, setSurface] = useState<ElementHandle | null>(null)
  const layer = useOverlayLayer({
    open,
    kind: 'popover',
    surface: surfaceRef,
    anchor,
    dismissKey: true,
  })
  const position = useAnchoredPosition({
    layer,
    open,
    surface,
    anchor,
    placement: 'bottom-end',
    offset: 4,
    padding: 0,
    collision: 'none',
    timing: 'frame',
    listFallback,
  })
  return (
    <>
      <Box as="div" data-testid="anchor" ref={anchor} />
      <Text as="p">
        {position.fallback
          ? 'List fallback'
          : position.ready
            ? `${position.left},${position.top}`
            : 'Measuring'}
      </Text>
      {open && (
        <OverlayPortal layer={layer} presentation="host" server="omit" anchorPosition={position}>
          <Box as="div" data-testid="surface" ref={setSurface}>
            <Pressable as="button" disabled>
              Unavailable
            </Pressable>
            <Pressable as="button">Menu</Pressable>
          </Box>
        </OverlayPortal>
      )}
    </>
  )
}

it('discards a stale measurement after close and unmount and uses the current host origin', () => {
  const anchorCallbacks: Parameters<MockNode['measureInWindow']>[0][] = []
  native.measure.mockImplementation((id, callback) => {
    if (id === 'anchor') anchorCallbacks.push(callback)
    else if (id === 'plane') callback(7, 12, 300, 400)
    else callback(0, 0, 20, 20)
  })
  const view = render(<Positioned open />)
  frame()
  expect(screen.getByText('Measuring')).toBeDefined()
  expect(screen.getByTestId('surface').parentElement?.getAttribute('data-pointer-events')).toBe(
    'none',
  )
  const stale = anchorCallbacks.shift()
  view.rerender(<Positioned open={false} />)
  view.rerender(<Positioned open />)
  frame()
  const current = anchorCallbacks.shift()
  if (!stale || !current) throw new Error('Expected two open intervals to measure')
  act(() => stale(100, 100, 30, 20))
  expect(screen.getByText('Measuring')).toBeDefined()
  act(() => current(40, 50, 30, 20))
  expect(screen.getByText('43,62')).toBeDefined()
  expect(screen.getByTestId('surface').parentElement?.getAttribute('data-pointer-events')).toBe(
    'box-none',
  )
  view.unmount()
  native.measure.mockClear()
  act(() => current(40, 50, 30, 20))
  expect(native.measure).not.toHaveBeenCalled()
})

it.each([
  { clipped: 'menu', anchorY: 550, anchorHeight: 40, scroll: false },
  { clipped: 'anchor at the screen edge', anchorY: -6, anchorHeight: 8, scroll: false },
  { clipped: 'anchor in a scroller', anchorY: 40, anchorHeight: 10, scroll: true },
])(
  'presents an accessible native list for a clipped $clipped',
  ({ anchorY, anchorHeight, scroll }) => {
    native.measure.mockImplementation((id, callback) => {
      if (id === 'anchor') callback(90, anchorY, 40, anchorHeight)
      else if (id === 'plane') callback(0, 0, 300, 600)
      else if (id === 'viewport') callback(0, 50, 300, 200)
      else callback(0, 0, 20, 30)
    })
    const scene = <Positioned open listFallback />
    render(scroll ? <ScrollArea data-testid="viewport">{scene}</ScrollArea> : scene)
    frame()
    expect(screen.getByText('List fallback')).toBeDefined()
    expect(native.modals.size).toBe(1)
    expect(screen.getByText('Menu').closest('[data-native-modal]')).not.toBeNull()
    expect(native.accessFocus).not.toHaveBeenCalled()
    const presentation = [...native.modals.values()][0]
    if (!presentation) throw new Error('Expected the native menu presentation')
    act(() => {
      presentation.onShow()
      native.layout.forEach((onLayout) => onLayout())
    })
    frame()
    expect(native.accessFocus).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Menu' }))
  },
)

it('observes a raw sibling tap without capturing its press or dismissing on scroll', () => {
  const dismiss = vi.fn()
  const onPress = vi.fn()
  function Disclosure(): ReactElement {
    const target = useRef<ElementHandle>(null)
    useOverlayLayer({
      open: true,
      kind: 'popover',
      surface: target,
      anchor: target,
      dismissKey: true,
      outside: { inside: [target], phase: 'activate' },
      onDismiss: dismiss,
    })
    return (
      <Box as="div" ref={target} data-testid="inside">
        Disclosure
      </Box>
    )
  }
  render(
    <OverlayHost>
      <Disclosure />
      <button type="button" onClick={onPress}>
        Raw sibling
      </button>
    </OverlayHost>,
  )
  const inside = screen.getByTestId('inside')
  const outside = screen.getByRole('button', { name: 'Raw sibling' })
  const touch = (node: Element, type: 'touchstart' | 'touchend', pageY = 10): void => {
    const event = new Event(type, { bubbles: true })
    Object.defineProperties(event, {
      identifier: { value: 'one' },
      pageX: { value: 10 },
      pageY: { value: pageY },
      touches: { value: type === 'touchstart' ? [{}] : [] },
    })
    fireEvent(node, event)
  }
  touch(inside, 'touchstart')
  touch(inside, 'touchend')
  expect(dismiss).not.toHaveBeenCalled()
  touch(outside, 'touchstart')
  touch(outside, 'touchend', 85)
  expect(dismiss).not.toHaveBeenCalled()
  touch(outside, 'touchstart')
  expect(dismiss).not.toHaveBeenCalled()
  touch(outside, 'touchend')
  expect(dismiss).toHaveBeenCalledExactlyOnceWith('outside')
  fireEvent.click(outside)
  expect(onPress).toHaveBeenCalledOnce()
})

/** A blocking dialog, with children kept under the provider that declared it. */
function Dialog({
  open,
  name,
  children,
  ...options
}: Pick<OverlayLayerOptions, 'open' | 'dismissKey' | 'onDismiss' | 'anchor'> & {
  name: string
  children?: ReactNode
}): ReactElement {
  const surface = useRef<ElementHandle>(null)
  const layer = useOverlayLayer({
    kind: 'modal',
    open,
    surface,
    dismissBackdrop: true,
    focus: { trap: true, restore: 'opener' },
    ...options,
  })
  return (
    <OverlayPortal layer={layer} presentation="host" server="inline">
      {open && (
        <OverlayBackdrop layer={layer} role="presentation">
          <ScrollArea
            as="div"
            role="dialog"
            aria-modal="true"
            aria-label={name}
            aria-describedby={`${name}-description`}
            tabIndex={-1}
            ref={surface}
          >
            <Text as="p" id={`${name}-description`}>
              Review before continuing.
            </Text>
            {children}
          </ScrollArea>
        </OverlayBackdrop>
      )}
    </OverlayPortal>
  )
}

/** Retrieves the native presenter that contains a rendered panel. */
function presenter(name: string): NativeModalProps {
  const node = screen.getByRole('dialog', { name }).closest('[data-native-modal]')
  const modal = node && native.modals.get(node)
  if (!modal) throw new Error(`Expected a native presenter for ${name}`)
  return modal
}

it('gives Android Back to the top Modal, including a barrier with dismissal disabled', () => {
  const lower = vi.fn()
  const upper = vi.fn()
  const view = render(
    <OverlayHost>
      <Text as="p">Background</Text>
      <Dialog open name="Drawer" dismissKey onDismiss={lower} />
      <Dialog open name="Confirm" dismissKey={false} onDismiss={upper} />
    </OverlayHost>,
  )
  const bottom = presenter('Drawer')
  const top = presenter('Confirm')
  act(() => {
    bottom.onShow()
    top.onShow()
  })
  expect(native.back.size).toBe(0)
  expect(
    screen.getByText('Background').closest('[data-background="no-hide-descendants"]'),
  ).not.toBeNull()
  act(() => {
    bottom.onRequestClose()
    top.onRequestClose()
  })
  expect(lower).not.toHaveBeenCalled()
  expect(upper).not.toHaveBeenCalled()
  view.rerender(
    <OverlayHost>
      <Text as="p">Background</Text>
      <Dialog open name="Drawer" dismissKey onDismiss={lower} />
      <Dialog open name="Confirm" dismissKey onDismiss={upper} />
    </OverlayHost>,
  )
  act(() => presenter('Confirm').onRequestClose())
  expect(upper).toHaveBeenCalledExactlyOnceWith('back')
  expect(lower).not.toHaveBeenCalled()
})

it('delivers one Back outside native modals and leaves a passive toast out of dismissal', () => {
  const lower = vi.fn()
  const upper = vi.fn()
  const toast = vi.fn()
  function Popover({
    kind,
    onDismiss,
  }: Pick<OverlayLayerOptions, 'kind' | 'onDismiss'>): ReactElement {
    const surface = useRef<ElementHandle>(null)
    const layer = useOverlayLayer({ open: true, kind, surface, dismissKey: true, onDismiss })
    return (
      <OverlayPortal layer={layer} presentation="host" server="omit">
        <Text as="p">{kind}</Text>
      </OverlayPortal>
    )
  }
  const view = render(
    <>
      <Popover kind="popover" onDismiss={lower} />
      <Popover kind="popover" onDismiss={upper} />
      <Popover kind="toast" onDismiss={toast} />
    </>,
  )
  expect(native.modals.size).toBe(0)
  expect(native.back.size).toBe(1)
  const back = [...native.back][0]
  expect(back()).toBe(true)
  expect(upper).toHaveBeenCalledExactlyOnceWith('back')
  expect(lower).not.toHaveBeenCalled()
  expect(toast).not.toHaveBeenCalled()
  view.unmount()
  expect(native.back.size).toBe(0)
})

function FocusScreen(): ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable as="button" onClick={() => setOpen(true)}>
        Opener
      </Pressable>
      <Dialog open={open} name="Confirm" dismissKey onDismiss={() => setOpen(false)}>
        <Pressable as="button" disabled>
          Unavailable
        </Pressable>
        <Pressable as="button">Action</Pressable>
      </Dialog>
    </>
  )
}

it('focuses the first enabled control after show and layout and restores the mounted opener', () => {
  render(<FocusScreen />)
  const opener = screen.getByText('Opener').closest('button')
  fireEvent.click(screen.getByText('Opener'))
  act(() => presenter('Confirm').onShow())
  frame()
  expect(native.accessFocus).not.toHaveBeenCalled()
  act(() => native.layout.forEach((layout) => layout()))
  frame()
  expect(document.activeElement).toBe(screen.getByText('Action').closest('button'))
  expect(native.accessFocus).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('dialog', { name: 'Confirm' }).getAttribute('data-hint')).toBe(
    'Review before continuing.',
  )
  expect(native.announce).toHaveBeenCalledExactlyOnceWith('Confirm. Review before continuing.')

  act(() => presenter('Confirm').onRequestClose())
  frame()
  expect(document.activeElement).toBe(opener)
  expect(native.accessFocus).toHaveBeenCalledTimes(2)
})

it('focuses and restores an overlay control through its React Native Web ref', () => {
  native.platform.OS = 'web'
  render(<FocusScreen />)
  const opener = screen.getByText('Opener').closest('button')
  fireEvent.click(screen.getByText('Opener'))
  act(() => presenter('Confirm').onShow())
  act(() => native.layout.forEach((layout) => layout()))
  frame()
  expect(document.activeElement).toBe(screen.getByText('Action').closest('button'))

  act(() => presenter('Confirm').onRequestClose())
  frame()
  expect(document.activeElement).toBe(opener)
  expect(native.accessFocus).not.toHaveBeenCalled()
})

it('serializes iOS sibling presentations and resumes the lower drawer after dismissal', () => {
  native.platform.OS = 'ios'
  const dialogs = (upper: boolean): ReactElement => (
    <>
      <Dialog open name="Drawer" />
      <Dialog open={upper} name="Confirm" dismissKey />
    </>
  )
  const view = render(dialogs(false))
  const drawer = presenter('Drawer')
  expect(drawer.transparent).toBe(true)
  expect(drawer.presentationStyle).toBe('overFullScreen')
  act(() => drawer.onShow())
  view.rerender(dialogs(true))
  expect(native.modals.size).toBe(1)
  expect(presenter('Drawer').visible).toBe(false)
  act(() => presenter('Drawer').onDismiss())
  expect(presenter('Confirm').visible).toBe(true)
  act(() => presenter('Confirm').onShow())
  const confirm = presenter('Confirm')
  view.rerender(dialogs(false))
  expect([...native.modals.values()].map((modal) => modal.visible)).toEqual([false])
  act(() => confirm.onDismiss())
  expect(presenter('Drawer').visible).toBe(true)
})

it('presents an iOS descendant after its parent, retaining context and accessibility Escape', () => {
  native.platform.OS = 'ios'
  const Locale = createContext('fallback')
  const leave = vi.fn()
  function Content(): ReactElement {
    return <Text as="p">{useContext(Locale)}</Text>
  }
  const tree = (locale: string): ReactElement => (
    <Dialog open name="Outer" dismissKey>
      <Locale.Provider value={locale}>
        <Dialog open name="Nested" dismissKey onDismiss={leave}>
          <Content />
        </Dialog>
      </Locale.Provider>
    </Dialog>
  )
  const view = render(tree('First language'))
  expect(native.modals.size).toBe(1)
  act(() => presenter('Outer').onShow())
  expect(native.modals.size).toBe(2)
  act(() => presenter('Nested').onShow())
  expect(screen.getByText('First language')).toBeDefined()
  view.rerender(tree('Second language'))
  expect(screen.getByText('Second language')).toBeDefined()
  act(() => native.escape.forEach((escape) => escape()))
  expect(leave).toHaveBeenCalledExactlyOnceWith('escape')
})

it('gives the backdrop its own press target and keeps the scroll frame and controls usable', () => {
  const close = vi.fn()
  const action = vi.fn()
  render(
    <Dialog open name="Drawer" dismissKey onDismiss={close}>
      <Pressable as="button" onClick={action}>
        Action
      </Pressable>
    </Dialog>,
  )
  const panel = screen.getByRole('dialog', { name: 'Drawer' })
  const scroll = panel.querySelector('[data-scroll="handled"]')
  if (!scroll) throw new Error('Expected a Native ScrollView inside the dialog frame')
  expect(panel.getAttribute('tabindex')).toBe('-1')
  fireEvent.scroll(scroll)
  fireEvent.click(screen.getByText('Action'))
  expect(action).toHaveBeenCalledTimes(1)
  expect(close).not.toHaveBeenCalled()
  const backdrop = panel.parentElement?.querySelector('[data-backdrop]')
  if (!backdrop) throw new Error('Expected a separate backdrop behind the panel')
  fireEvent.click(backdrop)
  expect(close).toHaveBeenCalledExactlyOnceWith('backdrop')
})

it('matches numeric and pixel width conditions in logical units at the breakpoint', () => {
  function Match({ query }: { query: number | string }): ReactElement {
    return (
      <Box as="div" data-testid="current-width-match">
        {String(useViewportMatch(query))}
      </Box>
    )
  }
  const view = render(<Match query={768} />)
  expect(screen.getByTestId('current-width-match').textContent).toBe('false')
  native.width = 768
  view.rerender(<Match query={768} />)
  expect(screen.getByTestId('current-width-match').textContent).toBe('true')
  view.rerender(<Match query="(min-width: 768px) and (max-width: 900px)" />)
  expect(screen.getByTestId('current-width-match').textContent).toBe('true')
  view.rerender(<Match query="(orientation: landscape)" />)
  expect(screen.getByTestId('current-width-match').textContent).toBe('false')
})
