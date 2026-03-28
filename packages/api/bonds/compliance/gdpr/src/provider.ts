/**
 * GDPR implementation of `ComplianceProvider`.
 *
 * Provides in-memory storage for consent records, processing logs, and
 * user data export/deletion. Supports configurable data collectors for
 * integrating with external data sources, legal obligation retention,
 * and data category filtering.
 *
 * @module
 */

import type {
  ComplianceProvider,
  ConsentEntry,
  ConsentRecord,
  ConsentUpdate,
  DataCategory,
  DeletionOptions,
  DeletionResult,
  DeletionStatus,
  ExportFormat,
  ProcessingLogEntry,
  UserDataExport,
} from '@molecule/api-compliance'

import type { GdprConfig } from './types.js'

/** All supported data categories. */
const ALL_CATEGORIES: DataCategory[] = [
  'profile',
  'activity',
  'preferences',
  'communications',
  'billing',
  'analytics',
  'content',
  'authentication',
]

/** Default categories retained for legal obligations. */
const DEFAULT_LEGAL_OBLIGATION_CATEGORIES: DataCategory[] = ['billing']

/** Generates a unique identifier. */
const generateId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Creates a GDPR compliance provider.
 *
 * @param config - Provider configuration.
 * @returns A `ComplianceProvider` implementing GDPR compliance operations.
 */
export const createProvider = (config: GdprConfig = {}): ComplianceProvider => {
  const {
    categories = ALL_CATEGORIES,
    legalObligationCategories = DEFAULT_LEGAL_OBLIGATION_CATEGORIES,
    defaultLegalBasis = 'consent',
    dataCollectors = [],
  } = config

  /** In-memory consent records keyed by userId. */
  const consentStore = new Map<string, ConsentEntry[]>()

  /** In-memory processing log keyed by userId. */
  const processingLogStore = new Map<string, ProcessingLogEntry[]>()

  /** Tracks deletion requests keyed by userId. */
  const deletionStore = new Map<string, DeletionResult>()

  /**
   * Records a processing activity in the log.
   */
  const recordProcessing = (userId: string, activity: string, category: DataCategory): void => {
    const entries = processingLogStore.get(userId) ?? []
    entries.push({
      id: generateId(),
      userId,
      activity,
      category,
      legalBasis: defaultLegalBasis,
      processor: 'gdpr-compliance-provider',
      timestamp: new Date(),
    })
    processingLogStore.set(userId, entries)
  }

  /**
   * Collects user data from registered data collectors.
   */
  const collectUserData = async (
    userId: string,
    targetCategories: DataCategory[],
  ): Promise<Record<string, unknown>> => {
    const data: Record<string, unknown> = {}

    for (const collector of dataCollectors) {
      if (targetCategories.includes(collector.category)) {
        data[collector.category] = await collector.collect(userId)
      }
    }

    return data
  }

  const provider: ComplianceProvider = {
    async exportUserData(userId: string, format: ExportFormat = 'json'): Promise<UserDataExport> {
      const targetCategories = categories.filter((c) => ALL_CATEGORIES.includes(c))
      const data = await collectUserData(userId, targetCategories)

      const consents = consentStore.get(userId)
      if (consents) {
        data['consents'] = consents
      }

      recordProcessing(userId, 'data_export', 'profile')

      return {
        userId,
        exportedAt: new Date(),
        format,
        data,
        categories: targetCategories,
      }
    },

    async deleteUserData(userId: string, options?: DeletionOptions): Promise<DeletionResult> {
      const requestedCategories = options?.categories ?? [...categories]
      const retainLegal = options?.retainLegalObligations ?? true

      const deletedCategories: DataCategory[] = []
      const retainedCategories: DataCategory[] = []

      for (const category of requestedCategories) {
        if (retainLegal && legalObligationCategories.includes(category)) {
          retainedCategories.push(category)
        } else {
          deletedCategories.push(category)
        }
      }

      let status: DeletionStatus = 'completed'
      if (deletedCategories.length === 0 && retainedCategories.length > 0) {
        status = 'partial'
      }

      if (deletedCategories.length > 0) {
        recordProcessing(userId, 'data_deletion', deletedCategories[0])
      }

      const result: DeletionResult = {
        userId,
        status,
        deletedCategories,
        retainedCategories,
        requestedAt: new Date(),
        completedAt: new Date(),
      }

      deletionStore.set(userId, result)

      if (deletedCategories.includes('profile') || deletedCategories.includes('preferences')) {
        const consents = consentStore.get(userId)
        if (consents) {
          const retained = consents.filter(
            (c) => retainedCategories.length > 0 && c.legalBasis === 'legal_obligation',
          )
          if (retained.length > 0) {
            consentStore.set(userId, retained)
          } else {
            consentStore.delete(userId)
          }
        }
      }

      return result
    },

    async getConsent(userId: string): Promise<ConsentRecord> {
      const consents = consentStore.get(userId) ?? []

      return {
        userId,
        consents,
        updatedAt:
          consents.length > 0
            ? consents.reduce(
                (latest, c) => (c.updatedAt > latest ? c.updatedAt : latest),
                consents[0].updatedAt,
              )
            : new Date(),
      }
    },

    async setConsent(userId: string, consent: ConsentUpdate): Promise<void> {
      const consents = consentStore.get(userId) ?? []
      const existingIndex = consents.findIndex((c) => c.purpose === consent.purpose)

      const entry: ConsentEntry = {
        purpose: consent.purpose,
        granted: consent.granted,
        updatedAt: new Date(),
        legalBasis: consent.legalBasis,
      }

      if (existingIndex >= 0) {
        consents[existingIndex] = entry
      } else {
        consents.push(entry)
      }

      consentStore.set(userId, consents)

      recordProcessing(
        userId,
        consent.granted ? 'consent_granted' : 'consent_revoked',
        'preferences',
      )
    },

    async getDataProcessingLog(userId: string): Promise<ProcessingLogEntry[]> {
      return processingLogStore.get(userId) ?? []
    },
  }

  return provider
}

/** Lazily-initialized default provider instance. */
let _provider: ComplianceProvider | null = null

/**
 * Default GDPR compliance provider instance.
 *
 * Lazily initializes on first property access with default configuration.
 */
export const provider: ComplianceProvider = new Proxy({} as ComplianceProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
