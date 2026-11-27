// @vitest-environment jsdom
import {
  act,
  type ChangeEvent,
  createElement,
  createRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckFieldHandle, FormAreaHandle, KitEvent } from '@molecule/app-ui'

import { Box } from '../elements/Box.js'
import { CheckField } from '../elements/CheckField.js'
import { Fieldset } from '../elements/Fieldset.js'
import { FormArea } from '../elements/FormArea.js'
import { Pressable } from '../elements/Pressable.js'
import { Text } from '../elements/Text.js'
import { TextField } from '../elements/TextField.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    splitForNative: (view: string) => ({
      view: view === 'contents' ? '' : view,
      display: view === 'contents' || view === 'flex' ? view : null,
      text: '',
      weight: null,
      lines: null,
    }),
    checkFieldMark: () => ({ path: 'M3 7h10v2H3z', className: '' }),
  }),
}))

vi.mock('react-native-svg', () => ({
  Svg: ({ children }: { children?: ReactNode }) => createElement('svg', {}, children),
  Path: ({ d }: { d: string }) => createElement('path', { d }),
}))

vi.mock('react-native-external-keyboard', () => ({ ExternalKeyboardViewNative: () => null }))

vi.mock('react-native', () => {
  interface HostProps {
    id?: string
    role?: string
    testID?: string
    'aria-label'?: string
    'aria-checked'?: boolean | 'mixed'
    'aria-disabled'?: boolean
    accessibilityHint?: string
    onPress?: (event: MouseEvent<HTMLElement>) => void
    disabled?: boolean
    focusable?: boolean
    children?: ReactNode
    ref?: Ref<HTMLElement>
  }
  interface InputProps extends HostProps {
    editable?: boolean
    multiline?: boolean
    defaultValue?: string
    value?: string
    inputMode?: string
    onChangeText?: (value: string) => void
    onSubmitEditing?: () => void
  }

  const identity = (props: HostProps) => ({
    id: props.id,
    role: props.role,
    'data-testid': props.testID,
    'aria-label': props['aria-label'],
    'aria-checked': props['aria-checked'],
    'aria-disabled': props['aria-disabled'],
    'data-accessibility-hint': props.accessibilityHint,
    ref: props.ref,
  })
  const host = (tag: string) => (props: HostProps) =>
    createElement(
      tag,
      {
        ...identity(props),
        tabIndex: props.focusable === false ? -1 : 0,
        onClick: props.onPress
          ? (event: MouseEvent<HTMLElement>) => {
              event.stopPropagation()
              if (!props.disabled) props.onPress?.(event)
            }
          : undefined,
      },
      props.children,
    )
  return {
    Platform: { select: ({ default: value }: { default: string }) => value },
    useWindowDimensions: () => ({ width: 640 }),
    View: host('div'),
    Pressable: host('div'),
    Text: host('span'),
    TextInput: (props: InputProps) =>
      createElement(props.multiline ? 'textarea' : 'input', {
        ...identity(props),
        value: props.value,
        defaultValue: props.defaultValue,
        inputMode: props.inputMode,
        disabled: props.disabled,
        readOnly: props.editable === false,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          props.onChangeText?.(event.currentTarget.value),
        onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') props.onSubmitEditing?.()
        },
      }),
  }
})

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function render(node: ReactNode): void {
  act(() => root.render(node))
}

function host<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = container.querySelector<T>(`[data-testid="${id}"]`)
  if (!node) throw new Error(`No native host for ${id}`)
  return node
}

function press(id: string): void {
  act(() => host(id).click())
}

