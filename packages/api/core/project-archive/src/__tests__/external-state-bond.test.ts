/**
 * Boot-time regression guard for the external-state bond category.
 *
 * This package once called `expectBond('project-archive-external-state')` at
 * module scope. That is unsatisfiable: `setExternalStateProvider()` registers
 * NAMED providers, and `validateBonds()` only inspects the singleton map — so
 * every app importing this core refused to boot with "Missing required bond
 * providers: project-archive-external-state" no matter how many providers it
 * wired. These cases fail if that expectation ever comes back.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { bond, reset, validateBonds } from '@molecule/api-bond'

import { getExternalStateProviders, setExternalStateProvider } from '../provider.js'
import type {
  ProjectArchiveProvider,
  ProjectExternalStateCapture,
  ProjectExternalStateProvider,
} from '../types.js'

/**
 * A provider that satisfies the singleton `project-archive` expectation, which
 * IS legitimately required (one answer per deployment). Its methods are never
 * called here — these cases only exercise bond registration.
 *
 * @returns A stub archive provider.
 */
const archiveStub = (): ProjectArchiveProvider =>
  ({
    kind: 'stub',
  }) as unknown as ProjectArchiveProvider

/**
 * A minimal external-state provider.
 *
 * @param kind - The provider's routing key.
 * @returns A stub external-state provider.
 */
const externalStateStub = (kind: string): ProjectExternalStateProvider => ({
  kind,
  capture: async (): Promise<ProjectExternalStateCapture> => ({ parts: [], records: [] }),
  restore: async (): Promise<void> => undefined,
})

describe('project-archive-external-state is not a required singleton bond', () => {
  beforeEach(() => {
    reset()
  })

  it('an app that wires external-state providers boots', () => {
    bond('project-archive', archiveStub())
    setExternalStateProvider(externalStateStub('postgresql'))
    setExternalStateProvider(externalStateStub('object-storage'))

    // Both landed in the NAMED registry — the shape that made the old
    // expectBond() unsatisfiable.
    expect([...getExternalStateProviders().keys()]).toEqual(['postgresql', 'object-storage'])
    expect(() => validateBonds()).not.toThrow()
  })

  it('an app that wires NO external-state provider boots', () => {
    // A deployment whose projects own nothing outside their source tree is
    // legitimate — an empty provider map must not block startup.
    bond('project-archive', archiveStub())

    expect(getExternalStateProviders().size).toBe(0)
    expect(() => validateBonds()).not.toThrow()
  })

  it('still fails when the genuinely-required archive singleton is missing', () => {
    setExternalStateProvider(externalStateStub('postgresql'))

    expect(() => validateBonds()).toThrow(/project-archive/)
  })
})
