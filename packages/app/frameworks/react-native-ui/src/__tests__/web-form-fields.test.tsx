// @vitest-environment jsdom
/** Browser controls register with the native form, including its reset and fieldset semantics. */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { type FormAreaHandle, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Fieldset } from '../elements/Fieldset.js'
import { Pressable } from '../elements/Pressable.js'
import { Checkbox, FormArea, Select, Switch, Textarea } from '../index.web.js'

vi.mock('react-native', () => import('react-native-web'))

beforeEach(() => {
  setProvider(createSimpleI18nProvider())
  setClassMap(classMap)
  setIconSet(iconSet)
})
afterEach(cleanup)

it('includes the checked fields alongside named text controls in the native form', () => {
  const form = createRef<FormAreaHandle>()
  const onSubmit = vi.fn()
  const view = render(
    <FormArea as="form" ref={form} onSubmit={onSubmit}>
      <Checkbox label="Consent" name="consent" checked value="yes" />
      <Switch label="Sync" name="sync" checked value="enabled" />
      <Fieldset as="fieldset" disabled>
        <Checkbox label="Hidden consent" name="hidden" checked />
        <Switch label="Hidden sync" name="hiddenSync" checked />
      </Fieldset>
      <Textarea label="Notes" name="notes" defaultValue="Hello" />
      <Select label="Plan" name="plan" value="pro" options={[{ value: 'pro', label: 'Pro' }]} />
    </FormArea>,
  )
  form.current?.requestSubmit()
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.anything(), [
    ['consent', 'yes'],
    ['sync', 'enabled'],
    ['notes', 'Hello'],
    ['plan', 'pro'],
  ])
  expect(view.getByRole('switch', { name: 'Hidden sync' })).toHaveProperty('disabled', true)
})

it('focuses an invalid field and resets an uncontrolled checkbox to its initial value', () => {
  const form = createRef<FormAreaHandle>()
  const onSubmit = vi.fn()
  const { getByRole, getByLabelText } = render(
    <FormArea as="form" ref={form} onSubmit={onSubmit}>
      <Checkbox label="Consent" name="consent" required />
      <Pressable as="button" type="reset">
        Reset
      </Pressable>
    </FormArea>,
  )
  const consent = getByLabelText('Consent')
  form.current?.requestSubmit()
  expect(onSubmit).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(consent)
  fireEvent.click(consent)
  form.current?.requestSubmit()
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.anything(), [['consent', 'on']])
  fireEvent.click(getByRole('button', { name: 'Reset' }))
  expect(consent).toHaveProperty('checked', false)
  form.current?.requestSubmit()
  expect(onSubmit).toHaveBeenCalledTimes(1)
})

it('focuses the visible switch when its form value is required', () => {
  const form = createRef<FormAreaHandle>()
  const onSubmit = vi.fn()
  const { getByRole } = render(
    <FormArea as="form" ref={form} onSubmit={onSubmit}>
      <Switch label="Sync" name="sync" required />
    </FormArea>,
  )
  form.current?.requestSubmit()
  expect(onSubmit).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(getByRole('switch'))
})
