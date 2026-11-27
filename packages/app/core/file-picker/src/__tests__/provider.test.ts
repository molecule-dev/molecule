import { afterEach, expect, it } from 'vitest'

import { bond, get, unbond } from '@molecule/app-bond'

import { type FilePickerProvider, getProvider, hasProvider, setProvider } from '../index.js'

afterEach(() => {
  unbond('file-picker')
})

it('reports an unconfigured picker', () => {
  expect(getProvider()).toBeNull()
  expect(hasProvider()).toBe(false)
})

it('registers and replaces the app singleton', () => {
  const first: FilePickerProvider = { pickFiles: async () => [] }
  const replacement: FilePickerProvider = { pickFiles: async () => [] }

  setProvider(first)
  expect(hasProvider()).toBe(true)
  expect(getProvider()).toBe(first)
  expect(get('file-picker')).toBe(first)

  setProvider(replacement)
  expect(getProvider()).toBe(replacement)
  expect(get('file-picker')).toBe(replacement)
})

it('sees a provider bonded by the app wiring', () => {
  const provider: FilePickerProvider = { pickFiles: async () => [] }

  bond('file-picker', provider)
  expect(hasProvider()).toBe(true)
  expect(getProvider()).toBe(provider)

  unbond('file-picker')
  expect(hasProvider()).toBe(false)
  expect(getProvider()).toBeNull()
})
