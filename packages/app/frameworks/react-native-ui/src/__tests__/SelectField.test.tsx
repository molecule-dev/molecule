// @vitest-environment jsdom
import {
  act,
  createElement,
  createRef,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { View } from 'react-native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import type { ElementHandle, FormAreaHandle, FormEntries, KitEvent } from '@molecule/app-ui'

import { createFormScope } from '../elements/form.js'
import {
  Box,
  Fieldset,
  FormArea,
  Pressable,
  SelectField,
  setNativeKeyboardView,
  Text,
} from '../elements/index.js'

const device = vi.hoisted(() => ({
  os: 'android',
  keyboard: false,
  windowed: false,
  accessibilityFocus: vi.fn(),
  announce: vi.fn(),
  scroll: vi.fn(),
}))

interface NativeKey {
  nativeEvent: { keyCode: number; isShiftPressed?: boolean }
  stopPropagation(): void
}

interface HostProps {
  ref?: Ref<HTMLElement>
  children?: ReactNode
  id?: string
  nativeID?: string
  testID?: string
  role?: string
  'aria-label'?: string
  'aria-expanded'?: boolean
  'aria-disabled'?: boolean
  'aria-selected'?: boolean
  accessibilityHint?: string
  accessibilityValue?: { text?: string }
  accessibilityState?: { disabled?: boolean; expanded?: boolean; selected?: boolean }
  accessible?: boolean
  accessibilityViewIsModal?: boolean
  onAccessibilityEscape?: () => void
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void
  onPress?: (event: MouseEvent<HTMLElement>) => void
  onFocus?: () => void
  onBlur?: () => void
  onFocusChange?: (event: { nativeEvent: { isFocused: boolean } }) => void
  onKeyDownPress?: (event: NativeKey) => void
  onKeyUpPress?: (event: NativeKey) => void
  canBeFocused?: boolean
  hasTVPreferredFocus?: boolean
  disabled?: boolean
  focusable?: boolean
  className?: string
  style?: unknown
}

interface ModalProps {
  children?: ReactNode
  visible: boolean
  onShow(): void
  onDismiss(): void
  onRequestClose(): void
}

interface ListProps {
  ref?: Ref<{ scrollToIndex: (args: { index: number; animated?: boolean }) => void }>
  data: readonly { key: string }[]
  initialScrollIndex?: number
  keyExtractor: (item: { key: string }) => string
  getItemLayout?: (
    data: unknown,
    index: number,
  ) => { index: number; offset: number; length: number }
  renderItem: (info: { item: { key: string }; index: number }) => ReactNode
}

const hosts = new WeakMap<HTMLElement, HostProps>()
let modal: ModalProps | undefined
let list: ListProps | undefined

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...values: Array<string | boolean | undefined>) => values.filter(Boolean).join(' '),
    splitForNative: (classes: string) => ({
      view: classes
        .split(' ')
        .filter((token) => !token.startsWith('ink-'))
        .join(' '),
      display: null,
      text: classes
        .split(' ')
        .filter((token) => token.startsWith('ink-'))
        .join(' '),
      weight: null,
      lines: null,
    }),
  }),
}))

vi.mock('@react-native-community/slider', () => ({ default: () => null }))

vi.mock('react-native-svg', () => ({ Svg: () => null }))

