/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the auto-created web provider
 * in happy-dom. Only `fetch` (the deployed `/version.json`) and the page
 * reload are stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { VersionInfo, VersionState } from '../index.js'
import {
  applyUpdate,
  dismissUpdate,
  getProvider,
  getState,
  setCurrentVersion,
  startPeriodicChecks,
  stopPeriodicChecks,
} from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    stopPeriodicChecks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('detects a newer deploy, lets the user reload, and dismisses the banner', async () => {
    vi.stubEnv('VITE_BUILD_ID', 'b41')
    vi.stubEnv('VITE_APP_VERSION', '1.4.0')
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      const deployed: VersionInfo = { buildId: 'b42', version: '1.5.0' }
      return new Response(JSON.stringify(deployed), {
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as Location)

    setCurrentVersion({
      buildId: import.meta.env.VITE_BUILD_ID as string,
      version: import.meta.env.VITE_APP_VERSION as string,
    })

    let bannerVisible = false
    const seen: string[] = []
    const stopListening = getProvider().on<{ current: VersionState; new: VersionInfo }>(
      'update-available',
      (update) => {
        bannerVisible = true
        seen.push(`${update.current.version} → ${update.new.version}`)
      },
    )

    startPeriodicChecks({ immediate: true, interval: 5 * 60_000 })

    await vi.waitFor(() => expect(bannerVisible).toBe(true))
    expect(seen).toEqual(['1.4.0 → 1.5.0'])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/version.json')
    expect(getState()).toMatchObject({ isUpdateAvailable: true, newBuildId: 'b42' })

    const onReloadClick = (): void => applyUpdate()
    onReloadClick()
    expect(reload).toHaveBeenCalledTimes(1)

    const onLaterClick = (): void => {
      dismissUpdate()
      bannerVisible = false
    }
    onLaterClick()
    expect(bannerVisible).toBe(false)
    expect(getState().isUpdateAvailable).toBe(false)

    stopListening()
  })
})
