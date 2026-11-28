// @vitest-environment jsdom
/**
 * The web trees of Checkbox, RadioGroup and Switch: the browser's own checkbox and radio inside a
 * label, and the drawn switch with the hidden checkbox that holds its state for a form.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Checkbox } from '../index.web.js'
import { RadioGroup } from '../index.web.js'
import { Switch } from '../index.web.js'

vi.mock('react-native', () => import('react-native-web'))

/**
 * The one element a selector matches.
 *
 * @param container - The rendered root.
 * @param selector - The selector.
 * @returns The element.
 */
function one<E extends Element>(container: HTMLElement, selector: string): E {
  const element = container.querySelector<E>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

beforeAll(() => setClassMap(classMap))
beforeEach(() => setProvider(createSimpleI18nProvider()))
afterEach(cleanup)

describe('Checkbox on React Native Web', () => {
  it("renders the browser's checkbox with its classes, state and label", () => {
    const { container } = render(<Checkbox checked label="Accept" testId="accept" />)
    const input = one<HTMLInputElement>(container, 'label > input[type="checkbox"]')
    expect(input.checked).toBe(true)
    expect(input.getAttribute('data-state')).toBe('checked')
    expect(input.getAttribute('data-testid')).toBe('accept')
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.className).toBe(classMap.checkbox({ error: false }))
    expect(input.parentElement?.className).toBe(classMap.controlLabel)
    expect(input.parentElement?.parentElement?.className).toBe(classMap.formFieldWrapper)
    const text = input.nextElementSibling
    expect(text?.className).toBe(classMap.controlText)
    expect(text?.textContent).toBe('Accept')
  })

  it('keeps the indeterminate state on the input', () => {
    const { container, rerender } = render(<Checkbox indeterminate />)
    const input = one<HTMLInputElement>(container, 'input[type="checkbox"]')
    expect(input.indeterminate).toBe(true)
    expect(input.getAttribute('data-state')).toBe('unchecked')
    rerender(<Checkbox />)
    expect(input.indeterminate).toBe(false)
  })

  it('reports the state the user clicks, and nothing for a disabled box', () => {
    const onCheckedChange = vi.fn()
    const enabled = render(<Checkbox checked onCheckedChange={onCheckedChange} />)
    fireEvent.click(one<HTMLInputElement>(enabled.container, 'input[type="checkbox"]'))
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(false)

    enabled.unmount()

    // A browser takes no click from a disabled box.
    const disabled = render(<Checkbox disabled label="Accept" onCheckedChange={onCheckedChange} />)
    const box = one<HTMLInputElement>(disabled.container, 'label > input[type="checkbox"]')
    expect(box.disabled).toBe(true)
    expect(box.parentElement?.className).toBe(classMap.controlLabel)
    expect(
      one<HTMLElement>(box.parentElement ?? disabled.container, ':scope > span').className,
    ).toBe(classMap.cn(classMap.controlText, classMap.controlDisabled))
  })

  it('associates the error message with the box and tints the error', () => {
    const { container } = render(<Checkbox error="Required" />)
    const input = one<HTMLInputElement>(container, 'input[type="checkbox"]')
    const message = one<HTMLElement>(container, 'p')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(message.id)
    expect(message.className).toBe(classMap.cn(classMap.formError, classMap.sp('mt', 1)))
    expect(message.textContent).toBe('Required')
    expect(input.className).toBe(classMap.checkbox({ error: true }))
  })
})

