/**
 * The `paracrine` CLI — a harness with no bond support still participates.
 *
 * Zero flags-framework, zero dependencies: plain argv parsing, JSON out (one
 * object per line for lists, so a shell loop can consume it), `--text` for a
 * human-readable form. Every command works on the same store the bond uses
 * (`PARACRINE_DIR` or `~/.agents/paracrine`), so a CLI send is visible to a
 * bonded receiver and vice versa.
 *
 * ```text
 * paracrine send  --from <id> --to <id|*> [--subject <line>] [--thread <id>] <body>
 * paracrine recv  --for <id> [--since <iso>] [--unread] [--prefix <subject-prefix>]
 * paracrine ack   --for <id> <message-id> [<message-id> …]
 * paracrine reads <message-id>
 * ```
 *
 * @module
 */

import { createProvider, type ParacrineFileConfig } from './provider.js'

/** One CLI usage error: prints usage and exits 2. */
class UsageError extends Error {}

/** Parse `--flag value` and `--flag` (boolean) argv shapes into a map. */
const parseArgs = (argv: string[]): { flags: Map<string, string | true>; rest: string[] } => {
  const flags = new Map<string, string | true>()
  const rest: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      rest.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = argv[index + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(key, next)
      index += 1
    } else {
      flags.set(key, true)
    }
  }
  return { flags, rest }
}

const string = (flags: Map<string, string | true>, key: string): string => {
  const value = flags.get(key)
  if (typeof value !== 'string' || value === '') {
    throw new UsageError(`--${key} <value> is required`)
  }
  return value
}

/** Split CLI output lines: JSON by default, `--text` for humans. */
const render = <T>(value: T, text: (value: T) => string, asText: boolean): string =>
  asText ? text(value) : JSON.stringify(value)

/**
 * Run the CLI. Exports for tests; `bin/paracrine.mjs` calls this with
 * `process.argv.slice(2)`.
 *
 * @param argv - The arguments after the command name.
 * @param config - Store configuration override (tests).
 * @returns The lines to print.
 */
export async function runCli(argv: string[], config: ParacrineFileConfig = {}): Promise<string[]> {
  const [command, ...commandArgs] = argv
  const { flags, rest } = parseArgs(commandArgs)
  const asText = flags.get('text') === true
  const store = createProvider(config)
  switch (command) {
    case 'send': {
      const body = rest.join(' ')
      if (body === '') throw new UsageError('a message body is required: send … <body>')
      const message = await store.send({
        from: string(flags, 'from'),
        to: string(flags, 'to'),
        ...(flags.has('subject') ? { subject: String(flags.get('subject')) } : {}),
        ...(flags.has('thread') ? { threadId: string(flags, 'thread') } : {}),
        body,
      })
      return [render(message, (m) => `sent ${m.id} -> ${m.to}`, asText)]
    }
    case 'recv': {
      const messages = await store.receive({
        for: string(flags, 'for'),
        ...(flags.has('since') ? { since: string(flags, 'since') } : {}),
        ...(flags.get('unread') === true ? { unreadOnly: true } : {}),
        ...(flags.has('prefix') ? { subjectPrefix: string(flags, 'prefix') } : {}),
      })
      if (messages.length === 0) return [asText ? '(no messages)' : '[]']
      return messages.map((message) =>
        render(
          message,
          (m) =>
            `${m.sentAt} ${m.from} -> ${m.to}${m.subject === undefined ? '' : ` — ${m.subject}`}\n${m.body}`,
          asText,
        ),
      )
    }
    case 'ack': {
      if (rest.length === 0) throw new UsageError('ack needs at least one message id')
      const by = string(flags, 'for')
      for (const messageId of rest) await store.ack(messageId, by)
      return [`acked ${rest.length} message(s) for ${by}`]
    }
    case 'reads': {
      if (rest.length !== 1) throw new UsageError('reads needs exactly one message id')
      const reads = await store.reads(rest[0] ?? '')
      if (reads.length === 0) return [asText ? '(no receipts)' : '[]']
      return reads.map((read) => render(read, (r) => `read by ${r.by} at ${r.at}`, asText))
    }
    default:
      throw new UsageError(
        'usage: paracrine <send|recv|ack|reads> …  (send --from A --to B|--to * body; ' +
          'recv --for A [--unread]; ack --for A <id…>; reads <id>)',
      )
  }
}
