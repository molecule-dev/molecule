// @vitest-environment jsdom
/** Exercises the kit callbacks at the native primitive boundary. */
import type { ComponentProps, FormEvent, ReactElement, ReactNode } from 'react'
import { Fragment } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import type * as Native from 'react-native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { Button } from '../components/Button.js'
import { Card } from '../components/Card.js'
import { Checkbox } from '../components/Checkbox.js'
import { Input } from '../components/Input.js'
import { Flex } from '../components/Layout.js'
import { Select } from '../components/Select.js'
import { Switch } from '../components/Switch.js'
import { Textarea } from '../components/Textarea.js'

vi.mock('react-native', () => ({
  View: ({ children, testID, onTouchEnd }: ComponentProps<typeof Native.View>) => (
    <div data-testid={testID} onClick={onTouchEnd}>
      {children}
    </div>
  ),
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Pressable: ({
    children,
    disabled,
    testID,
    accessibilityLabel,
    onPress,
  }: ComponentProps<typeof Native.Pressable>) => (
    <div
      data-testid={testID}
      aria-label={accessibilityLabel}
      onClick={disabled ? undefined : onPress}
    >
      {children}
    </div>
  ),
  TextInput: ({
    editable,
    multiline,
    onChangeText,
    onFocus,
    onBlur,
    testID,
    value,
  }: ComponentProps<typeof Native.TextInput>) => {
    const props = {
      'data-testid': testID,
      'data-value-type': typeof value,
      defaultValue: value,
      disabled: editable === false,
      onInput: (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChangeText?.(event.currentTarget.value),
      onFocus,
      onBlur,
    }
    return multiline ? <textarea {...props} /> : <input {...props} />
  },
  Switch: ({ value, disabled, onValueChange }: ComponentProps<typeof Native.Switch>) => (
    <input
      type="checkbox"
      defaultChecked={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.currentTarget.checked)}
    />
  ),
  Modal: ({ visible, children }: ComponentProps<typeof Native.Modal>) =>
    visible ? children : null,
  FlatList: <T,>({ data, keyExtractor, renderItem }: ComponentProps<typeof Native.FlatList<T>>) => (
    <>
      {data?.map((item, index) => (
        <Fragment key={keyExtractor?.(item, index) ?? index}>
          {renderItem({ item, index })}
        </Fragment>
      ))}
    </>
  ),
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...parts: unknown[]) => parts.filter(Boolean).join(' ')
            : () => String(prop),
      },
    ),
}))

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: {} }]))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  flushSync(() => root.unmount())
  host.remove()
})

/** Mount the kit component using React's real renderer. */
function render(element: ReactElement): void {
  flushSync(() => root.render(element))
}

