/** Create and validate the SQLite-backed file-store provider. */
import { homedir } from 'node:os'
import { join } from 'node:path'

import type {
  ParacrineAgentId,
  ParacrineMessage,
  ParacrinePurgeOptions,
  ParacrineQuery,
  ParacrineRead,
  ParacrineSendInput,
} from '@molecule/api-paracrine'
import { PARACRINE_BROADCAST } from '@molecule/api-paracrine'

import { ParacrineDatabase } from './database.js'
import type {
  ParacrineFileClaimedPending,
  ParacrineFileClaimOptions,
  ParacrineFileClaimReference,
  ParacrineFileProvider,
} from './types.js'
import { assertAgentId, assertMessageId } from './validation.js'

/** Configuration for the file store. */
export interface ParacrineFileConfig {
  /** The root directory; defaults to `PARACRINE_DIR` or `~/.agents/paracrine`. */
  rootDir?: string
}

/** Resolve the store root: explicit config → env → `~/.agents/paracrine`. */
const resolveRoot = (config: ParacrineFileConfig): string =>
  config.rootDir ?? process.env.PARACRINE_DIR ?? join(homedir(), '.agents', 'paracrine')

/** Create the transactional paracrine store. */
export function createProvider(config: ParacrineFileConfig = {}): ParacrineFileProvider {
  const root = resolveRoot(config)
  const database = new ParacrineDatabase(root)
  try {
    database.importLegacy()
  } catch (error) {
    database.close()
    throw error
  }
  const registered = (recipient: ParacrineAgentId): void => database.register(recipient)

  return {
    name: 'file',

    async send(input: ParacrineSendInput): Promise<ParacrineMessage> {
      assertAgentId(input.from, 'sender')
      if (input.to !== PARACRINE_BROADCAST) assertAgentId(input.to, 'recipient')
      return database.send(input)
    },

    async pending(recipient: ParacrineAgentId): Promise<string[]> {
      assertAgentId(recipient, 'mailbox')
      registered(recipient)
      return database.pending(recipient)
    },

    async receive(query: ParacrineQuery): Promise<ParacrineMessage[]> {
      assertAgentId(query.for, 'mailbox')
      if (query.since !== undefined && Number.isNaN(Date.parse(query.since))) {
        throw new Error(`Invalid paracrine 'since' instant: ${JSON.stringify(query.since)}`)
      }
      registered(query.for)
      return database.receive(query)
    },

    async ack(messageId: string, by: ParacrineAgentId): Promise<void> {
      assertAgentId(by, 'reader')
      assertMessageId(messageId)
      database.acknowledge(messageId, by)
    },

    async reads(messageId: string): Promise<ParacrineRead[]> {
      assertMessageId(messageId)
      return database.reads(messageId)
    },

    async purge(options: ParacrinePurgeOptions): Promise<number> {
      if (Number.isNaN(Date.parse(options.before))) {
        throw new Error(
          `Invalid paracrine purge 'before' instant: ${JSON.stringify(options.before)}`,
        )
      }
      return database.purge(options)
    },

    async claimPending(
      recipient: ParacrineAgentId,
      options: ParacrineFileClaimOptions = {},
    ): Promise<ParacrineFileClaimedPending> {
      assertAgentId(recipient, 'mailbox')
      if (options.since !== undefined && Number.isNaN(Date.parse(options.since))) {
        throw new Error('Invalid paracrine since instant')
      }
      registered(recipient)
      const limit =
        options.limit === undefined || !Number.isFinite(options.limit) ? 5 : options.limit
      const leaseMs =
        options.leaseMs === undefined || !Number.isFinite(options.leaseMs) || options.leaseMs < 0
          ? 30_000
          : options.leaseMs
      return database.claimPending(recipient, { ...options, limit, leaseMs })
    },

    async acknowledgeClaims(
      claims: ParacrineFileClaimReference[],
      by: ParacrineAgentId,
    ): Promise<void> {
      assertAgentId(by, 'reader')
      for (const claim of claims) {
        assertMessageId(claim.messageId)
        assertAgentId(claim.recipientId, 'mailbox')
      }
      database.acknowledgeClaims(claims, by)
    },

    async releaseClaims(claims: ParacrineFileClaimReference[]): Promise<void> {
      for (const claim of claims) {
        assertMessageId(claim.messageId)
        assertAgentId(claim.recipientId, 'mailbox')
      }
      database.releaseClaims(claims)
    },

    close(): void {
      database.close()
    },
  }
}
