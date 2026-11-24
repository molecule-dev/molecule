/**
 * Vue top-of-dashboard hero metric card — the counterpart of
 * `@molecule/app-hero-metric-card-react`'s `HeroMetricCard`: the same props
 * (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { HeroMetricTrendChip } from './HeroMetricTrendChip.js'
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
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (slot: (() => VNodeChild[]) | undefined, prop: VNodeChild): VNodeChild[] => {
  if (slot) return toChildArray(slot())
  return prop != null ? toChildArray(prop) : []
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
 * @returns The hero metric card component.
 */
export const HeroMetricCard = defineComponent({
  name: 'HeroMetricCard',
  props: {
    title: null,
    value: null,
    unit: null,
    trend: { type: Object as PropType<HeroMetricCardProps['trend']>, default: undefined },
    subtitle: null,
    progressRing: null,
    icon: null,
    accent: { type: String as PropType<HeroMetricAccent>, default: undefined },
    onClick: { type: Function as PropType<(event?: MouseEvent) => void>, default: undefined },
    loading: { type: Boolean, default: false },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()

    /**
     * The right-hand slot's nodes: React's `progressRing ?? icon`, with the
     * slot winning over the same-named prop and React's truthiness deciding
     * whether the wrapper renders at all.
     *
     * @returns The right-hand nodes (empty when neither is supplied).
     */
    const rightNodes = (): VNodeChild[] => {
      // React's `slot(progressRing) ?? icon`: an empty list is absent, so the
      // other source (its prop or slot) still shows.
      const ring = toChildArray(slots.progressRing ? slots.progressRing() : props.progressRing)
      if (ring.length > 0) return ring
      return toChildArray(slots.icon ? slots.icon() : props.icon)
    }

    return (): VNode => {
      const loading = Boolean(props.loading)
      const accentBar = props.accent ? resolveAccentBar(cm, props.accent) : undefined
      const loadingLabel = t('hero-metric-card.loading', {}, { defaultValue: 'Loading metric…' })
      // An empty unit/subtitle list is absent, as React's slot() treats it.
      const unitNodes = toChildArray(slotOrProp(slots.unit, props.unit))
      const subtitleNodes = toChildArray(slotOrProp(slots.subtitle, props.subtitle))
      const hasUnit = unitNodes.length > 0
      const hasSubtitle = subtitleNodes.length > 0
      const right = rightNodes()

      return h(
        Card,
        {
          className: cm.cn(props.className),
          padding: 'none',
          style: accentBar ? { overflow: 'hidden' } : undefined,
          interactive: typeof props.onClick === 'function',
          onClick: props.onClick ? (event: MouseEvent) => props.onClick?.(event) : undefined,
          'data-mol-id': props.dataMolId,
        },
        {
          default: (): VNodeChild[] => [
            accentBar
              ? h('span', {
                  'aria-hidden': 'true',
                  class: cm.cn(accentBar.className),
                  style: {
                    display: 'block',
                    height: '4px',
                    backgroundColor: accentBar.backgroundColor,
                  },
                })
              : null,
            h('div', { class: cm.cardPadding('md') }, [
              h(
                'div',
                {
                  class: cm.flex({ justify: 'between', align: 'center', gap: 'md' }),
                  'aria-busy': loading ? 'true' : undefined,
                },
                [
                  h('div', { class: cm.stack(2) }, [
                    h(
                      'span',
                      {
                        class: cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.uppercase,
                          cm.trackingWide,
                          cm.textMuted,
                        ),
                      },
                      slotOrProp(slots.title, props.title),
                    ),
                    loading
                      ? h(
                          'span',
                          {
                            class: cm.cn(cm.textSize('5xl'), cm.fontWeight('bold')),
                            role: 'status',
                            'aria-live': 'polite',
                          },
                          loadingLabel,
                        )
                      : h('div', { class: cm.flex({ align: 'baseline', gap: 'xs' }) }, [
                          h(
                            'span',
                            {
                              class: cm.cn(
                                cm.textSize('5xl'),
                                cm.fontWeight('extrabold'),
                                cm.heroMetricCardValue,
                              ),
                            },
                            slotOrProp(slots.value, props.value),
                          ),
                          hasUnit
                            ? h(
                                'span',
                                {
                                  class: cm.cn(
                                    cm.textSize('lg'),
                                    cm.fontWeight('medium'),
                                    cm.textMuted,
                                  ),
                                },
                                unitNodes,
                              )
                            : null,
                        ]),
                    !loading && props.trend ? h(HeroMetricTrendChip, { trend: props.trend }) : null,
                    !loading && hasSubtitle
                      ? h('span', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, subtitleNodes)
                      : null,
                  ]),
                  right.length > 0
                    ? h('div', { class: cm.flex({ align: 'center', justify: 'center' }) }, right)
                    : null,
                ],
              ),
            ]),
          ],
        },
      )
    }
  },
})
