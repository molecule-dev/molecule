import { beforeEach, describe, expect, it, vi } from 'vitest'

import { consoleLogger, provider } from '../provider.js'

describe('@molecule/api-logger-console', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should export provider and consoleLogger as the same object', () => {
    expect(provider).toBe(consoleLogger)
  })

  it('should have all log methods', () => {
    expect(typeof provider.trace).toBe('function')
    expect(typeof provider.debug).toBe('function')
    expect(typeof provider.info).toBe('function')
    expect(typeof provider.warn).toBe('function')
    expect(typeof provider.error).toBe('function')
  })

  it('should delegate trace to console.trace', () => {
    const spy = vi.spyOn(console, 'trace').mockImplementation(() => {})
    provider.trace('test message')
    expect(spy).toHaveBeenCalledWith('test message')
  })

  it('should delegate debug to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    provider.debug('debug msg')
    expect(spy).toHaveBeenCalledWith('debug msg')
  })

  it('should delegate info to console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    provider.info('info msg')
    expect(spy).toHaveBeenCalledWith('info msg')
  })

  it('should delegate warn to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    provider.warn('warn msg')
    expect(spy).toHaveBeenCalledWith('warn msg')
  })

  it('should delegate error to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    provider.error('error msg')
    expect(spy).toHaveBeenCalledWith('error msg')
  })

  it('should pass multiple arguments', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    provider.info('msg', { data: 1 }, 42)
    expect(spy).toHaveBeenCalledWith('msg', { data: 1 }, 42)
  })
})
