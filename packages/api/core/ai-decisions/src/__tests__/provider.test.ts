import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AIDecisionsProvider, DecideResult, DecisionQuestion } from '../types.js'

const makeStub = (name: string): AIDecisionsProvider => ({
  name,
  async decide<Q extends Record<string, DecisionQuestion>>(): Promise<DecideResult<Q>> {
    return { answers: {} as DecideResult<Q>['answers'] }
  },
})

describe('ai-decisions accessor', () => {
  beforeEach(() => {
    reset()
    configure({})
  })

  it('returns null / false when nothing is bonded', () => {
    expect(getProvider()).toBeNull()
    expect(hasProvider()).toBe(false)
  })

  it('requireProvider throws a helpful error when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/ai-decisions provider/)
  })

  it('bonds a singleton', () => {
    const stub = makeStub('laya')
    setProvider(stub)
    expect(getProvider()).toBe(stub)
    expect(requireProvider()).toBe(stub)
    expect(hasProvider()).toBe(true)
  })

  it('bonds named providers and registers the first as the singleton', () => {
    const a = makeStub('laya')
    const b = makeStub('jev')
    setProvider('laya', a)
    setProvider('jev', b)
    expect(getProviderByName('laya')).toBe(a)
    expect(getProviderByName('jev')).toBe(b)
    expect(getProvider()).toBe(a)
    expect(hasProvider('jev')).toBe(true)
    expect([...getAllProviders().keys()].sort()).toEqual(['jev', 'laya'])
  })

  it('returns null for an unknown name', () => {
    expect(getProviderByName('nope')).toBeNull()
  })
})
