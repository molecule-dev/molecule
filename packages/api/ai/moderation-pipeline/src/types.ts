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

export type ModerationAction = 'allow' | 'flag' | 'block' | 'redact'

export interface ModerationScore {
  category: ModerationCategory
  /** 0..1 confidence. */
  score: number
}

export interface ModerationDecision {
  action: ModerationAction
  scores: ModerationScore[]
  reasoning: string
  /** Most severe matched category, if any. */
  matched_category: ModerationCategory | null
  /** True if any non-safe category exceeded its policy threshold. */
  flagged: boolean
}

export interface ModerationPolicy {
  /** Threshold per category — content above this score triggers the action. */
  thresholds: Partial<Record<ModerationCategory, number>>
  /** What action to take when any threshold is exceeded. */
  action: ModerationAction
  /** Default action when no threshold is exceeded. */
  defaultAction?: ModerationAction
}

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
