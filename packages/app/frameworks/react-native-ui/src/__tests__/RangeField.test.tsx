// @vitest-environment jsdom
import type { SliderProps } from '@react-native-community/slider'
import { act, createRef, type ReactNode, type Ref, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { View } from 'react-native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ElementHandle,
  FormAreaHandle,
  KitKeyboardEvent,
  RangeFieldProps,
} from '@molecule/app-ui'

import {
  Fieldset,
  FormArea,
  Pressable,
  RangeField,
  setNativeKeyboardView,
  Text,
} from '../elements/index.js'

const device = vi.hoisted(() => ({
  os: 'android',
  keyboard: true,
  announce: vi.fn(),
  command: vi.fn(),
}))

interface KeyInput {
  nativeEvent: { keyCode: number; isShiftPressed?: boolean }
  stopPropagation(): void
}

interface HostProps {
  ref?: Ref<HTMLElement>
  children?: ReactNode
  testID?: string
  id?: string
  nativeID?: string
  'aria-label'?: string
  role?: string
  accessible?: boolean
  accessibilityRole?: string
  accessibilityLabel?: string
  accessibilityLanguage?: string
  accessibilityValue?: { min?: number; max?: number; now?: number; text?: string }
  accessibilityActions?: { name: string }[]
  accessibilityState?: { disabled?: boolean }
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void
  onKeyDownPress?: (event: KeyInput) => void
  onKeyUpPress?: (event: KeyInput) => void
  onFocusChange?: (event: { nativeEvent: { isFocused: boolean } }) => void
  canBeFocused?: boolean
  onPress?: () => void
  onLayout?: (event: { nativeEvent: { layout: { width: number; height: number } } }) => void
  style?: unknown
  lockFocus?: number
}

const hosts = new Map<string, HostProps>()
const tracks = new WeakMap<HTMLElement, { props: SliderProps; move(value: number): void }>()

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))

vi.mock('react-native-svg', () => ({ Svg: () => null }))

vi.mock('react-native', () => {
  const view = (props: HostProps) => {
    if (props.testID) hosts.set(props.testID, props)
    return (
      <div
        ref={props.ref}
        id={props.nativeID ?? props.id}
        data-testid={props.testID}
        aria-label={props.accessibilityLabel ?? props['aria-label']}
        role={props.accessibilityRole === 'adjustable' ? 'slider' : props.role}
        onClick={props.onPress}
        tabIndex={0}
      >
        {props.children}
      </div>
    )
  }
  return {
    AccessibilityInfo: { announceForAccessibility: device.announce },
    Platform: {
      get OS() {
        return device.os
      },
      select: ({ default: value }: { default: string }) => value,
    },
    useWindowDimensions: () => ({ width: 640 }),
    View: view,
    Pressable: view,
    Text: view,
    UIManager: {
      hasViewManagerConfig: (name: string) => name === 'ExternalKeyboardView' && device.keyboard,
      dispatchViewManagerCommand: device.command,
    },
    findNodeHandle: () => 2,
  }
})

vi.mock('react-native-external-keyboard', () => {
  throw new Error('The stock elements barrel must load without a hardware-keyboard package')
})

vi.mock('@react-native-community/slider', () => ({
  default: function WriteOnlySlider(props: SliderProps) {
    const [position, setPosition] = useState(props.value || props.minimumValue)
    useLayoutEffect(() => {
      // The 4.5.6 wrapper drops zero, and Android Fabric echoes programmatic progress.
      if (props.value) {
        setPosition(props.value)
        if (device.os === 'android') props.onValueChange?.(props.value)
      }
    }, [props.value])
    return (
      <div
        data-thumb={position}
        ref={(node) => {
          if (node) tracks.set(node, { props, move: setPosition })
        }}
      />
    )
  },
}))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  device.os = 'android'
  device.keyboard = true
  setNativeKeyboardView(View)
  vi.clearAllMocks()
  hosts.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  setNativeKeyboardView(undefined)
  container.remove()
  vi.unstubAllGlobals()
})

function render(node: ReactNode): void {
  act(() => root.render(node))
}

