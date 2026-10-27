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
 * ```
 *
 * Writes are atomic (temp file + `rename` in the same directory): a reader
 * sees a whole message or no message, never a half-written one, whatever
 * else is sending concurrently. Reads never write; only `ack` does. Message
 * ids embed their send time (`<epoch-ms>-<random>`), so directory order IS
 * chronological order — the listing a `receive` narrows.
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
    // A file that is not whole JSON is not a message; the listing continues
    // with the rest of the mailbox either way.
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.body !== 'string') return null
  return candidate as unknown as ParacrineMessage
}

/** Every message in one mailbox directory, oldest first. */
const readMailbox = async (dir: string): Promise<ParacrineMessage[]> => {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch (error) {
    // A mailbox nobody ever wrote to is EMPTY; a directory that exists but
    // cannot be listed is a failure the caller must see. Only the not-found
    // case may read as "no messages" — anything else rethrows with its cause.
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

/**
 * Create the file-backed paracrine store.
 *
 * @param config - The root directory (see {@link ParacrineFileConfig}).
 * @returns The provider.
 */
export function createProvider(config: ParacrineFileConfig = {}): ParacrineProvider {
  const root = resolveRoot(config)
  const messagesRoot = join(root, 'messages')
  const readsRoot = join(root, 'reads')
  const mailboxDir = (recipient: string): string => join(messagesRoot, recipient)

  return {
    name: 'file',

    async send(input: ParacrineSendInput): Promise<ParacrineMessage> {
      assertAgentId(input.from, 'sender')
      if (input.to !== PARACRINE_BROADCAST) assertAgentId(input.to, 'recipient')
      const message: ParacrineMessage = {
        id: `${Date.now().toString(36)}-${randomUUID()}`,
        from: input.from,
        to: input.to,
        ...(input.subject === undefined ? {} : { subject: input.subject }),
        body: input.body,
        sentAt: new Date().toISOString(),
        ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
      }
      const dir = mailboxDir(input.to)
      await mkdir(dir, { recursive: true })
      await writeAtomic(join(dir, `${message.id}.json`), message)
      return message
    },

    async receive(query: ParacrineQuery): Promise<ParacrineMessage[]> {
      assertAgentId(query.for, 'mailbox')
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
          const receipt = join(readsRoot, message.id, `${query.for}.json`)
          if (
            !(await stat(receipt).then(
              () => true,
              () => false,
            ))
          )
            unread.add(message.id)
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
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/.test(messageId)) {
        throw new Error(`Invalid paracrine message id: ${JSON.stringify(messageId)}`)
      }
      // The receipt file's NAME is its meaning ("`by` read `messageId`"), so
      // the write is idempotent by construction: concurrent acks converge on
      // the same path with the same meaning and a fresh timestamp.
      const dir = join(readsRoot, messageId)
      await mkdir(dir, { recursive: true })
      await writeAtomic(join(dir, `${by}.json`), {
        messageId,
        by,
        at: new Date().toISOString(),
      } satisfies ParacrineRead)
    },

    async reads(messageId: string): Promise<ParacrineRead[]> {
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/.test(messageId)) {
        throw new Error(`Invalid paracrine message id: ${JSON.stringify(messageId)}`)
      }
      let names: string[]
      try {
        names = await readdir(join(readsRoot, messageId))
      } catch (_error) {
        // No receipts directory for this message: nobody has read it.
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
        // No messages root: nothing was ever sent, so nothing can be purged.
        return 0
      }
      for (const mailbox of mailboxes) {
        const dir = mailboxDir(mailbox)
        for (const message of await readMailbox(dir)) {
          if (Date.parse(message.sentAt) >= beforeMs) continue
          await rm(join(dir, `${message.id}.json`), { force: true })
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
