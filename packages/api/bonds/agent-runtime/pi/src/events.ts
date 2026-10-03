/**
 * Reader for the JSONL event stream `pi --mode json` writes to stdout.
 *
 * Verified 2026-10-03 against `packages/coding-agent/docs/json.md` and a real
 * `@earendil-works/pi-coding-agent@1.0.0` run: one session header
 * (`{"type":"session","version":3,…}`), then session events. Records are
 * framed by LF only — U+2028 / U+2029 inside a JSON string are content, not
 * record boundaries (which is why Node's `readline` must not be used here).
 *
 * @module
 */

import type { AgentRunUsage } from '@molecule/api-agent-run'

/** Pi's per-response usage (the fields this reader sums). */
interface PiUsage {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
}

/** The parts of a Pi assistant message this reader looks at. */
interface PiAssistantMessage {
  role: 'assistant'
  content?: Array<{ type?: string; text?: string }>
  provider?: string
  model?: string
  usage?: PiUsage
  stopReason?: string
  errorMessage?: string
}

/** What one `pi --mode json` invocation reported, condensed. */
export interface PiRunSummary {
  /** Whether the stream opened with Pi's session header. */
  sawSessionHeader: boolean
  /** Whether `agent_settled` arrived — Pi's "no more automatic work" signal. */
  settled: boolean
  /** `stopReason` of the last completed assistant message (`stop`, `toolUse`, `length`, `error`, `aborted`, …). */
  lastStopReason?: string
  /** `errorMessage` of the last completed assistant message, when it failed. */
  lastErrorMessage?: string
  /** Prose of the last completed assistant message. */
  lastText: string
  /** Every distinct `provider/model` that answered, in order of first appearance. */
  answeredBy: string[]
  /** The final error of an automatic retry sequence that gave up. */
  retryFailure?: string
  /** Token usage summed over every assistant `message_end` and every successful compaction. */
  usage?: AgentRunUsage
  /** One short line per tool call and notable event, for the run's logs. */
  lines: string[]
  /** Records that were not JSON (Pi reserves stdout for JSONL, so these are anomalies). */
  unparsed: number
}

/**
 * Split a JSONL stream into records exactly as Pi's framing requires: on LF
 * only, stripping one optional preceding CR. Blank records are dropped.
 *
 * @param text - Raw stdout.
 * @returns The record strings.
 */
export function splitJsonlRecords(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const record = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (record.trim()) out.push(record)
  }
  return out
}

/**
 * Add one usage block to a running total.
 *
 * @param total - The running total, or undefined before the first block.
 * @param u - Pi's usage block.
 * @returns The new total.
 */
function addUsage(
  total: AgentRunUsage | undefined,
  u: PiUsage | undefined,
): AgentRunUsage | undefined {
  if (!u || typeof u !== 'object') return total
  const next: AgentRunUsage = total ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  }
  next.inputTokens += u.input ?? 0
  next.outputTokens += u.output ?? 0
  next.cacheReadTokens = (next.cacheReadTokens ?? 0) + (u.cacheRead ?? 0)
  next.cacheCreationTokens = (next.cacheCreationTokens ?? 0) + (u.cacheWrite ?? 0)
  return next
}

/**
 * Condense a `pi --mode json` stdout into what the runtime reports.
 *
 * @param stdout - The raw JSONL stream.
 * @returns The run summary.
 */
export function summarizePiEvents(stdout: string): PiRunSummary {
  const summary: PiRunSummary = {
    sawSessionHeader: false,
    settled: false,
    lastText: '',
    answeredBy: [],
    lines: [],
    unparsed: 0,
  }
  const records = splitJsonlRecords(stdout)
  records.forEach((record, index) => {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(record) as Record<string, unknown>
    } catch (_error) {
      // Pi keeps diagnostics on stderr; a non-JSON stdout record is counted
      // (and reported in the logs) rather than failing the whole parse.
      summary.unparsed++
      return
    }
    if (!event || typeof event !== 'object') return
    switch (event.type) {
      case 'session':
        if (index === 0) summary.sawSessionHeader = true
        break
      case 'agent_settled':
        summary.settled = true
        break
      case 'message_end': {
        const message = event.message as PiAssistantMessage | undefined
        if (!message || message.role !== 'assistant') break
        summary.usage = addUsage(summary.usage, message.usage)
        summary.lastStopReason = message.stopReason
        summary.lastErrorMessage = message.errorMessage
        summary.lastText = (message.content ?? [])
          .filter((b) => b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text)
          .join('\n\n')
        if (message.provider && message.model) {
          const who = `${message.provider}/${message.model}`
          if (!summary.answeredBy.includes(who)) summary.answeredBy.push(who)
        }
        if (message.stopReason === 'error' || message.stopReason === 'aborted') {
          summary.lines.push(`[pi] assistant ${message.stopReason}: ${message.errorMessage ?? ''}`)
        }
        break
      }
      case 'tool_execution_start': {
        const args = event.args as Record<string, unknown> | undefined
        const detail =
          typeof args?.command === 'string'
            ? args.command
            : typeof args?.path === 'string'
              ? args.path
              : ''
        summary.lines.push(`[pi] ${String(event.toolName)} ${detail}`.trimEnd().slice(0, 300))
        break
      }
      case 'tool_execution_end':
        if (event.isError === true) summary.lines.push(`[pi] ${String(event.toolName)} failed`)
        break
      case 'compaction_end': {
        const result = event.result as { usage?: PiUsage } | undefined
        summary.usage = addUsage(summary.usage, result?.usage)
        summary.lines.push(`[pi] context compacted (${String(event.reason)})`)
        break
      }
      case 'auto_retry_start':
        summary.lines.push(
          `[pi] retry ${String(event.attempt)}/${String(event.maxAttempts)}: ${String(event.errorMessage ?? '')}`,
        )
        break
      case 'auto_retry_end':
        if (event.success === false) {
          summary.retryFailure = String(event.finalError ?? 'retries exhausted')
          summary.lines.push(`[pi] retries exhausted: ${summary.retryFailure}`)
        } else {
          summary.retryFailure = undefined
        }
        break
      default:
        break
    }
  })
  return summary
}
