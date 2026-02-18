/**
 * Payment type definitions.
 * @module
 */

/**
 * Every available platform.
 *
 * Open string type so new payment platforms can be added without modifying
 * this package. Well-known values include 'stripe', 'apple', and 'google'.
 */
export type PlatformKey = string

/**
 * Every available plan alias.
 */
export type PlanAlias = '' | 'monthly' | 'yearly'

/**
 * Every available plan period.
 */
export type PlanPeriod = '' | 'month' | 'year'

/**
 * The payment's properties.
 */
export interface Props {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  platformKey: PlatformKey
  transactionId?: string
  productId: string
  data?: Record<string, unknown>
  receipt?: string
}

/**
 * Properties when creating a payment.
 */
export type CreateProps = Pick<
  Props,
  | 'createdAt'
  | 'updatedAt'
  | 'userId'
  | 'platformKey'
  | 'transactionId'
  | 'productId'
  | 'data'
  | 'receipt'
>

/**
 * Properties when updating a payment.
 */
export type UpdateProps = Partial<Pick<Props, 'data' | 'receipt'>>

/**
 * A plan's properties.
 */
export interface Plan {
  planKey: string
  platformKey: PlatformKey
  platformProductId: string
  alias: PlanAlias
  period: PlanPeriod
  price: string
  autoRenews?: boolean
  title: string
  titleKey: string
  description: string
  descriptionKey: string
  shortDescription?: string
  shortDescriptionKey?: string
  highlightedDescription?: string
  highlightedDescriptionKey?: string
  capabilities: {
    premium: boolean
  }
}

/**
 * Resource type.
 */
export interface Resource {
  name: string
  tableName: string
  schema: unknown
}
