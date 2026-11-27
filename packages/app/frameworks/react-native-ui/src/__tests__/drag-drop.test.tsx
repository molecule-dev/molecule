// @vitest-environment jsdom
import { act, type ReactNode, type Ref, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DragEndEvent } from '@molecule/app-drag-drop'
import {
  DragDropRendererProvider,
  type DragSourceProps,
  useDragDropRenderer,
  useScopedDragDrop,
} from '@molecule/app-drag-drop/react'
import { KanbanBoard, type KanbanColumnData } from '@molecule/app-kanban-board-react'
import { ReorderableList } from '@molecule/app-reorderable-list-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Box } from '../elements/Box.js'
import { NativeDragDropProvider } from '../elements/drag-drop.js'
import { Text } from '../elements/Text.js'

interface Responder {
  onMoveShouldSetPanResponder: (
    event: object,
    state: { dx: number; dy: number; numberActiveTouches: number },
  ) => boolean
  onPanResponderGrant: () => void
  onPanResponderMove: (event: object, state: { moveX: number; moveY: number }) => void
  onPanResponderRelease: (event: { nativeEvent: { pageX: number; pageY: number } }) => void
  onPanResponderReject?: () => void
  onPanResponderTerminate: () => void
}

type Contact = {
  identifier: string
  pageX: number
  pageY: number
}
type Touch = {
  nativeEvent: Contact & { touches: Contact[]; changedTouches: Contact[] }
  persist(): void
  stopPropagation(): void
}
type ScopedResponder = {
  onResponderGrant?: (event: Touch) => void
  onResponderMove?: (event: Touch) => void
  onResponderRelease?: (event: Touch) => void
  onResponderTerminate?: (event: Touch) => void
}

const native = vi.hoisted(() => ({
  responders: new WeakMap<HTMLElement, Responder>(),
  scopedResponders: new WeakMap<HTMLElement, ScopedResponder>(),
  bounds: new WeakMap<HTMLElement, { x: number; y: number }>(),
  pendingMeasurements: Array<() => void>(),
  deferMeasurement: false,
}))

// Exercise both features and the existing element implementations. Only the native host and
// the responder dispatch are represented here, as in the parked form and label tests.
vi.mock('@react-native-community/slider', () => ({ default: () => null }))
vi.mock('react-native-svg', () => ({ Svg: () => null }))
vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})

vi.mock('react-native', async () => {
  const { createElement, useImperativeHandle, useMemo, useRef } = await import('react')
  type Measure = (
    left: number,
    top: number,
    width: number,
    height: number,
    x: number,
    y: number,
  ) => void
  interface HostHandle {
    measure: (callback: Measure) => void
    measureInWindow: (
      callback: (x: number, y: number, width: number, height: number) => void,
    ) => void
    focus(): void
    blur(): void
  }
  interface HostProps extends ScopedResponder {
    ref?: Ref<HostHandle>
    children?: ReactNode
    role?: string
    testID?: string
    collapsable?: boolean
    testResponder?: Responder
    disabled?: boolean
    'aria-label'?: string
    'aria-expanded'?: boolean
    onPress?: () => void
  }
  const host = (tag: string) =>
    function Host(props: HostProps) {
      const element = useRef<HTMLElement | null>(null)
      const handle = useMemo<HostHandle>(
        () => ({
          focus() {},
          blur() {},
          measure(callback) {
            const box = element.current && native.bounds.get(element.current)
            const emit = () => callback(0, 0, box ? 90 : 0, box ? 40 : 0, box?.x ?? 0, box?.y ?? 0)
            if (native.deferMeasurement) native.pendingMeasurements.push(emit)
            else emit()
          },
          measureInWindow(callback) {
            const box = element.current && native.bounds.get(element.current)
            const emit = () => callback(box?.x ?? 0, box?.y ?? 0, box ? 90 : 0, box ? 40 : 0)
            if (native.deferMeasurement) native.pendingMeasurements.push(emit)
            else emit()
          },
        }),
        [],
      )
      useImperativeHandle(props.ref, () => handle, [handle])
      return createElement(
        tag,
        {
          ref: (node: HTMLElement | null) => {
            element.current = node
            if (node && props.testResponder) native.responders.set(node, props.testResponder)
            if (node && props.onResponderGrant) native.scopedResponders.set(node, props)
          },
          role: props.role,
          'data-testid': props.testID,
          'data-native-target': props.collapsable === false ? '' : undefined,
          'data-native-source': props.testResponder ? '' : undefined,
          'aria-label': props['aria-label'],
          'aria-expanded': props['aria-expanded'],
          disabled: props.disabled,
          onClick: props.onPress,
        },
        props.children,
      )
    }
  return {
    StyleSheet: { create: (styles: object) => styles },
    PanResponder: { create: (testResponder: Responder) => ({ panHandlers: { testResponder } }) },
    Platform: { select: ({ default: value }: { default: string }) => value },
    useWindowDimensions: () => ({ width: 640 }),
    View: host('div'),
    Pressable: host('button'),
    Text: host('span'),
  }
})