vi.mock('react-native', () => {
  const handles = new Map<number, HTMLElement>()
  const makeHost = (tag: string) =>
    function Host(props: HostProps) {
      const node = useRef<HTMLElement>(null)
      useLayoutEffect(() => {
        if (props.hasTVPreferredFocus) node.current?.focus()
      }, [props.hasTVPreferredFocus])
      return createElement(
        tag,
        {
          id: props.nativeID ?? props.id,
          ref: (element: HTMLElement | null) => {
            node.current = element
            if (element) hosts.set(element, props)
            if (typeof props.ref === 'function') props.ref(element)
            else if (props.ref) props.ref.current = element
          },
          role: props.role,
          tabIndex: (props.canBeFocused ?? props.focusable) === false ? -1 : 0,
          'aria-label': props['aria-label'],
          'aria-expanded': props['aria-expanded'] ?? props.accessibilityState?.expanded,
          'aria-disabled': props['aria-disabled'] ?? props.accessibilityState?.disabled,
          'aria-selected': props['aria-selected'] ?? props.accessibilityState?.selected,
          'data-testid': props.testID,
          'data-backdrop':
            props.accessible === false && !props.children && !!props.onPress ? '' : undefined,
          onClick: props.onPress
            ? (event: MouseEvent<HTMLElement>) => {
                event.stopPropagation()
                if (!props.disabled) props.onPress?.(event)
              }
            : undefined,
          onFocus: () => {
            props.onFocus?.()
            props.onFocusChange?.({ nativeEvent: { isFocused: true } })
          },
          onBlur: () => {
            props.onBlur?.()
            props.onFocusChange?.({ nativeEvent: { isFocused: false } })
          },
        },
        props.children,
      )
    }
  return {
    AccessibilityInfo: {
      setAccessibilityFocus: (tag: number) => device.accessibilityFocus(handles.get(tag)),
      announceForAccessibility: device.announce,
    },
    findNodeHandle: (node: HTMLElement) => {
      const id = handles.size + 1
      handles.set(id, node)
      return id
    },
    FlatList: function MockList(props: ListProps) {
      list = props
      const [index, setIndex] = useState(props.initialScrollIndex ?? 0)
      useImperativeHandle(props.ref, () => ({
        scrollToIndex(args) {
          device.scroll(args.index)
          setIndex(args.index)
        },
      }))
      return (
        <div>
          {props.data.map((item, position) =>
            !device.windowed || Math.abs(index - position) <= 2 ? (
              <div key={props.keyExtractor(item)}>
                {props.renderItem({ item, index: position })}
              </div>
            ) : null,
          )}
        </div>
      )
    },
    Modal: function MockModal(props: ModalProps) {
      modal = props
      const latest = useRef(props)
      latest.current = props
      const wasVisible = useRef(false)
      useLayoutEffect(() => {
        if (props.visible) latest.current.onShow()
        else if (wasVisible.current && device.os === 'ios') latest.current.onDismiss()
        wasVisible.current = props.visible
      }, [props.visible])
      return props.visible ? <div data-native-modal="">{props.children}</div> : null
    },
    Platform: {
      get OS() {
        return device.os
      },
      select: ({ default: value }: { default: string }) => value,
    },
    Pressable: makeHost('div'),
    StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles },
    Text: makeHost('span'),
    UIManager: {
      hasViewManagerConfig: (name: string) => name === 'ExternalKeyboardView' && device.keyboard,
      dispatchViewManagerCommand: (tag: number, command: string) => {
        if (command === 'rnekKeyboardFocus') handles.get(tag)?.focus()
      },
    },
    useWindowDimensions: () => ({ width: 640, height: 800, fontScale: 1, scale: 1 }),
    View: makeHost('div'),
  }
})

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  device.os = 'android'
  device.keyboard = false
  setNativeKeyboardView(View)
  device.windowed = false
  modal = undefined
  list = undefined
  vi.clearAllMocks()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  frames = new Map()
  let frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
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

const free = { value: 'free', label: 'Free' }
const pro = { value: 'pro', label: 'Pro' }
const blocked = { value: 'blocked', label: 'Blocked', disabled: true }
const placeholder = { value: '', label: 'Choose', disabled: true }
const empty = { value: '', label: 'None' }

function render(node: ReactNode): void {
  act(() => root.render(node))
}

function frame(): void {
  act(() => {
    const pending = Array.from(frames.keys())
    for (const id of pending) {
      const callback = frames.get(id)
      frames.delete(id)
      callback?.(0)
    }
  })
}

function host(selector: string): HTMLElement {
  const node = container.querySelector<HTMLElement>(selector)
  if (!node) throw new Error(`Expected native host ${selector}`)
  return node
}

function native(node: HTMLElement): HostProps {
  const props = hosts.get(node)
  if (!props) throw new Error('Expected native host props')
  return props
}

function trigger(): HTMLElement {
  return host('[data-testid="select"]')
}

function option(label: string): HTMLElement {
  const row = [...container.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (node) => node.getAttribute('aria-label') === label,
  )
  if (!row) throw new Error(`Expected option ${label}`)
  return row
}

function click(node: HTMLElement): void {
  act(() => node.click())
}

function open(): void {
  click(trigger())
  frame()
  expect(container.querySelector('[data-native-modal]')).not.toBeNull()
}

function key(
  node: HTMLElement,
  keyCode: number,
  shift = false,
  phase: 'down' | 'up' = 'down',
): void {
  const props = native(node)
  const callback = phase === 'down' ? props.onKeyDownPress : props.onKeyUpPress
  if (!callback) throw new Error('Expected installed hardware key handler')
  act(() => callback({ nativeEvent: { keyCode, isShiftPressed: shift }, stopPropagation: vi.fn() }))
}

