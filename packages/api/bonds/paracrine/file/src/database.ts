import { randomUUID } from 'node:crypto'
import type { Dirent } from 'node:fs'
import {
  chmodSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import './runtime.js'

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
import { legacyMessage, MESSAGE_ID } from './validation.js'

const DEFAULT_LEASE_MS = 30_000
const DELIVERY_SUFFIX = '.delivered'
const EPOCH = '1970-01-01T00:00:00.000Z'
const LEGACY_UNREADABLE = 'legacy-unreadable'
const RECENT_WRITE_MS = 60_000
const UNREADABLE = Symbol('unreadable legacy JSON')

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
  selection_group: number
  old_state: 'pending' | 'claimed'
  old_token: string | null
  old_claimed_at: number | null
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

const RECEIPTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS receipts (
    message_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('read', 'delivery')),
    recipient TEXT NOT NULL,
    at TEXT NOT NULL,
    legacy INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(message_id, kind, recipient)
  );
`

/** Synchronous SQLite operations, wrapped by the asynchronous public provider. */
export class ParacrineDatabase {
  private readonly db: DatabaseSync

  constructor(private readonly root: string) {
    mkdirSync(root, { recursive: true, mode: 0o700 })
    chmodSync(root, 0o700)
    const filename = join(root, 'paracrine.sqlite')
    this.db = new DatabaseSync(filename)
    try {
      chmodSync(filename, 0o600)
      this.db.exec('PRAGMA busy_timeout = 5000')
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
          sent_ms INTEGER NOT NULL DEFAULT 0,
          selection_group INTEGER NOT NULL DEFAULT 0,
          emission_count INTEGER NOT NULL DEFAULT 0,
          last_emitted_at INTEGER,
          PRIMARY KEY(message_id, recipient)
        );
        CREATE TABLE IF NOT EXISTS migration (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS legacy_unreadable (
          path TEXT PRIMARY KEY,
          original_path TEXT NOT NULL
        );
        ${RECEIPTS_SCHEMA}
        CREATE INDEX IF NOT EXISTS deliveries_pending_selection
          ON deliveries(recipient, selection_group, sent_ms, message_id)
          WHERE state = 'pending';
        CREATE INDEX IF NOT EXISTS deliveries_stale_selection
          ON deliveries(recipient, selection_group, sent_ms, message_id, claimed_at)
          WHERE state = 'claimed';
        PRAGMA user_version = 1;
        `)
      })
    } catch (error) {
      try {
        this.db.close()
      } catch (_error) {
        // Preserve the initialization failure rather than a secondary close error.
      }
      throw error
    }
  }

  /** Close this process's SQLite handle. */
  close(): void {
    this.db.close()
  }

  /** List quarantined files retained beside this store. */
  unreadableLegacyFiles(): string[] {
    const rows = this.db.prepare('SELECT path FROM legacy_unreadable ORDER BY path').all() as {
      path: string
    }[]
    return rows.map((row) => join(this.root, row.path))
  }

  /** Only a confirmed ENOENT means a legacy tree is absent. */
  private directoryEntries(path: string): Dirent[] {
    try {
      return readdirSync(path, { withFileTypes: true }).sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
      )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }

  /** Record both the retained path and its original legacy location. */
  private recordUnreadable(path: string, originalPath: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO legacy_unreadable(path, original_path) VALUES(?, ?)')
      .run(path, originalPath)
  }

  /** Recover records for renames that survived a crash before their transaction committed. */
  private recordQuarantinedFiles(directory = join(this.root, LEGACY_UNREADABLE)): void {
    for (const entry of this.directoryEntries(directory)) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        this.recordQuarantinedFiles(path)
      } else if (entry.isFile()) {
        this.recordUnreadable(
          relative(this.root, path),
          relative(join(this.root, LEGACY_UNREADABLE), path),
        )
      }
    }
  }

  /** Retain malformed bytes without overwriting a different quarantined file. */
  private quarantineLegacyFile(path: string, originalPath: string, raw: string): void {
    const quarantinedPath = join(LEGACY_UNREADABLE, originalPath)
    const destination = join(this.root, quarantinedPath)
    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 })
    try {
      const existing = readFileSync(destination, 'utf8')
      if (existing !== raw) {
        throw new Error(`Refusing to overwrite a different quarantined file: ${destination}`)
      }
      unlinkSync(path)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') renameSync(path, destination)
      else throw error
    }
    this.recordUnreadable(quarantinedPath, originalPath)
  }

  /** Retry fresh partial writes; quarantine only permanently malformed, aged JSON. */
  private readLegacyJson(path: string, originalPath: string): unknown | typeof UNREADABLE {
    const raw = readFileSync(path, 'utf8')
    try {
      return JSON.parse(raw) as unknown
    } catch (error) {
      if (
        !(error instanceof SyntaxError) ||
        Date.now() - statSync(path).mtimeMs < RECENT_WRITE_MS
      ) {
        throw error
      }
      this.quarantineLegacyFile(path, originalPath, raw)
      return UNREADABLE
    }
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

  /** Register once; sends and imports atomically fan out later broadcasts. */
  private registerTransaction(recipient: ParacrineAgentId): void {
    const inserted = this.db
      .prepare('INSERT OR IGNORE INTO recipients(id, registered_at) VALUES(?, ?)')
      .run(recipient, new Date().toISOString())
    if (inserted.changes === 0) return
    this.db
      .prepare(
        `INSERT OR IGNORE INTO deliveries
           (message_id, recipient, state, sent_ms, selection_group)
         SELECT id, ?, 'pending', sent_ms, 1 FROM messages WHERE recipient = '*'`,
      )
      .run(recipient)
    this.applyReceiptsForRecipient(recipient)
  }

  /** Apply explicit receipt identities; never infer a recipient from a suffix. */
  private applyReceiptsForRecipient(recipient: ParacrineAgentId): void {
    this.db
      .prepare(
        `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
         WHERE recipient = ? AND state = 'pending' AND EXISTS (
           SELECT 1 FROM receipts r
           WHERE r.message_id = deliveries.message_id AND r.recipient = deliveries.recipient
         )`,
      )
      .run(recipient)
  }

  /** Apply receipts imported before their surviving message. */
  private applyReceiptsForMessage(messageId: string): void {
    this.db
      .prepare(
        `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
         WHERE message_id = ? AND state = 'pending' AND EXISTS (
           SELECT 1 FROM receipts r
           WHERE r.message_id = deliveries.message_id AND r.recipient = deliveries.recipient
         )`,
      )
      .run(messageId)
  }

  /** Import one valid legacy message idempotently; receipts have their own tree walk. */
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
          `INSERT OR IGNORE INTO deliveries
             (message_id, recipient, state, sent_ms, selection_group)
           SELECT ?, id, 'pending', ?, 1 FROM recipients`,
        )
        .run(message.id, sentMs)
    } else {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO deliveries
             (message_id, recipient, state, sent_ms, selection_group)
           VALUES(?, ?, 'pending', ?, 0)`,
        )
        .run(message.id, message.to, sentMs)
    }
    this.applyReceiptsForMessage(message.id)
  }

  /** Import a 1.1.0 read receipt under its exact, case-sensitive identity. */
  private importReceipt(messageId: string, name: string, parsed: unknown): void {
    const recipient = name.slice(0, -5)
    if (!isParacrineAgentId(recipient)) return
    const existing = this.db.prepare('SELECT sent_at FROM messages WHERE id = ?').get(messageId) as
      { sent_at: string } | undefined
    let at = existing?.sent_at ?? EPOCH
    if (typeof parsed === 'object' && parsed !== null && 'at' in parsed) {
      const candidate = (parsed as { at?: unknown }).at
      if (typeof candidate === 'string') at = candidate
    }
    this.db
      .prepare(
        `INSERT OR IGNORE INTO receipts(message_id, kind, recipient, at, legacy)
         VALUES(?, 'read', ?, ?, 1)`,
      )
      .run(messageId, recipient, at)
    this.db
      .prepare(
        `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
         WHERE message_id = ? AND recipient = ?`,
      )
      .run(messageId, recipient)
  }

  /** Import every registered recipient and addressed message in the caller's transaction. */
  private importMessages(): void {
    for (const entry of this.directoryEntries(join(this.root, 'pending'))) {
      if (entry.isDirectory() && isParacrineAgentId(entry.name)) {
        this.registerTransaction(entry.name)
      }
    }

    const messagesRoot = join(this.root, 'messages')
    for (const mailbox of this.directoryEntries(messagesRoot)) {
      if (
        !mailbox.isDirectory() ||
        !(mailbox.name === PARACRINE_BROADCAST || isParacrineAgentId(mailbox.name))
      ) {
        continue
      }
      for (const entry of this.directoryEntries(join(messagesRoot, mailbox.name))) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue
        const path = join(messagesRoot, mailbox.name, entry.name)
        const parsed = this.readLegacyJson(path, join('messages', mailbox.name, entry.name))
        if (parsed === UNREADABLE) continue
        const message = legacyMessage(parsed)
        if (message !== null && message.to === mailbox.name) this.importMessage(message)
      }
    }
  }

  /** Import every exact, case-sensitive legacy receipt in the same transaction. */
  private importReceipts(): void {
    const readsRoot = join(this.root, 'reads')
    for (const message of this.directoryEntries(readsRoot)) {
      if (!message.isDirectory() || !MESSAGE_ID.test(message.name)) continue
      for (const entry of this.directoryEntries(join(readsRoot, message.name))) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const path = join(readsRoot, message.name, entry.name)
          const parsed = this.readLegacyJson(path, join('reads', message.name, entry.name))
          if (parsed !== UNREADABLE) this.importReceipt(message.name, entry.name, parsed)
        }
      }
    }
  }

  /** The completion marker is checked again after acquiring the write lock. */
  private legacyImportComplete(): boolean {
    return (
      this.db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get() !==
      undefined
    )
  }

  /** Import the published JSON layout once, atomically, before returning a provider. */
  importLegacy(): void {
    this.transaction(() => {
      if (this.legacyImportComplete()) return
      this.recordQuarantinedFiles()
      this.importMessages()
      this.importReceipts()
      this.db.prepare("INSERT INTO migration(key, value) VALUES('legacy-complete', 'done')").run()
    })
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
            `INSERT INTO deliveries
               (message_id, recipient, state, sent_ms, selection_group)
             SELECT ?, id, 'pending', ?, 1 FROM recipients`,
          )
          .run(message.id, sentMs)
      } else {
        this.db
          .prepare(
            `INSERT INTO deliveries
               (message_id, recipient, state, sent_ms, selection_group)
             VALUES(?, ?, 'pending', ?, 0)`,
          )
          .run(message.id, input.to, sentMs)
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
             SELECT 1 FROM receipts r
             WHERE r.message_id = messages.id AND r.kind = 'read' AND r.recipient = ?
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

  /** Write one explicit read receipt and update only that recipient's row. */
  acknowledge(messageId: string, by: ParacrineAgentId): void {
    this.transaction(() => {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO receipts(message_id, kind, recipient, at, legacy)
           VALUES(?, 'read', ?, ?, 0)`,
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

  /** List receipts; the suffix is presentation only, never a storage identity. */
  reads(messageId: string): ParacrineRead[] {
    const rows = this.db
      .prepare(
        `SELECT kind, recipient, at FROM receipts
         WHERE message_id = ? ORDER BY recipient, kind`,
      )
      .all(messageId) as unknown as { kind: 'read' | 'delivery'; recipient: string; at: string }[]
    return rows.map((row) => ({
      messageId,
      by: row.kind === 'delivery' ? row.recipient + DELIVERY_SUFFIX : row.recipient,
      at: row.at,
    }))
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

  /** Claim a bounded indexed page using compare-and-set tokens and no COUNT. */
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
      const candidates: ClaimRow[] = []
      for (const group of [0, 1]) {
        const pending = this.db
          .prepare(
            `SELECT m.*, d.selection_group, d.state AS old_state,
                    d.claim_token AS old_token, d.claimed_at AS old_claimed_at
             FROM deliveries d JOIN messages m ON m.id = d.message_id
             WHERE d.recipient = ? AND d.selection_group = ? AND d.sent_ms >= ?
               AND d.state = 'pending'
             ORDER BY d.selection_group, d.sent_ms, d.message_id
             LIMIT ?`,
          )
          .all(recipient, group, sinceMs, maximum + 1) as unknown as ClaimRow[]
        const stale = this.db
          .prepare(
            `SELECT m.*, d.selection_group, d.state AS old_state,
                    d.claim_token AS old_token, d.claimed_at AS old_claimed_at
             FROM deliveries d JOIN messages m ON m.id = d.message_id
             WHERE d.recipient = ? AND d.selection_group = ? AND d.sent_ms >= ?
               AND d.state = 'claimed' AND d.claimed_at <= ?
             ORDER BY d.selection_group, d.sent_ms, d.message_id
             LIMIT ?`,
          )
          .all(recipient, group, sinceMs, staleBefore, maximum + 1) as unknown as ClaimRow[]
        candidates.push(...pending, ...stale)
      }
      candidates.sort(
        (left, right) =>
          left.selection_group - right.selection_group ||
          left.sent_ms - right.sent_ms ||
          left.id.localeCompare(right.id),
      )
      const selected = candidates.slice(0, maximum)
      const update = this.db.prepare(
        `UPDATE deliveries SET state = 'claimed', claim_token = ?, claimed_at = ?
         WHERE message_id = ? AND recipient = ? AND state = ?
           AND claim_token IS ? AND claimed_at IS ?`,
      )
      const claims: ParacrineFileClaim[] = []
      for (const row of selected) {
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
      // This is a lower bound observed by bounded probes, not a backlog count.
      return { claims, hidden: Math.max(0, candidates.length - claims.length) }
    })
  }

  /** Settle claims only if their generation tokens still match. */
  acknowledgeClaims(claims: ParacrineFileClaimReference[], _by: ParacrineAgentId): void {
    this.transaction(() => {
      const update = this.db.prepare(
        `UPDATE deliveries SET state = 'acknowledged', claim_token = NULL, claimed_at = NULL
         WHERE message_id = ? AND recipient = ? AND state = 'claimed' AND claim_token = ?`,
      )
      const receipt = this.db.prepare(
        `INSERT OR IGNORE INTO receipts(message_id, kind, recipient, at, legacy)
         VALUES(?, 'delivery', ?, ?, 0)`,
      )
      for (const claim of claims) {
        const result = update.run(claim.messageId, claim.recipientId, claim.claimToken)
        if (result.changes === 1) {
          receipt.run(claim.messageId, claim.recipientId, new Date().toISOString())
        }
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
