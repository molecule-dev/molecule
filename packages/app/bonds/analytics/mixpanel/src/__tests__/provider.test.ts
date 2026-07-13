/**
 * Tests for Mixpanel app analytics provider.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockInit, mockIdentify, mockTrack, mockPeopleSet, mockSetGroup, mockGetGroup, mockReset } =
  vi.hoisted(() => ({
    mockInit: vi.fn(),
    mockIdentify: vi.fn(),
    mockTrack: vi.fn(),
    mockPeopleSet: vi.fn(),
    mockSetGroup: vi.fn(),
    mockGetGroup: vi.fn().mockReturnValue({ set: vi.fn() }),
    mockReset: vi.fn(),
  }))

vi.mock('mixpanel-browser', () => ({
  default: {
    init: mockInit,
    identify: mockIdentify,
    track: mockTrack,
    people: { set: mockPeopleSet },
    set_group: mockSetGroup,
    get_group: mockGetGroup,
    reset: mockReset,
  },
}))

import { createProvider, provider } from '../provider.js'

describe('Mixpanel app analytics provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProvider', () => {
    it('should initialize Mixpanel with token', () => {
      createProvider({ token: 'mp_test', debug: true })
      expect(mockInit).toHaveBeenCalledWith('mp_test', {
        debug: true,
        track_pageview: false,
      })
    })

    it('should NOT initialize the SDK without a token — warns once and no-ops instead', async () => {
      // mixpanel-browser accepts init('') in total silence and then every
      // event vanishes server-side. The provider must degrade gracefully with
      // an actionable breadcrumb instead.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const p = createProvider()
        expect(mockInit).not.toHaveBeenCalled()
        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_MIXPANEL_TOKEN'))
        // All calls resolve (analytics must never break the UI) and never touch the SDK.
        await expect(p.track({ name: 'x' })).resolves.toBeUndefined()
        await expect(p.identify({ userId: 'u1' })).resolves.toBeUndefined()
        await expect(p.page({ path: '/' })).resolves.toBeUndefined()
        expect(mockTrack).not.toHaveBeenCalled()
        expect(mockIdentify).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })
  })

  describe('provider methods', () => {
    let p: ReturnType<typeof createProvider>

    beforeEach(() => {
      p = createProvider({ token: 'mp_test' })
    })

    it('identify should call mixpanel.identify and people.set', async () => {
      await p.identify({ userId: 'u1', email: 'a@b.com', name: 'User' })
      expect(mockIdentify).toHaveBeenCalledWith('u1')
      expect(mockPeopleSet).toHaveBeenCalledWith({
        $email: 'a@b.com',
        $name: 'User',
      })
    })

    it('identify should include traits', async () => {
      await p.identify({ userId: 'u1', traits: { plan: 'pro' } })
      expect(mockPeopleSet).toHaveBeenCalledWith({
        $email: undefined,
        $name: undefined,
        plan: 'pro',
      })
    })

    it('track should call mixpanel.track', async () => {
      await p.track({ name: 'btn.click', properties: { label: 'submit' } })
      expect(mockTrack).toHaveBeenCalledWith('btn.click', { label: 'submit' })
    })

    it('page should track a Page View event', async () => {
      await p.page({ path: '/home', name: 'Home' })
      expect(mockTrack).toHaveBeenCalledWith('Page View', {
        page_name: 'Home',
        page_category: undefined,
        page_url: undefined,
        page_path: '/home',
        page_referrer: undefined,
      })
    })

    it('group should call set_group', async () => {
      await p.group!('org-1', { name: 'Acme' })
      expect(mockSetGroup).toHaveBeenCalledWith('company', 'org-1')
      expect(mockGetGroup).toHaveBeenCalledWith('company', 'org-1')
    })

    it('reset should call mixpanel.reset', async () => {
      await p.reset!()
      expect(mockReset).toHaveBeenCalled()
    })

    it('flush should resolve without error', async () => {
      await expect(p.flush!()).resolves.toBeUndefined()
    })
  })

  describe('lazy provider', () => {
    it('should export a provider object', () => {
      expect(provider).toBeDefined()
    })
  })
})
