/** Content category assigned by the moderation pipeline. */
export type ModerationCategory =
  | 'hate'
  | 'harassment'
  | 'sexual'
  | 'self_harm'
  | 'violence'
  | 'illegal'
  | 'spam'
  | 'misinformation'
  | 'pii'
  | 'safe'

/** Action the pipeline takes after evaluating content against policy. */
export type ModerationAction = 'allow' | 'flag' | 'block' | 'redact'

/**
 * Action taken when the classifier itself FAILS to produce a usable signal —
 * a provider error/timeout, an in-band `error` event, or malformed model output.
 * There is no real moderation verdict in that case, so the pipeline routes per
 * this policy instead of silently allowing un-moderated content.
 *
 * - `'flag'` — route to human review (safe default; never a silent allow).
 * - `'block'` — fail closed (deny the content).
 * - `'allow'` — explicit opt-in to fail OPEN (content passes un-moderated).
 */
export type ModerationErrorAction = 'allow' | 'flag' | 'block'

/** Per-category confidence score produced by a moderation classifier. */
export interface ModerationScore {
  category: ModerationCategory
  /** 0..1 confidence. */
  score: number
}

/** Final verdict returned by the pipeline for a piece of content. */
export interface ModerationDecision {
  action: ModerationAction
  scores: ModerationScore[]
  reasoning: string
  /** Most severe matched category, if any. */
  matched_category: ModerationCategory | null
  /** True if any non-safe category exceeded its policy threshold. */
  flagged: boolean
  /**
   * True when this decision came from a classifier FAILURE routed through
   * `policy.onError` (no real moderation signal), rather than a real verdict.
   * Lets callers/audits distinguish a fail-safe `'flag'`/`'block'` from a
   * genuine one. Absent (undefined) on normal decisions.
   */
  errored?: boolean
}

/** Result of a single classification attempt against the bonded AI provider. */
export interface ClassificationResult {
  scores: ModerationScore[]
  reasoning: string
  /**
   * Set when the classifier FAILED to produce a usable signal — a provider
   * error/timeout, an in-band `error` event, or malformed model output. When
   * present, `scores` is empty; the pipeline routes per `policy.onError`
   * instead of treating the empty scores as an allow. `moderate()` handles this
   * for you; direct `classify()` callers MUST check `error` before trusting an
   * empty-scores result.
   */
  error?: Error
}

/** Per-category thresholds and actions that govern moderation decisions. */
export interface ModerationPolicy {
  /** Threshold per category — content above this score triggers the action. */
  thresholds: Partial<Record<ModerationCategory, number>>
  /** What action to take when any threshold is exceeded. */
  action: ModerationAction
  /** Default action when no threshold is exceeded. */
  defaultAction?: ModerationAction
  /**
   * What to do when classification FAILS (provider error/timeout or malformed
   * output) — i.e. when there is no real moderation signal. Defaults to
   * `'flag'` (route to human review) so a transient classifier blip never
   * silently ALLOWS un-moderated content. Set `'allow'` to explicitly opt into
   * fail-open, or `'block'` to fail closed. When omitted, the
   * `MODERATION_ON_ERROR` env var is consulted, then falls back to `'flag'`.
   */
  onError?: ModerationErrorAction
}

/** Database row shape for a single moderation audit-log entry. */
export interface AuditLogRow {
  id: string
  owner_id: string | null
  content_excerpt: string
  decision: ModerationAction
  matched_category: ModerationCategory | null
  scores: ModerationScore[]
  reasoning: string
  resource_type: string | null
  resource_id: string | null
  created_at: string | Date
}
