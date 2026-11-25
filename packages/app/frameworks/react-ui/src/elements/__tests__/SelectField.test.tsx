// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { FormAreaHandle, KitEvent } from '@molecule/app-ui'

import { FormArea, SelectField } from '../index.js'

const free = { value: 'free', label: 'Free' }
const pro = { value: 'pro', label: 'Pro' }
const enterprise = { value: 'enterprise', label: 'Enterprise', disabled: true }

function select(): HTMLSelectElement {
  const field = screen.getByRole('combobox')
  if (!(field instanceof HTMLSelectElement)) throw new Error('Expected a real select')
  return field
}

describe('SelectField (web)', () => {
  it('renders one bare empty select and preserves caller attributes and styles', () => {
    const { container } = render(
      <SelectField
        as="select"
        options={[]}
        id="method"
        name="method"
        data-mol-id="method-select"
        required
        disabled
        title="HTTP method"
        translate="no"
        style={{ color: 'red' }}
        webStyle={{ color: 'blue' }}
      />,
    )
    const field = select()
    expect(Array.from(container.children)).toEqual([field])
    expect(field.innerHTML).toBe('')
    expect(field.hasAttribute('role')).toBe(false)
    expect(field.hasAttribute('placeholder')).toBe(false)
    expect(field.id).toBe('method')
    expect(field.name).toBe('method')
    expect(field.getAttribute('data-mol-id')).toBe('method-select')
    expect(field.required).toBe(true)
    expect(field.disabled).toBe(true)
    expect(field.title).toBe('HTTP method')
    expect(field.getAttribute('translate')).toBe('no')
    expect(field.style.color).toBe('blue')
  })

  it('renders interleaved groups and explicit empty and disabled options in order', () => {
    render(
      <SelectField
        as="select"
        options={[
          { value: '', label: 'Choose', disabled: true },
          { label: 'Paid', options: [pro, enterprise] },
          free,
          { value: '', label: 'None' },
        ]}
      />,
    )
    const field = select()
    expect(field.innerHTML).toBe(
      '<option value="" disabled="">Choose</option><optgroup label="Paid"><option value="pro">Pro</option><option value="enterprise" disabled="">Enterprise</option></optgroup><option value="free">Free</option><option value="">None</option>',
    )
    expect(field.value).toBe('pro')
  })

  it('exposes the real ref, focus and change targets and calls the value handler afterward', () => {
    const ref = createRef<HTMLSelectElement>()
    const calls = vi.fn()
    render(
      <SelectField
        as="select"
        options={[free, pro]}
        ref={ref}
        onFocus={(event) => calls('focus', event.target, event.currentTarget)}
        onBlur={(event) => calls('blur', event.target, event.currentTarget)}
        onChange={(event) => calls('change', event.target, event.currentTarget)}
        onValueChange={(value) => calls('value', value)}
      />,
    )
    const field = select()
    expect(ref.current).toBe(field)
    act(() => ref.current?.focus())
    expect(document.activeElement).toBe(field)
    fireEvent.change(field, { target: { value: 'pro' } })
    act(() => ref.current?.blur())
    expect(calls.mock.calls).toEqual([
      ['focus', field, field],
      ['change', field, field],
      ['value', 'pro'],
      ['blur', field, field],
    ])
  })

  it('reports a controlled proposal and restores the value if the parent rejects it', () => {
    const change = vi.fn()
    const view = render(
      <SelectField as="select" options={[free, pro]} value="free" onValueChange={change} />,
    )
    const field = select()
    fireEvent.change(field, { target: { value: 'pro' } })
    expect(change).toHaveBeenCalledExactlyOnceWith('pro')
    expect(field.value).toBe('free')
    view.rerender(
      <SelectField as="select" options={[free, pro]} value="pro" onValueChange={change} />,
    )
    expect(field.value).toBe('pro')
    expect(change).toHaveBeenCalledTimes(1)
  })

  it('lets the browser reset an uncontrolled edit without emitting a second change', () => {
    const change = vi.fn()
    const { container } = render(
      <FormArea as="form">
        <SelectField as="select" options={[free, pro]} defaultValue="free" onValueChange={change} />
      </FormArea>,
    )
    const field = select()
    fireEvent.change(field, { target: { value: 'pro' } })
    expect(field.value).toBe('pro')
    expect(field.options[0].getAttribute('selected')).toBe('')
    act(() => container.querySelector('form')?.reset())
    expect(field.value).toBe('free')
    expect(change).toHaveBeenCalledExactlyOnceWith('pro')
  })

  it('keeps option nodes through fresh objects, duplicate-valued reordering and removal', () => {
    const equivalent = { value: 'pro', label: 'Pro (other)' }
    const makeOptions = () => [
      { ...pro },
      { ...equivalent },
      { label: 'Plans', options: [{ ...free }] },
    ]
    const change = vi.fn()
    const view = render(
      <SelectField as="select" options={makeOptions()} value="pro" onValueChange={change} />,
    )
    const field = select()
    const [firstPro, secondPro, groupedFree] = Array.from(field.options)
    const group = groupedFree.parentElement
    view.rerender(
      <SelectField
        as="select"
        options={makeOptions().reverse()}
        value="pro"
        onValueChange={change}
      />,
    )
    expect(field.children[0]).toBe(group)
    expect(field.options[0]).toBe(groupedFree)
    expect(field.options[1]).toBe(secondPro)
    expect(field.options[2]).toBe(firstPro)
    view.rerender(
      <SelectField
        as="select"
        options={[{ label: 'Plans', options: [free] }]}
        value="pro"
        onValueChange={change}
      />,
    )
    expect(field.options.length).toBe(1)
    expect(field.options[0]).toBe(groupedFree)
    expect(field.value).toBe('free')
    expect(change).not.toHaveBeenCalled()
  })

  it('reports ordered multiple edits and submits repeated names through FormArea', () => {
    const form = createRef<FormAreaHandle>()
    const submit = vi.fn()
    const values = vi.fn()
    render(
      <FormArea
        as="form"
        ref={form}
        onSubmit={(event: KitEvent, entries) => {
          event.preventDefault()
          submit(entries)
        }}
      >
        <SelectField as="select" name="plan" options={[free]} />
        <SelectField
          as="select"
          name="plan"
          multiple
          options={[{ value: '', label: 'None' }, pro]}
          onValueChange={values}
        />
      </FormArea>,
    )
    const field = screen.getByRole('listbox')
    if (!(field instanceof HTMLSelectElement)) throw new Error('Expected a real multiple select')
    expect(field.multiple).toBe(true)
    expect(field.selectedOptions).toHaveLength(0)
    field.options[1].selected = true
    field.options[0].selected = true
    fireEvent.change(field)
    act(() => form.current?.requestSubmit())
    expect(values).toHaveBeenCalledExactlyOnceWith(['', 'pro'])
    expect(submit).toHaveBeenCalledExactlyOnceWith([
      ['plan', 'free'],
      ['plan', ''],
      ['plan', 'pro'],
    ])
    field.options[0].selected = false
    field.options[1].selected = false
    fireEvent.change(field)
    expect(values).toHaveBeenLastCalledWith([])
  })
})
