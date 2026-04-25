/**
 * Express middleware factories for tier-based entitlements.
 *
 * `requireCategory` and `requireCategoryAtLeast` gate endpoints by the user's
 * tier category. `enforceLimit` checks a quantitative limit before allowing
 * the request to proceed (e.g. "max 10 projects per user").
 *
 * Tier-aware windowed rate limiting (e.g. "60 requests per minute on free,
 * 300 on pro") is intentionally not handled here — wire one
 * `@molecule/api-rate-limit` middleware per tier and dispatch on category,
 * or use the bonded rate-limit provider directly.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import { getCachedPlanKey } from './cache.js'
import { buildLimitError } from './error.js'
import { getProvider } from './provider.js'
import type { LimitErrorPayload, LimitType, Tier } from './types.js'

/**
 * Minimal request shape consumed by the entitlements middleware. The
 * structural type lets Express's full `Request` flow in transparently
 * (Express types are assignable to this) without forcing this package to
 * take a hard dependency on `express`.
 *
 * The middleware never reads off `req` directly; auth context lives on
 * `res.locals.session.userId` and is read via the response object instead.
 * The optional `_skipReason` field exists purely so this is not an empty
 * interface (which ESLint's `@typescript-eslint/no-empty-interface` flags).
 */
interface Request {
  /** Reserved — not consumed by the middleware. */
  readonly _skipReason?: never
}

/** Minimal response shape — Express's `Response` is assignable to this. */
interface Response {
  status(code: number): Response
  json(body: unknown): Response
  set(field: string, value: string): Response
  locals: { session?: { userId?: string } } & Record<string, unknown>
}

/** Express-compatible next function. */
type NextFunction = (err?: unknown) => void

/** Express-compatible request handler. */
export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>

/**
 * Resolves the effective tier for the user attached to the request via
 * `res.locals.session.userId`. Falls back to the registry's default tier
 * when no user is on the request, when the user record cannot be found, or
 * when the stored plan has expired.
 *
 * @param res - The response object whose `locals.session.userId` identifies the user.
 * @returns The user's effective tier.
 */
export const getEffectiveTier = async <TLimits = unknown>(
  res: Response,
): Promise<Tier<TLimits>> => {
  const registry = getProvider<TLimits>()
  const userId = res.locals?.session?.userId
  if (!userId) return registry.getDefaultTier()

  const planKey = await getCachedPlanKey(userId)
  return registry.findTier(planKey)
}

/**
 * Builds a 401 response payload for unauthenticated requests.
 *
 * @returns An error envelope shaped like `LimitErrorPayload` for client uniformity.
 */
const buildUnauthorizedPayload = (): { error: string } => ({
  error: t('entitlements.error.unauthenticated', undefined, {
    defaultValue: 'Authentication required.',
  }),
})

/**
 * Creates middleware that allows the request only when the user's tier
 * category is one of the listed values. Responds 401 if the request is
 * unauthenticated, 403 with a `LimitErrorPayload`-shaped body if the user's
 * tier is not in the list.
 *
 * @param allowedCategories - The tier categories that are permitted (e.g. `['pro', 'team']`).
 * @returns An Express request handler.
 */
export const requireCategory = <TLimits = unknown>(
  ...allowedCategories: string[]
): RequestHandler => {
  return async (_req, res, next) => {
    const userId = res.locals?.session?.userId
    if (!userId) {
      res.status(401).json(buildUnauthorizedPayload())
      return
    }

    const tier = await getEffectiveTier<TLimits>(res)
    if (!allowedCategories.includes(tier.category)) {
      const payload = buildLimitError<TLimits>({
        limitType: 'category',
        category: tier.category,
        currentLimit: 0,
      })
      res.status(403).json(payload)
      return
    }

    next()
  }
}

/**
 * Creates middleware that allows the request only when the user's tier
 * rank is at least as high as the named category. Useful for "pro and above"
 * style gates without listing every category individually.
 *
 * Apps must include all gated categories in `categoryOrder` when calling
 * `defineTiers(...)`; categories absent from the order produce `null` ranks
 * and therefore fail the check.
 *
 * @param minCategory - The minimum acceptable category.
 * @returns An Express request handler.
 */
export const requireCategoryAtLeast = <TLimits = unknown>(minCategory: string): RequestHandler => {
  return async (_req, res, next) => {
    const userId = res.locals?.session?.userId
    if (!userId) {
      res.status(401).json(buildUnauthorizedPayload())
      return
    }

    const registry = getProvider<TLimits>()
    const minRank = registry.getCategoryRank(minCategory)

    const tier = await getEffectiveTier<TLimits>(res)
    const userRank = registry.getCategoryRank(tier.category)

    if (minRank == null || userRank == null || userRank < minRank) {
      const payload = buildLimitError<TLimits>({
        limitType: 'categoryAtLeast',
        category: tier.category,
        currentLimit: userRank ?? 0,
      })
      res.status(403).json(payload)
      return
    }

    next()
  }
}

/** Options for the `enforceLimit` middleware. */
export interface EnforceLimitOptions<TLimits = unknown> {
  /** Stable identifier for the limit (used in error payloads, telemetry). */
  limitType: LimitType

  /**
   * Pulls the numeric cap out of the user's tier `limits` object.
   *
   * @param limits - The tier-specific limits.
   * @returns The numeric cap to enforce.
   */
  getLimit: (limits: TLimits) => number

  /**
   * Computes the user's current usage. Receives the userId resolved from the
   * session and the request object so apps can scope by additional fields
   * (e.g. organization, project) when needed.
   *
   * @param userId - The authenticated user ID.
   * @param req - The incoming request, in case scoping needs query/body data.
   * @returns The current usage count.
   */
  getCurrent: (userId: string, req: Request) => Promise<number> | number

  /**
   * Optional override for the response status. Defaults to 403; some apps
   * prefer 429 for usage-style limits.
   */
  status?: number
}

/**
 * Creates middleware that allows the request only when the user is below
 * their tier limit for the given resource. The user's tier `limits` object
 * supplies the cap, and the caller-supplied `getCurrent` function counts
 * the current usage.
 *
 * @param options - The limit type, limit accessor, and current-usage accessor.
 * @returns An Express request handler.
 *
 * @example
 * ```typescript
 * router.post('/posts',
 *   enforceLimit<BlogLimits>({
 *     limitType: 'maxPosts',
 *     getLimit: (limits) => limits.maxPosts,
 *     getCurrent: (userId) => count('posts', [{ field: 'userId', operator: '=', value: userId }]),
 *   }),
 *   handlers.createPost,
 * )
 * ```
 */
export const enforceLimit = <TLimits = unknown>(
  options: EnforceLimitOptions<TLimits>,
): RequestHandler => {
  const { limitType, getLimit, getCurrent, status = 403 } = options

  return async (req, res, next) => {
    const userId = res.locals?.session?.userId
    if (!userId) {
      res.status(401).json(buildUnauthorizedPayload())
      return
    }

    const tier = await getEffectiveTier<TLimits>(res)
    const limit = getLimit(tier.limits)
    const current = await getCurrent(userId, req)

    if (current >= limit) {
      const payload: LimitErrorPayload = buildLimitError<TLimits>({
        limitType,
        category: tier.category,
        currentLimit: limit,
        resolveUpgradedLimit: getLimit,
      })
      res.status(status).json(payload)
      return
    }

    next()
  }
}
