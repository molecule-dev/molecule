import { randomUUID } from 'node:crypto'
import type { Dirent } from 'node:fs'
import { chmodSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

const IMPORT_BATCH = 32
const IMPORT_LAUNCH_LEASE_MS = 10_000
const IMPORT_LEASE_MS = 60_000
const DEFAULT_LEASE_MS = 30_000
const DELIVERY_SUFFIX = '.delivered'
const EPOCH = '1970-01-01T00:00:00.000Z'

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

interface MessageCursor {
  phase: 'recipients' | 'messages' | 'done'
  after: string
  mailbox: string | null
  fileAfter: string
}

interface ReceiptCursor {
  phase: 'receipts' | 'done'
  after: string
  messageId: string | null
  fileAfter: string
}

const INITIAL_MESSAGE_CURSOR: MessageCursor = {
  phase: 'recipients',
  after: '',
  mailbox: null,
  fileAfter: '',
}

const INITIAL_RECEIPT_CURSOR: ReceiptCursor = {
  phase: 'receipts',
  after: '',
  messageId: null,
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
  }

  /** Close this process's SQLite handle; the detached importer owns its own. */
  close(): void {
    this.db.close()
  }

  /** Read one stable, resumable directory page in the detached importer. */
  private directoryEntries(path: string, after: string): Dirent[] {
    try {
      return readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.name > after)
        .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
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

  /** Read the durable JSON-import checkpoint without translating SQLite versions. */
  private messageCursor(): MessageCursor {
    const row = this.db.prepare("SELECT value FROM migration WHERE key = 'legacy'").get() as
      { value: string } | undefined
    if (row === undefined) return { ...INITIAL_MESSAGE_CURSOR }
    return JSON.parse(row.value) as MessageCursor
  }

  /** Read the independent durable legacy-receipt checkpoint. */
  private receiptCursor(): ReceiptCursor {
    const row = this.db
      .prepare("SELECT value FROM migration WHERE key = 'legacy-receipts'")
      .get() as { value: string } | undefined
    return row === undefined
      ? { ...INITIAL_RECEIPT_CURSOR }
      : (JSON.parse(row.value) as ReceiptCursor)
  }

  /** Persist either checkpoint in the caller's transaction. */
  private saveCursor(key: 'legacy' | 'legacy-receipts', cursor: object): void {
    this.db
      .prepare(
        'INSERT INTO migration(key, value) VALUES(?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, JSON.stringify(cursor))
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
  private importReceipt(messageId: string, name: string, raw: string): void {
    const recipient = name.slice(0, -5)
    if (!isParacrineAgentId(recipient)) return
    const existing = this.db.prepare('SELECT sent_at FROM messages WHERE id = ?').get(messageId) as
      { sent_at: string } | undefined
    let at = existing?.sent_at ?? EPOCH
    try {
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed === 'object' && parsed !== null && 'at' in parsed) {
        const candidate = (parsed as { at?: unknown }).at
        if (typeof candidate === 'string') at = candidate
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      // Existence is the receipt; malformed optional metadata is not an I/O retry.
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

  /** Import one sorted page and commit its cursor with the same batch. */
  private importMessagesBatch(): boolean {
    let cursor = this.messageCursor()
    if (cursor.phase === 'done') return true

    if (cursor.phase === 'recipients') {
      const entries = this.directoryEntries(join(this.root, 'pending'), cursor.after)
      const batch = entries.slice(0, IMPORT_BATCH)
      this.transaction(() => {
        for (const entry of batch) {
          if (entry.isDirectory() && isParacrineAgentId(entry.name)) {
            this.registerTransaction(entry.name)
          }
        }
        const last = batch.at(-1)
        if (last !== undefined) cursor.after = last.name
        if (batch.length === entries.length) {
          cursor = { ...INITIAL_MESSAGE_CURSOR, phase: 'messages' }
        }
        this.saveCursor('legacy', cursor)
      })
      return false
    }

    const messagesRoot = join(this.root, 'messages')
    if (cursor.mailbox === null) {
      const mailboxes = this.directoryEntries(messagesRoot, cursor.after)
      const entry = mailboxes[0]
      if (entry === undefined) {
        this.transaction(() => {
          this.saveCursor('legacy', { ...INITIAL_MESSAGE_CURSOR, phase: 'done' })
        })
        return true
      }
      if (
        !entry.isDirectory() ||
        !(entry.name === PARACRINE_BROADCAST || isParacrineAgentId(entry.name))
      ) {
        this.transaction(() => {
          this.saveCursor('legacy', { ...cursor, after: entry.name })
        })
        return false
      }
      cursor.mailbox = entry.name
      cursor.fileAfter = ''
    }

    const mailbox = cursor.mailbox
    const entries = this.directoryEntries(join(messagesRoot, mailbox), cursor.fileAfter)
    const batch = entries.slice(0, IMPORT_BATCH)
    const imported: ParacrineMessage[] = []
    for (const entry of batch) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      // All blocking filesystem work happens before BEGIN IMMEDIATE. A failed
      // read leaves the prior durable cursor untouched and is retried later.
      const raw = readFileSync(join(messagesRoot, mailbox, entry.name), 'utf8')
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch (error) {
        if (error instanceof SyntaxError) continue
        throw error
      }
      const message = legacyMessage(parsed)
      if (message !== null && message.to === mailbox) imported.push(message)
    }
    this.transaction(() => {
      for (const message of imported) this.importMessage(message)
      const last = batch.at(-1)
      if (last !== undefined) cursor.fileAfter = last.name
      if (batch.length === entries.length) {
        cursor = { ...cursor, after: mailbox, mailbox: null, fileAfter: '' }
      }
      this.saveCursor('legacy', cursor)
    })
    return false
  }

  /** Import one sorted receipt page without skipping transient read failures. */
  private importReceiptsBatch(): boolean {
    let cursor = this.receiptCursor()
    if (cursor.phase === 'done') return true
    const readsRoot = join(this.root, 'reads')
    if (cursor.messageId === null) {
      const messages = this.directoryEntries(readsRoot, cursor.after)
      const entry = messages[0]
      if (entry === undefined) {
        this.transaction(() => {
          this.saveCursor('legacy-receipts', { ...INITIAL_RECEIPT_CURSOR, phase: 'done' })
        })
        return true
      }
      if (!entry.isDirectory() || !MESSAGE_ID.test(entry.name)) {
        this.transaction(() => {
          this.saveCursor('legacy-receipts', { ...cursor, after: entry.name })
        })
        return false
      }
      cursor.messageId = entry.name
      cursor.fileAfter = ''
    }

    const messageId = cursor.messageId
    const entries = this.directoryEntries(join(readsRoot, messageId), cursor.fileAfter)
    const batch = entries.slice(0, IMPORT_BATCH)
    const imported: { name: string; raw: string }[] = []
    for (const entry of batch) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        imported.push({
          name: entry.name,
          raw: readFileSync(join(readsRoot, messageId, entry.name), 'utf8'),
        })
      }
    }
    this.transaction(() => {
      for (const receipt of imported) this.importReceipt(messageId, receipt.name, receipt.raw)
      const last = batch.at(-1)
      if (last !== undefined) cursor.fileAfter = last.name
      if (batch.length === entries.length) {
        cursor = { ...cursor, after: messageId, messageId: null, fileAfter: '' }
      }
      this.saveCursor('legacy-receipts', cursor)
    })
    return false
  }

  /** The completion marker is the only authority for starting another import. */
  legacyImportComplete(): boolean {
    return (
      this.db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get() !==
      undefined
    )
  }

  /** Mark an absent or completed legacy tree without reopening it later. */
  completeLegacyImport(): void {
    this.transaction(() => {
      this.db
        .prepare("INSERT OR IGNORE INTO migration(key, value) VALUES('legacy-complete', 'done')")
        .run()
    })
  }

  /**
   * Acquire the SQLite import lease. The launcher gets a short adoption lease;
   * the worker then owns its PID and heartbeats while yielding between batches.
   */
  claimLegacyImport(token: string, launching = false): boolean {
    return this.transaction(() => {
      if (this.legacyImportComplete()) return false
      const row = this.db
        .prepare("SELECT value FROM migration WHERE key = 'legacy-import-lock'")
        .get() as { value: string } | undefined
      if (row !== undefined) {
        let owner: { token: string; pid: number; expiresAt: number } | undefined
        try {
          owner = JSON.parse(row.value) as typeof owner
        } catch (_error) {
          // A malformed lock has no live owner and is safe to replace.
        }
        if (owner !== undefined && owner.token !== token) {
          let alive = true
          try {
            process.kill(owner.pid, 0)
          } catch (error) {
            alive = (error as NodeJS.ErrnoException).code === 'EPERM'
          }
          if (alive && owner.expiresAt > Date.now()) return false
        }
      }
      this.db
        .prepare(
          "INSERT INTO migration(key, value) VALUES('legacy-import-lock', ?) " +
            'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        )
        .run(
          JSON.stringify({
            token,
            pid: process.pid,
            expiresAt: Date.now() + (launching ? IMPORT_LAUNCH_LEASE_MS : IMPORT_LEASE_MS),
          }),
        )
      return true
    })
  }

  /** Extend only the current worker's lease. */
  heartbeatLegacyImport(token: string): void {
    this.transaction(() => {
      const row = this.db
        .prepare("SELECT value FROM migration WHERE key = 'legacy-import-lock'")
        .get() as { value: string } | undefined
      if (row === undefined) return
      const owner = JSON.parse(row.value) as { token: string }
      if (owner.token !== token) return
      this.db
        .prepare("UPDATE migration SET value = ? WHERE key = 'legacy-import-lock'")
        .run(JSON.stringify({ token, pid: process.pid, expiresAt: Date.now() + IMPORT_LEASE_MS }))
    })
  }

  /** Release only the lock owned by this launcher or worker. */
  releaseLegacyImport(token: string): void {
    this.transaction(() => {
      const row = this.db
        .prepare("SELECT value FROM migration WHERE key = 'legacy-import-lock'")
        .get() as { value: string } | undefined
      if (row === undefined) return
      const owner = JSON.parse(row.value) as { token: string }
      if (owner.token === token) {
        this.db.prepare("DELETE FROM migration WHERE key = 'legacy-import-lock'").run()
      }
    })
  }

  /** Run exclusively in the detached worker, committing sorted resumable pages. */
  async importLegacy(): Promise<void> {
    while (!this.legacyImportComplete()) {
      const messagesDone = this.importMessagesBatch()
      const receiptsDone = this.importReceiptsBatch()
      if (messagesDone && receiptsDone) {
        this.completeLegacyImport()
        return
      }
      await new Promise<void>((resolve) => setImmediate(resolve))
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
