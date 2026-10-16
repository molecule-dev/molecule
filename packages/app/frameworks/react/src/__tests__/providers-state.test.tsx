// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createSimpleStateProvider,
  createStore,
  setProvider,
  simpleProvider,
} from '@molecule/app-state'

import { useStateProvider, useStore } from '../hooks/index.js'
import { MoleculeProvider } from '../providers.js'

describe('MoleculeProvider supplies the bonded state provider by default (flash-m65)', () => {
  beforeEach(() => {
    // What `setupAllDefaultBonds()` does in a scaffolded app.
    setProvider(simpleProvider)
  })

  it('lets useStore() work with no `state` prop — the scaffolded shape', () => {
    const store = createStore({ initialState: { sidebarOpen: false } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MoleculeProvider>{children}</MoleculeProvider>
    )

    const { result } = renderHook(() => useStore(store), { wrapper })

    expect(result.current).toEqual({ sidebarOpen: false })
  })

  it('still lets an explicit `state` prop override the bond', () => {
    const explicitProvider = createSimpleStateProvider()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MoleculeProvider state={explicitProvider}>{children}</MoleculeProvider>
    )

    const { result } = renderHook(() => useStateProvider(), { wrapper })

    expect(result.current).toBe(explicitProvider)
    expect(result.current).not.toBe(simpleProvider)
  })
})
