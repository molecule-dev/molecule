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

import type {
  AuditLogRow,
  ModerationCategory,
  ModerationDecision,
  ModerationPolicy,
  ModerationScore,
} from './types.js'

const AUDIT_TABLE = 'moderation_audit_log'

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
}

/** Classify content using the bonded AI provider. */
export async function classify(content: string): Promise<{
  scores: ModerationScore[]
  reasoning: string
}> {
  const ai = requireAI()
  let raw = ''
  for await (const event of ai.chat({
    messages: [{ role: 'user', content: CLASSIFY_PROMPT.replace('{{CONTENT}}', content) }],
    temperature: 0,
  })) {
    const e = event as { type: string; text?: string }
    if (e.type === 'text') raw += e.text ?? ''
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
  } catch {
    return { scores: [], reasoning: 'classifier returned malformed JSON' }
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
      if (over > maxOver) {
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
  const { scores, reasoning } = await classify(opts.content)
  const decision = applyPolicy(scores, reasoning, opts.policy)

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
    } catch {
      // Audit is best-effort.
    }
  }

  return decision
}
