/**
 * Tests for injection-keys.ts
 */
import { describe, expect, it } from 'vitest'

import {
  AuthKey,
  HttpKey,
  I18nKey,
  LoggerKey,
  RouterKey,
  StateKey,
  StorageKey,
  ThemeKey,
} from '../injection-keys.js'

describe('injection-keys', () => {
  it('exports StateKey as a unique Symbol', () => {
    expect(typeof StateKey).toBe('symbol')
    expect(StateKey.toString()).toBe('Symbol(molecule-state)')
  })

  it('exports AuthKey as a unique Symbol', () => {
    expect(typeof AuthKey).toBe('symbol')
    expect(AuthKey.toString()).toBe('Symbol(molecule-auth)')
  })

  it('exports ThemeKey as a unique Symbol', () => {
    expect(typeof ThemeKey).toBe('symbol')
    expect(ThemeKey.toString()).toBe('Symbol(molecule-theme)')
  })

  it('exports RouterKey as a unique Symbol', () => {
    expect(typeof RouterKey).toBe('symbol')
    expect(RouterKey.toString()).toBe('Symbol(molecule-router)')
  })

  it('exports I18nKey as a unique Symbol', () => {
    expect(typeof I18nKey).toBe('symbol')
    expect(I18nKey.toString()).toBe('Symbol(molecule-i18n)')
  })

  it('exports HttpKey as a unique Symbol', () => {
    expect(typeof HttpKey).toBe('symbol')
    expect(HttpKey.toString()).toBe('Symbol(molecule-http)')
  })

  it('exports StorageKey as a unique Symbol', () => {
    expect(typeof StorageKey).toBe('symbol')
    expect(StorageKey.toString()).toBe('Symbol(molecule-storage)')
  })

  it('exports LoggerKey as a unique Symbol', () => {
    expect(typeof LoggerKey).toBe('symbol')
    expect(LoggerKey.toString()).toBe('Symbol(molecule-logger)')
  })

  it('all keys are distinct from one another', () => {
    const keys = [StateKey, AuthKey, ThemeKey, RouterKey, I18nKey, HttpKey, StorageKey, LoggerKey]
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})
