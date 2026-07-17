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

/**
 * Generates a unique identifier.
 *
 * @returns A short random identifier suitable for in-memory records.
 */
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
   *
   * @param userId - Subject user identifier.
   * @param activity - Human-readable processing action label.
   * @param category - Data category impacted by the activity.
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
   *
   * @param userId - Subject user identifier.
   * @param targetCategories - Categories the export should include.
   * @returns Aggregated payloads keyed by category name.
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

      // Categories whose data was actually erased (a delete hook ran).
      const deletedCategories: DataCategory[] = []
      // Categories deliberately kept for a legal obligation.
      const retainedCategories: DataCategory[] = []
      // Categories the caller asked to erase but that have no delete-capable
      // collector — nothing was erased for these, so they must NOT be reported
      // as deleted (that was the data-integrity bug this provider used to have).
      const skippedCategories: DataCategory[] = []

      for (const category of requestedCategories) {
        if (retainLegal && legalObligationCategories.includes(category)) {
          retainedCategories.push(category)
          continue
        }

        // Actually erase the category through every registered delete hook.
        // A rejection propagates out — an erasure that hit an error must never
        // resolve to a rosy result.
        let erased = false
        for (const collector of dataCollectors) {
          if (collector.category === category && collector.delete) {
            await collector.delete(userId)
            erased = true
          }
        }

        if (erased) {
          deletedCategories.push(category)
        } else {
          skippedCategories.push(category)
        }
      }

      // Report the truth: only 'completed' when everything the caller asked to
      // erase was actually erased (legal retention aside). Anything skipped
      // downgrades the status so callers/regulators are never told erasure
      // finished when it did not.
      let status: DeletionStatus
      if (deletedCategories.length === 0) {
        if (skippedCategories.length > 0) {
          status = 'failed'
        } else if (retainedCategories.length > 0) {
          status = 'partial'
        } else {
          status = 'completed'
        }
      } else if (skippedCategories.length > 0) {
        status = 'partial'
      } else {
        status = 'completed'
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
        // No completion timestamp when nothing was erased.
        completedAt: status === 'failed' ? undefined : new Date(),
      }

      deletionStore.set(userId, result)

      // Consent records are this provider's OWN in-memory data, so erase them
      // directly whenever profile/preferences erasure was requested (i.e. not
      // legally retained), regardless of the external-data outcome.
      const erasureRequested = new Set<DataCategory>([...deletedCategories, ...skippedCategories])
      if (erasureRequested.has('profile') || erasureRequested.has('preferences')) {
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.set(_provider, prop, value)
  },
})
