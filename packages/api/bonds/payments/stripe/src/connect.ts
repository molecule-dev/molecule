/**
 * Stripe Connect support for the Stripe payment provider.
 *
 * Adds split-payment / payouts helpers on top of the existing
 * `@molecule/api-payments-stripe` bond surface so multi-vendor / two-sided
 * marketplace apps (course-marketplace, food-delivery, multi-vendor-marketplace,
 * rental-marketplace, tutoring-marketplace, venue-booking, crowdfunding,
 * pet-care, telemedicine, etc.) can:
 *   - Onboard sellers / drivers / providers (`createConnectedAccount` + `createAccountLink`).
 *   - Move funds into connected accounts (`createTransfer`).
 *   - Trigger payouts (`createPayout`).
 *   - Inspect onboarding/eligibility status (`getAccountStatus`).
 *   - Handle Connect-specific webhooks (`processConnectWebhook`).
 *
 * @see https://stripe.com/docs/connect
 *
 * @module
 */

import type Stripe from 'stripe'

import { getLogger } from '@molecule/api-bond'

import { getClient, verifyWebhookSignature } from './provider.js'

const logger = getLogger()

/**
 * Connected account type.
 *
 * Stripe distinguishes three account types with different
 * onboarding / dashboard responsibilities. See
 * https://stripe.com/docs/connect/accounts.
 */
export type ConnectedAccountType = 'standard' | 'express' | 'custom'

/**
 * Subset of Stripe `business_profile` fields commonly set during marketplace
 * onboarding.
 */
export interface ConnectedAccountBusinessProfile {
  name?: string
  url?: string
  productDescription?: string
  supportEmail?: string
  supportPhone?: string
  mcc?: string
}

/**
 * Parameters for creating a connected account.
 */