function control(id = 'range'): HostProps {
  const props = hosts.get(id)
  if (!props) throw new Error(`No native range host ${id}`)
  return props
}

function track(id = 'range') {
  const node = container.querySelector<HTMLElement>(`[data-testid="${id}"] [data-thumb]`)
  const slider = node && tracks.get(node)
  if (!node || !slider) throw new Error(`No native thumb ${id}`)
  return { ...slider, position: Number(node.getAttribute('data-thumb')) }
}

function sendKey(keyCode: number, isShiftPressed = false): void {
  const event = { nativeEvent: { keyCode, isShiftPressed }, stopPropagation: vi.fn() }
  act(() => control().onKeyDownPress?.(event))
}

function adjust(actionName: 'increment' | 'decrement', id = 'range'): void {
  act(() => control(id).onAccessibilityAction?.({ nativeEvent: { actionName } }))
}

function slide(position: number, id = 'range'): void {
  const slider = track(id)
  act(() => {
    slider.props.onSlidingStart?.(slider.position)
    slider.move(position)
    slider.props.onValueChange?.(position)
    slider.props.onSlidingComplete?.(position)
  })
}

describe('RangeField on device', () => {
  it.each([true, false])('forwards the slider language with hardware keyboard %s', (keyboard) => {
    device.os = 'ios'
    device.keyboard = keyboard
    render(<RangeField data-testid="range" lang="fr-CA" aria-label="Volume" />)

    expect(control().accessibilityLabel).toBe('Volume')
    expect(control().accessibilityLanguage).toBe('fr-CA')
  })

  it('starts at the HTML midpoint and seeks on a tap with one edit notification', () => {
    const changed = vi.fn()
    render(<RangeField data-testid="range" onValueChange={changed} />)
    expect(control().accessibilityValue).toEqual({ min: 0, max: 100, now: 50, text: '50' })
    const slider = track()
    expect(slider.props.tapToSeek).toBe(true)
    expect(slider.props.step).toBe(1)
    expect(slider.position).toBe(51)
    slide(61)
    expect(changed).toHaveBeenCalledExactlyOnceWith(60)
    expect(control().accessibilityValue?.now).toBe(60)
  })

  it.each<{ range: RangeFieldProps; expected: number }>([
    { range: { min: 0, max: 1, step: 0.1, value: 0.15 }, expected: 0.2 },
    { range: { min: 0, max: 10, step: 3, value: 100 }, expected: 9 },
    { range: { max: 12, step: 3, defaultValue: 2 }, expected: 2 },
    { range: { min: 0, max: 1, step: 'any', defaultValue: 0.37 }, expected: 0.37 },
    { range: { min: 0, max: 9, step: 0, value: Number.NaN }, expected: 5 },
  ])('clamps and aligns HTML-like range values (%#)', ({ range, expected }) => {
    device.os = 'ios'
    render(<RangeField data-testid="range" {...range} />)
    expect(control().accessibilityValue?.now).toBe(expected)
  })

  it('preserves a write-only thumb during drag and resynchronizes it on a refused edit', () => {
    const changed = vi.fn()
    render(
      <RangeField
        data-testid="range"
        min={-1}
        max={1}
        step={0.01}
        value={0}
        onValueChange={changed}
      />,
    )
    const original = track()
    expect(original.position).toBe(101)
    act(() => {
      original.props.onSlidingStart?.(original.position)
      original.move(151)
      original.props.onValueChange?.(151)
      original.props.onValueChange?.(151)
    })
    expect(track().position).toBe(151)
    expect(changed).toHaveBeenCalledExactlyOnceWith(0.5)
    act(() => track().props.onSlidingComplete?.(151))
    expect(track().position).toBe(101)
    expect(changed).toHaveBeenCalledExactlyOnceWith(0.5)
  })

  it('writes controlled changes and zero without echoing programmatic progress', () => {
    const changed = vi.fn()
    const show = (value: number): void =>
      render(<RangeField data-testid="range" value={value} onValueChange={changed} />)
    show(70)
    expect(track().position).toBe(71)
    show(0)
    expect(track().position).toBe(1)
    expect(changed).not.toHaveBeenCalled()
  })

  it('lets the Android Shift+Arrow handler consume a ten-step nudge before the default', () => {
    const changed = vi.fn()
    const handler = vi.fn((event: KitKeyboardEvent) => {
      if (event.shiftKey && event.key === 'ArrowRight') {
        event.preventDefault()
        changed(60)
      }
    })
    render(
      <RangeField data-testid="range" value={50} onKeyDown={handler} onValueChange={changed} />,
    )
    expect(control().lockFocus).toBe(15)
    sendKey(22, true)
    expect(changed).toHaveBeenCalledExactlyOnceWith(60)
    expect(handler).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ key: 'ArrowRight', shiftKey: true }),
    )
    sendKey(22)
    sendKey(122)
    sendKey(123)
    expect(changed.mock.calls).toEqual([[60], [51], [0], [100]])
  })

  it('maps iOS hardware arrows, Home and End to numeric changes', () => {
    device.os = 'ios'
    const changed = vi.fn()
    render(<RangeField data-testid="range" min={-4} max={4} step={2} onValueChange={changed} />)
    sendKey(82)
    sendKey(80)
    sendKey(74)
    sendKey(77)
    expect(changed.mock.calls).toEqual([[2], [0], [-4], [4]])
  })

  it.each(['android', 'ios'])('speaks 0.50 after one accessibility increment on %s', (os) => {
    device.os = os
    const changed = vi.fn()
    render(
      <RangeField
        data-testid="range"
        min={0}
        max={1}
        step={0.01}
        defaultValue={0.49}
        aria-label="Gain"
        onValueChange={changed}
      />,
    )
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(1)
    expect(track().props.importantForAccessibility).toBe('no-hide-descendants')
    expect(track().props.accessibilityElementsHidden).toBe(true)
    expect(control().accessibilityValue?.text).toBe('0.49')
    adjust('increment')
    expect(changed).toHaveBeenCalledExactlyOnceWith(0.5)
    expect(control().accessibilityValue?.text).toBe('0.50')
    if (os === 'android') {
      expect(control().role).toBe('slider')
      expect(control().accessibilityRole).toBeUndefined()
      expect(control().accessibilityValue).toEqual({ text: '0.50' })
      expect(device.announce).toHaveBeenCalledExactlyOnceWith('0.50')
    } else {
      expect(control().accessibilityRole).toBe('adjustable')
      expect(control().accessibilityValue?.now).toBe(0.5)
    }
    adjust('decrement')
    expect(changed.mock.calls).toEqual([[0.5], [0.49]])
    expect(control().accessibilityValue?.text).toBe('0.49')
  })

  it('applies a caller-provided spoken value and keeps touch usable without a keyboard view', () => {
    device.keyboard = false
    const changed = vi.fn()
    render(
      <RangeField
        data-testid="range"
        value={50}
        aria-valuetext="Half way"
        onValueChange={changed}
      />,
    )
    expect(control().onKeyDownPress).toBeUndefined()
    adjust('increment')
    expect(changed).toHaveBeenCalledExactlyOnceWith(51)
    expect(control().accessibilityValue?.text).toBe('Half way')
    expect(device.announce).not.toHaveBeenCalled()
  })

  it('uses one vertical footprint and rotates the platform track once', () => {
    render(
      <RangeField
        data-testid="range"
        aria-orientation="vertical"
        webStyle={{ width: 180, height: 24, transform: 'rotate(-90deg)' }}
      />,
    )
    expect(control().style).toContainEqual(expect.objectContaining({ width: 24, height: 180 }))
    act(() => control().onLayout?.({ nativeEvent: { layout: { width: 24, height: 180 } } }))
    expect(track().props.style).toEqual(
      expect.objectContaining({ width: 180, transform: [{ rotate: '-90deg' }] }),
    )
  })

  it('uses the stock slider when a native manager exists but no keyboard host is registered', () => {
    setNativeKeyboardView(undefined)
    const changed = vi.fn()
    render(<RangeField data-testid="range" value={50} onValueChange={changed} />)
    expect(control().onKeyDownPress).toBeUndefined()
    adjust('increment')
    expect(changed).toHaveBeenCalledExactlyOnceWith(51)
  })

  it('holds a zero-duration seek at zero and avoids a degenerate platform range', () => {
    const changed = vi.fn()
    render(
      <RangeField
        data-testid="range"
        min={0}
        max={0}
        step={0.1}
        value={12}
        onValueChange={changed}
      />,
    )
    expect(control().accessibilityValue).toEqual({ text: '0.0' })
    expect(track().props.disabled).toBe(true)
    expect(track().props.maximumValue).toBeGreaterThan(track().props.minimumValue ?? 0)
    slide(2)
    sendKey(22)
    adjust('increment')
    expect(changed).not.toHaveBeenCalled()
    expect(control().accessibilityValue).toEqual({ text: '0.0' })
  })

  it('focuses an imperative-only host, then releases hardware focus through the handle', () => {
    const ref = createRef<ElementHandle>()
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    render(
      <RangeField data-testid="range" ref={ref} tabIndex={-1} onFocus={onFocus} onBlur={onBlur} />,
    )
    const original = container.querySelector('[role="slider"]')
    expect(control().canBeFocused).toBe(false)
    act(() => ref.current?.focus())
    expect(control().canBeFocused).toBe(true)
    expect(device.command).toHaveBeenCalledExactlyOnceWith(2, 'rnekKeyboardFocus', [])
    act(() => control().onFocusChange?.({ nativeEvent: { isFocused: true } }))
    expect(onFocus).toHaveBeenCalledOnce()
    act(() => ref.current?.blur())
    expect(onBlur).toHaveBeenCalledOnce()
    expect(control().canBeFocused).toBe(false)
    expect(original?.isConnected).toBe(false)
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(1)
  })

  it('labels, focuses, submits and resets fields, excluding the disabled fieldset', () => {
    const form = createRef<FormAreaHandle>()
    const ref = createRef<ElementHandle>()
    const received = vi.fn()
    const unchanged = vi.fn()
    const show = (cancelReset: boolean): void =>
      render(
        <FormArea
          as="form"
          ref={form}
          onSubmit={(_event, values) => received(values)}
          onReset={(event) => {
            if (cancelReset) event.preventDefault()
          }}
        >
          <Text as="label" htmlFor="range" data-testid="label">
            Gain
          </Text>
          <RangeField data-testid="range" id="range" defaultValue={12} name="gain" ref={ref} />
          <RangeField data-testid="controlled" value={50} name="fixed" />
          <Fieldset as="fieldset" disabled>
            <RangeField data-testid="disabled" name="disabled" onValueChange={unchanged} />
          </Fieldset>
          <Pressable as="button" type="reset" data-testid="reset">
            Reset
          </Pressable>
        </FormArea>,
      )
    show(true)
    expect(control().accessibilityLabel).toBe('Gain')
    act(() => container.querySelector<HTMLElement>('[data-testid="label"]')?.click())
    act(() => ref.current?.focus())
    expect(device.command).toHaveBeenCalledTimes(2)
    expect(device.command).toHaveBeenLastCalledWith(2, 'rnekKeyboardFocus', [])
    expect(track('disabled').props.disabled).toBe(true)
    slide(90, 'disabled')
    adjust('increment', 'disabled')
    expect(unchanged).not.toHaveBeenCalled()
    slide(21)
    act(() => container.querySelector<HTMLElement>('[data-testid="reset"]')?.click())
    act(() => form.current?.requestSubmit())
    expect(received).toHaveBeenLastCalledWith([
      ['gain', '20'],
      ['fixed', '50'],
    ])
    show(false)
    act(() => container.querySelector<HTMLElement>('[data-testid="reset"]')?.click())
    act(() => form.current?.requestSubmit())
    expect(track().position).toBe(13)
    expect(received).toHaveBeenLastCalledWith([
      ['gain', '12'],
      ['fixed', '50'],
    ])
  })
})
