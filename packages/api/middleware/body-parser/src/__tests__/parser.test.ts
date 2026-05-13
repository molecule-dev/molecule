const { mockBond, mockGet, mockIsBonded } = vi.hoisted(() => ({
  mockBond: vi.fn(),
  mockGet: vi.fn(),
  mockIsBonded: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  bond: mockBond,
  get: mockGet,
  isBonded: mockIsBonded,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bodyParser,
  createJsonParser,
  getBodyParser,
  getJsonParserFactory,
  hasBodyParser,
  setBodyParser,
  setJsonParserFactory,
} from '../parser.js'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('setBodyParser / getBodyParser', () => {
  it('setBodyParser bonds with the body-parser type', () => {
    const mw = vi.fn()
    setBodyParser(mw)
    expect(mockBond).toHaveBeenCalledWith('middleware:body-parser', mw)
  })

  it('getBodyParser returns the bonded middleware', () => {
    const mw = vi.fn()
    mockGet.mockReturnValue(mw)
    expect(getBodyParser()).toBe(mw)
  })

  it('getBodyParser throws when none bonded', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => getBodyParser()).toThrow(/No body parser implementation has been bonded/)
  })
})

describe('hasBodyParser', () => {
  it('true when bonded', () => {
    mockIsBonded.mockReturnValue(true)
    expect(hasBodyParser()).toBe(true)
    expect(mockIsBonded).toHaveBeenCalledWith('middleware:body-parser')
  })

  it('false when not bonded', () => {
    mockIsBonded.mockReturnValue(false)
    expect(hasBodyParser()).toBe(false)
  })
})

describe('default bodyParser delegates', () => {
  it('passes req/res/next to the bonded parser', () => {
    const bonded = vi.fn()
    mockGet.mockReturnValue(bonded)
    const req = { body: 'x' }
    const res = {}
    const next = vi.fn()
    bodyParser(req, res, next)
    expect(bonded).toHaveBeenCalledWith(req, res, next)
  })

  it('lazy: throws on invocation, not at module load', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => bodyParser({}, {}, vi.fn())).toThrow(/No body parser/)
  })
})

describe('setJsonParserFactory / getJsonParserFactory', () => {
  it('setJsonParserFactory bonds with the json-factory type', () => {
    const factory = vi.fn()
    setJsonParserFactory(factory)
    expect(mockBond).toHaveBeenCalledWith('middleware:body-parser:json-factory', factory)
  })

  it('getJsonParserFactory returns null when none bonded (lenient — unlike getBodyParser)', () => {
    mockGet.mockReturnValue(undefined)
    expect(getJsonParserFactory()).toBeNull()
  })

  it('getJsonParserFactory returns the bonded factory', () => {
    const factory = vi.fn()
    mockGet.mockReturnValue(factory)
    expect(getJsonParserFactory()).toBe(factory)
  })
})

describe('createJsonParser', () => {
  it('throws when no factory bonded', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => createJsonParser()).toThrow(/No JSON parser factory has been bonded/)
  })

  it('passes options through to the factory', () => {
    const mw = vi.fn()
    const factory = vi.fn().mockReturnValue(mw)
    mockGet.mockReturnValue(factory)
    const out = createJsonParser({ limit: '1mb', strict: true })
    expect(factory).toHaveBeenCalledWith({ limit: '1mb', strict: true })
    expect(out).toBe(mw)
  })

  it('supports no-options invocation (factory receives undefined)', () => {
    const factory = vi.fn().mockReturnValue(vi.fn())
    mockGet.mockReturnValue(factory)
    createJsonParser()
    expect(factory).toHaveBeenCalledWith(undefined)
  })
})