function edit(id: string, value: string): void {
  const input = host<HTMLInputElement>(id)
  act(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function enter(id: string): void {
  act(() => {
    const input = host<HTMLInputElement>(id)
    input.focus()
    input.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
  })
}

describe('Native form elements', () => {
  it('uses the text named by an aria-describedby relationship as the pressable hint', () => {
    const onRetry = vi.fn()
    render(
      <Box as="div">
        <Text as="span" id="event-type">
          order.created
        </Text>
        <Pressable
          as="button"
          type="button"
          data-testid="retry"
          aria-describedby="event-type"
          onClick={onRetry}
        >
          Retry
        </Pressable>
      </Box>,
    )
    expect(host('retry').getAttribute('data-accessibility-hint')).toBe('order.created')
    press('retry')
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('validates inclusive number bounds and decimal steps without changing draft text', () => {
    const onSubmit = vi.fn()
    const onValueChange = vi.fn()
    const form = createRef<FormAreaHandle>()
    render(
      <FormArea as="form" ref={form} onSubmit={onSubmit}>
        <TextField
          as="input"
          type="number"
          name="quantity"
          data-testid="number"
          min={0.1}
          max={0.5}
          step={0.1}
          onValueChange={onValueChange}
        />
      </FormArea>,
    )
    const input = host<HTMLInputElement>('number')
    expect(input.inputMode).toBe('decimal')
    for (const text of ['-', '0x1', '0', '0.35', '0.6']) {
      edit('number', text)
      expect(input.value).toBe(text)
      expect(onValueChange).toHaveBeenLastCalledWith(text)
      act(() => form.current?.requestSubmit())
      expect(onSubmit).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(input)
    }
    for (const text of ['0.1', '3e-1', '0.5']) {
      onSubmit.mockClear()
      edit('number', text)
      act(() => form.current?.requestSubmit())
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), [['quantity', text]])
    }
  })

  it('uses the value attribute and then zero as the numeric step base', () => {
    const onSubmit = vi.fn()
    const form = createRef<FormAreaHandle>()
    render(
      <FormArea as="form" ref={form} onSubmit={onSubmit}>
        <TextField
          as="input"
          type="number"
          name="offset"
          data-testid="offset"
          defaultValue="0.15"
          step={0.1}
        />
        <TextField as="input" type="number" name="whole" data-testid="whole" />
      </FormArea>,
    )
    edit('offset', '0.20')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    edit('offset', '-0.05')
    edit('whole', '0.5')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    edit('whole', '0')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), [
      ['offset', '-0.05'],
      ['whole', '0'],
    ])
  })

  it('validates a controlled number proposal against the supplied value attribute', () => {
    const onSubmit = vi.fn()
    const form = createRef<FormAreaHandle>()
    render(
      <FormArea as="form" ref={form} onSubmit={onSubmit}>
        <TextField
          as="input"
          type="number"
          data-testid="controlled-bound"
          name="offset"
          value="0.15"
          step={0.1}
          onValueChange={() => form.current?.requestSubmit()}
        />
      </FormArea>,
    )
    edit('controlled-bound', '0.2')
    expect(onSubmit).not.toHaveBeenCalled()
    edit('controlled-bound', '0.25')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), [['offset', '0.25']])
  })

  it('validates real dates, inclusive bounds and steps in calendar days', () => {
    const onSubmit = vi.fn()
    const form = createRef<FormAreaHandle>()
    render(
      <FormArea as="form" ref={form} onSubmit={onSubmit}>
        <TextField
          as="input"
          type="date"
          name="day"
          data-testid="day"
          min="2024-02-27"
          max="2024-03-12"
          defaultValue="2024-03-01"
          step={2}
        />
      </FormArea>,
    )
    for (const day of ['2024-02-2', '2024-02-30', '2024-03-01', '2024-02-25', '2024-03-14']) {
      edit('day', day)
      act(() => form.current?.requestSubmit())
      expect(onSubmit).not.toHaveBeenCalled()
    }
    for (const day of ['2024-02-27', '2024-02-29', '2024-03-10', '2024-03-12']) {
      onSubmit.mockClear()
      edit('day', day)
      act(() => form.current?.requestSubmit())
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), [['day', day]])
    }
  })

  it('ignores an invalid date minimum and tries the value attribute before the epoch', () => {
    const onSubmit = vi.fn()
    const form = createRef<FormAreaHandle>()
    render(
      <FormArea as="form" ref={form} onSubmit={onSubmit}>
        <TextField
          as="input"
          type="date"
          data-testid="base"
          min="1900-02-29"
          defaultValue="2024-02-29"
          step={2}
        />
        <TextField as="input" type="date" data-testid="epoch" step={1.5} />
      </FormArea>,
    )
    edit('base', '2024-03-01')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    edit('base', '2024-03-02')
    edit('epoch', '1969-12-31')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    edit('epoch', '1969-12-29')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('keeps optional empty, required, read-only, disabled and noValidate form behavior', () => {
    const onSubmit = vi.fn()
    const form = createRef<FormAreaHandle>()
    const show = (required: boolean, noValidate = false): void =>
      render(
        <FormArea as="form" ref={form} onSubmit={onSubmit} noValidate={noValidate}>
          <TextField
            as="input"
            type="number"
            name="free"
            data-testid="free"
            min={0}
            step="any"
            required={required}
          />
          <TextField as="input" type="date" name="read" defaultValue="1900-02-29" readOnly />
          <TextField as="input" type="number" name="disabled" defaultValue="draft" disabled />
        </FormArea>,
      )
    show(false)
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), [
      ['free', ''],
      ['read', '1900-02-29'],
    ])
    onSubmit.mockClear()
    show(true)
    act(() => form.current?.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    edit('free', '0.13')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenCalledTimes(1)
    edit('free', '-0.13')
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenCalledTimes(1)
    show(true, true)
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenLastCalledWith(expect.any(Object), [
      ['free', '-0.13'],
      ['read', '1900-02-29'],
    ])
  })

  it('submits current values and flattens a disabled contents fieldset without disabling a Box', () => {
    const click = vi.fn()
    const receive = vi.fn()
    render(
      <FormArea
        as="form"
        className="flex"
        data-testid="form"
        onSubmit={(_event, entries) => receive(entries)}
      >
        <TextField as="input" data-testid="one" name="same" defaultValue="first" />
        <TextField as="input" data-testid="two" name="same" defaultValue="second" />
        <TextField as="input" defaultValue="unnamed" />
        <Fieldset as="fieldset" className="contents" disabled>
          <TextField as="input" data-testid="skipped" name="skipped" required />
          <Box as="div" data-testid="box" onClick={click}>
            Still interactive
          </Box>
        </Fieldset>
        <Pressable as="button" name="button" data-testid="submit">
          Submit
        </Pressable>
      </FormArea>,
    )
    expect(host('skipped').parentElement).toBe(host('form'))
    expect(host<HTMLInputElement>('skipped').disabled).toBe(true)
    press('box')
    expect(click).toHaveBeenCalledOnce()
    edit('two', 'edited')
    press('submit')
    expect(receive).toHaveBeenCalledExactlyOnceWith([
      ['same', 'first'],
      ['same', 'edited'],
    ])
  })

  it('validates in order, focuses the first invalid control, and honors noValidate', () => {
    const onSubmit = vi.fn()
    const form = createRef<FormAreaHandle>()
    const show = (noValidate?: boolean): void =>
      render(
        <FormArea as="form" ref={form} noValidate={noValidate} onSubmit={onSubmit}>
          <TextField as="input" data-testid="email" type="email" name="email" required />
          <TextField as="input" data-testid="url" type="url" name="url" defaultValue="relative" />
        </FormArea>,
      )
    show()
    act(() => form.current?.requestSubmit())
    expect(document.activeElement).toBe(host('email'))
    expect(onSubmit).not.toHaveBeenCalled()
    edit('email', 'wrong@-host')
    act(() => form.current?.requestSubmit())
    expect(document.activeElement).toBe(host('email'))
    edit('email', 'user@host')
    act(() => form.current?.requestSubmit())
    expect(document.activeElement).toBe(host('url'))
    expect(onSubmit).not.toHaveBeenCalled()
    show(true)
    act(() => form.current?.requestSubmit())
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.any(Object), [
      ['email', 'user@host'],
      ['url', 'relative'],
    ])
  })

  it('resets uncontrolled fields to their defaults unless reset is canceled', () => {
    const receive = vi.fn()
    const show = (onReset?: (event: KitEvent) => void): void =>
      render(
        <FormArea as="form" onSubmit={(_event, entries) => receive(entries)} onReset={onReset}>
          <TextField
            as="input"
            data-testid="uncontrolled"
            name="uncontrolled"
            defaultValue="first"
          />
          <TextField as="input" data-testid="controlled" name="controlled" value="kept" />
          <Pressable as="button" type="reset" data-testid="reset">
            Reset
          </Pressable>
          <Pressable as="button" type="submit" data-testid="submit">
            Submit
          </Pressable>
        </FormArea>,
      )
    show((event) => event.preventDefault())
    edit('uncontrolled', 'edited')
    edit('controlled', 'ignored')
    press('reset')
    press('submit')
    expect(receive).toHaveBeenLastCalledWith([
      ['uncontrolled', 'edited'],
      ['controlled', 'kept'],
    ])
    show()
    press('reset')
    expect(host<HTMLInputElement>('uncontrolled').value).toBe('first')
    press('submit')
    expect(receive).toHaveBeenLastCalledWith([
      ['uncontrolled', 'first'],
      ['controlled', 'kept'],
    ])
  })

  it('uses the first default button for Enter and honors both disabled and click cancellation', () => {
    const onSubmit = vi.fn()
    const first = vi.fn()
    const second = vi.fn()
    const show = (disabled: boolean, cancel: boolean): void =>
      render(
        <FormArea as="form" onSubmit={onSubmit}>
          <TextField as="input" data-testid="entry" name="entry" />
          <Fieldset as="fieldset" disabled={disabled}>
            <Pressable
              as="button"
              onClick={(event) => {
                first()
                if (cancel) event.preventDefault()
              }}
            >
              Default button
            </Pressable>
          </Fieldset>
          <Pressable as="button" type="submit" onClick={second}>
            Other submit button
          </Pressable>
        </FormArea>,
      )
    show(true, false)
    enter('entry')
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    show(false, true)
    enter('entry')
    expect(first).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
    show(false, false)
    enter('entry')
    expect(first).toHaveBeenCalledTimes(2)
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })

  it('uses the single-line fallback only when exactly one such field remains', () => {
    const onSubmit = vi.fn()
    const show = (another: boolean): void =>
      render(
        <FormArea as="form" onSubmit={onSubmit}>
          <TextField as="input" data-testid="one" name="one" />
          <TextField as="textarea" name="notes" />
          {another && <TextField as="input" name="two" />}
          <Pressable as="button" type="button">
            Other action
          </Pressable>
        </FormArea>,
      )
    show(true)
    enter('one')
    expect(onSubmit).not.toHaveBeenCalled()
    show(false)
    enter('one')
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('resolves duplicate ids in the nearest form and falls back to an unscoped control', () => {
    render(
      <>
        <FormArea as="form">
          <Text as="label" htmlFor="email" data-testid="personal-label">
            Personal email
          </Text>
          <TextField as="input" id="email" data-testid="personal" />
        </FormArea>
        <FormArea as="form">
          <Text as="label" htmlFor="email" data-testid="work-label">
            Work email
          </Text>
          <TextField as="input" id="email" data-testid="work" />
          <Text as="label" htmlFor="outside" data-testid="outside-label">
            Outside
          </Text>
        </FormArea>
        <TextField as="input" id="outside" data-testid="outside" />
      </>,
    )
    expect(host('personal').getAttribute('aria-label')).toBe('Personal email')
    expect(host('work').getAttribute('aria-label')).toBe('Work email')
    expect(host('outside').getAttribute('aria-label')).toBe('Outside')
    press('work-label')
    expect(document.activeElement).toBe(host('work'))
    press('personal-label')
    expect(document.activeElement).toBe(host('personal'))
    press('outside-label')
    expect(document.activeElement).toBe(host('outside'))
  })
})

