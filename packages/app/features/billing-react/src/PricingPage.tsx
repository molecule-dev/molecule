import type { ReactNode } from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { usePricingTiers, useStartCheckout } from './hooks.js'
import type { PricingTierEntry, PricingTierPrice } from './types.js'

/**
 * Container for a tier's feature list. Apps use this in their
 * `renderLimits` prop with `<LimitsItem>` children to get the polished
 * stacked-checklist layout (check icon prefix, muted/primary colors,
 * spacing) that matches the rest of `<PricingPage />`.
 *
 * @example
 * ```tsx
 * <PricingPage
 *   renderLimits={(limits) => (
 *     <LimitsList>
 *       <LimitsItem>{t('pricing.blocks', { count: limits.maxBlocks })}</LimitsItem>
 *       <LimitsItem included={limits.canExport}>{t('pricing.dataExport')}</LimitsItem>
 *     </LimitsList>
 *   )}
 * />
 * ```
 */
export function LimitsList({ children }: { children: ReactNode }): React.ReactElement {
  const cm = getClassMap()
  return (
    <ul className={cm.stack(3)} data-mol-id="pricing-limits-list">
      {children}
    </ul>
  )
}

/** Props for `<LimitsItem>`. */
export interface LimitsItemProps {
  /** Row content (typically a translated label + number). */
  children: ReactNode
  /**
   * Whether this feature is included in the tier. When `false`, the row
   * renders with a muted line-through and a dash glyph instead of the
   * check icon. Defaults to `true`.
   */
  included?: boolean
}

/**
 * Single row in a tier's feature list — a check (or em-dash) icon
 * followed by the row label. Use inside `<LimitsList>`.
 */
export function LimitsItem({ children, included = true }: LimitsItemProps): React.ReactElement {
  const cm = getClassMap()
  return (
    <li
      className={cm.cn(
        cm.flex({ direction: 'row', align: 'start', gap: 'sm' }),
        cm.textSize('sm'),
        !included && cm.textMuted,
      )}
    >
      <Icon
        name={included ? 'check-circle' : 'minus'}
        size={18}
        aria-hidden="true"
        className={included ? cm.textPrimary : cm.textSubtle}
      />
      <span>{children}</span>
    </li>
  )
}

/**
 * Default "anonymous → routes to" path used when a logged-out visitor
 * clicks an upgrade CTA. Apps can override via the `unauthenticatedRedirect`
 * prop. `/login` is the convention across flagship templates.
 */
const DEFAULT_UNAUTHENTICATED_REDIRECT = '/login'

/**
 * Headline font is sourced from the app's theme via the
 * `--font-headline` CSS variable. Apps that want a serif/display
 * treatment set this variable in their `theme.css`. Apps that don't
 * set it inherit the body font (no special headline treatment), which
 * is the safe default for a generic shared component — we never bake
 * a specific font family into the shared package.
 *
 * The CSS variable fallback chain is intentionally just `inherit` so
 * the headline picks up whatever the surrounding context uses; apps
 * that want a custom stack pass `headlineFontFamily` to override
 * either with a literal string or another `var(--something)` value.
 */
const DEFAULT_HEADLINE_FONT = 'var(--font-headline, inherit)'

