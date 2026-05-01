import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { DrugDatabaseProvider, DrugDetail, DrugInteraction, DrugMatch } from '../types.js'

// Reset module state between tests so the bond registry is not
// contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let searchDrug: typeof ProviderModule.searchDrug
let getDrug: typeof ProviderModule.getDrug
let checkInteractions: typeof ProviderModule.checkInteractions
let getNDCs: typeof ProviderModule.getNDCs

const buildProvider = (overrides: Partial<DrugDatabaseProvider> = {}): DrugDatabaseProvider => ({
  searchDrug: vi.fn(),
  getDrug: vi.fn(),
  checkInteractions: vi.fn(),
  getNDCs: vi.fn(),
  ...overrides,
})

const buildMatch = (overrides: Partial<DrugMatch> = {}): DrugMatch => ({
  id: '860975',
  name: 'metformin hydrochloride 500 MG Oral Tablet',
  genericName: 'metformin hydrochloride',
  brandName: null,
  source: 'rxnorm',
  ...overrides,
})

const buildDetail = (overrides: Partial<DrugDetail> = {}): DrugDetail => ({
  id: '860975',
  name: 'metformin hydrochloride 500 MG Oral Tablet',
  genericName: 'metformin hydrochloride',
  brandName: null,
  dosageForms: ['Oral Tablet'],
  ingredients: [{ id: '6809', name: 'metformin', strength: '500 mg' }],
  source: 'rxnorm',
  ...overrides,
})

const buildInteraction = (overrides: Partial<DrugInteraction> = {}): DrugInteraction => ({
  drugIds: ['11289', '1191'],
  severity: 'high',
  description: 'Concurrent use of warfarin and aspirin may increase the risk of bleeding.',
  sources: ['DrugBank'],
  ...overrides,
})

describe('drug-database provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    searchDrug = providerModule.searchDrug
    getDrug = providerModule.getDrug
    checkInteractions = providerModule.checkInteractions
    getNDCs = providerModule.getNDCs
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Drug-database provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('searchDrug', () => {
    it('should throw when no provider is set', async () => {
      await expect(searchDrug('metformin')).rejects.toThrow('Drug-database provider not configured')
    })

    it('should call provider searchDrug and return matches', async () => {
      const match = buildMatch()
      const mockSearch = vi.fn().mockResolvedValue([match])
      setProvider(buildProvider({ searchDrug: mockSearch }))

      const result = await searchDrug('metformin')

      expect(mockSearch).toHaveBeenCalledWith('metformin')
      expect(result).toEqual([match])
    })

    it('should pass an empty array through unchanged', async () => {
      const mockSearch = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ searchDrug: mockSearch }))

      const result = await searchDrug('zzzz-no-match')

      expect(result).toEqual([])
    })
  })

  describe('getDrug', () => {
    it('should throw when no provider is set', async () => {
      await expect(getDrug('860975')).rejects.toThrow('Drug-database provider not configured')
    })

    it('should call provider getDrug and return the detail', async () => {
      const detail = buildDetail()
      const mockGet = vi.fn().mockResolvedValue(detail)
      setProvider(buildProvider({ getDrug: mockGet }))

      const result = await getDrug('860975')

      expect(mockGet).toHaveBeenCalledWith('860975')
      expect(result).toBe(detail)
    })

    it('should pass through null when the id is unknown', async () => {
      const mockGet = vi.fn().mockResolvedValue(null)
      setProvider(buildProvider({ getDrug: mockGet }))

      const result = await getDrug('does-not-exist')

      expect(result).toBeNull()
    })
  })

  describe('checkInteractions', () => {
    it('should throw when no provider is set', async () => {
      await expect(checkInteractions(['11289', '1191'])).rejects.toThrow(
        'Drug-database provider not configured',
      )
    })

    it('should call provider checkInteractions and return interactions', async () => {
      const interaction = buildInteraction()
      const mockCheck = vi.fn().mockResolvedValue([interaction])
      setProvider(buildProvider({ checkInteractions: mockCheck }))

      const result = await checkInteractions(['11289', '1191'])

      expect(mockCheck).toHaveBeenCalledWith(['11289', '1191'])
      expect(result).toEqual([interaction])
    })

    it('should pass an empty array through unchanged (deprecation fallback)', async () => {
      const mockCheck = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ checkInteractions: mockCheck }))

      const result = await checkInteractions(['11289', '1191'])

      expect(result).toEqual([])
    })
  })

  describe('getNDCs', () => {
    it('should throw when no provider is set', async () => {
      await expect(getNDCs('860975')).rejects.toThrow('Drug-database provider not configured')
    })

    it('should call provider getNDCs and return the NDC list', async () => {
      const mockGetNdcs = vi.fn().mockResolvedValue(['00093-1074-01', '00093-1074-10'])
      setProvider(buildProvider({ getNDCs: mockGetNdcs }))

      const result = await getNDCs('860975')

      expect(mockGetNdcs).toHaveBeenCalledWith('860975')
      expect(result).toEqual(['00093-1074-01', '00093-1074-10'])
    })

    it('should pass an empty array through unchanged', async () => {
      const mockGetNdcs = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ getNDCs: mockGetNdcs }))

      const result = await getNDCs('860975')

      expect(result).toEqual([])
    })
  })
})

describe('drug-database types', () => {
  it('should accept a minimal DrugDatabaseProvider implementation', () => {
    const provider: DrugDatabaseProvider = {
      searchDrug: async () => [],
      getDrug: async () => null,
      checkInteractions: async () => [],
      getNDCs: async () => [],
    }
    expect(typeof provider.searchDrug).toBe('function')
    expect(typeof provider.getDrug).toBe('function')
    expect(typeof provider.checkInteractions).toBe('function')
    expect(typeof provider.getNDCs).toBe('function')
  })

  it('should accept a fully-populated DrugDetail value', () => {
    const detail: DrugDetail = buildDetail({
      brandName: 'Glucophage',
      dosageForms: ['Oral Tablet', 'Oral Solution'],
      ingredients: [
        { id: '6809', name: 'metformin', strength: '500 mg' },
        { id: null, name: 'magnesium stearate', strength: null },
      ],
    })
    expect(detail.brandName).toBe('Glucophage')
    expect(detail.dosageForms).toHaveLength(2)
    expect(detail.ingredients[1]?.id).toBeNull()
  })

  it('should accept a fully-populated DrugInteraction value', () => {
    const interaction: DrugInteraction = buildInteraction({
      severity: 'moderate',
      sources: ['DrugBank', 'ONCHigh'],
    })
    expect(interaction.severity).toBe('moderate')
    expect(interaction.sources).toHaveLength(2)
    expect(interaction.drugIds.length).toBeGreaterThanOrEqual(2)
  })
})