const columns: KanbanColumnData[] = [
  { id: 'todo', title: 'To do', cards: [{ id: 'alpha', title: 'Alpha' }] },
  { id: 'done', title: 'Done', cards: [] },
]

function List({
  onReorder,
  handle = false,
}: {
  onReorder: (ids: string[]) => void
  handle?: boolean
}) {
  const [items, setItems] = useState([
    { id: 'a', data: 'First' },
    { id: 'b', data: 'Second' },
  ])
  return (
    <ReorderableList
      items={items}
      onReorder={(next) => {
        setItems(next)
        onReorder(next.map(({ id }) => id))
      }}
      renderItem={(item, isDragging) => (
        <Text as="span" data-mol-id={`row-${item.id}`}>
          {item.data}
          {isDragging ? ' (dragging)' : ''}
        </Text>
      )}
      renderHandle={handle ? () => <Text as="span">Handle</Text> : undefined}
    />
  )
}

/** Introduces an unknown ID through the public renderer contract while keeping the native gesture. */
function UnknownSource({ children }: { children: ReactNode }) {
  const renderer = useDragDropRenderer()
  if (!renderer) throw new Error('Test requires the native drag renderer.')
  const Source = renderer.Source
  const unknownRenderer = {
    ...renderer,
    Source: (props: DragSourceProps) => (
      <Source {...props} source={{ ...props.source, id: 'unknown' }} />
    ),
  }
  return <DragDropRendererProvider value={unknownRenderer}>{children}</DragDropRendererProvider>
}

function ScopedRows({
  onDragEnd,
  hasSource = true,
}: {
  onDragEnd: (event: DragEndEvent) => void
  hasSource?: boolean
}) {
  const { Scope, Target } = useScopedDragDrop()
  return (
    <Scope onDragEnd={onDragEnd}>
      {hasSource && (
        <Target
          id="first"
          source={{
            controls: {
              id: 'move-first',
              label: 'Move First',
              cancelLabel: 'Cancel move',
              choices: [{ targetId: 'second', label: 'Move First to Second' }],
            },
          }}
        >
          {(binding) => <Box {...binding} as="li" data-mol-id="first" />}
        </Target>
      )}
      <Target id="second" source={{ disabled: true }}>
        {(binding) => <Box {...binding} as="li" data-mol-id="second" />}
      </Target>
    </Scope>
  )
}

let container: HTMLElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  setClassMap(classMap)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  native.deferMeasurement = false
  for (const measure of native.pendingMeasurements.splice(0)) measure()
  vi.unstubAllGlobals()
})

function render(children: ReactNode) {
  act(() => root.render(<NativeDragDropProvider>{children}</NativeDragDropProvider>))
}

function targets(): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-native-target]')]
}

function setPositions(positions: readonly { x: number; y: number }[]) {
  const elements = targets()
  expect(elements).toHaveLength(positions.length)
  elements.forEach((element, index) => native.bounds.set(element, positions[index]))
}

function pickup(index = 0): Responder {
  const element = container.querySelectorAll<HTMLElement>('[data-native-source]')[index]
  const responder = element && native.responders.get(element)
  if (!responder) throw new Error(`Native drag source ${index} is missing.`)
  expect(responder.onMoveShouldSetPanResponder({}, { dx: 2, dy: 2, numberActiveTouches: 1 })).toBe(
    false,
  )
  expect(responder.onMoveShouldSetPanResponder({}, { dx: 0, dy: 10, numberActiveTouches: 1 })).toBe(
    true,
  )
  act(() => responder.onPanResponderGrant())
  return responder
}

function control(label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll<HTMLButtonElement>('button[role="button"]')].find(
    (button) => button.getAttribute('aria-label') === label,
  )
  if (!result) throw new Error(`Native accessible button is missing: ${label}`)
  return result
}

const at = (pageX: number, pageY: number) => ({ nativeEvent: { pageX, pageY } })

function touch(pageX: number, pageY: number): Touch {
  const contact = { identifier: 'finger', pageX, pageY }
  return {
    nativeEvent: { ...contact, touches: [contact], changedTouches: [contact] },
    persist() {},
    stopPropagation() {},
  }
}

function scopedPickup(): ScopedResponder {
  const first = container.querySelector<HTMLElement>('[data-testid="first"]')
  const second = container.querySelector<HTMLElement>('[data-testid="second"]')
  if (!first || !second) throw new Error('Missing scoped target view')
  native.bounds.set(first, { x: 0, y: 0 })
  native.bounds.set(second, { x: 0, y: 50 })
  expect(native.scopedResponders.has(second)).toBe(false)
  const responder = native.scopedResponders.get(first)
  if (!responder?.onResponderGrant) throw new Error('Missing authored host responder')
  act(() => responder.onResponderGrant?.(touch(10, 10)))
  return responder
}

