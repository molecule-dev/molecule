import type { ParacrineAgentId, ParacrineMessage, ParacrineProvider } from '@molecule/api-paracrine'

/** One atomically claimed delivery. The token identifies this claim generation. */
export interface ParacrineFileClaim {
  message: ParacrineMessage
  messageId: string
  recipientId: ParacrineAgentId
  claimToken: string
}

/** The stable fields needed to acknowledge or release a claim. */
export interface ParacrineFileClaimReference {
  messageId: string
  recipientId: ParacrineAgentId
  claimToken: string
}

/** Options for bounded pending delivery selection. */
export interface ParacrineFileClaimOptions {
  since?: string
  limit?: number
  leaseMs?: number
}

/** A bounded set of claims and the number of eligible deliveries left waiting. */
export interface ParacrineFileClaimedPending {
  claims: ParacrineFileClaim[]
  hidden: number
}

/** The file store's delivery operations; the core mailbox contract stays unchanged. */
export type ParacrineFileProvider = ParacrineProvider & {
  /** List pending ids using the previous filename-shaped representation. */
  pending(recipient: ParacrineAgentId): Promise<string[]>
  /** Claim at most `limit` pending or lease-expired deliveries in one transaction. */
  claimPending(
    recipient: ParacrineAgentId,
    options?: ParacrineFileClaimOptions,
  ): Promise<ParacrineFileClaimedPending>
  /** Acknowledge only claims still owned by their supplied tokens. */
  acknowledgeClaims(claims: ParacrineFileClaimReference[], by: ParacrineAgentId): Promise<void>
  /** Return only claims still owned by their supplied tokens to pending. */
  releaseClaims(claims: ParacrineFileClaimReference[]): Promise<void>
  /** Close this provider's database handle. */
  close(): void
}