describe('RadioGroup on React Native Web', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B', disabled: true },
  ]

  it("renders the browser's radios as one named group, with the selected one checked", () => {
    const { container } = render(<RadioGroup options={options} value="a" direction="horizontal" />)
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    expect(radios.map((radio) => radio.value)).toEqual(['a', 'b'])
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1)
    expect(radios[0]?.checked).toBe(true)
    expect(radios[0]?.getAttribute('data-state')).toBe('checked')
    expect(radios[1]?.getAttribute('data-state')).toBe('unchecked')
    expect(radios[1]?.disabled).toBe(true)
    expect(radios[0]?.className).toBe(
      classMap.cn(classMap.radio({ error: false }), classMap.cursorPointer),
    )
    const group = one<HTMLElement>(container, '[role="radiogroup"]')
    expect(one<HTMLElement>(group, ':scope > div').className).toBe(
      classMap.radioGroupLayout('horizontal'),
    )
    const labels = [...group.querySelectorAll('label')]
    expect(labels.map((label) => label.className)).toEqual([
      classMap.controlLabel,
      classMap.cn(classMap.controlLabel, classMap.controlDisabled),
    ])
    expect([...group.querySelectorAll('label > span')].map((span) => span.textContent)).toEqual([
      'Option A',
      'Option B',
    ])
  })

  it('reports the option the user picks', () => {
    const onChange = vi.fn()
    const { container } = render(<RadioGroup options={options} value="a" onChange={onChange} />)
    const second = [...container.querySelectorAll('input[type="radio"]')][1]
    if (!second) throw new Error('Missing the second radio')
    fireEvent.click(second)
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b')
  })

  it('labels the group and describes its error', () => {
    const { container } = render(<RadioGroup options={options} label="Size" error="Pick one" />)
    const group = one<HTMLElement>(container, '[role="radiogroup"]')
    const [heading, list, message] = group.children
    expect(group.getAttribute('aria-label')).toBe('Size')
    expect(group.getAttribute('aria-invalid')).toBe('true')
    expect(heading?.className).toBe(
      classMap.cn(classMap.label({ required: false }), classMap.sp('mb', 2)),
    )
    expect(list?.querySelectorAll('input[type="radio"]').length).toBe(2)
    expect(message?.tagName).toBe('P')
    expect(message?.textContent).toBe('Pick one')
    expect(group.getAttribute('aria-describedby')).toBe(message?.id)
  })
})

describe('Switch on React Native Web', () => {
  it('renders the drawn switch the React kit draws, with the state on both parts', () => {
    const { container } = render(
      <Switch checked size="lg" color="success" label="Sync" testId="sync" />,
    )
    const button = one<HTMLButtonElement>(container, 'button[role="switch"]')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-checked')).toBe('true')
    expect(button.getAttribute('data-state')).toBe('checked')
    expect(button.getAttribute('data-testid')).toBe('sync')
    expect(button.className).toBe(classMap.switchBase({ size: 'lg', color: 'success' }))
    const thumb = one<HTMLElement>(button, ':scope > span')
    expect(thumb.getAttribute('data-state')).toBe('checked')
    expect(thumb.className).toBe(classMap.switchThumb({ size: 'lg' }))
    expect(button.nextElementSibling?.textContent).toBe('Sync')
    expect(button.parentElement?.className).toBe(classMap.controlLabel)
  })

  it('toggles its hidden checkbox when pressed and reports the new state', () => {
    const onCheckedChange = vi.fn()
    const { container } = render(<Switch checked={false} onCheckedChange={onCheckedChange} />)
    const hidden = one<HTMLInputElement>(container, 'input[type="checkbox"]')
    expect(hidden.getAttribute('aria-hidden')).toBe('true')
    expect(hidden.getAttribute('tabindex')).toBe('-1')
    expect(hidden.className).toBe(classMap.srOnly)
    expect(hidden.checked).toBe(false)
    fireEvent.click(one<HTMLElement>(container, 'button[role="switch"]'))
    // The switch is controlled: the hidden checkbox reports the new state and returns to its prop.
    expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true)
    expect(hidden.checked).toBe(false)
  })

  it('does nothing when disabled', () => {
    const onCheckedChange = vi.fn()
    const { container } = render(<Switch disabled onCheckedChange={onCheckedChange} />)
    const button = one<HTMLButtonElement>(container, 'button[role="switch"]')
    expect(button.disabled).toBe(true)
    expect(button.parentElement?.className).toBe(
      classMap.cn(classMap.controlLabel, classMap.controlDisabled),
    )
    fireEvent.click(button)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
