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
})
