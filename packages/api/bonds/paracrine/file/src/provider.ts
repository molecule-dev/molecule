/**
 * File-backed paracrine store.
 *
 * One directory holds everything, so every process on the machine — bonded or
 * CLI, any harness — reads the same truth by path, with no daemon to run and
 * no lock to take:
 *
 * ```text
 * <root>/messages/<recipient>/<message-id>.json   one file per message
 * <root>/messages/*  (PARACRINE_BROADCAST)        the broadcast stream
 * <root>/reads/<message-id>/<reader>.json         one file per read receipt
 * <root>/pending/<recipient>/<message-id>.json    one unread pointer
 * ```
 *
 * Writes are atomic (temp file + `rename` in the same directory): a reader
 * sees a whole message or no message, never a half-written one, whatever
 * else is sending concurrently. Message contents are never consumed. Reading
 * or listing pending mail registers the mailbox and backfills its index once;
 * `ack` writes the receipt before removing the pointer. Message ids embed
 * their send time, so filename order is chronological.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type {
  ParacrineAgentId,
  ParacrineMessage,
  ParacrineProvider,
  ParacrinePurgeOptions,
  ParacrineQuery,
  ParacrineRead,
  ParacrineSendInput,
} from '@molecule/api-paracrine'
import { isParacrineAgentId, PARACRINE_BROADCAST } from '@molecule/api-paracrine'

/** Configuration for the file store. */
export interface ParacrineFileConfig {
  /**
   * The store's root directory. Defaults to `~/.agents/paracrine` — the
   * cross-harness agents directory — or the `PARACRINE_DIR` env var. The
   * directory tree is created on first use; concurrent creators race safely
   * (`mkdir` with `recursive: true`).
   */
  rootDir?: string
}

/** The file-only cheap unread index; the core mailbox contract stays unchanged. */
type ParacrineFileProvider = ParacrineProvider & {
  /** List one recipient's pending filenames with one readdir of its own index. */
  pending(recipient: ParacrineAgentId): Promise<string[]>
}

interface PendingPointer {
  id: string
  to: ParacrineAgentId | typeof PARACRINE_BROADCAST
  sentAt: string
}

const MESSAGE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/
const DELIVERY_SUFFIX = '.delivered'

const assertAgentId = (value: string, role: string): ParacrineAgentId => {
  if (!isParacrineAgentId(value)) {
    throw new Error(
      `Invalid paracrine ${role} id: ${JSON.stringify(value)} — ids are flat ` +
        '[A-Za-z0-9_.:@-] strings (a path here would retarget the mailbox, so ' +
        'malformed ids are refused, not sanitized).',
    )
  }
  return value
}

/** Resolve the store root: explicit config → env → `~/.agents/paracrine`. */
const resolveRoot = (config: ParacrineFileConfig): string =>
  config.rootDir ?? process.env.PARACRINE_DIR ?? join(homedir(), '.agents', 'paracrine')

/** One atomic JSON write: temp file in the same directory, then rename over it. */
const writeAtomic = async (path: string, value: unknown): Promise<void> => {
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 })
  await rename(temporary, path)
}

/** Read one message file, skipping wreckage (a foreign/corrupt file is not a mailbox). */
const readMessageFile = async (path: string): Promise<ParacrineMessage | null> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'))
  } catch (_error) {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.body !== 'string') return null
  return candidate as unknown as ParacrineMessage
}

/** Every readable message in one mailbox directory, oldest first. */
const readMailbox = async (dir: string): Promise<ParacrineMessage[]> => {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`Could not list the paracrine mailbox at ${dir}`, { cause: error })
    }
    return []
  }
  const messages: ParacrineMessage[] = []
  for (const name of names.sort()) {
    if (!name.endsWith('.json')) continue
    const message = await readMessageFile(join(dir, name))
    if (message !== null) messages.push(message)
  }
  return messages
}

