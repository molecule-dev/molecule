/**
 * Unit tests for `reactInitials` — the React-parity initials helper in
 * `../initials.js`, shared by `Avatar`, `SidebarUserCard` and the
 * `UserMenuPopover` family.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/initials.test.ts` onto the
 * Svelte package's React-parity helper (`getInitials` in `../utilities.js`
 * keeps its historical split-on-spaces behavior; `reactInitials` is the
 * counterpart of React's `getInitials`).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { reactInitials } from '../initials.js'

describe('getInitials', () => {
  it('returns "?" for empty / nullish input', () => {
    expect(reactInitials(null)).toBe('?')
    expect(reactInitials(undefined)).toBe('?')
    expect(reactInitials('')).toBe('?')
    expect(reactInitials('   ')).toBe('?')
  })

  it('takes first + last initial of a multi-word name', () => {
    expect(reactInitials('Ada Lovelace')).toBe('AL')
    expect(reactInitials('grace brewster hopper')).toBe('GH')
  })

  it('uppercases and caps at two characters', () => {
    expect(reactInitials('alan turing')).toBe('AT')
    expect(reactInitials('a b c d')).toBe('AD')
  })

  it('uses a single initial for a one-word name', () => {
    expect(reactInitials('Madonna')).toBe('M')
  })

  it('derives initials from the local part of an email', () => {
    expect(reactInitials('ada@example.com')).toBe('A')
    expect(reactInitials('ada.lovelace@example.com')).toBe('AL')
  })

  it('splits on whitespace, dots, underscores, and hyphens', () => {
    expect(reactInitials('jean-luc picard')).toBe('JP')
    expect(reactInitials('ada_lovelace')).toBe('AL')
    expect(reactInitials('ada.b.lovelace')).toBe('AL')
  })
})
