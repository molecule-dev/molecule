import { describe, expect, it } from 'vitest'

import { getCustomEventCardFactory, registerCustomEventCard } from '../customEventCards.js'

describe('customEventCards registry', () => {
  it('returns undefined for an unregistered event name', () => {
    expect(getCustomEventCardFactory('never-registered')).toBeUndefined()
  })

  it('registers a factory and resolves it, building a card from event data', () => {
    registerCustomEventCard('test_event', (data) => ({
      text: String(data?.message ?? ''),
      action: { label: 'Go', href: '/x' },
    }))
    const factory = getCustomEventCardFactory('test_event')
    expect(factory).toBeDefined()
    expect(factory!({ message: 'hello' })).toEqual({
      text: 'hello',
      action: { label: 'Go', href: '/x' },
    })
  })

  it('lets a factory return null to render nothing', () => {
    registerCustomEventCard('test_null', () => null)
    expect(getCustomEventCardFactory('test_null')!(undefined)).toBeNull()
  })

  it('overwrites a previously-registered factory for the same name', () => {
    registerCustomEventCard('test_overwrite', () => ({ text: 'first' }))
    registerCustomEventCard('test_overwrite', () => ({ text: 'second' }))
    expect(getCustomEventCardFactory('test_overwrite')!(undefined)).toEqual({ text: 'second' })
  })

  // The app-specific `upgrade_prompt` + `guest_reminder` notices were removed from
  // the core ai-chat union and ChatPanel; a consuming app (e.g. molecule.dev) now
  // delivers them through THIS registry, supplying its own routes/copy. These tests
  // exercise the registry handling those moved events end-to-end.
  describe('moved app-specific events (upgrade_prompt / guest_reminder)', () => {
    it("handles an app's 'upgrade_prompt' event — single host-supplied CTA from data", () => {
      // App owns the route + label; the package only stores what the factory returns.
      registerCustomEventCard('upgrade_prompt', (data) => ({
        text: String(data?.message ?? ''),
        action: { label: 'Upgrade', href: '/pricing' },
      }))
      const card = getCustomEventCardFactory('upgrade_prompt')!({
        feature: 'maxToolLoops',
        message: 'Raising max loops requires a paid plan.',
      })
      expect(card).toEqual({
        text: 'Raising max loops requires a paid plan.',
        action: { label: 'Upgrade', href: '/pricing' },
      })
    })

    it("handles an app's 'guest_reminder' event — action array + emphasized box", () => {
      registerCustomEventCard('guest_reminder', (data) => ({
        text: String(data?.message ?? ''),
        action: [
          { label: 'Sign up', href: '/signup' },
          { label: 'Log in', href: '/login' },
        ],
        emphasized: true,
      }))
      const card = getCustomEventCardFactory('guest_reminder')!({
        message: 'Sign up to keep your work.',
        expiresInHours: 72,
      })
      expect(card?.emphasized).toBe(true)
      expect(Array.isArray(card?.action)).toBe(true)
      expect(card?.action).toEqual([
        { label: 'Sign up', href: '/signup' },
        { label: 'Log in', href: '/login' },
      ])
    })

    it('lets a guest_reminder factory render nothing (e.g. during discovery)', () => {
      registerCustomEventCard('guest_reminder', () => null)
      expect(getCustomEventCardFactory('guest_reminder')!({ message: 'x' })).toBeNull()
    })
  })
})