/** Props for `<PricingPage />`. */
export interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional billing-period selector. Defaults to `'month'`. Pass `'year'`
   * to render the yearly column. The component falls back to whatever the
   * tier provides when the requested period is missing.
   */
  period?: PricingTierPrice['period']

  /**
   * Optional render function for the tier-specific limits column. Defaults
   * to a stacked checklist rendering numeric / boolean values with a green
   * check glyph. Apps with rich limit shapes can supply a custom renderer.
   */
  renderLimits?: (limits: TLimits) => React.ReactNode

  /**
   * Optional override for the page-level heading translation key.
   * Defaults to `'billing.pricing.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. Defaults to `'Choose your plan'`. */
  headingDefault?: string

  /**
   * Optional sub-heading shown under the page heading. Pass `null` to
   * suppress. Defaults to a translated "Pick the plan that fits…" line.
   */
  subheadingKey?: string | null
  /** English fallback for the sub-heading. */
  subheadingDefault?: string

  /**
   * Optional className applied to the outer wrapper, useful when embedding
   * the page in an existing layout.
   */
  className?: string

  /**
   * Path the browser is sent to when an anonymous visitor clicks a paid
   * tier's upgrade CTA. Defaults to `/login`. Set to `null` to disable
   * the redirect (e.g. when the app handles the auth gate at a higher
   * level via routing guards).
   */
  unauthenticatedRedirect?: string | null

  /**
   * Optional tier key to highlight as "most popular" — receives the
   * elevated card variant, a popular-badge in the header, and a
   * primary-tone CTA. When omitted (default), the highest-priced tier
   * with a real stripePriceId for the selected period is auto-selected.
   * Pass `null` to disable highlighting entirely.
   */
  popularTierKey?: string | null

  /**
   * Optional font-family stack applied inline to the page heading,
   * tier names, and hero price. Defaults to a system-serif cascade
   * (Georgia, Iowan Old Style, …) matching the flagship-app
   * convention. Pass `null` to disable inline font and inherit from
   * the theme.
   */
  headlineFontFamily?: string | null
}

/**
 * Renders the public pricing page. Fetches `/api/billing/tiers` on mount
 * and lays out one card per tier with the price for the selected period
 * and a CTA that starts a Stripe Checkout session via
 * `/api/billing/checkout`. Tiers without a Stripe priceId (e.g. the free
 * tier or local-dev) render a disabled CTA so users still see the row.
 *
 * The highest-priced paid tier is highlighted as "most popular" by
 * default — the card uses the elevated variant, the header carries a
 * star badge, and its CTA renders in the primary color. Apps that want
 * a different tier in the spotlight can pass `popularTierKey` (or
 * `null` to suppress).
 *
 * @param props - Component props (see `PricingPageProps`).
 * @returns The rendered pricing page.
 */