function submitter() {
  const ref = createRef<FormAreaHandle>()
  const receive = vi.fn()
  return {
    ref,
    receive,
    onSubmit: (event: KitEvent, entries: FormEntries): void => {
      event.preventDefault()
      receive(entries)
    },
    submit: (): void => act(() => ref.current?.requestSubmit()),
  }
}

describe('SelectField (native)', () => {
  it('applies layout classes and inline dimensions to the trigger and typography to its label', () => {
    const field = (
      <SelectField
        as="select"
        data-mol-id="select"
        options={[free]}
        className="field-layout ink-label"
        style={{ width: 92, fontSize: 16, color: 'red' }}
        webStyle={{ width: '104px', color: 'blue' }}
      />
    )
    render(field)
    const node = trigger()
    const text = node.querySelector('span')
    if (!text) throw new Error('Expected the selected label')
    expect(native(node).className).toBe('field-layout')
    expect(native(node).style).toEqual(expect.arrayContaining([{ width: 104 }]))
    expect(native(text).className).toBe('ink-label')
    expect(native(text).style).toMatchObject({ fontSize: 16, color: 'blue' })
    render(null)
    device.keyboard = true
    render(field)
    const keyboardTrigger = trigger()
    const styledHost = keyboardTrigger.parentElement
    expect(native(keyboardTrigger).className).toBeUndefined()
    expect(styledHost && hosts.get(styledHost)?.className).toBe('field-layout')
    expect(styledHost && hosts.get(styledHost)?.style).toEqual(
      expect.arrayContaining([{ width: 104 }]),
    )
  })

  it('uses form-scoped referenced text, root hints, explicit identity and real focus targets', () => {
    const ref = createRef<ElementHandle>()
    const focus = vi.fn()
    const blur = vi.fn()
    render(
      <Box as="div">
        <Text as="p" id="title">
          Outside title
        </Text>
        <Box as="div" id="hint">
          <Text as="span">Outside hint</Text>
        </Box>
        <FormArea as="form">
          <Text as="span" id="title">
            Plan title
          </Text>
          <SelectField
            as="select"
            ref={ref}
            autoFocus
            id="plan"
            name="plan"
            data-testid="other"
            data-mol-id="select"
            options={[free, pro]}
            title="Extra detail"
            required
            aria-label="Override fallback"
            aria-labelledby="title"
            aria-describedby="hint"
            aria-invalid="true"
            aria-readonly
            onFocus={focus}
            onBlur={blur}
          />
        </FormArea>
      </Box>,
    )
    frame()
    const node = trigger()
    expect(node.id).toBe('plan')
    expect(node.getAttribute('aria-label')).toBe('Plan title')
    expect(node.getAttribute('aria-expanded')).toBe('false')
    expect(native(node).accessibilityValue).toEqual({ text: 'Free' })
    expect(native(node).accessibilityHint).toMatch(
      /Outside hint.*Extra detail.*Required field.*Invalid value.*Read-only field/,
    )
    expect(document.activeElement).toBe(node)
    expect(modal?.visible).toBe(false)
    const event = focus.mock.calls[0]?.[0]
    expect(event.target).toBe(event.currentTarget)
    expect(event.target).toMatchObject({ id: 'plan', name: 'plan' })
    act(() => ref.current?.blur())
    expect(blur.mock.calls[0]?.[0].target).toMatchObject({ id: 'plan' })
  })

  it('honors click cancellation and activates either label or the nested trigger exactly once', () => {
    const clickHandler = vi.fn()
    const view = (prevent: boolean): ReactNode => (
      <FormArea as="form">
        <Text as="label" htmlFor="plan" data-testid="label">
          External plan
        </Text>
        <Box as="label" data-testid="wrap">
          <Text as="span">Wrapped plan</Text>
          <SelectField
            as="select"
            id="plan"
            data-mol-id="select"
            options={[free]}
            onClick={(event) => {
              clickHandler(event)
              if (prevent) event.preventDefault()
            }}
          />
        </Box>
      </FormArea>
    )
    render(view(true))
    click(host('[data-testid="label"]'))
    expect(modal?.visible).toBe(false)
    expect(clickHandler).toHaveBeenCalledTimes(1)
    render(view(false))
    click(host('[data-testid="wrap"]'))
    expect(modal?.visible).toBe(true)
    expect(clickHandler).toHaveBeenCalledTimes(2)
    expect(native(trigger())['aria-label']).toMatch(
      /(External plan.*Wrapped plan|Wrapped plan.*External plan)/,
    )
    act(() => modal?.onRequestClose())
    click(trigger())
    expect(clickHandler).toHaveBeenCalledTimes(3)
  })

  it('opens at the first enabled selection and reports one single edit with an ordered event snapshot', () => {
    const calls = vi.fn()
    render(
      <SelectField
        as="select"
        data-mol-id="select"
        name="plan"
        options={[placeholder, free, { label: 'Paid', options: [blocked, pro] }]}
        onChange={(event) => calls('change', event.target, event.currentTarget)}
        onValueChange={(value) => calls('value', value)}
      />,
    )
    expect(trigger().textContent).toBe('Free')
    open()
    expect(host('[role="dialog"]')).toBeDefined()
    expect(native(host('[role="dialog"]')).accessibilityViewIsModal).toBe(true)
    expect(option('Blocked').getAttribute('aria-disabled')).toBe('true')
    expect(option('Free').getAttribute('aria-selected')).toBe('true')
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(option('Free'))
    click(option('Blocked'))
    expect(calls).not.toHaveBeenCalled()
    click(option('Free'))
    expect(modal?.visible).toBe(false)
    expect(calls).not.toHaveBeenCalled()
    frame()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
    open()
    click(option('Pro'))
    expect(calls.mock.calls.map(([name]) => name)).toEqual(['change', 'value'])
    const [, target, currentTarget] = calls.mock.calls[0]
    expect(target).toBe(currentTarget)
    expect(target).toMatchObject({
      name: 'plan',
      type: 'select-one',
      multiple: false,
      value: 'pro',
      selectedIndex: 3,
      selectedOptions: [{ value: 'pro', label: 'Pro', disabled: false }],
    })
    expect(calls).toHaveBeenLastCalledWith('value', 'pro')
    expect(trigger().textContent).toBe('Pro')
  })

  it('submits a controlled proposal inside change handlers and restores the parent selection', () => {
    const form = submitter()
    const change = vi.fn()
    const view = (): ReactNode => (
      <FormArea as="form" ref={form.ref} onSubmit={form.onSubmit}>
        <SelectField
          as="select"
          data-mol-id="select"
          name="plan"
          options={[free, pro]}
          value="free"
          onChange={() => {
            flushSync(() => root.render(view()))
            form.ref.current?.requestSubmit()
          }}
          onValueChange={(value) => {
            change(value)
            form.ref.current?.requestSubmit()
          }}
        />
      </FormArea>
    )
    render(view())
    open()
    click(option('Pro'))
    form.submit()
    expect(form.receive.mock.calls).toEqual([
      [[['plan', 'pro']]],
      [[['plan', 'pro']]],
      [[['plan', 'free']]],
    ])
    expect(change).toHaveBeenCalledExactlyOnceWith('pro')
    expect(trigger().textContent).toBe('Free')
  })

  it('toggles duplicate-valued rows independently and submits successful multiple options in order', () => {
    const form = submitter()
    const change = vi.fn()
    const events = vi.fn()
    const options = [
      empty,
      { label: 'Paid', options: [pro, blocked, { ...pro, label: 'Pro (other)' }] },
    ]
    const view = (items: typeof options): ReactNode => (
      <FormArea as="form" ref={form.ref} onSubmit={form.onSubmit}>
        <SelectField as="select" name="plan" options={[free]} />
        <SelectField
          as="select"
          multiple
          name="plan"
          data-mol-id="select"
          options={items}
          defaultValue={['missing', 'blocked']}
          onChange={(event) => events(event.target)}
          onValueChange={change}
        />
      </FormArea>
    )
    render(view(options))
    form.submit()
    expect(form.receive).toHaveBeenLastCalledWith([['plan', 'free']])
    open()
    click(option('Pro (other)'))
    click(option('None'))
    expect(change.mock.calls).toEqual([[['blocked', 'pro']], [['', 'blocked', 'pro']]])
    expect(option('Pro').getAttribute('aria-selected')).toBe('false')
    expect(option('Pro (other)').getAttribute('aria-selected')).toBe('true')
    expect(events).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'select-multiple',
        multiple: true,
        value: '',
        selectedIndex: 0,
        selectedOptions: [
          { value: '', label: 'None', disabled: false },
          { value: 'blocked', label: 'Blocked', disabled: true },
          { value: 'pro', label: 'Pro (other)', disabled: false },
        ],
      }),
    )
    render(view([empty, { label: 'Paid', options: [{ ...pro, label: 'Pro (other)' }, blocked] }]))
    form.submit()
    expect(form.receive).toHaveBeenLastCalledWith([
      ['plan', 'free'],
      ['plan', ''],
      ['plan', 'pro'],
    ])
    expect(option('Pro (other)').getAttribute('aria-selected')).toBe('true')
    click(host('[aria-label="Done"]'))
    frame()
    expect(modal?.visible).toBe(false)
    expect(change).toHaveBeenCalledTimes(2)
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
  })

  it('validates an unnamed placeholder, honors noValidate and focuses the first invalid trigger', () => {
    const form = submitter()
    const view = (noValidate: boolean): ReactNode => (
      <FormArea as="form" ref={form.ref} onSubmit={form.onSubmit} noValidate={noValidate}>
        <SelectField
          as="select"
          data-mol-id="select"
          options={[placeholder, free]}
          value=""
          required
        />
        <SelectField as="select" name="other" options={[]} required />
      </FormArea>
    )
    render(view(false))
    expect(trigger().textContent).toBe('Choose')
    form.submit()
    expect(form.receive).not.toHaveBeenCalled()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
    render(view(true))
    form.submit()
    expect(form.receive).toHaveBeenCalledExactlyOnceWith([])
  })

  it('accepts grouped or later empty selections and omits disabled selected controls and options', () => {
    const form = submitter()
    render(
      <FormArea as="form" ref={form.ref} onSubmit={form.onSubmit}>
        <SelectField
          as="select"
          name="grouped"
          options={[{ label: 'Group', options: [empty] }]}
          required
          value=""
        />
        <SelectField as="select" name="later" options={[free, empty]} required value="" />
        <SelectField
          as="select"
          name="blocked"
          options={[blocked, free]}
          required
          value="blocked"
        />
        <SelectField as="select" name="no-match" options={[blocked, pro]} value="unknown" />
        <SelectField as="select" name="disabled" options={[]} required disabled />
        <Fieldset as="fieldset" disabled>
          <SelectField as="select" name="fieldset" data-mol-id="select" options={[free]} required />
        </Fieldset>
        <SelectField as="select" name="" options={[free]} />
      </FormArea>,
    )
    click(trigger())
    expect(container.querySelector('[data-native-modal]')).toBeNull()
    form.submit()
    expect(form.receive).toHaveBeenCalledExactlyOnceWith([
      ['grouped', ''],
      ['later', ''],
      ['no-match', 'pro'],
    ])
  })

  it('resets the mount default against current options and preserves canceled reset and controlled values', () => {
    const form = submitter()
    const change = vi.fn()
    const view = (cancel: boolean, changed: boolean, options = [free, pro]): ReactNode => (
      <FormArea
        as="form"
        ref={form.ref}
        onSubmit={form.onSubmit}
        onReset={(event) => {
          if (cancel) event.preventDefault()
        }}
      >
        <SelectField
          as="select"
          name="uncontrolled"
          data-mol-id="select"
          options={options}
          defaultValue={changed ? 'pro' : 'free'}
          onValueChange={change}
        />
        <SelectField as="select" name="controlled" options={[free, pro]} value="pro" />
        <Pressable as="button" type="reset" data-testid="reset">
          Reset
        </Pressable>
      </FormArea>
    )
    render(view(true, false))
    open()
    click(option('Pro'))
    render(view(true, true))
    click(host('[data-testid="reset"]'))
    expect(trigger().textContent).toBe('Pro')
    render(view(false, true))
    click(host('[data-testid="reset"]'))
    form.submit()
    expect(form.receive).toHaveBeenLastCalledWith([
      ['uncontrolled', 'free'],
      ['controlled', 'pro'],
    ])
    render(view(false, true, [pro]))
    click(host('[data-testid="reset"]'))
    form.submit()
    expect(form.receive).toHaveBeenLastCalledWith([
      ['uncontrolled', 'pro'],
      ['controlled', 'pro'],
    ])
    expect(change).toHaveBeenCalledExactlyOnceWith('pro')
  })

  it('dismisses by backdrop, Android Back or iOS escape without another change and drops pending focus on disable or unmount', () => {
    const change = vi.fn()
    const view = (disabled: boolean): ReactNode => (
      <SelectField
        as="select"
        data-mol-id="select"
        options={[free, pro]}
        onValueChange={change}
        disabled={disabled}
      />
    )
    render(view(false))
    open()
    click(host('[data-backdrop]'))
    frame()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
    open()
    act(() => modal?.onRequestClose())
    frame()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
    device.os = 'ios'
    open()
    act(() => native(host('[role="dialog"]')).onAccessibilityEscape?.())
    frame()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
    open()
    device.accessibilityFocus.mockClear()
    render(view(true))
    frame()
    expect(modal?.visible).toBe(false)
    expect(device.accessibilityFocus).not.toHaveBeenCalled()
    render(view(false))
    click(trigger())
    render(null)
    frame()
    expect(device.accessibilityFocus).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
  })

  it('localizes multiple selection, resolves Back and focuses Close when every row is disabled', () => {
    const i18n = createSimpleI18nProvider('fr', [
      {
        code: 'fr',
        name: 'French',
        direction: 'ltr',
        translations: {
          'ui.select.selectionCount': '{{count}} choisi(s)',
          'common.done': 'Terminé',
        },
      },
    ])
    render(
      <I18nProvider provider={i18n}>
        <SelectField
          as="select"
          multiple
          data-mol-id="select"
          options={[blocked]}
          defaultValue={['blocked']}
        />
      </I18nProvider>,
    )
    expect(trigger().textContent).toBe('1 choisi(s)')
    open()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(host('[aria-label="Terminé"]'))
    act(() => modal?.onRequestClose())
    frame()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(trigger())
  })

  it('scrolls a virtualized list to a distant selected option before focusing it', () => {
    device.windowed = true
    const options = Array.from({ length: 150 }, (_, index) => ({
      value: String(index),
      label: `Row ${index}`,
    }))
    render(<SelectField as="select" data-mol-id="select" options={options} value="129" />)
    open()
    expect(list?.getItemLayout?.(options, 129)).toMatchObject({
      index: 129,
      offset: expect.any(Number),
    })
    expect(container.querySelector('[aria-label="Row 0"]')).toBeNull()
    expect(device.accessibilityFocus).toHaveBeenLastCalledWith(option('Row 129'))
  })

  it('cycles hardware focus within the modal, skips disabled rows and deduplicates activation', () => {
    device.keyboard = true
    const change = vi.fn()
    const seen = vi.fn()
    render(
      <SelectField
        as="select"
        multiple
        data-mol-id="select"
        options={[free, blocked, pro]}
        onValueChange={change}
        onKeyDown={(event) => {
          seen('down', event.key)
          if (event.shiftKey && event.key === 'ArrowDown') event.preventDefault()
        }}
        onKeyUp={(event) => seen('up', event.key)}
      />,
    )
    key(trigger(), 66)
    key(trigger(), 66, false, 'up')
    frame()
    expect(seen.mock.calls.slice(0, 2)).toEqual([
      ['down', 'Enter'],
      ['up', 'Enter'],
    ])
    expect(document.activeElement).toBe(option('Free'))
    key(option('Free'), 20, true)
    expect(document.activeElement).toBe(option('Free'))
    key(option('Free'), 20)
    frame()
    expect(document.activeElement).toBe(option('Pro'))
    key(option('Pro'), 62)
    key(option('Pro'), 62, false, 'up')
    act(() =>
      native(option('Pro')).onAccessibilityAction?.({ nativeEvent: { actionName: 'activate' } }),
    )
    expect(change).toHaveBeenCalledExactlyOnceWith(['pro'])
    frame()
    key(option('Pro'), 61)
    frame()
    const done = host('[aria-label="Done"]')
    expect(document.activeElement).toBe(done)
    key(done, 61, true)
    frame()
    expect(document.activeElement).toBe(option('Pro'))
    key(option('Pro'), 111)
    frame()
    expect(modal?.visible).toBe(false)
    expect(document.activeElement).toBe(trigger())
  })
})

describe('native form registry entries', () => {
  it('flattens zero, one and many entries in registration order', () => {
    const onSubmit = vi.fn()
    const form = createFormScope(() => ({ onSubmit }))
    const base = { valid: () => true, reset: vi.fn(), focus: vi.fn() }
    form.fields.add(() => ({ ...base, entries: () => [['same', 'a']] }))
    form.fields.add(() => ({ ...base, entries: () => [] }))
    form.fields.add(() => ({
      ...base,
      entries: () => [
        ['same', 'b'],
        ['same', ''],
      ],
    }))
    form.submit()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.anything(), [
      ['same', 'a'],
      ['same', 'b'],
      ['same', ''],
    ])
  })
})
