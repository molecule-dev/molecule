/**
 * The model picker's rows and processing-region dropdown — React's render
 * section "minWidth:0 + ellipsis so a long label yields to the…": the rows the
 * picker lists (with the inline "Older models" disclosure), each row's provider,
 * capability badges, relative usage rate and region pill, and the fixed-position
 * menu of a model's available processing regions.
 *
 * The row and its region control are SIBLINGS inside a positioning wrapper: the
 * pill is a control, and a control cannot sit inside the row button (axe
 * `nested-interactive`), so it overlays the row's bottom-right from the wrapper
 * instead. Every row's pre-render data (badges, lock reason, rate, region pill)
 * comes from the framework-neutral `modelPickerRowView`; nothing here re-derives
 * it.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { formatTokenCount } from '@molecule/app-ai-models'
import type { ModelPickerRowView } from '@molecule/app-ide-panel-logic/panels'
import {
  MODEL_REGION_FLAGS,
  modelHasPeakPricing,
  modelPeakWindowLabels,
  modelPickerRowView,
  modelRegionLabel,
  modelUsageRate,
} from '@molecule/app-ide-panel-logic/panels'
import { Tooltip } from '@molecule/app-ui-vue'

import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'
import { renderRegionFlag } from './RegionFlag.js'
import type { RegionMenuState } from './use-chat-pickers.js'

/**
 * Renders the model picker's rows.
 *
 * @param ctx - The panel context (the open picker, the catalog, the theme, the
 *   current model, the region menu and the section toggle).
 * @returns The list of row wrappers and the "Older models" disclosure, or
 *   `null` when no picker is open.
 */