export function PricingPage<TLimits = unknown>(
  props: PricingPageProps<TLimits>,
): React.ReactElement {
  const {
    period = 'month',
    renderLimits,
    headingKey = 'billing.pricing.heading',
    headingDefault = 'Choose your plan',
    subheadingKey = 'billing.pricing.subheading',
    subheadingDefault = 'Pick the plan that fits how you work. Upgrade or downgrade any time.',
    className,
    unauthenticatedRedirect = DEFAULT_UNAUTHENTICATED_REDIRECT,
    popularTierKey,
    headlineFontFamily = DEFAULT_HEADLINE_FONT,
  } = props
  const headlineStyle = headlineFontFamily === null ? undefined : { fontFamily: headlineFontFamily }

  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const { data, loading, error } = usePricingTiers<TLimits>()
  const { start, loading: starting, error: startError } = useStartCheckout()

  if (loading) {
    return (
      <section
        className={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('py', 16), className)}
        data-mol-id="pricing-page"
      >
        <p className={cm.textMuted}>
          {t('billing.pricing.loading', undefined, { defaultValue: 'Loading plans…' })}
        </p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section
        className={cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('py', 16), className)}
        data-mol-id="pricing-page"
      >
        <p className={cm.formError}>
          {t('billing.pricing.error', undefined, {
            defaultValue: 'Could not load pricing. Try again later.',
          })}
        </p>
      </section>
    )
  }

  const rawTiers = data.data

  // Default-pick the popular tier: highest-priced paid tier that has a
  // real Stripe price id for the active period. Honors `popularTierKey`
  // override when set (string = use that key; null = disable highlight).
  const resolvedPopularKey =
    popularTierKey === null ? null : (popularTierKey ?? autoSelectPopular(rawTiers, period))

  // Move the popular tier to the visual center of the row. We keep the
  // server's order otherwise — only the highlighted tier shifts. For odd
  // tier counts this means index `Math.floor(N/2)`; for 2 tiers we leave
  // the popular one second so it still flanks the free tier on the right.
  const tiers = centerPopularTier(rawTiers, resolvedPopularKey)

  const handleUpgrade = async (priceId: string | null): Promise<void> => {
    if (!priceId) return
    // Always fire the POST so the API is the source of truth for auth and
    // entitlement gating. Short-circuiting on `auth.isAuthenticated` would
    // produce a "silent button" for anonymous visitors (no network activity,
    // no observable failure) and bypass the API's 401 contract that e2e
    // suites rely on. Redirect anonymous visitors only AFTER the POST
    // resolves (or fails), so the request is always observable.
    const response = await start(priceId)
    if (!response) {
      if (!auth.isAuthenticated && unauthenticatedRedirect && typeof window !== 'undefined') {
        window.location.assign(unauthenticatedRedirect)
      }
      return
    }
    if (response.checkoutUrl) {
      window.location.assign(response.checkoutUrl)
    } else if (response.updated) {
      window.location.reload()
    }
  }

  return (
    <section
      className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), className)}
      data-mol-id="pricing-page"
    >
      <header className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
        <h1
          className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
          style={headlineStyle}
          data-mol-id="pricing-page-heading"
        >
          {t(headingKey, undefined, { defaultValue: headingDefault })}
        </h1>
        {subheadingKey !== null && (
          <p
            className={cm.cn(cm.textSize('lg'), cm.textMuted, cm.maxW('2xl'), cm.mxAuto)}
            data-mol-id="pricing-page-subheading"
          >
            {t(subheadingKey, undefined, { defaultValue: subheadingDefault })}
          </p>
        )}
      </header>
      <div
        className={cm.flex({
          direction: 'row',
          wrap: 'wrap',
          gap: 'lg',
          justify: 'center',
          align: 'stretch',
        })}
      >
        {tiers.map((tier: PricingTierEntry<TLimits>) => (
          <TierCard
            key={tier.key}
            tier={tier}
            period={period}
            cm={cm}
            t={t}
            renderLimits={renderLimits}
            onUpgrade={handleUpgrade}
            starting={starting}
            popular={tier.key === resolvedPopularKey}
            headlineStyle={headlineStyle}
          />
        ))}
      </div>
      {startError && (
        <p className={cm.cn(cm.formError, cm.sp('mt', 6), cm.textCenter)} role="alert">
          {t('billing.pricing.checkoutError', undefined, {
            defaultValue: 'Could not start checkout. Please try again.',
          })}
        </p>
      )}
      <p
        className={cm.cn(cm.sp('mt', 10), cm.textCenter, cm.textSize('xs'), cm.textSubtle)}
        data-mol-id="pricing-page-reassurance"
      >
        {t('billing.pricing.reassurance', undefined, {
          defaultValue: 'Cancel anytime · No credit card required to start',
        })}
      </p>
    </section>
  )
}

interface TierCardProps<TLimits> {
  tier: PricingTierEntry<TLimits>
  period: PricingTierPrice['period']
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
  renderLimits?: (limits: TLimits) => React.ReactNode
  onUpgrade: (priceId: string | null) => Promise<void>
  starting: boolean
  popular: boolean
  headlineStyle: React.CSSProperties | undefined
}