describe('Native check fields', () => {
  it('toggles once through a label and clears the mixed state and form value on reset', () => {
    const onChange = vi.fn()
    const onCheckedChange = vi.fn()
    const receive = vi.fn()
    render(
      <FormArea as="form" onSubmit={(_event, entries) => receive(entries)}>
        <Box as="label" data-testid="label">
          <CheckField
            as="input"
            type="checkbox"
            data-testid="check"
            name="news"
            indeterminate
            onChange={({ target }) => onChange(target)}
            onCheckedChange={onCheckedChange}
          />
          <Text as="span">News</Text>
        </Box>
        <Pressable as="button" type="reset" data-testid="reset">
          Reset
        </Pressable>
        <Pressable as="button" type="submit" data-testid="submit">
          Submit
        </Pressable>
      </FormArea>,
    )
    const check = host('check')
    expect(check.getAttribute('aria-label')).toBe('News')
    expect(check.getAttribute('aria-checked')).toBe('mixed')
    expect(check.querySelector('svg path')).not.toBeNull()
    press('label')
    expect(check.getAttribute('aria-checked')).toBe('true')
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ checked: true, name: 'news', value: 'on', type: 'checkbox' }),
    )
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true)
    press('submit')
    expect(receive).toHaveBeenLastCalledWith([['news', 'on']])
    press('reset')
    expect(check.getAttribute('aria-checked')).toBe('false')
    expect(check.querySelector('svg')).toBeNull()
    press('submit')
    expect(receive).toHaveBeenLastCalledWith([])
  })

  it('keeps hidden input handles and form registration without drawing a control', () => {
    const ref = createRef<CheckFieldHandle>()
    const changed = vi.fn()
    const receive = vi.fn()
    const show = (disabled: boolean): void =>
      render(
        <FormArea as="form" onSubmit={(_event, entries) => receive(entries)}>
          <Fieldset as="fieldset" disabled={disabled}>
            <CheckField
              as="input"
              type="checkbox"
              data-testid="hidden"
              aria-hidden
              name="value"
              ref={ref}
              onCheckedChange={changed}
            />
          </Fieldset>
          <Box as="label" data-testid="visible-label">
            <Pressable
              as="button"
              type="button"
              data-testid="switch"
              role="switch"
              onClick={() => ref.current?.click()}
            />
            <Text as="span">Alarm</Text>
          </Box>
          <Pressable as="button" type="submit" data-testid="submit">
            Submit
          </Pressable>
        </FormArea>,
      )
    show(true)
    expect(container.querySelector('[data-testid="hidden"]')).toBeNull()
    expect(host('switch').getAttribute('aria-label')).toBe('Alarm')
    press('visible-label')
    expect(ref.current?.checked).toBe(false)
    expect(changed).not.toHaveBeenCalled()
    show(false)
    press('visible-label')
    expect(ref.current?.checked).toBe(true)
    expect(changed).toHaveBeenCalledExactlyOnceWith(true)
    press('submit')
    expect(receive).toHaveBeenCalledExactlyOnceWith([['value', 'on']])
  })

  it('validates required radios as a group and keeps a checked radio checked when pressed', () => {
    const receive = vi.fn()
    const changed = vi.fn()
    const show = (checked: boolean): void =>
      render(
        <FormArea as="form" onSubmit={(_event, entries) => receive(entries)}>
          <CheckField
            as="input"
            type="radio"
            data-testid="first"
            name="size"
            value="small"
            checked={false}
            required
          />
          <CheckField
            as="input"
            type="radio"
            data-testid="second"
            name="size"
            value="large"
            checked={checked}
            required
            onCheckedChange={changed}
          />
          <Pressable as="button" type="submit" data-testid="submit">
            Submit
          </Pressable>
        </FormArea>,
      )
    show(false)
    press('submit')
    expect(document.activeElement).toBe(host('first'))
    expect(receive).not.toHaveBeenCalled()
    show(true)
    press('second')
    expect(changed).not.toHaveBeenCalled()
    press('submit')
    expect(receive).toHaveBeenCalledExactlyOnceWith([['size', 'large']])
  })
})
