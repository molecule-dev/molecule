import { describe, expect, it } from 'vitest'

import { partialBindingMocks } from '../lib/binding-mocks.mjs'

const lines = (text, name = 'x.test.ts') => partialBindingMocks(text, name).map((m) => m.line)

describe('partialBindingMocks', () => {
  it('flags a factory whose object replaces the binding (the 2026-11-22 Angular shape)', () => {
    const text = [
      "vi.mock('@molecule/app-angular', () => ({",
      '  useTranslation: () => ({ t: (key: string) => key }),',
      '}))',
    ].join('\n')
    expect(partialBindingMocks(text, 'cookie-banner.test.ts')).toEqual([
      { binding: '@molecule/app-angular', line: 1 },
    ])
  })

  it('flags a factory that picks exports from the real module without spreading it', () => {
    const text = [
      "vi.mock('@molecule/app-angular', async (importOriginal) => {",
      '  const actual = await importOriginal<Record<string, unknown>>()',
      '  return { Link: actual.Link, provideRouter: actual.provideRouter }',
      '})',
    ].join('\n')
    expect(lines(text)).toEqual([1])
  })

  it('flags a block factory that returns a variable or an object without the spread', () => {
    const text = [
      "vi.mock('@molecule/app-vue', async () => {",
      '  const mocked = { useTranslation: () => ({ t: (k: string) => k }) }',
      '  return mocked',
      '})',
      "vi.mock('@molecule/app-solid', async () => {",
      "  const { createSignal } = await import('solid-js')",
      '  return { useTranslation: () => ({ t: (k: string) => k }), createSignal }',
      '})',
    ].join('\n')
    expect(lines(text)).toEqual([1, 5])
  })

  it('accepts a factory that spreads importOriginal, vi.importActual or a variable holding either', () => {
    const text = [
      "vi.mock('@molecule/app-svelte', async (importOriginal) => ({",
      '  ...(await importOriginal<Record<string, unknown>>()),',
      '  useTranslation: () => ({ t: (k: string) => k }),',
      '}))',
      "vi.mock('@molecule/app-react', async () => ({",
      "  ...(await vi.importActual<typeof AppReact>('@molecule/app-react')),",
      "  useLocation: () => ({ pathname: '/', search: '' }),",
      '}))',
      "vi.mock('@molecule/app-angular', async (importOriginal) => {",
      '  const actual = await importOriginal<typeof AngularBinding>()',
      "  const { signal } = await import('@angular/core')",
      '  return { ...actual, useTranslation: () => ({ t: (k: string) => k }), signal }',
      '})',
    ].join('\n')
    expect(lines(text, 'x.test.tsx')).toEqual([])
  })

  it('accepts the real-module loader under any parameter name, and only as the parameter', () => {
    const named = [
      "vi.mock('@molecule/app-react', async (load) => ({",
      '  ...(await load<Record<string, unknown>>()),',
      '  useTranslation: () => ({ t: (k: string) => k }),',
      '}))',
      "vi.mock('@molecule/app-vue', async (original) => {",
      '  const actual = await original<Record<string, unknown>>()',
      '  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) }',
      '})',
    ].join('\n')
    expect(lines(named, 'x.test.tsx')).toEqual([])
    // Without the parameter, `importOriginal` is not defined when the mock loads.
    const unbound = [
      "vi.mock('@molecule/app-react', async () => ({",
      '  ...(await importOriginal<Record<string, unknown>>()),',
      '}))',
      "vi.mock('@molecule/app-solid', async (load) => ({",
      '  ...(await importOriginal<Record<string, unknown>>()),',
      '}))',
    ].join('\n')
    expect(lines(unbound)).toEqual([1, 4])
  })

  it('counterexample: ignores other packages, automocks and strings that mention vi.mock', () => {
    const text = [
      "vi.mock('@molecule/app-ui-angular', () => ({ Button: class {} }))",
      "vi.mock('@molecule/app-react-native', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))",
      "vi.mock('@molecule/app-routing-react-router', () => ({ BrowserRouter: () => null }))",
      "vi.mock('@molecule/app-react')",
      'const note = "vi.mock(\'@molecule/app-vue\', () => ({}))"',
      "// vi.mock('@molecule/app-solid', () => ({}))",
    ].join('\n')
    expect(lines(text)).toEqual([])
  })

  it('reads a .tsx file as JSX', () => {
    const text = [
      'const el = <div>{1}</div>',
      "vi.mock('@molecule/app-react', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))",
    ].join('\n')
    expect(lines(text, 'x.test.tsx')).toEqual([2])
  })
})