function TierCard<TLimits>({
  tier,
  period,
  cm,
  t,
  renderLimits,
  onUpgrade,
  starting,
  popular,
  headlineStyle,
}: TierCardProps<TLimits>): React.ReactElement {
  const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
  const periodLabel = price?.period
    ? t(`billing.pricing.period.${price.period}`, undefined, {
        defaultValue: price.period === 'year' ? 'per year' : 'per month',
      })
    : ''

  void periodLabel
  return (
    <div
      // Outer positioning wrapper so the "Most popular" pill can float
      // above the article's top edge via absolute positioning. The
      // popular tier card is also given a negative top margin so it
      // visually rises above its neighbors AND has more vertical room.
      style={{
        position: 'relative',
        width: popular ? '24rem' : '19rem',
        marginTop: popular ? '-1.5rem' : 0,
        marginBottom: popular ? '-1.5rem' : 0,
      }}
    >
      {popular && (
        <span
          className={cm.cn(
            cm.badge({ variant: 'primary', size: 'sm' }),
            cm.uppercase,
            cm.trackingWide,
            cm.fontWeight('bold'),
          )}
          style={{
            position: 'absolute',
            top: '-0.875rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
          }}
          data-mol-id={`pricing-tier-${tier.key}-popular-badge`}
        >
          <Icon name="star" size={12} aria-hidden="true" className={cm.sp('mr', 1)} />
          {t('billing.pricing.mostPopular', undefined, { defaultValue: 'Most popular' })}
        </span>
      )}
      <article
        className={cm.cn(
          cm.card({ variant: 'default' }),
          cm.flex({ direction: 'col' }),
          popular && cm.borderTPrimary,
          popular && cm.shadowLifted,
        )}
        style={{
          height: '100%',
          // Extra vertical padding on the popular tier so it physically
          // grows taller than the side cards in addition to wider. Side
          // padding tracks the card variant's defaults.
          paddingTop: popular ? '3rem' : '1.5rem',
          paddingBottom: popular ? '2.5rem' : '1.5rem',
        }}
        data-mol-id={`pricing-tier-${tier.key}`}
        data-popular={popular ? 'true' : undefined}
      >
        <header className={cm.cardHeader}>
          {!popular && (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.textSubtle,
                cm.fontWeight('semibold'),
                cm.uppercase,
                cm.trackingWide,
                cm.sp('mb', 2),
              )}
              data-mol-id={`pricing-tier-${tier.key}-eyebrow`}
            >
              {t('billing.pricing.tierEyebrow', undefined, { defaultValue: 'Tier' })}
            </p>
          )}
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.italic,
              cm.fontWeight('semibold'),
              cm.sp('mb', 4),
            )}
            style={headlineStyle}
          >
            {tier.name}
          </h2>
          <p>
            <span
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                popular && cm.textPrimary,
              )}
              style={headlineStyle}
            >
              {price?.price ?? '—'}
            </span>
            {tier.perSeat && (
              <span className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.fontWeight('normal'))}>
                {' '}
                {t('billing.pricing.perSeat', undefined, { defaultValue: 'per seat' })}
              </span>
            )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.textSubtle,
              cm.fontWeight('semibold'),
              cm.uppercase,
              cm.trackingWide,
              cm.sp('mt', 2),
            )}
          >
            {t(`billing.pricing.billed.${price?.period ?? 'month'}`, undefined, {
              defaultValue: price?.period === 'year' ? 'Billed annually' : 'Billed monthly',
            })}
            {price?.savings && (
              <>
                {' · '}
                <span className={cm.textSuccess}>{price.savings.toUpperCase()}</span>
              </>
            )}
          </p>
        </header>
        <div className={cm.cn(cm.cardContent, cm.flex1)}>
          {renderLimits ? (
            renderLimits(tier.limits)
          ) : (
            <DefaultLimits limits={tier.limits} cm={cm} />
          )}
        </div>
        <footer className={cm.cardFooter}>
          <button
            type="button"
            className={cm.cn(
              cm.button({
                variant: popular ? 'solid' : 'outline',
                size: 'md',
                fullWidth: true,
              }),
              popular && cm.gradientPrimary,
              cm.uppercase,
              cm.trackingWide,
            )}
            disabled={!price?.stripePriceId || starting}
            onClick={() => onUpgrade(price?.stripePriceId ?? null)}
            data-mol-id={`pricing-cta-${tier.key}`}
          >
            {price?.stripePriceId
              ? t(
                  'billing.pricing.upgradeCta',
                  { tierName: tier.name },
                  { defaultValue: 'Upgrade to {{tierName}}' },
                )
              : t('billing.pricing.currentCta', undefined, { defaultValue: 'Current plan' })}
          </button>
        </footer>
      </article>
    </div>
  )
}

