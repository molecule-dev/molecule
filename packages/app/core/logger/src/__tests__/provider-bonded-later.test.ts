/**
 * A logger obtained before a provider is bonded (a module-level
 * `const logger = getLogger('x')`, which runs at import time, before the app's
 * composition root bonds its provider) logs through the provider bonded later,
 * and through a provider swapped in after that.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { unbond } from '@molecule/app-bond'

import type { Logger, LoggerConfig, LoggerProvider, LogLevel } from '../index.js'
import { createLogger, getLogger, setProvider } from '../index.js'

/** One recorded log call: which provider, which logger, which level, which message. */
interface Call {
  provider: string
  logger: string
  level: LogLevel | 'setLevel'
  message: string
}

/**
 * A provider that records every call it receives under its own label.
 *
 * @param label - Names the provider in the recorded calls.
 * @param calls - Receives the calls.
 * @returns The provider and how many loggers it created.
 */
function recordingProvider(
  label: string,
  calls: Call[],
): { provider: LoggerProvider; created: string[] } {
  const created: string[] = []
  let level: LogLevel = 'info'
  const make = (name: string): Logger => {
    const log =
      (lvl: LogLevel) =>
      (message: string | Error): void => {
        calls.push({ provider: label, logger: name, level: lvl, message: String(message) })
      }
    return {
      trace: log('trace'),
      debug: log('debug'),
      info: log('info'),
      warn: log('warn'),
      error: log('error'),
      setLevel: (next) => {
        level = next
        calls.push({ provider: label, logger: name, level: 'setLevel', message: next })
      },
      getLevel: () => level,
      child: (child) => make(`${name}:${child}`),
      withContext: () => make(`${name}+context`),
      addTransport: () => () => undefined,
      removeTransport: () => undefined,
    }
  }
  const provider: LoggerProvider = {
    getLogger: (name) => make(name ?? 'root'),
    createLogger: (nameOrConfig: string | LoggerConfig) => {
      const name =
        typeof nameOrConfig === 'string' ? nameOrConfig : (nameOrConfig.name ?? 'default')
      created.push(name)
      return make(name)
    },
    setLevel: (next) => {
      level = next
    },
    getLevel: () => level,
    addTransport: () => () => undefined,
    enable: () => undefined,
    disable: () => undefined,
    isEnabled: () => true,
  }
  return { provider, created }
}

afterEach(() => {
  unbond('app-logger')
})

describe('a logger obtained before its provider is bonded', () => {
  it('logs through the provider bonded after it was obtained', () => {
    const calls: Call[] = []
    const logger = getLogger('chat-panel')
    setProvider(recordingProvider('app', calls).provider)
    logger.warn('settings load failed')
    expect(calls).toEqual([
      { provider: 'app', logger: 'chat-panel', level: 'warn', message: 'settings load failed' },
    ])
  })

  it('follows a provider swapped in later', () => {
    const calls: Call[] = []
    const logger = getLogger('chat-panel')
    setProvider(recordingProvider('first', calls).provider)
    logger.info('one')
    setProvider(recordingProvider('second', calls).provider)
    logger.info('two')
    expect(calls.map((c) => `${c.provider}:${c.message}`)).toEqual(['first:one', 'second:two'])
  })

  it('returns the same logger for the same name', () => {
    expect(getLogger('chat-panel')).toBe(getLogger('chat-panel'))
    expect(getLogger()).toBe(getLogger())
    expect(getLogger('chat-panel')).not.toBe(getLogger('editor'))
  })

  it('routes child and context loggers to the provider bonded later', () => {
    const calls: Call[] = []
    const child = getLogger('ide').child('chat')
    const scoped = getLogger('ide').withContext({ projectId: 'p1' })
    setProvider(recordingProvider('app', calls).provider)
    child.error('boom')
    scoped.debug('context')
    expect(calls.map((c) => `${c.provider}/${c.logger}/${c.level}`)).toEqual([
      'app/ide:chat/error',
      'app/ide+context/debug',
    ])
  })

  it('sets the level on the provider bonded when it is called', () => {
    const calls: Call[] = []
    const logger = getLogger('ide')
    setProvider(recordingProvider('app', calls).provider)
    logger.setLevel('debug')
    expect(calls).toEqual([{ provider: 'app', logger: 'ide', level: 'setLevel', message: 'debug' }])
    expect(logger.getLevel()).toBe('debug')
  })
})

describe('a logger created before its provider is bonded', () => {
  it('is created on the provider bonded when it first logs, once per provider', () => {
    const calls: Call[] = []
    const logger = createLogger('uploads')
    const first = recordingProvider('first', calls)
    setProvider(first.provider)
    logger.info('a')
    logger.info('b')
    const second = recordingProvider('second', calls)
    setProvider(second.provider)
    logger.info('c')
    expect(first.created).toEqual(['uploads'])
    expect(second.created).toEqual(['uploads'])
    expect(calls.map((c) => `${c.provider}:${c.logger}:${c.message}`)).toEqual([
      'first:uploads:a',
      'first:uploads:b',
      'second:uploads:c',
    ])
  })

  it('still redacts credentials through a bonded custom provider', () => {
    const calls: Call[] = []
    const logger = getLogger('auth')
    setProvider(recordingProvider('app', calls).provider)
    logger.warn('password=bonded-later-secret&flag')
    expect(calls).toHaveLength(1)
    expect(calls[0].message).not.toContain('bonded-later-secret')
  })
})