describe('Native feature drag and drop', () => {
  it('keeps the last measured target for cancellation and reports source disposal separately', async () => {
    const onDragEnd = vi.fn()
    render(<ScopedRows onDragEnd={onDragEnd} />)
    const drag = scopedPickup()
    await act(async () => {
      // Movement arrives before the scope's measurement promise delivers its positions.
      drag.onResponderMove?.(touch(10, 60))
      drag.onResponderMove?.(touch(10, 150))
      drag.onResponderTerminate?.(touch(10, 150))
    })
    expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({
      id: 'first',
      overId: 'second',
      reason: 'cancel',
    })
    onDragEnd.mockClear()
    scopedPickup()
    render(<ScopedRows onDragEnd={onDragEnd} hasSource={false} />)
    expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({
      id: 'first',
      overId: undefined,
      reason: 'unmount',
    })
    onDragEnd.mockClear()
    render(<ScopedRows onDragEnd={onDragEnd} />)
    act(() => control('Move First').click())
    act(() => control('Move First to Second').click())
    expect(onDragEnd).toHaveBeenCalledExactlyOnceWith({
      id: 'first',
      overId: 'second',
      reason: 'drop',
    })
  })

  it('reorders a list from its handle and clears its dragging state', async () => {
    const reorder = vi.fn()
    render(<List onReorder={reorder} handle />)
    setPositions([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
    ])
    const drag = pickup()
    expect(container.textContent).toContain('First (dragging)')
    await act(async () => {
      drag.onPanResponderMove({}, { moveX: 10, moveY: 60 })
      drag.onPanResponderRelease(at(10, 60))
    })
    expect(reorder).toHaveBeenCalledExactlyOnceWith(['b', 'a'])
    expect(
      targets().map((target) => target.querySelector('[data-testid^="row-"]')?.textContent),
    ).toEqual(['Second', 'First'])
  })

  it('consumes a cross-column gesture once even if release is delivered twice', async () => {
    const move = vi.fn()
    render(<KanbanBoard columns={columns} onCardMove={move} />)
    setPositions([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const drag = pickup()
    await act(async () => {
      drag.onPanResponderRelease(at(110, 10))
      drag.onPanResponderRelease(at(110, 10))
    })
    expect(move).toHaveBeenCalledExactlyOnceWith('alpha', 'todo', 'done')
  })

  it('ignores measurements arriving after the native gesture is cancelled', async () => {
    const reorder = vi.fn()
    render(<List onReorder={reorder} />)
    setPositions([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
    ])
    const drag = pickup()
    expect(container.textContent).toContain('First (dragging)')
    native.deferMeasurement = true
    await act(async () => {
      drag.onPanResponderRelease(at(10, 60))
      drag.onPanResponderTerminate()
      for (const measure of native.pendingMeasurements.splice(0)) measure()
    })
    expect(reorder).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('(dragging)')
  })

  it('clears the item when the existing native responder rejects the drag', async () => {
    const reorder = vi.fn()
    render(<List onReorder={reorder} />)
    setPositions([
      { x: 0, y: 0 },
      { x: 0, y: 50 },
    ])
    const drag = pickup()
    expect(container.textContent).toContain('First (dragging)')
    await act(async () => drag.onPanResponderReject?.())
    expect(container.textContent).not.toContain('(dragging)')
    expect(reorder).not.toHaveBeenCalled()
  })

  it('rejects an unknown source and a release outside all targets', async () => {
    const move = vi.fn()
    render(
      <UnknownSource>
        <KanbanBoard columns={columns} onCardMove={move} />
      </UnknownSource>,
    )
    setPositions([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const unknown = pickup()
    await act(async () => unknown.onPanResponderRelease(at(110, 10)))
    expect(move).not.toHaveBeenCalled()

    render(<KanbanBoard columns={columns} onCardMove={move} />)
    setPositions([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    const outside = pickup()
    await act(async () => outside.onPanResponderRelease(at(999, 999)))
    expect(move).not.toHaveBeenCalled()
  })

  it('lets a screen-reader user cancel or move a card with destination buttons', () => {
    const move = vi.fn()
    render(<KanbanBoard columns={columns} onCardMove={move} />)
    act(() => control('Move Alpha').click())
    expect(control('Cancel move').getAttribute('aria-expanded')).toBe('true')
    act(() => control('Cancel move').click())
    expect(move).not.toHaveBeenCalled()
    act(() => control('Move Alpha').click())
    act(() => control('Move Alpha to Done').click())
    expect(move).toHaveBeenCalledExactlyOnceWith('alpha', 'todo', 'done')
    expect(control('Move Alpha').getAttribute('aria-expanded')).toBe('false')
  })

  it('gives a screen-reader user a positional label and a way to move a row', () => {
    const reorder = vi.fn()
    render(<List onReorder={reorder} />)
    expect(control('Move up, Item 1 of 2').disabled).toBe(true)
    act(() => control('Move down, Item 1 of 2').click())
    expect(reorder).toHaveBeenCalledExactlyOnceWith(['b', 'a'])
    expect(
      targets().map((target) => target.querySelector('[data-testid^="row-"]')?.textContent),
    ).toEqual(['Second', 'First'])
  })
})