interface DefaultLimitsProps<TLimits> {
  limits: TLimits
  cm: ReturnType<typeof getClassMap>
}

/**
 * Default render for a tier's `limits` object — a stacked checklist
 * with a green check glyph per row. Numbers and booleans render
 * directly; objects/arrays JSON-stringify. Apps with richer limit
 * shapes should pass their own `renderLimits` prop to `<PricingPage />`.
 *
 * @param props - The component props.
 * @param props.limits - Tier-specific limits to render.
 * @param props.cm - Active ClassMap instance.
 * @returns A `<ul>` of check-prefixed limit rows.
 */
function DefaultLimits<TLimits>({ limits, cm }: DefaultLimitsProps<TLimits>): React.ReactElement {
  if (limits == null || typeof limits !== 'object') {
    return <></>
  }
  const entries = Object.entries(limits as Record<string, unknown>)
  return (
    <ul className={cm.stack(2)}>
      {entries.map(([key, value]) => (
        <li
          key={key}
          className={cm.cn(
            cm.flex({ direction: 'row', align: 'start', gap: 'sm' }),
            cm.textSize('sm'),
          )}
        >
          <Icon name="check-circle" size={16} className={cm.textSuccess} aria-hidden="true" />
          <span>
            <span className={cm.textMuted}>{humanizeKey(key)}: </span>
            <span className={cm.fontWeight('medium')}>{formatLimitValue(value)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function humanizeKey(key: string): string {
  // 'maxBlocks' → 'Max blocks'; 'canExport' → 'Can export';
  // 'max_blocks' → 'Max blocks'. The PricingPage caller can always
  // override with renderLimits for fully custom labels.
  const spaced = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatLimitValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'number') {
    if (value >= 999_999) return 'Unlimited'
    return value.toLocaleString()
  }
  if (value == null) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Pick the "most popular" tier when the caller hasn't specified one:
 * the highest-priced paid tier that has a real stripePriceId for the
 * active period. If nothing qualifies, returns null (no highlight).
 */
function autoSelectPopular<TLimits>(
  tiers: ReadonlyArray<PricingTierEntry<TLimits>>,
  period: PricingTierPrice['period'],
): string | null {
  let bestKey: string | null = null
  let bestCents = -1
  for (const tier of tiers) {
    const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
    if (!price?.stripePriceId) continue
    const cents = priceToCents(price.price)
    if (cents > bestCents) {
      bestCents = cents
      bestKey = tier.key
    }
  }
  return bestKey
}

function priceToCents(label: string | null | undefined): number {
  if (!label) return 0
  // Accept "$12", "$12.99/mo", "€12,99" — strip currency + suffix, parse the number.
  const match = label.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return 0
  return Math.round(Number(match[1].replace(',', '.')) * 100)
}

/**
 * Move the popular tier to the visual center of the row so the
 * highlighted card flanks the other tiers. Returns a new array with the
 * popular tier at `Math.floor(N/2)`; if the popular key isn't found, or
 * is already in that position, the array is returned unchanged.
 */
function centerPopularTier<TLimits>(
  tiers: ReadonlyArray<PricingTierEntry<TLimits>>,
  popularKey: string | null,
): PricingTierEntry<TLimits>[] {
  if (!popularKey || tiers.length < 3) return [...tiers]
  const targetIdx = Math.floor(tiers.length / 2)
  const currentIdx = tiers.findIndex((t) => t.key === popularKey)
  if (currentIdx === -1 || currentIdx === targetIdx) return [...tiers]
  const next = [...tiers]
  const [popular] = next.splice(currentIdx, 1)
  next.splice(targetIdx, 0, popular)
  return next
}