/** Create the file-backed paracrine store. */
export function createProvider(config: ParacrineFileConfig = {}): ParacrineFileProvider {
  const root = resolveRoot(config)
  const messagesRoot = join(root, 'messages')
  const readsRoot = join(root, 'reads')
  const pendingRoot = join(root, 'pending')
  const mailboxDir = (recipient: string): string => join(messagesRoot, recipient)
  const pendingDir = (recipient: string): string => join(pendingRoot, recipient)
  const pendingPath = (recipient: string, messageId: string): string =>
    join(pendingDir(recipient), `${messageId}.json`)

  const pointerFor = (message: ParacrineMessage): PendingPointer | null => {
    if (
      !MESSAGE_ID.test(message.id) ||
      typeof message.sentAt !== 'string' ||
      !Number.isFinite(Date.parse(message.sentAt)) ||
      (message.to !== PARACRINE_BROADCAST && !isParacrineAgentId(message.to))
    )
      return null
    return { id: message.id, to: message.to, sentAt: message.sentAt }
  }

  const writePending = async (recipient: string, message: ParacrineMessage): Promise<void> => {
    const pointer = pointerFor(message)
    if (pointer === null) return
    await writeAtomic(pendingPath(recipient, message.id), pointer)
  }

  const hasReaderReceipt = async (messageId: string, reader: string): Promise<boolean> =>
    stat(join(readsRoot, messageId, `${reader}.json`)).then(
      () => true,
      () => false,
    )

  const hasReceipt = async (messageId: string, recipient: string): Promise<boolean> => {
    for (const reader of [recipient, recipient + DELIVERY_SUFFIX]) {
      if (await hasReaderReceipt(messageId, reader)) return true
    }
    return false
  }

  /** Create and initialize a mailbox index. `.ready` makes interrupted backfills retryable. */
  const ensurePending = async (recipient: string): Promise<void> => {
    assertAgentId(recipient, 'mailbox')
    const dir = pendingDir(recipient)
    await mkdir(dir, { recursive: true })
    const ready = join(dir, '.ready')
    const initialized = await stat(ready).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return false
        throw error
      },
    )
    if (initialized) return

    // Both legacy direct mail and the existing broadcast stream remain visible
    // to a new reader, matching receive()'s long-standing semantics.
    for (const message of [
      ...(await readMailbox(mailboxDir(recipient))),
      ...(await readMailbox(mailboxDir(PARACRINE_BROADCAST))),
    ]) {
      if (message.to !== recipient && message.to !== PARACRINE_BROADCAST) continue
      if (!(await hasReceipt(message.id, recipient))) await writePending(recipient, message)
    }
    await writeAtomic(ready, { version: 1 })
  }

  const removePendingEverywhere = async (messageId: string): Promise<void> => {
    let mailboxes
    try {
      mailboxes = await readdir(pendingRoot, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    for (const mailbox of mailboxes) {
      if (!mailbox.isDirectory() || !isParacrineAgentId(mailbox.name)) continue
      const dir = pendingDir(mailbox.name)
      await Promise.all([
        rm(join(dir, `${messageId}.json`), { force: true }),
        rm(join(dir, '.claimed', `${messageId}.json`), { force: true }),
        rm(join(dir, '.rejected', `${messageId}.json`), { force: true }),
        rm(join(dir, '.rejected', `${messageId}.reason.json`), { force: true }),
      ])
    }
  }

  return {
    name: 'file',

    async send(input: ParacrineSendInput): Promise<ParacrineMessage> {
      assertAgentId(input.from, 'sender')
      if (input.to !== PARACRINE_BROADCAST) assertAgentId(input.to, 'recipient')
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
      const dir = mailboxDir(input.to)
      await mkdir(dir, { recursive: true })
      await writeAtomic(join(dir, `${message.id}.json`), message)

      if (input.to !== PARACRINE_BROADCAST) {
        await ensurePending(input.to)
        await writePending(input.to, message)
      } else {
        // Broadcast fan-out is delivery of a user message, not discovery or an
        // announcement: only mailboxes that already registered receive it.
        let mailboxes
        try {
          mailboxes = await readdir(pendingRoot, { withFileTypes: true })
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return message
          throw error
        }
        for (const mailbox of mailboxes) {
          if (!mailbox.isDirectory() || !isParacrineAgentId(mailbox.name)) continue
          await writePending(mailbox.name, message)
        }
      }
      return message
    },

    async pending(recipient: ParacrineAgentId): Promise<string[]> {
      await ensurePending(recipient)
      const names = await readdir(pendingDir(recipient))
      return names.filter((name) => !name.startsWith('.') && name.endsWith('.json')).sort()
    },

    async receive(query: ParacrineQuery): Promise<ParacrineMessage[]> {
      assertAgentId(query.for, 'mailbox')
      await ensurePending(query.for)
      const own = await readMailbox(mailboxDir(query.for))
      const broadcasts = await readMailbox(mailboxDir(PARACRINE_BROADCAST))
      const sinceMs = query.since === undefined ? null : Date.parse(query.since)
      if (query.since !== undefined && Number.isNaN(sinceMs)) {
        throw new Error(`Invalid paracrine 'since' instant: ${JSON.stringify(query.since)}`)
      }
      let unread: Set<string> | null = null
      if (query.unreadOnly) {
        unread = new Set<string>()
        for (const message of [...own, ...broadcasts]) {
          if (!(await hasReaderReceipt(message.id, query.for))) unread.add(message.id)
        }
      }
      return [...own, ...broadcasts]
        .filter((message) => sinceMs === null || Date.parse(message.sentAt) >= sinceMs)
        .filter(
          (message) =>
            query.subjectPrefix === undefined ||
            (message.subject ?? '').startsWith(query.subjectPrefix),
        )
        .filter((message) => unread === null || unread.has(message.id))
        .sort((left, right) =>
          left.sentAt === right.sentAt
            ? left.id.localeCompare(right.id)
            : left.sentAt.localeCompare(right.sentAt),
        )
    },

    async ack(messageId: string, by: ParacrineAgentId): Promise<void> {
      assertAgentId(by, 'reader')
      if (!MESSAGE_ID.test(messageId)) {
        throw new Error(`Invalid paracrine message id: ${JSON.stringify(messageId)}`)
      }
      const dir = join(readsRoot, messageId)
      await mkdir(dir, { recursive: true })
      await writeAtomic(join(dir, `${by}.json`), {
        messageId,
        by,
        at: new Date().toISOString(),
      } satisfies ParacrineRead)

      // A harness delivery receipt uses <recipient>.delivered while its index
      // belongs to <recipient>. The receipt is durable before either pathname
      // is removed, preserving at-least-once behavior across a crash.
      const recipients = new Set([by])
      if (by.endsWith(DELIVERY_SUFFIX)) {
        const recipient = by.slice(0, -DELIVERY_SUFFIX.length)
        if (isParacrineAgentId(recipient)) recipients.add(recipient)
      }
      for (const recipient of recipients) {
        await rm(pendingPath(recipient, messageId), { force: true })
        await rm(join(pendingDir(recipient), '.claimed', `${messageId}.json`), { force: true })
      }
    },

    async reads(messageId: string): Promise<ParacrineRead[]> {
      if (!MESSAGE_ID.test(messageId)) {
        throw new Error(`Invalid paracrine message id: ${JSON.stringify(messageId)}`)
      }
      let names: string[]
      try {
        names = await readdir(join(readsRoot, messageId))
      } catch (_error) {
        return []
      }
      const reads: ParacrineRead[] = []
      for (const name of names.sort()) {
        if (!name.endsWith('.json')) continue
        try {
          const parsed = JSON.parse(await readFile(join(readsRoot, messageId, name), 'utf8'))
          if (typeof parsed?.messageId === 'string' && typeof parsed?.by === 'string') {
            reads.push(parsed as ParacrineRead)
          }
        } catch (_error) {
          // One unreadable receipt does not erase the others.
        }
      }
      return reads
    },

    async purge(options: ParacrinePurgeOptions): Promise<number> {
      const beforeMs = Date.parse(options.before)
      if (Number.isNaN(beforeMs)) {
        throw new Error(
          `Invalid paracrine purge 'before' instant: ${JSON.stringify(options.before)}`,
        )
      }
      let purged = 0
      let mailboxes: string[]
      try {
        mailboxes = await readdir(messagesRoot)
      } catch (_error) {
        return 0
      }
      for (const mailbox of mailboxes) {
        const dir = mailboxDir(mailbox)
        for (const message of await readMailbox(dir)) {
          if (Date.parse(message.sentAt) >= beforeMs) continue
          await rm(join(dir, `${message.id}.json`), { force: true })
          await removePendingEverywhere(message.id)
          if (options.includeReceipts === true) {
            await rm(join(readsRoot, message.id), { recursive: true, force: true })
          }
          purged += 1
        }
      }
      return purged
    },
  }
}