/** Find a rendered native stand-in. */
function find<E extends HTMLElement>(selector: string): E {
  const element = host.querySelector<E>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

/** Drive the native input's text change through its host stand-in. */
function enterText(selector: string, value: string): void {
  const input = find<HTMLInputElement | HTMLTextAreaElement>(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Model an older JavaScript caller. The public types now forbid these props. */
function legacyChange() {
  const onChange = vi.fn()
  const props: Record<string, unknown> = { onChange }
  return { props, onChange }
}

describe('native kit callbacks', () => {
  it.each([
    { field: Input, control: 'input' },
    { field: Textarea, control: 'textarea' },
  ])('$control reports text through the value callback', ({ field, control }) => {
    const Field = field
    const legacy = legacyChange()
    const onValueChange = vi.fn<(value: string) => void>()
    render(<Field {...legacy.props} onValueChange={onValueChange} />)

    enterText(control, 'new text')

    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('new text')
  })

  it('reports an empty string and the clear action when clearing Input', () => {
    const legacy = legacyChange()
    const onValueChange = vi.fn<(value: string) => void>()
    const onClear = vi.fn<() => void>()
    render(
      <Input
        {...legacy.props}
        clearable
        clearLabel="Clear filter"
        value="typed"
        onValueChange={onValueChange}
        onClear={onClear}
      />,
    )

    find('[aria-label="Clear filter"], [aria-label="Clear"]').click()

    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(find('[aria-label="Clear filter"]')).toBeDefined()
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('')
    expect(onClear).toHaveBeenCalledExactlyOnceWith()
  })

  it.each([
    { field: Input, control: 'input' },
    { field: Textarea, control: 'textarea' },
  ])('$control reports focus and blur without an event', ({ field, control }) => {
    const Field = field
    const onFocus = vi.fn<() => void>()
    const onBlur = vi.fn<() => void>()
    render(<Field onFocus={onFocus} onBlur={onBlur} />)

    const input = find(control)
    input.focus()
    input.blur()

    expect(onFocus.mock.calls.map((args) => args.length)).toEqual([0])
    expect(onBlur.mock.calls.map((args) => args.length)).toEqual([0])
  })

  it('gives the native text primitive a string for numeric Input values', () => {
    render(<Input type="number" value={42} />)
    const input = find<HTMLInputElement>('input')
    expect(input.value).toBe('42')
    expect(input.dataset.valueType).toBe('string')
  })

  it('reports the checkbox checked state without a legacy event', () => {
    const legacy = legacyChange()
    const onCheckedChange = vi.fn<(checked: boolean) => void>()
    render(<Checkbox {...legacy.props} testId="check" checked onCheckedChange={onCheckedChange} />)

    find('[data-testid="check"]').click()

    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('reports the switch checked state without a legacy event', () => {
    const legacy = legacyChange()
    const onCheckedChange = vi.fn<(checked: boolean) => void>()
    render(<Switch {...legacy.props} checked={false} onCheckedChange={onCheckedChange} />)

    find('input[type="checkbox"]').click()

    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('reports the selected option value and closes the picker', () => {
    const legacy = legacyChange()
    const onValueChange = vi.fn<(value: string) => void>()
    render(
      <Select
        {...legacy.props}
        testId="picker"
        options={[{ value: 'review', label: 'Review' }]}
        onValueChange={onValueChange}
      />,
    )

    flushSync(() => find('[data-testid="picker"]').click())
    const option = Array.from(host.querySelectorAll('span')).find(
      (node) => node.textContent === 'Review',
    )
    if (!option) throw new Error('Picker did not show the option')
    flushSync(() => option.click())

    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('review')
    expect(option.isConnected).toBe(false)
  })

  it.each([
    { control: Button, name: 'Button' },
    { control: Card, name: 'Card' },
    { control: Flex, name: 'Flex' },
  ])('$name activates without an event', ({ control }) => {
    const Control = control
    const onClick = vi.fn<() => void>()
    render(<Control onClick={onClick} testId="activate" />)

    find('[data-testid="activate"]').click()

    expect(onClick.mock.calls.map((args) => args.length)).toEqual([0])
  })

  it('keeps disabled controls from calling action and value callbacks', () => {
    const legacy = legacyChange()
    const onValueChange = vi.fn()
    const onCheckedChange = vi.fn()
    const onClick = vi.fn()
    render(
      <>
        <Card disabled testId="card" onClick={onClick} />
        <Input {...legacy.props} disabled clearable value="locked" onValueChange={onValueChange} />
        <Checkbox disabled testId="check" onCheckedChange={onCheckedChange} />
      </>,
    )

    host.querySelector<HTMLElement>('[aria-label="Clear"]')?.click()
    find('[data-testid="card"]').click()
    find('[data-testid="check"]').click()

    expect(onValueChange).not.toHaveBeenCalled()
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(onClick.mock.calls).toHaveLength(0)
  })

  it('keeps disabled picker options from issuing a selection', () => {
    const legacy = legacyChange()
    const onValueChange = vi.fn()
    render(
      <Select
        {...legacy.props}
        testId="picker"
        options={[{ value: 'locked', label: 'Unavailable', disabled: true }]}
        onValueChange={onValueChange}
      />,
    )

    flushSync(() => find('[data-testid="picker"]').click())
    const option = Array.from(host.querySelectorAll('span')).find(
      (node) => node.textContent === 'Unavailable',
    )
    if (!option) throw new Error('Picker did not show the disabled option')
    option.click()

    expect(legacy.onChange).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
