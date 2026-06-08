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
}

/** Per-category thresholds and actions that govern moderation decisions. */
export interface ModerationPolicy {
  /** Threshold per category — content above this score triggers the action. */
  thresholds: Partial<Record<ModerationCategory, number>>
  /** What action to take when any threshold is exceeded. */
  action: ModerationAction
  /** Default action when no threshold is exceeded. */
  defaultAction?: ModerationAction
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
