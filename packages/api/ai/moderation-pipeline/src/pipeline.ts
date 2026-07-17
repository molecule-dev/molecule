/**
 * AI content-moderation pipeline.
 *
 * Pipe content through:
 * 1. AI classifier — scores categories
 * 2. Policy matcher — checks thresholds
 * 3. Action decision — allow / flag / block / redact
 * 4. Audit log — records what was decided + why
 *
 * @module
 */

import { requireProvider as requireAI } from '@molecule/api-ai'
import { create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import type {
  AuditLogRow,
  ClassificationResult,
  ModerationCategory,
  ModerationDecision,
  ModerationErrorAction,
  ModerationPolicy,
  ModerationScore,
} from './types.js'

const AUDIT_TABLE = 'moderation_audit_log'

/**
 * Behavior when the classifier fails and no real moderation signal exists.
 * `'flag'` (route to human review) is the safe default: a moderation control
 * must NOT silently allow un-moderated content on a transient classifier blip,
 * yet a hard `'block'` on every failure would break legitimate flows. The error
 * is always logged; `'allow'` (fail-open) and `'block'` (fail-closed) are
 * explicit opt-ins. See {@link ModerationPolicy.onError}.
 */
const DEFAULT_ON_ERROR: ModerationErrorAction = 'flag'

const CLASSIFY_PROMPT = `You are a content moderation classifier.

Score the following content from 0.0 (none) to 1.0 (extreme) for each category:
- hate (slurs, dehumanization)
- harassment (targeted abuse)
- sexual (explicit sexual content)
- self_harm (self-harm / suicide encouragement)
- violence (gore, threats of violence)
- illegal (illegal activity)
- spam (commercial spam, links, repetition)
- misinformation (knowingly false claims about real-world events)
- pii (personally identifiable information — emails, phone, address, SSN)

Respond with ONLY a JSON object mapping each category to its score and a brief reasoning string.
Format:
{
  "scores": { "hate": 0.0, "harassment": 0.0, "sexual": 0.0, "self_harm": 0.0, "violence": 0.0, "illegal": 0.0, "spam": 0.0, "misinformation": 0.0, "pii": 0.0 },
  "reasoning": "..."
}

Content:
{{CONTENT}}`

/** Default moderation policy applied when no explicit policy is provided. */
export const DEFAULT_POLICY: ModerationPolicy = {
  thresholds: {
    hate: 0.7,
    harassment: 0.7,
    sexual: 0.85,
    self_harm: 0.6,
    violence: 0.8,
    illegal: 0.7,
    spam: 0.9,
    misinformation: 0.8,
    pii: 0.7,
  },
  action: 'flag',
  defaultAction: 'allow',
  onError: 'flag',
}

/**
 * Resolves the effective {@link ModerationErrorAction} from an explicit policy
 * value, then the `MODERATION_ON_ERROR` env var, defaulting to
 * {@link DEFAULT_ON_ERROR}. Only the exact strings `'allow'`/`'block'`/`'flag'`
 * are honored; anything else falls through to the default.
 *
 * @param policy - The active moderation policy, if any.
 * @returns The effective action to take on classifier failure.
 */
function resolveErrorAction(policy?: ModerationPolicy): ModerationErrorAction {
  if (policy?.onError) return policy.onError
  const env =
    typeof process !== 'undefined' ? process.env?.MODERATION_ON_ERROR?.toLowerCase() : undefined
  if (env === 'allow' || env === 'block' || env === 'flag') return env
  return DEFAULT_ON_ERROR
}

/**
 * Classify content using the bonded AI provider.
 *
 * On a provider error/timeout, an in-band `error` stream event, or malformed
 * model output, this resolves to empty `scores` with `error` set — it does NOT
 * throw and does NOT fabricate a benign result. `moderate()` routes that
 * failure per `policy.onError`; direct callers MUST check `result.error` before
 * trusting an empty-scores result (an empty result with no `error` means the
 * model genuinely scored everything at 0).
 *
 * @param content - The content to classify.
 * @returns The classification result — scores + reasoning, or `error` on failure.
 */
export async function classify(content: string): Promise<ClassificationResult> {
  const ai = requireAI()
  let raw = ''
  let streamError: Error | null = null
  try {
    for await (const event of ai.chat({
      messages: [{ role: 'user', content: CLASSIFY_PROMPT.replace('{{CONTENT}}', content) }],
      temperature: 0,
    })) {
      // A ChatEvent's text payload is `content` (NOT `text`, which is the
      // ContentBlock shape) — reading `event.text` accumulated nothing.
      if (event.type === 'text') raw += event.content
      else if (event.type === 'error') {
        // In-band provider error — the classifier did not produce a usable
        // signal. Capture it so the caller fails per policy, never silently.
        streamError = new Error(event.message ?? 'AI provider returned an error event')
      }
    }
  } catch (error) {
    // The chat call/stream threw (connection error, timeout, aborted). Same as
    // an in-band error: no usable signal — surface it, don't swallow it.
    streamError = error instanceof Error ? error : new Error(String(error))
  }

  if (streamError) {
    return {
      scores: [],
      reasoning: `classifier failed: ${streamError.message}`,
      error: streamError,
    }
  }

  try {
    // Strip optional ```json fences
    const json = raw
      .replace(/```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    const parsed = JSON.parse(json) as {
      scores: Record<string, number>
      reasoning: string
    }
    const scores: ModerationScore[] = Object.entries(parsed.scores).map(([category, score]) => ({
      category: category as ModerationCategory,
      score: Math.max(0, Math.min(1, Number(score) || 0)),
    }))
    return { scores, reasoning: parsed.reasoning ?? '' }
  } catch (error) {
    // The model returned non-JSON or structurally invalid output — there is no
    // usable moderation signal. Return empty scores WITH `error` set so the
    // pipeline routes per policy.onError instead of treating this as an allow.
    return {
      scores: [],
      reasoning: 'classifier returned malformed JSON',
      error: error instanceof Error ? error : new Error('classifier returned malformed JSON'),
    }
  }
}

/** Apply a policy to classifier scores → moderation decision. */
export function applyPolicy(
  scores: ModerationScore[],
  reasoning: string,
  policy: ModerationPolicy = DEFAULT_POLICY,
): ModerationDecision {
  let matched: ModerationCategory | null = null
  let maxOver = 0
  for (const s of scores) {
    const threshold = policy.thresholds[s.category]
    if (threshold === undefined) continue
    if (s.score >= threshold) {
      const over = s.score - threshold
      if (matched === null || over > maxOver) {
        maxOver = over
        matched = s.category
      }
    }
  }
  return {
    action: matched ? policy.action : (policy.defaultAction ?? 'allow'),
    scores,
    reasoning,
    matched_category: matched,
    flagged: !!matched,
  }
}

/** Full pipeline — classify + decide + audit. Returns the decision. */
export async function moderate(opts: {
  content: string
  policy?: ModerationPolicy
  ownerId?: string | null
  resource?: { type: string; id: string }
  /** Whether to write the audit log row. Defaults to true. */
  audit?: boolean
}): Promise<ModerationDecision> {
  const policy = opts.policy ?? DEFAULT_POLICY
  const result = await classify(opts.content)

  let decision: ModerationDecision
  if (result.error) {
    // The classifier failed — there is NO real moderation signal. Route per
    // policy.onError instead of silently allowing un-moderated content, and
    // ALWAYS log the failure loudly (the real bug was swallowing it).
    const onError = resolveErrorAction(policy)
    logger.error(
      `[api-ai-moderation-pipeline] classifier failed; applying onError='${onError}' ` +
        `(content ${onError === 'block' ? 'BLOCKED' : onError === 'flag' ? 'FLAGGED for review' : 'ALLOWED un-moderated'}). ` +
        'Moderation is degraded until the classifier recovers.',
      { error: result.error },
    )
    decision = {
      action: onError,
      scores: result.scores,
      reasoning: result.reasoning,
      matched_category: null,
      flagged: onError !== 'allow',
      errored: true,
    }
  } else {
    decision = applyPolicy(result.scores, result.reasoning, policy)
  }

  if (opts.audit !== false) {
    try {
      await create<AuditLogRow>(AUDIT_TABLE, {
        owner_id: opts.ownerId ?? null,
        content_excerpt: opts.content.slice(0, 500),
        decision: decision.action,
        matched_category: decision.matched_category,
        scores: decision.scores,
        reasoning: decision.reasoning,
        resource_type: opts.resource?.type ?? null,
        resource_id: opts.resource?.id ?? null,
      } as Partial<AuditLogRow>)
    } catch (error) {
      // Audit is best-effort — a DB write failure must not block the moderation
      // decision returned to the caller — but it must NEVER be silently dropped:
      // an unwritten audit row is a lost compliance/security record, so warn
      // with the error (the decision itself still stands).
      logger.warn(
        `[api-ai-moderation-pipeline] audit-log write to '${AUDIT_TABLE}' failed; ` +
          'the moderation decision still stands but no audit row was recorded.',
        { error },
      )
    }
  }

  return decision
}
