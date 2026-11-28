// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import type { SelectOption } from '@molecule/app-ui'

import { Select } from '../../components/Select.js'

vi.mock(import('@molecule/app-ui'), async (importOriginal) => ({
  ...(await importOriginal()),
  getClassMap: () => ({
    cn: (): string => '',
    label: (): string => '',
    select: (): string => '',
  }),
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ paths: [], viewBox: '0 0 16 16' }),
}))

function field(role: 'combobox' | 'listbox' = 'combobox'): HTMLSelectElement {
  const select = screen.getByRole(role)
  if (!(select instanceof HTMLSelectElement)) throw new Error('Expected a real select')
  return select
}

describe('Select React adapter', () => {
  it('preserves numeric bucket order, prototype group names, both empty options and DOM identity', () => {
    const makeOptions = (): SelectOption[] => [
      { value: '', label: 'None' },
      { value: 'ten', label: 'Ten', group: '10' },
      { value: 'constructor', label: 'Constructor', group: 'constructor' },
      { value: 'two', label: 'Two', group: '2' },
      { value: 'proto', label: 'Prototype', group: '__proto__' },
    ]
    const ref = createRef<HTMLSelectElement>()
    const view = render(
      <Select options={makeOptions()} placeholder="Choose" clearable label="Plan" ref={ref} />,
    )
    const select = field()
    expect(ref.current).toBe(select)
    act(() => ref.current?.focus())
    expect(document.activeElement).toBe(select)
    expect(screen.getByLabelText('Plan')).toBe(select)
    expect(
      Array.from(select.children, (node) => node.getAttribute('label') ?? node.textContent),
    ).toEqual(['Choose', '2', '10', 'None', 'constructor', '__proto__'])
    expect(
      Array.from(select.options)
        .filter((option) => option.value === '')
        .map((option) => [option.label, option.disabled]),
    ).toEqual([
      ['Choose', true],
      ['None', false],
    ])
    const prototype = select.options[5]
    view.rerender(
      <Select
        options={makeOptions().reverse()}
        placeholder="Choose"
        clearable
        label="Plan"
        ref={ref}
      />,
    )
    expect(Array.from(select.options).find((option) => option.value === 'proto')).toBe(prototype)
    expect(document.activeElement).toBe(select)
  })

  it('updates a localized clear label on the same option while keeping a legacy multiple scalar', async () => {
    const locale = createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        direction: 'ltr',
        translations: { 'ui.select.clear': 'Clear' },
      },
      {
        code: 'fr',
        name: 'French',
        direction: 'ltr',
        translations: { 'ui.select.clear': 'Effacer' },
      },
    ])
    const options = [{ value: 'plan', label: 'Plan' }]
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(
        <I18nProvider provider={locale}>
          <Select options={options} clearable multiple={Boolean(options.length)} value="plan" />
        </I18nProvider>,
      )
      const select = field('listbox')
      const clear = select.options[0]
      expect(clear.label).toBe('Clear')
      expect(Array.from(select.selectedOptions, (option) => option.value)).toEqual(['plan'])
      await act(() => locale.setLocale('fr'))
      expect(select.options[0]).toBe(clear)
      expect(clear.label).toBe('Effacer')
      expect(errors).not.toHaveBeenCalled()
    } finally {
      errors.mockRestore()
    }
  })

  it('delivers the real event, legacy scalar and ordered full selection once per multiple edit', () => {
    const calls = vi.fn()
    const options = [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
    ]
    render(
      <Select
        options={options}
        multiple
        defaultValue={['pro']}
        onChange={(event) => calls('event', event.target, event.currentTarget)}
        onValueChange={(value) => calls('scalar', value)}
        onValuesChange={(values: readonly string[]) => calls('values', values)}
      />,
    )
    const select = field('listbox')
    expect(Array.from(select.selectedOptions, (option) => option.value)).toEqual(['pro'])
    select.options[0].selected = true
    fireEvent.change(select)
    expect(calls.mock.calls).toEqual([
      ['event', select, select],
      ['scalar', 'free'],
      ['values', ['free', 'pro']],
    ])
    for (const option of select.options) option.selected = false
    fireEvent.change(select)
    expect(calls.mock.calls.slice(3)).toEqual([
      ['event', select, select],
      ['scalar', ''],
      ['values', []],
    ])
  })
})
