/**
 * Unit tests for `getInitials` — the avatar-fallback initials helper
 * extracted to `utilities/initials.ts` and shared by `SidebarUserCard`
 * and the `UserMenuPopover` family.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { getInitials } from '../utilities/initials.js'

describe('getInitials', () => {
  it('returns "?" for empty / nullish input', () => {
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('takes first + last initial of a multi-word name', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL')
    expect(getInitials('grace brewster hopper')).toBe('GH')
  })

  it('uppercases and caps at two characters', () => {
    expect(getInitials('alan turing')).toBe('AT')
    expect(getInitials('a b c d')).toBe('AD')
  })

  it('uses a single initial for a one-word name', () => {
    expect(getInitials('Madonna')).toBe('M')
  })

  it('derives initials from the local part of an email', () => {
    expect(getInitials('ada@example.com')).toBe('A')
    expect(getInitials('ada.lovelace@example.com')).toBe('AL')
  })

  it('splits on whitespace, dots, underscores, and hyphens', () => {
    expect(getInitials('jean-luc picard')).toBe('JP')
    expect(getInitials('ada_lovelace')).toBe('AL')
    expect(getInitials('ada.b.lovelace')).toBe('AL')
  })
})
