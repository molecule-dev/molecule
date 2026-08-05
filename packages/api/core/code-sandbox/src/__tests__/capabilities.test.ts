/**
 * Tests for the OPTIONALITY of the expanded capability set.
 *
 * These read as type assertions because that is what they are. The contract's
 * central promise is that a provider written against the smaller interface keeps
 * compiling and keeps working, and that a caller can tell "this provider cannot
 * do it" from "it can, and this attempt failed" — and the moment either stops
 * holding, this file stops compiling.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import type { Sandbox, SandboxProvider, SandboxTemplate } from '../types.js'

/**
 * A provider implementing ONLY what the interface has always required.
 *
 * If any capability added later stopped being optional, this stops type-checking
 * — which is the whole point: every existing bond in the fleet looks like this.
 */
const minimal: SandboxProvider = {
  name: 'minimal',
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  destroy: vi.fn(),
}

/** A sandbox handle implementing only the long-standing required members. */
const minimalSandbox: Sandbox = {
  id: 'sandbox-1',
  status: 'running',
  previewUrl: 'http://localhost:5173',
  start: vi.fn(),
  stop: vi.fn(),
  sleep: vi.fn(),
  wake: vi.fn(),
  exec: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readDir: vi.fn(),
  deleteFile: vi.fn(),
  getPreviewUrl: () => 'http://localhost:5173',
  onFileChange: () => () => undefined,
}

describe('optional capabilities', () => {
  it('lets a provider omit every capability beyond the original contract', () => {
    // Feature detection, which is the documented way to consume these.
    expect(minimal.commitTemplate).toBeUndefined()
    expect(minimal.listTemplates).toBeUndefined()
    expect(minimal.describe).toBeUndefined()
    expect(minimal.find).toBeUndefined()
    expect(minimal.listVolumes).toBeUndefined()
    expect(minimal.capacity).toBeUndefined()
  })

  it('lets a sandbox handle omit every capability beyond the original contract', () => {
    expect(minimalSandbox.hibernate).toBeUndefined()
    expect(minimalSandbox.resume).toBeUndefined()
    expect(minimalSandbox.setResources).toBeUndefined()
    expect(minimalSandbox.exportFiles).toBeUndefined()
    expect(minimalSandbox.importFiles).toBeUndefined()
  })

  it('distinguishes "cannot" from "could not" at the call site', async () => {
    // An absent method and a rejected call are the two different answers a
    // caller must be able to act on differently: route around, versus retry or
    // surface. Collapsing them is what a stubbed no-op capability would do.
    const failing: SandboxProvider = {
      ...minimal,
      commitTemplate: vi.fn(async () => {
        throw new Error('daemon unreachable')
      }),
    }

    expect(typeof failing.commitTemplate).toBe('function')
    await expect(failing.commitTemplate!({ sandboxId: 's', templateId: 't' })).rejects.toThrow(
      /daemon unreachable/,
    )
  })

  it('models a per-project restore point with the same template primitive', async () => {
    // Retention and sharing are the caller's policy; the provider is handed an
    // id and a filesystem either way, which is why this is one mechanism and not
    // two near-identical families.
    const committed: SandboxTemplate = {
      id: 'snapshot-project-1-1760000000',
      ref: 'molecule-sandbox-template:snapshot-project-1-1760000000',
      createdAt: '2026-08-01T00:00:00Z',
      sizeBytes: 4_000_000,
      inUse: false,
    }
    const provider: SandboxProvider = { ...minimal, commitTemplate: vi.fn(async () => committed) }

    await expect(
      provider.commitTemplate!({
        sandboxId: 'sandbox-1',
        templateId: 'snapshot-project-1-1760000000',
        capturePaths: ['/workspace'],
      }),
    ).resolves.toBe(committed)
  })
})