export interface CreateConnectedAccountParams {
  /** Stripe account type — `standard`, `express`, or `custom`. */
  type: ConnectedAccountType
  /** Two-letter ISO country code for the account holder (e.g. `US`, `GB`). */
  country: string
  /** Email address of the account holder. */
  email: string
  /** Optional business profile fields (display name, website, MCC, etc.). */
  businessProfile?: ConnectedAccountBusinessProfile
  /** Optional metadata to attach to the connected account. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}

/**
 * Result of creating a connected account.
 */
export interface CreateConnectedAccountResult {
  /** Stripe connected account ID (`acct_...`). */
  id: string
  /** Optional onboarding URL (only present when an account link is created in the same flow). */
  accountLinkUrl?: string
}

/**
 * Account-link types — onboarding (first-time) vs update (returning).
 */
export type AccountLinkType = 'account_onboarding' | 'account_update'

/**
 * Parameters for creating an account link.
 */
export interface CreateAccountLinkParams {
  /** Stripe connected account ID (`acct_...`). */
  accountId: string
  /** URL Stripe redirects the user back to after onboarding completes. */
  returnUrl: string
  /** URL Stripe redirects the user to if the link expires before completion. */
  refreshUrl: string
  /** Whether this is a first-time onboarding link or an update link. */
  type: AccountLinkType
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}

/**
 * Result of creating an account link.
 */
export interface CreateAccountLinkResult {
  /** Hosted onboarding URL the connected account holder should open. */
  url: string
  /** Unix timestamp (seconds) when the link expires. */
  expiresAt: number
}

/**
 * Parameters for creating a transfer to a connected account.
 */
export interface CreateTransferParams {
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amount: number
  /** Three-letter ISO currency code, lowercase (e.g. `usd`). */
  currency: string
  /** Destination connected account ID (`acct_...`). */
  destination: string
  /** Optional source charge to attach the transfer to (for separate-charges-and-transfers flow). */
  sourceTransaction?: string
  /** Optional transfer group string (groups related transfers/charges together). */
  transferGroup?: string
  /** Optional metadata. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}

/**
 * Result of creating a transfer.
 */
export interface CreateTransferResult {
  /** Stripe transfer ID (`tr_...`). */
  id: string
  /** Amount transferred (smallest currency unit). */
  amount: number
  /** Three-letter ISO currency code. */
  currency: string
  /** Destination connected account ID. */
  destination: string
  /** Transfer group, if set. */
  transferGroup?: string
}

/**
 * Parameters for creating a payout from a connected account's Stripe balance to its bank account.
 */
export interface CreatePayoutParams {
  /** Connected account ID to issue the payout from (`acct_...`). */
  accountId: string
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amount: number
  /** Three-letter ISO currency code, lowercase (e.g. `usd`). */
  currency: string
  /** Optional payout method — `standard` or `instant`. */
  method?: 'standard' | 'instant'
  /** Optional metadata. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}

/**
 * Result of creating a payout.
 */
export interface CreatePayoutResult {
  /** Stripe payout ID (`po_...`). */
  id: string
  /** Amount paid out (smallest currency unit). */
  amount: number
  /** Three-letter ISO currency code. */
  currency: string
  /** Payout status (e.g. `pending`, `paid`, `failed`). */
  status: string
  /** Estimated arrival date (Unix timestamp in seconds). */
  arrivalDate: number
}

/**
 * Connected-account onboarding / payout eligibility status.
 */
export interface AccountStatus {
  /** Stripe connected account ID. */
  id: string
  /** Whether the account can accept charges. */
  chargesEnabled: boolean
  /** Whether the account can receive payouts. */
  payoutsEnabled: boolean
  /** Whether there are any currently-due requirements (Stripe is blocked on something). */
  requirementsCurrent: boolean
  /** Stripe connected-account type (`standard`, `express`, `custom`), if known. */
  type?: ConnectedAccountType
  /** Currently-due requirement IDs from Stripe (empty when nothing is due). */
  currentlyDue: readonly string[]
}

/**
 * Connect webhook event types this provider knows how to interpret.
 *
 * `unknown` is returned for any other Stripe event so callers can fall
 * through to the standard subscription webhook handler if needed.
 */
export type ConnectWebhookEventType =
  | 'account.updated'
  | 'payout.created'
  | 'transfer.created'
  | 'application_fee.refunded'
  | 'unknown'

/**
 * Normalized Connect webhook event.
 *
 * Provider-agnostic shape so consumers don't have to import Stripe types
 * to dispatch on event kind.
 */
export interface ConnectWebhookEvent {
  /** Recognized Connect event type, or `unknown` for unrelated events. */
  type: ConnectWebhookEventType
  /** Original Stripe event type string (e.g. `account.updated`). */
  rawType: string
  /** The ID of the primary resource this event is about (account, payout, transfer, fee). */
  resourceId?: string
  /** The connected account this event applies to, if Stripe sent one. */
  accountId?: string
  /** Raw event-data object (plain JSON shape — never the live Stripe object). */
  data: Record<string, unknown>
}

/**
 * Maps the in-bond business-profile shape to Stripe SDK params.
 *
 * @param profile - The optional business profile.
 * @returns A Stripe-compatible business_profile object, or `undefined` if no profile was provided.
 */
const toStripeBusinessProfile = (
  profile: ConnectedAccountBusinessProfile | undefined,
): Stripe.AccountCreateParams.BusinessProfile | undefined => {
  if (!profile) return undefined
  const out: Stripe.AccountCreateParams.BusinessProfile = {}
  if (profile.name !== undefined) out.name = profile.name
  if (profile.url !== undefined) out.url = profile.url
  if (profile.productDescription !== undefined) out.product_description = profile.productDescription
  if (profile.supportEmail !== undefined) out.support_email = profile.supportEmail
  if (profile.supportPhone !== undefined) out.support_phone = profile.supportPhone
  if (profile.mcc !== undefined) out.mcc = profile.mcc
  return out
}

/**
 * Creates a Stripe connected account for a marketplace seller / driver / provider.
 *
 * @param params - Connected-account creation parameters.
 * @returns The new account ID.
 */
export const createConnectedAccount = async (
  params: CreateConnectedAccountParams,
): Promise<CreateConnectedAccountResult> => {
  try {
    const account = await getClient().accounts.create(
      {
        type: params.type,
        country: params.country,
        email: params.email,
        business_profile: toStripeBusinessProfile(params.businessProfile),
        metadata: params.metadata,
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    )
    return { id: account.id }
  } catch (error) {
    logger.error('Error creating Stripe connected account:', error)
    throw error
  }
}

/**
 * Creates a Stripe account link the connected account holder uses to finish
 * onboarding (or to update payout details).
 *
 * @param params - Account-link creation parameters.
 * @returns The hosted onboarding/update URL and its expiry (Unix timestamp, seconds).
 */
export const createAccountLink = async (
  params: CreateAccountLinkParams,
): Promise<CreateAccountLinkResult> => {
  try {
    const link = await getClient().accountLinks.create(
      {
        account: params.accountId,
        return_url: params.returnUrl,
        refresh_url: params.refreshUrl,
        type: params.type,
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    )
    return { url: link.url, expiresAt: link.expires_at }
  } catch (error) {
    logger.error('Error creating Stripe account link:', error)
    throw error
  }
}

/**
 * Transfers funds from the platform balance to a connected account.
 *
 * @param params - Transfer parameters.
 * @returns The created transfer.
 */
export const createTransfer = async (
  params: CreateTransferParams,
): Promise<CreateTransferResult> => {
  try {
    const transfer = await getClient().transfers.create(
      {
        amount: params.amount,
        currency: params.currency,
        destination: params.destination,
        source_transaction: params.sourceTransaction,
        transfer_group: params.transferGroup,
        metadata: params.metadata,
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    )
    return {
      id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination:
        typeof transfer.destination === 'string'
          ? transfer.destination
          : (transfer.destination as { id?: string } | null)?.id || '',
      transferGroup: transfer.transfer_group ?? undefined,
    }
  } catch (error) {
    logger.error('Error creating Stripe transfer:', error)
    throw error
  }
}

/**
 * Issues a payout from a connected account's Stripe balance to its bank account.
 *
 * Uses Stripe's `Stripe-Account` header to scope the call to the connected account.
 *
 * @param params - Payout parameters.
 * @returns The created payout.
 */
export const createPayout = async (params: CreatePayoutParams): Promise<CreatePayoutResult> => {
  try {
    const requestOptions: Stripe.RequestOptions = { stripeAccount: params.accountId }
    if (params.idempotencyKey) requestOptions.idempotencyKey = params.idempotencyKey

    const payout = await getClient().payouts.create(
      {
        amount: params.amount,
        currency: params.currency,
        method: params.method,
        metadata: params.metadata,
      },
      requestOptions,
    )
    return {
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrival_date,
    }
  } catch (error) {
    logger.error('Error creating Stripe payout:', error)
    throw error
  }
}

/**
 * Looks up a connected account's onboarding / payout status.
 *
 * @param accountId - Stripe connected account ID (`acct_...`).
 * @returns Normalized account status.
 */
export const getAccountStatus = async (accountId: string): Promise<AccountStatus> => {
  try {
    const account = await getClient().accounts.retrieve(accountId)
    const currentlyDue = account.requirements?.currently_due ?? []
    return {
      id: account.id,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      requirementsCurrent: currentlyDue.length === 0,
      type: account.type as ConnectedAccountType | undefined,
      currentlyDue: [...currentlyDue],
    }
  } catch (error) {
    logger.error('Error retrieving Stripe connected account:', error)
    throw error
  }
}

/**
 * Maps a Stripe event type to the recognized Connect event type.
 *
 * @param raw - The raw Stripe event type.
 * @returns The recognized event type, or `unknown`.
 */
const toConnectEventType = (raw: string): ConnectWebhookEventType => {
  switch (raw) {
    case 'account.updated':
    case 'payout.created':
    case 'transfer.created':
    case 'application_fee.refunded':
      return raw
    default:
      return 'unknown'
  }
}

/**
 * Verifies and normalizes a Stripe Connect webhook event.
 *
 * Reuses the same `STRIPE_WEBHOOK_SECRET` env var as the standard webhook
 * pipeline (and the same signature verification logic) — Connect events
 * arrive on the same webhook endpoint when the platform's webhook is
 * configured to receive Connect events.
 *
 * @param headers - Request headers (looks up `stripe-signature`).
 * @param body - The raw request body (string or Buffer).
 * @returns The verified, normalized Connect webhook event.
 */
export const processConnectWebhook = (
  headers: Record<string, string | string[] | undefined>,
  body: string | Buffer,
): ConnectWebhookEvent => {
  const sigHeader = headers['stripe-signature']
  const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader
  if (!signature) {
    throw new Error('Missing stripe-signature header')
  }

  const verified = verifyWebhookSignature(body, signature)
  const rawType = verified.type
  const data = verified.data.object
  const accountIdFromHeader = headers['stripe-account']
  const accountId = Array.isArray(accountIdFromHeader)
    ? accountIdFromHeader[0]
    : accountIdFromHeader

  const resourceId = typeof data.id === 'string' ? data.id : undefined
  const dataAccount = typeof data.account === 'string' ? data.account : undefined

  return {
    type: toConnectEventType(rawType),
    rawType,
    resourceId,
    accountId: accountId || dataAccount,
    data,
  }
}
