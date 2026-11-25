// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { SelectField } from '@molecule/app-ui-react/elements'

it('reflects a disabled reset option while the caller owns the live selection', () => {
  const onValueChange = vi.fn()
  const { getByRole } = render(
    <SelectField
      as="select"
      value=""
      options={[
        { value: '', label: 'Choose an action', disabled: true, webDefaultSelected: true },
        { value: 'add', label: 'Add' },
      ]}
      onValueChange={onValueChange}
    />,
  )
  const select = getByRole('combobox')
  const placeholder = getByRole('option', { name: 'Choose an action' })
  fireEvent.change(select, { target: { value: 'add' } })
  fireEvent.change(select, { target: { value: 'add' } })
  expect(onValueChange.mock.calls).toEqual([['add'], ['add']])
  expect(placeholder.hasAttribute('selected')).toBe(true)
})
