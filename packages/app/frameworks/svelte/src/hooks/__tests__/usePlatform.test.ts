// @vitest-environment jsdom
/**
 * `usePlatform`: React's `usePlatform` cases in Svelte's idiom. The hook runs
 * once during component init and its result is a plain object (platform
 * information is static), so a component update re-reads the same object and
 * the module functions are asked once per mount.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlatformInfo } from '@molecule/app-platform'

vi.mock('@molecule/app-platform', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  platform: vi.fn(),
  isPlatform: vi.fn(),
}))

import { isPlatform, platform } from '@molecule/app-platform'

import type { UsePlatformResult } from '../usePlatform.js'
import PlatformProbe from './PlatformProbe.svelte'

const mockPlatformInfo: PlatformInfo = {
  platform: 'web',
  isNative: false,
  isMobile: false,
  isDesktop: false,
  isWeb: true,
  isDevelopment: true,
  isProduction: false,
  userAgent: 'Mozilla/5.0 (Macintosh)',
}

/** The mounted fixtures this file tears down after each case. */
const mounts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of mounts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts {@link PlatformProbe}, which runs `usePlatform()` during its init.
 *
 * @returns The container, the results it handed over, and the update trigger.
 */
function mountProbe(): {
  container: HTMLDivElement
  read: UsePlatformResult[]
  update: () => void
} {
  const read: UsePlatformResult[] = []
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(PlatformProbe, {
    target: container,
    props: {
      onRead: (result: UsePlatformResult) => {
        read.push(result)
      },
    },
  })
  flushSync()
  mounts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return {
    container,
    read,
    update: () => {
      const button = container.querySelector('button')
      if (button === null) throw new Error('the probe rendered no button')
      button.click()
      flushSync()
    },
  }
}

/**
 * The last result the probe handed over.
 *
 * @param read - The results the probe recorded.
 * @returns The newest result.
 */
function latest(read: UsePlatformResult[]): UsePlatformResult {
  const result = read.at(-1)
  if (result === undefined) throw new Error('the probe handed over no result')
  return result
}

describe('usePlatform', () => {
  beforeEach(() => {
    vi.mocked(platform).mockReturnValue(mockPlatformInfo)
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('web'))
  })

  it('returns platform info fields', () => {
    const result = latest(mountProbe().read)

    expect(result.platform).toBe('web')
    expect(result.isWeb).toBe(true)
    expect(result.isNative).toBe(false)
    expect(result.isMobile).toBe(false)
    expect(result.isDesktop).toBe(false)
    expect(result.isDevelopment).toBe(true)
    expect(result.isProduction).toBe(false)
  })

  it('isPlatform delegates to module function', () => {
    const result = latest(mountProbe().read)

    expect(result.isPlatform('web')).toBe(true)
    expect(isPlatform).toHaveBeenCalledWith('web')

    expect(result.isPlatform('ios', 'android')).toBe(false)
    expect(isPlatform).toHaveBeenCalledWith('ios', 'android')
  })

  it('does not call platform() again on rerender', () => {
    const probe = mountProbe()
    const first = latest(probe.read)
    const readsBefore = probe.read.length

    const callCount = vi.mocked(platform).mock.calls.length
    probe.update()

    // The component really updated: the probe handed over its result again.
    expect(probe.read.length).toBeGreaterThan(readsBefore)
    // And the update re-reads the result made at init; the provider is not asked again.
    expect(vi.mocked(platform).mock.calls.length).toBe(callCount)
    expect(latest(probe.read)).toBe(first)
  })

  it('returns correct values for native platform', () => {
    vi.mocked(platform).mockReturnValue({
      ...mockPlatformInfo,
      platform: 'ios',
      isNative: true,
      isMobile: true,
      isWeb: false,
      isDevelopment: false,
      isProduction: true,
    })
    vi.mocked(isPlatform).mockImplementation((...platforms) => platforms.includes('ios'))

    const result = latest(mountProbe().read)

    expect(result.platform).toBe('ios')
    expect(result.isNative).toBe(true)
    expect(result.isMobile).toBe(true)
    expect(result.isWeb).toBe(false)
    expect(result.isProduction).toBe(true)
    expect(result.isPlatform('ios')).toBe(true)
    expect(result.isPlatform('web')).toBe(false)
  })

  it('returns correct values for desktop platform', () => {
    vi.mocked(platform).mockReturnValue({
      ...mockPlatformInfo,
      platform: 'electron',
      isNative: true,
      isDesktop: true,
      isWeb: false,
    })

    const result = latest(mountProbe().read)

    expect(result.platform).toBe('electron')
    expect(result.isNative).toBe(true)
    expect(result.isDesktop).toBe(true)
    expect(result.isWeb).toBe(false)
  })
})
