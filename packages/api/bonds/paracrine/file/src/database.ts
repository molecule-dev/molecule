import { randomUUID } from 'node:crypto'
import { chmodSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import type {
  ParacrineAgentId,
  ParacrineMessage,
  ParacrinePurgeOptions,
  ParacrineQuery,
  ParacrineRead,
  ParacrineSendInput,
} from '@molecule/api-paracrine'
import { isParacrineAgentId, PARACRINE_BROADCAST } from '@molecule/api-paracrine'

import type {
  ParacrineFileClaim,
  ParacrineFileClaimedPending,
  ParacrineFileClaimOptions,
  ParacrineFileClaimReference,
} from './types.js'
import { legacyMessage } from './validation.js'

const MIGRATION_BATCH = 64
const DEFAULT_LEASE_MS = 30_000

interface MessageRow {
  id: string
  sender: string
  recipient: string
  subject: string | null
  body: string
  sent_at: string
  sent_ms: number
  thread_id: string | null
}

interface ClaimRow extends MessageRow {
  old_state: 'pending' | 'claimed'
  old_token: string | null
  old_claimed_at: number | null
}

interface MigrationCursor {
  phase: 'recipients' | 'messages' | 'done'
  after: string
  mailbox: string | null
  fileAfter: string
}

const INITIAL_CURSOR: MigrationCursor = {
  phase: 'recipients',
  after: '',
  mailbox: null,
  fileAfter: '',
}

const toMessage = (row: MessageRow): ParacrineMessage => ({
  id: row.id,
  from: row.sender,
  to: row.recipient === PARACRINE_BROADCAST ? PARACRINE_BROADCAST : row.recipient,
  ...(row.subject === null ? {} : { subject: row.subject }),
  body: row.body,
  sentAt: row.sent_at,
  ...(row.thread_id === null ? {} : { threadId: row.thread_id }),
})

const namesAfter = (path: string, after: string, directories: boolean): string[] => {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => (directories ? entry.isDirectory() : entry.isFile()))
      .map((entry) => entry.name)
      .filter((name) => name > after)
      .sort()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

/** Synchronous SQLite operations, wrapped by the asynchronous public provider. */
export class ParacrineDatabase {
  private readonly db: DatabaseSync
  private migrationDone = false

  constructor(private readonly root: string) {
    mkdirSync(root, { recursive: true, mode: 0o700 })
    chmodSync(root, 0o700)
    const filename = join(root, 'paracrine.sqlite')
    this.db = new DatabaseSync(filename)
    chmodSync(filename, 0o600)
    this.db.exec('PRAGMA busy_timeout = 250')
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA synchronous = FULL')
    this.db.exec('PRAGMA foreign_keys = ON')
    this.transaction(() => {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          sender TEXT NOT NULL,
          recipient TEXT NOT NULL,
          subject TEXT,
          body TEXT NOT NULL,
          sent_at TEXT NOT NULL,
          sent_ms INTEGER NOT NULL,
          thread_id TEXT
        );
        CREATE INDEX IF NOT EXISTS messages_recipient_sent
          ON messages(recipient, sent_ms, id);
        CREATE TABLE IF NOT EXISTS recipients (
          id TEXT PRIMARY KEY,
          registered_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS deliveries (
          message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          recipient TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('pending', 'claimed', 'acknowledged')),
          claim_token TEXT,
          claimed_at INTEGER,
          PRIMARY KEY(message_id, recipient)
        );
        CREATE INDEX IF NOT EXISTS deliveries_recipient_state
          ON deliveries(recipient, state, claimed_at, message_id);
        CREATE TABLE IF NOT EXISTS receipts (
          message_id TEXT NOT NULL,
          reader TEXT NOT NULL,
          at TEXT NOT NULL,
          legacy INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(message_id, reader)
        );
        CREATE TABLE IF NOT EXISTS migration (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
    })
  }

  /** Close the underlying SQLite handle. */
  close(): void {
    this.db.close()
  }

  /** Run one synchronous state change atomically. */
  private transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const value = work()
      this.db.exec('COMMIT')
      return value
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /** Read the durable legacy-import checkpoint. */
  private cursor(): MigrationCursor {
    const row = this.db.prepare("SELECT value FROM migration WHERE key = 'legacy'").get() as
      { value: string } | undefined
    return row === undefined ? { ...INITIAL_CURSOR } : (JSON.parse(row.value) as MigrationCursor)
  }

  /** Persist a checkpoint in the caller's transaction. */
  private saveCursor(cursor: MigrationCursor): void {
    this.db
      .prepare(
        "INSERT INTO migration(key, value) VALUES('legacy', ?) " +
          'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(JSON.stringify(cursor))
  }

  /** Register a recipient and backfill broadcasts in the caller's transaction. */
  private registerTransaction(recipient: ParacrineAgentId): void {
    this.db
      .prepare('INSERT OR IGNORE INTO recipients(id, registered_at) VALUES(?, ?)')
      .run(recipient, new Date().toISOString())
    this.db
      .prepare(
        `INSERT OR IGNORE INTO deliveries(message_id, recipient, state)
         SELECT id, ?, 'pending' FROM messages WHERE recipient = '*'`,
      )
      .run(recipient)
    this.db
      .prepare(
        `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
         WHERE recipient = ? AND state = 'pending' AND EXISTS (
           SELECT 1 FROM receipts r
           WHERE r.message_id = deliveries.message_id
             AND (r.reader = deliveries.recipient
               OR (r.legacy = 1 AND r.reader = deliveries.recipient || '.delivered'
                 AND EXISTS (
                   SELECT 1 FROM messages m
                   WHERE m.id = deliveries.message_id AND m.recipient = deliveries.recipient
                 )))
         )`,
      )
      .run(recipient)
  }

  /** Import one valid legacy message and its receipts idempotently. */
  private importMessage(message: ParacrineMessage): void {
    const sentMs = Date.parse(message.sentAt)
    this.db
      .prepare(
        `INSERT OR IGNORE INTO messages
           (id, sender, recipient, subject, body, sent_at, sent_ms, thread_id)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        message.id,
        message.from,
        message.to,
        message.subject ?? null,
        message.body,
        message.sentAt,
        sentMs,
        message.threadId ?? null,
      )
    if (message.to === PARACRINE_BROADCAST) {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO deliveries(message_id, recipient, state)
           SELECT ?, id, 'pending' FROM recipients`,
        )
        .run(message.id)
    } else {
      this.db
        .prepare(
          "INSERT OR IGNORE INTO deliveries(message_id, recipient, state) VALUES(?, ?, 'pending')",
        )
        .run(message.id, message.to)
    }

    const receiptDir = join(this.root, 'reads', message.id)
    for (const name of namesAfter(receiptDir, '', false)) {
      if (!name.endsWith('.json')) continue
      const reader = name.slice(0, -5)
      if (!isParacrineAgentId(reader)) continue
      let at = message.sentAt
      try {
        const parsed = JSON.parse(readFileSync(join(receiptDir, name), 'utf8')) as unknown
        if (typeof parsed === 'object' && parsed !== null && 'at' in parsed) {
          const candidate = (parsed as { at?: unknown }).at
          if (typeof candidate === 'string') at = candidate
        }
      } catch (_error) {
        // The receipt's existence, not optional legacy JSON metadata, is the ack.
      }
      this.db
        .prepare(
          'INSERT OR IGNORE INTO receipts(message_id, reader, at, legacy) VALUES(?, ?, ?, 1)',
        )
        .run(message.id, reader, at)
      this.db
        .prepare(
          `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
           WHERE message_id = ? AND recipient = ?`,
        )
        .run(message.id, reader)
      if (reader.endsWith('.delivered')) {
        const recipient = reader.slice(0, -10)
        this.db
          .prepare(
            `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
             WHERE message_id = ? AND recipient = ? AND EXISTS (
               SELECT 1 FROM messages m WHERE m.id = deliveries.message_id AND m.recipient = ?
             )`,
          )
          .run(message.id, recipient, recipient)
      }
    }
  }

  /** Import at most one bounded legacy batch and checkpoint it in the same transaction. */
  migrate(): boolean {
    if (this.migrationDone) return true
    this.transaction(() => {
      let cursor = this.cursor()
      if (cursor.phase === 'done') return

      if (cursor.phase === 'recipients') {
        const names = namesAfter(join(this.root, 'pending'), cursor.after, true).filter(
          isParacrineAgentId,
        )
        const batch = names.slice(0, MIGRATION_BATCH)
        for (const recipient of batch) this.registerTransaction(recipient)
        if (batch.length > 0) {
          this.saveCursor({ ...cursor, after: batch.at(-1) ?? cursor.after })
          return
        }
        cursor = { phase: 'messages', after: '', mailbox: null, fileAfter: '' }
      }

      // Empty directory phases do not consume a delivery attempt.
      for (let transitions = 0; transitions < 8; transitions += 1) {
        const messagesRoot = join(this.root, 'messages')
        if (cursor.mailbox === null) {
          const mailbox = namesAfter(messagesRoot, cursor.after, true).find(
            (name) => name === PARACRINE_BROADCAST || isParacrineAgentId(name),
          )
          if (mailbox === undefined) {
            this.saveCursor({ phase: 'done', after: '', mailbox: null, fileAfter: '' })
            return
          }
          cursor.mailbox = mailbox
          cursor.fileAfter = ''
        }
        const mailbox = cursor.mailbox
        const files = namesAfter(join(messagesRoot, mailbox), cursor.fileAfter, false)
          .filter((name) => name.endsWith('.json'))
          .slice(0, MIGRATION_BATCH)
        if (files.length === 0) {
          cursor = { phase: 'messages', after: mailbox, mailbox: null, fileAfter: '' }
          continue
        }
        for (const name of files) {
          let parsed: unknown
          try {
            parsed = JSON.parse(readFileSync(join(messagesRoot, mailbox, name), 'utf8'))
          } catch (_error) {
            // A corrupt legacy entry is skipped; the checkpoint still advances.
            continue
          }
          const message = legacyMessage(parsed)
          if (message !== null && message.to === mailbox) this.importMessage(message)
        }
        this.saveCursor({ ...cursor, fileAfter: files.at(-1) ?? cursor.fileAfter })
        return
      }
      this.saveCursor(cursor)
    })
    // Cache only durable progress: a failed COMMIT must be retried by this instance.
    this.migrationDone = this.cursor().phase === 'done'
    return this.migrationDone
  }

  /** Whole-history mailbox APIs finish the one-time import before reading. */
  migrateAll(): void {
    while (!this.migrate()) {
      // Each iteration commits its own resumable batch.
    }
  }

  /** Register a recipient in its own transaction. */
  register(recipient: ParacrineAgentId): void {
    this.transaction(() => this.registerTransaction(recipient))
  }

  /** Insert a message and all initial deliveries atomically. */
  send(input: ParacrineSendInput): ParacrineMessage {
    const sentMs = Date.now()
    const message: ParacrineMessage = {
      id: `${sentMs.toString(36)}-${randomUUID()}`,
      from: input.from,
      to: input.to,
      ...(input.subject === undefined ? {} : { subject: input.subject }),
      body: input.body,
      sentAt: new Date(sentMs).toISOString(),
      ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
    }
    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO messages(id, sender, recipient, subject, body, sent_at, sent_ms, thread_id)
           VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          message.id,
          message.from,
          message.to,
          message.subject ?? null,
          message.body,
          message.sentAt,
          sentMs,
          message.threadId ?? null,
        )
      if (input.to === PARACRINE_BROADCAST) {
        this.db
          .prepare(
            `INSERT INTO deliveries(message_id, recipient, state)
             SELECT ?, id, 'pending' FROM recipients`,
          )
          .run(message.id)
      } else {
        this.db
          .prepare("INSERT INTO deliveries(message_id, recipient, state) VALUES(?, ?, 'pending')")
          .run(message.id, message.to)
      }
    })
    return message
  }

  /** Read the recipient's pending ids through the delivery index. */
  pending(recipient: ParacrineAgentId): string[] {
    const rows = this.db
      .prepare(
        `SELECT message_id FROM deliveries
         WHERE recipient = ? AND state = 'pending' ORDER BY message_id`,
      )
      .all(recipient) as unknown as { message_id: string }[]
    return rows.map((row) => row.message_id + '.json')
  }

  /** Read matching messages without consuming them. */
  receive(query: ParacrineQuery): ParacrineMessage[] {
    const sinceMs = query.since === undefined ? Number.NEGATIVE_INFINITY : Date.parse(query.since)
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE recipient IN (?, '*') AND sent_ms >= ?
           AND NOT (? AND EXISTS (
             SELECT 1 FROM receipts r WHERE r.message_id = messages.id AND r.reader = ?
           ))
         ORDER BY sent_ms, id`,
      )
      .all(
        query.for,
        sinceMs,
        query.unreadOnly === true ? 1 : 0,
        query.for,
      ) as unknown as MessageRow[]
    return rows
      .map(toMessage)
      .filter(
        (message) =>
          query.subjectPrefix === undefined ||
          (message.subject ?? '').startsWith(query.subjectPrefix),
      )
  }

  /** Write one read receipt and update only the explicit recipient's row. */
  acknowledge(messageId: string, by: ParacrineAgentId): void {
    this.transaction(() => {
      this.db
        .prepare(
          'INSERT OR IGNORE INTO receipts(message_id, reader, at, legacy) VALUES(?, ?, ?, 0)',
        )
        .run(messageId, by, new Date().toISOString())
      this.db
        .prepare(
          `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
           WHERE message_id = ? AND recipient = ?`,
        )
        .run(messageId, by)
    })
  }

  /** List independent read receipts for a message. */
  reads(messageId: string): ParacrineRead[] {
    const rows = this.db
      .prepare('SELECT reader, at FROM receipts WHERE message_id = ? ORDER BY reader')
      .all(messageId) as unknown as { reader: string; at: string }[]
    return rows.map((row) => ({ messageId, by: row.reader, at: row.at }))
  }

  /** Apply caller-owned retention atomically. */
  purge(options: ParacrinePurgeOptions): number {
    const beforeMs = Date.parse(options.before)
    return this.transaction(() => {
      const rows = this.db
        .prepare('DELETE FROM messages WHERE sent_ms < ? RETURNING id')
        .all(beforeMs) as unknown as { id: string }[]
      if (options.includeReceipts === true) {
        const remove = this.db.prepare('DELETE FROM receipts WHERE message_id = ?')
        for (const row of rows) remove.run(row.id)
      }
      return rows.length
    })
  }

  /** Claim a bounded page using compare-and-set tokens. */
  claimPending(
    recipient: ParacrineAgentId,
    options: ParacrineFileClaimOptions,
  ): ParacrineFileClaimedPending {
    const maximum = Math.max(0, Math.min(20, Math.floor(options.limit ?? 5)))
    if (maximum === 0) return { claims: [], hidden: 0 }
    const sinceMs =
      options.since === undefined ? Number.NEGATIVE_INFINITY : Date.parse(options.since)
    const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS
    const now = Date.now()
    const staleBefore = now - leaseMs
    return this.transaction(() => {
      const where = `d.recipient = ? AND m.sent_ms >= ? AND (
        d.state = 'pending' OR (d.state = 'claimed' AND d.claimed_at <= ?)
      )`
      const candidates = this.db
        .prepare(
          `SELECT m.*, d.state AS old_state, d.claim_token AS old_token,
                  d.claimed_at AS old_claimed_at
           FROM deliveries d JOIN messages m ON m.id = d.message_id
           WHERE ${where}
           ORDER BY CASE WHEN m.recipient = d.recipient THEN 0 ELSE 1 END, m.sent_ms, m.id
           LIMIT ?`,
        )
        .all(recipient, sinceMs, staleBefore, maximum) as unknown as ClaimRow[]
      const update = this.db.prepare(
        `UPDATE deliveries SET state = 'claimed', claim_token = ?, claimed_at = ?
         WHERE message_id = ? AND recipient = ? AND state = ?
           AND claim_token IS ? AND claimed_at IS ?`,
      )
      const claims: ParacrineFileClaim[] = []
      for (const row of candidates) {
        const claimToken = randomUUID()
        const result = update.run(
          claimToken,
          now,
          row.id,
          recipient,
          row.old_state,
          row.old_token,
          row.old_claimed_at,
        )
        if (result.changes === 1) {
          claims.push({
            message: toMessage(row),
            messageId: row.id,
            recipientId: recipient,
            claimToken,
          })
        }
      }
      const count = this.db
        .prepare(
          `SELECT COUNT(*) AS count FROM deliveries d JOIN messages m ON m.id = d.message_id
           WHERE ${where}`,
        )
        .get(recipient, sinceMs, staleBefore) as { count: number }
      return { claims, hidden: count.count }
    })
  }

  /** Settle claims only if their generation tokens still match. */
  acknowledgeClaims(claims: ParacrineFileClaimReference[], by: ParacrineAgentId): void {
    this.transaction(() => {
      const update = this.db.prepare(
        `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
         WHERE message_id = ? AND recipient = ? AND state = 'claimed' AND claim_token = ?`,
      )
      const receipt = this.db.prepare(
        'INSERT OR IGNORE INTO receipts(message_id, reader, at, legacy) VALUES(?, ?, ?, 0)',
      )
      for (const claim of claims) {
        const result = update.run(claim.messageId, claim.recipientId, claim.claimToken)
        if (result.changes === 1) receipt.run(claim.messageId, by, new Date().toISOString())
      }
    })
  }

  /** Return token-owned claims to pending immediately. */
  releaseClaims(claims: ParacrineFileClaimReference[]): void {
    this.transaction(() => {
      const update = this.db.prepare(
        `UPDATE deliveries SET state = 'pending', claim_token = NULL, claimed_at = NULL
         WHERE message_id = ? AND recipient = ? AND state = 'claimed' AND claim_token = ?`,
      )
      for (const claim of claims) update.run(claim.messageId, claim.recipientId, claim.claimToken)
    })
  }
}
