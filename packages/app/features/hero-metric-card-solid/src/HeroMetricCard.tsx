/**
 * Solid top-of-dashboard hero metric card — the counterpart of
 * `@molecule/app-hero-metric-card-react`'s `HeroMetricCard`: the same props
 * (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import { HeroMetricTrendChip } from './HeroMetricTrendChip.jsx'
import type { HeroMetricAccent, HeroMetricCardProps, HeroMetricSemanticAccent } from './types.js'

/**
 * Maps a semantic hero accent to a real ClassMap {@link ColorVariant}.
 *
 * The theme exposes no `danger`/`neutral` color token, so those names are
 * translated to the tokens that DO exist (`danger → error`, `neutral →
 * secondary`).
 */
const ACCENT_COLOR_VARIANT: Record<HeroMetricSemanticAccent, ColorVariant> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Resolves the top-edge accent bar's color.
 *
 * Semantic accents route through `cm.progressColor()` — the ClassMap's
 * per-variant color resolver — so the bar picks up a real, theme-aware token
 * (`bg-primary`, `bg-error`, …). Any other string is treated as a one-off CSS
 * color and applied inline (the documented colored-accent exception).
 *
 * @param cm - The active ClassMap resolver.
 * @param accent - The accent token or raw color string.
 * @returns A ClassMap color class and/or an inline background color.
 */
function resolveAccentBar(
  cm: ReturnType<typeof getClassMap>,
  accent: HeroMetricAccent,
): { className?: string; backgroundColor?: string } {
  const variant = ACCENT_COLOR_VARIANT[accent as HeroMetricSemanticAccent]
  if (variant) {
    return { className: cm.progressColor(variant) }
  }
  return { backgroundColor: accent }
}

/**
 * Top-of-dashboard hero metric card.
 *
 * Layout: large value left (with optional unit + trend chip + subtitle),
 * `progressRing` or `icon` slot to the right. The card's padding moves onto
 * the inner wrapper so the accent bar can sit full-bleed against the top
 * edge; `overflow: hidden` clips the bar to the card's rounded corners.
 *
 * @param props - Component props (see {@link HeroMetricCardProps}).
 * @returns The rendered hero metric card.
 */
export const HeroMetricCard: Component<HeroMetricCardProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  const loading = (): boolean => Boolean(props.loading)
  const clickable = (): boolean => typeof props.onClick === 'function'
  const accentBar = (): { className?: string; backgroundColor?: string } | undefined =>
    props.accent ? resolveAccentBar(cm, props.accent) : undefined
  const loadingLabel = (): string =>
    t('hero-metric-card.loading', {}, { defaultValue: 'Loading metric…' })

  return (
    <Card
      className={cm.cn(props.className)}
      padding="none"
      style={accentBar() ? { overflow: 'hidden' } : undefined}
      interactive={clickable()}
      onClick={props.onClick}
      data-mol-id={props.dataMolId}
    >
      <Show when={accentBar()}>
        {(bar) => (
          <span
            aria-hidden="true"
            class={cm.cn(bar().className)}
            style={{
              display: 'block',
              height: '4px',
              'background-color': bar().backgroundColor,
            }}
          />
        )}
      </Show>
      <div class={cm.cardPadding('md')}>
        <div
          class={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}
          aria-busy={loading() || undefined}
        >
          <div class={cm.stack(2)}>
            <span
              class={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.uppercase,
                cm.trackingWide,
                cm.textMuted,
              )}
            >
              {props.title}
            </span>
            <Show
              when={!loading()}
              fallback={
                <span
                  class={cm.cn(cm.textSize('5xl'), cm.fontWeight('bold'))}
                  role="status"
                  aria-live="polite"
                >
                  {loadingLabel()}
                </span>
              }
            >
              <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
                <span
                  class={cm.cn(
                    cm.textSize('5xl'),
                    cm.fontWeight('extrabold'),
                    cm.heroMetricCardValue,
                  )}
                >
                  {props.value}
                </span>
                <PresentWhileNode node={props.unit}>
                  {(unit) => (
                    <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), cm.textMuted)}>
                      {unit()}
                    </span>
                  )}
                </PresentWhileNode>
              </div>
            </Show>
            <Show when={!loading() && props.trend}>
              {(trend) => <HeroMetricTrendChip trend={trend()} />}
            </Show>
            <Show when={!loading()}>
              <PresentWhileNode node={props.subtitle}>
                {(subtitle) => (
                  <span class={cm.cn(cm.textSize('sm'), cm.textMuted)}>{subtitle()}</span>
                )}
              </PresentWhileNode>
            </Show>
          </div>
          <ResolveNode node={props.progressRing}>
            {(progressRing, hasProgressRing) => (
              <Show
                when={hasProgressRing()}
                fallback={
                  <PresentWhileNode node={props.icon}>
                    {(icon) => (
                      <div class={cm.flex({ align: 'center', justify: 'center' })}>{icon()}</div>
                    )}
                  </PresentWhileNode>
                }
              >
                <div class={cm.flex({ align: 'center', justify: 'center' })}>{progressRing()}</div>
              </Show>
            )}
          </ResolveNode>
        </div>
      </div>
    </Card>
  )
}