export function renderChatModelPickerRows(ctx: ChatCtx): VNodeChild {
  const modelPicker = ctx.composer.modelPicker.value
  if (!modelPicker) return null
  const cm = ctx.env.cm
  const t = ctx.env.t
  const isLight = ctx.env.isLight.value
  const isFreeTier = ctx.models.isFreeTier.value
  const availableModels = ctx.models.AVAILABLE_MODELS.value
  const serverDefaults = ctx.models.serverModelDefaults.value
  const freeTierModel = ctx.models.FREE_TIER_MODEL.value
  const currentModels = ctx.pickers.currentModels.value
  const deprecatedModels = ctx.pickers.deprecatedModels.value
  const showDeprecated = ctx.pickers.showDeprecated.value
  const currentPickerModelId = ctx.pickers.currentPickerModelId.value
  const regionMenu = ctx.pickers.regionMenu.value

  const rows: VNodeChild[] = []

  ctx.pickers.visibleModels.value.forEach((model, idx) => {
    const isDeprecatedRow = idx >= currentModels.length
    const dividerBefore = idx === currentModels.length && deprecatedModels.length > 0
    const row = modelPickerRowView({
      model,
      isLight,
      isFreeTier,
      mode: modelPicker.mode,
      models: availableModels,
      serverDefaults,
      freeTierModel,
      modelRegion: ctx.pickers.effectiveModelRegion(model),
      t,
    })

    if (dividerBefore) {
      rows.push(
        h(
          'button',
          {
            key: 'older-models-collapse',
            type: 'button',
            onClick: () => ctx.pickers.setShowDeprecated((s) => !s),
            class: cm.cn(cm.textSize('xs'), cm.textMuted, cm.w('full')),
            style: {
              padding: '6px 12px',
              border: 'none',
              borderTop: '1px solid rgba(128,128,128,0.12)',
              background: 'rgba(128,128,128,0.04)',
              cursor: 'pointer',
              textAlign: 'left',
            },
          },
          [
            t(
              'ide.chat.olderModelsCollapse',
              { count: deprecatedModels.length },
              { defaultValue: 'Older models ⌃ ({{count}})' },
            ),
          ],
        ),
      )
    }

    rows.push(
      h('div', { key: model.id, style: { position: 'relative' } }, [
        h(
          'button',
          {
            key: 'row',
            type: 'button',
            onClick: () => {
              if (row.lockReason === 'paid') {
                ctx.composer.setModelPicker(null)
                ctx.composer.setInputValue('')
                ctx.systemCards.addSystemCard(
                  t(
                    'ide.chat.modelUpgradeRequired',
                    { model: model.label },
                    {
                      defaultValue: '{{model}} is available on Pro. Upgrade to access all models.',
                    },
                  ),
                  // Host owns the upgrade/sign-in button(s) (its routes/copy).
                  { action: ctx.props.buildUpgradeCta?.({}) ?? undefined },
                )
              } else if (row.lockReason === 'mode') {
                // Free-usable in a DIFFERENT mode — a plain one-liner, never
                // the paid-upgrade pitch.
                ctx.composer.setModelPicker(null)
                ctx.composer.setInputValue('')
                ctx.systemCards.addSystemCard(
                  row.usableMode === 'plan'
                    ? t('ide.chat.modeOnlyPlan', undefined, {
                        defaultValue: 'On the free plan, this model is used in plan mode.',
                      })
                    : row.usableMode === 'execute'
                      ? t('ide.chat.modeOnlyExecute', undefined, {
                          defaultValue: 'On the free plan, this model is used in execute mode.',
                        })
                      : t('ide.chat.modeOnlyCommit', undefined, {
                          defaultValue:
                            'On the free plan, this model is used for commit messages and compaction.',
                        }),
                )
              } else {
                void ctx.modelActions.selectModel(model.id, model.label, modelPicker.mode)
              }
            },
            onMouseenter: (event: MouseEvent) => {
              const target = event.currentTarget as HTMLElement | null
              if (target && !row.locked) target.style.background = 'rgba(128,128,128,0.15)'
            },
            onMouseleave: (event: MouseEvent) => {
              const target = event.currentTarget as HTMLElement | null
              if (!target) return
              target.style.background =
                idx === modelPicker.selectedIdx && !row.locked
                  ? 'rgba(128,128,128,0.1)'
                  : 'transparent'
            },
            // The provider color is the row's accent: an inset bar
            // (DESIGN.md → "Accent bars"); the provider label below already
            // carries the same color.
            class: cm.cn(cm.w('full'), cm.accentCard({ tone: 'custom' })),
            style: {
              '--mol-accent': row.accent,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
              padding: '8px 12px 8px 30px',
              border: 'none',
              borderTop: '1px solid rgba(128,128,128,0.12)',
              cursor: row.locked ? 'default' : 'pointer',
              color: 'inherit',
              textAlign: 'left',
              fontSize: '13px',
              opacity: row.locked ? '0.45' : isDeprecatedRow ? '0.7' : '1',
              background:
                idx === modelPicker.selectedIdx && !row.locked
                  ? 'rgba(128,128,128,0.1)'
                  : 'transparent',
            },
          },
          [
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px', width: '100%' } },
              [
                // minWidth:0 + ellipsis so a long label yields to the
                // right-aligned current/lock pill instead of pushing it past
                // a narrow (390px) pane's edge.
                h(
                  'span',
                  {
                    key: 'label',
                    class: cm.fontWeight('medium'),
                    style: {
                      minWidth: '0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  [model.label],
                ),
                h(
                  'span',
                  {
                    key: 'provider',
                    style: {
                      fontSize: '10px',
                      color: row.accent,
                      opacity: '0.85',
                      flexShrink: '0',
                    },
                  },
                  [model.provider],
                ),
                model.id === currentPickerModelId
                  ? h(
                      'span',
                      {
                        key: 'current',
                        'data-mol-id': `model-current-${model.id}`,
                        class: cm.fontWeight('medium'),
                        style: {
                          // Right-aligned + primary-tinted so the active
                          // model stands out more than the old flat grey.
                          // The hex is only the var() fallback (theme token
                          // wins); same color-mix idiom as TipCard/UserAvatar.
                          marginLeft: 'auto',
                          fontSize: '10px',
                          color: 'var(--mol-color-primary, #6366f1)',
                          background:
                            'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
                          border:
                            '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                          padding: '1px 7px',
                          borderRadius: '999px',
                        },
                      },
                      [t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })],
                    )
                  : null,
                row.lockReason === 'paid'
                  ? h(
                      'span',
                      {
                        key: 'paid',
                        style: {
                          fontSize: '10px',
                          marginLeft: 'auto',
                          background: 'rgba(128,128,128,0.2)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        },
                      },
                      [t('ide.chat.proRequired', undefined, { defaultValue: 'Pro' })],
                    )
                  : null,
                // Free-tier model locked here only because it belongs to a
                // DIFFERENT mode — a muted "free in <mode>" pill, never the
                // paid "Pro" claim.
                row.lockReason === 'mode'
                  ? h(
                      'span',
                      {
                        key: 'mode',
                        class: cm.textMuted,
                        style: {
                          fontSize: '10px',
                          marginLeft: 'auto',
                          background: 'rgba(128,128,128,0.2)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        },
                      },
                      [row.freeInLabel],
                    )
                  : null,
              ],
            ),
            h('span', { key: 'description', style: { fontSize: '12px', opacity: '0.7' } }, [
              model.description,
            ]),
            h(
              'span',
              { key: 'meta', style: { fontSize: '11px', opacity: '0.65' } },
              buildMetaLine(ctx, model, row),
            ),
            row.badges.length > 0
              ? h(
                  'span',
                  {
                    key: 'badges',
                    style: {
                      display: 'flex',
                      gap: '4px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginTop: '1px',
                      // Full row width — the button column is
                      // alignItems:flex-start, so without this the line
                      // shrinks to content and the region control's
                      // marginLeft:auto has no space to push it to the
                      // right edge.
                      width: '100%',
                    },
                  },
                  row.badges.map((b) =>
                    h(
                      'span',
                      {
                        key: b.label,
                        style: {
                          fontSize: '10px',
                          color: b.fg,
                          background: b.bg,
                          padding: '1px 5px',
                          borderRadius: '3px',
                        },
                      },
                      [b.label],
                    ),
                  ),
                )
              : null,
          ],
        ),
        // Processing-region dropdown, anchored to the BOTTOM-RIGHT of the row
        // (absolutely positioned against the row wrapper, out of the row
        // button itself). Rendered as role=button/menu spans, not
        // <button>, because the whole model row is itself a <button> and
        // nesting buttons is invalid; stopPropagation keeps clicks from
        // selecting the row.
        renderRegionPill(ctx, model, row, regionMenu),
      ]),
    )
  })

  // Collapsed section: the expand row sits after the live rows. While expanded
  // the divider button before the deprecated rows is the collapse control, so
  // this one is not rendered.
  if (!showDeprecated && deprecatedModels.length > 0) {
    rows.push(
      h(
        'button',
        {
          key: 'older-models-expand',
          type: 'button',
          onClick: () => ctx.pickers.setShowDeprecated(true),
          class: cm.cn(cm.textSize('xs'), cm.textMuted, cm.w('full')),
          style: {
            padding: '6px 12px',
            border: 'none',
            borderTop: '1px solid rgba(128,128,128,0.12)',
            background: 'rgba(128,128,128,0.04)',
            cursor: 'pointer',
            textAlign: 'left',
          },
        },
        [
          t(
            'ide.chat.olderModelsExpand',
            { count: deprecatedModels.length },
            { defaultValue: 'Older models ⌄ ({{count}})' },
          ),
        ],
      ),
    )
  }

  return rows
}

/**
 * Builds a row's second details line: the context / output window sizes, its
 * relative usage rate (or "your key" for a BYO model), the live peak-hour
 * segment and the knowledge cutoff.
 *
 * @param ctx - The panel context (the translator).
 * @param model - The catalog model the row renders.
 * @param row - That model's pre-computed row view.
 * @returns The line's children, in React's order.
 */
function buildMetaLine(
  ctx: ChatCtx,
  model: AppModelDefinition,
  row: ModelPickerRowView,
): VNodeChild[] {
  const t = ctx.env.t
  const parts: VNodeChild[] = [
    `${formatTokenCount(model.contextWindow)} ctx · `,
    `${formatTokenCount(model.maxOutputTokens)} out · `,
    row.isCustom
      ? h(
          'span',
          {
            title: t('ide.chat.models.usageRateYourKeyHint', undefined, {
              defaultValue: 'Billed to your own provider key, not your plan.',
            }),
          },
          [t('ide.chat.models.usageRateYourKey', undefined, { defaultValue: 'your key' })],
        )
      : h(
          'span',
          {
            style: { color: row.priceColor },
            title: t('ide.chat.models.usageRateHint', undefined, {
              defaultValue:
                'How fast this model uses your AI allowance, relative to the most economical model',
            }),
          },
          [
            t(
              'ide.chat.models.usageRateValue',
              { rate: row.usageRate },
              { defaultValue: '×{{rate}} usage' },
            ),
          ],
        ),
  ]
  // Peak hours: the rate above already reflects the CURRENT multiplier, so
  // without this the number would change during the day with no explanation.
  if (!row.isCustom && modelHasPeakPricing(model, row.modelRegion)) {
    parts.push(
      ' · ',
      h(
        'span',
        {
          style: {
            color: row.peakNow > 1 ? row.priceColor : undefined,
            opacity: row.peakNow > 1 ? '1' : '0.8',
          },
          title: t(
            'ide.chat.models.peakHint',
            {
              multiplier: model.peakPricing?.multiplier ?? 2,
              windows: modelPeakWindowLabels(model).join(', '),
            },
            {
              defaultValue:
                'This model costs ×{{multiplier}} between {{windows}}. It is the normal rate the rest of the day.',
            },
          ),
        },
        [
          row.peakNow > 1
            ? t(
                'ide.chat.models.peakNow',
                { multiplier: model.peakPricing?.multiplier ?? 2 },
                { defaultValue: 'peak ×{{multiplier}} now' },
              )
            : t(
                'ide.chat.models.peakLater',
                { multiplier: model.peakPricing?.multiplier ?? 2 },
                { defaultValue: '×{{multiplier}} at peak hours' },
              ),
        ],
      ),
    )
  }
  // Custom models synthesize an empty cutoff — skip the segment.
  if (model.knowledgeCutoff) parts.push(' · ', model.knowledgeCutoff)
  return parts
}

/**
 * Renders a row's processing-region control and, while it is open, its menu.
 *
 * @param ctx - The panel context (the translator, ClassMap and region state).
 * @param model - The catalog model the row renders.
 * @param regionRow - That model's pre-computed row view.
 * @param regionMenu - The open region menu, or `null`.
 * @returns The absolutely positioned region control, or `null` when the row
 *   shows no region pill.
 */
function renderRegionPill(
  ctx: ChatCtx,
  model: AppModelDefinition,
  regionRow: ModelPickerRowView,
  regionMenu: RegionMenuState | null,
): VNodeChild {
  const pill = regionRow.regionPill
  if (!pill.show) return null
  const cm = ctx.env.cm
  const t = ctx.env.t
  const interactive = pill.interactive
  const menuOpen = regionMenu?.modelId === model.id
  const setRegionMenu = ctx.pickers.setRegionMenu

  // Trigger built once so the Tooltip wrap can be dropped while the menu is
  // open (the menu replaces it — stacking a hover tooltip on an open menu is
  // noise).
  const trigger = h(
    'span',
    {
      role: interactive ? 'button' : undefined,
      tabIndex: interactive ? 0 : undefined,
      'aria-label': pill.hint,
      'aria-haspopup': interactive ? 'menu' : undefined,
      'aria-expanded': interactive ? menuOpen : undefined,
      'data-mol-id': `model-region-${model.id}`,
      onClick: (event: MouseEvent) => {
        event.stopPropagation()
        if (!interactive) return
        ctx.pickers.toggleRegionMenu(model.id, event.currentTarget as HTMLElement)
      },
      onKeydown: (event: KeyboardEvent) => {
        if (!interactive) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.stopPropagation()
          event.preventDefault()
          ctx.pickers.toggleRegionMenu(model.id, event.currentTarget as HTMLElement)
        } else if (event.key === 'Escape' && menuOpen) {
          event.stopPropagation()
          setRegionMenu(null)
        }
      },
      onMouseenter: (event: MouseEvent) => {
        // Hover affordance beyond the tooltip (same imperative idiom as the
        // row button's own hover background).
        if (interactive) {
          const target = event.currentTarget as HTMLElement
          target.style.background = 'rgba(128,128,128,0.25)'
        }
      },
      onMouseleave: (event: MouseEvent) => {
        const target = event.currentTarget as HTMLElement
        target.style.background = menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent'
      },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 4px',
        borderRadius: '4px',
        background: menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent',
        cursor: interactive ? 'pointer' : 'default',
      },
    },
    [
      interactive
        ? h(Icon, {
            name: 'chevron-down',
            size: 10,
            'aria-hidden': 'true',
            className: cm.textMuted,
          })
        : null,
      h('span', { class: cm.textMuted, style: { fontSize: '10px', lineHeight: '14px' } }, [
        pill.label,
      ]),
      // Rectangular flag from the bonded flag set, sized to the capability
      // pills' 14px height.
      renderRegionFlag(MODEL_REGION_FLAGS[pill.region] ?? pill.region, 14),
    ],
  )

  return h(
    'span',
    { key: 'region', style: { position: 'absolute', right: '12px', bottom: '8px', zIndex: '1' } },
    [
      menuOpen ? trigger : h(Tooltip, { content: pill.hint, placement: 'top' }, () => trigger),
      // The menu opens BELOW the trigger at fixed viewport coords (right edges
      // aligned) so the picker's scroll container can't clip it; scroll/resize
      // close it (see the effect).
      menuOpen && regionMenu
        ? h(
            'span',
            {
              role: 'menu',
              'aria-label': t('ide.chat.model.regionMenuLabel', undefined, {
                defaultValue: 'Processing region',
              }),
              class: cm.cn(cm.surface, cm.borderAll),
              style: {
                position: 'fixed',
                top: `${regionMenu.top}px`,
                right: `${regionMenu.right}px`,
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: '130',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '112px',
                padding: '2px',
              },
            },
            pill.options.map((r) => {
              const rLabel = modelRegionLabel(t, r)
              // Each option carries ITS region's usage multiplier so the cost
              // of a switch is visible before making it.
              const rRate = modelUsageRate(model, ctx.models.AVAILABLE_MODELS.value, r)
              const active = r === pill.region
              return h(
                'span',
                {
                  key: r,
                  role: 'menuitemradio',
                  'aria-checked': active,
                  tabIndex: 0,
                  'data-mol-id': `model-region-${model.id}-${r}`,
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation()
                    ctx.pickers.setRegionMenu(null)
                    if (!active) void ctx.modelActions.setModelRegion(model.id, r)
                  },
                  onKeydown: (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.stopPropagation()
                      event.preventDefault()
                      ctx.pickers.setRegionMenu(null)
                      if (!active) void ctx.modelActions.setModelRegion(model.id, r)
                    }
                  },
                  onMouseenter: (event: MouseEvent) => {
                    if (!active) {
                      const target = event.currentTarget as HTMLElement
                      target.style.background = 'rgba(128,128,128,0.15)'
                    }
                  },
                  onMouseleave: (event: MouseEvent) => {
                    const target = event.currentTarget as HTMLElement
                    target.style.background = active
                      ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                      : 'transparent'
                  },
                  class: active ? cm.fontWeight('medium') : undefined,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: active ? 'default' : 'pointer',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    background: active
                      ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                      : 'transparent',
                    color: active ? 'var(--mol-color-primary, #6366f1)' : 'inherit',
                  },
                },
                [
                  renderRegionFlag(MODEL_REGION_FLAGS[r] ?? r, 12),
                  h('span', {}, [rLabel]),
                  h(
                    'span',
                    {
                      class: active ? undefined : cm.textMuted,
                      style: { fontSize: '10px' },
                    },
                    [
                      '(',
                      t(
                        'ide.chat.models.usageRateMultiplier',
                        { rate: rRate },
                        { defaultValue: '×{{rate}}' },
                      ),
                      ')',
                    ],
                  ),
                ],
              )
            }),
          )
        : null,
    ],
  )
}
