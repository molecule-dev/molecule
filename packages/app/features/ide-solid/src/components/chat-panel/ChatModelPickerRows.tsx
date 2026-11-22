/**
 * The model picker's rows and its processing-region dropdown — React's render
 * section "minWidth:0 + ellipsis so a long label yields": every model row (its
 * label, provider, current / Pro / "free in <mode>" pill, description, context
 * and usage details, capability badges), the inline "Older models" disclosure,
 * and each row's fixed-position processing-region menu.
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

import type { JSX } from 'solid-js'
import { createMemo, For, Show } from 'solid-js'

import { formatTokenCount } from '@molecule/app-ai-models'
import {
  MODEL_REGION_FLAGS,
  modelHasPeakPricing,
  modelPeakWindowLabels,
  modelPickerRowView,
  modelRegionLabel,
  modelUsageRate,
} from '@molecule/app-ide-panel-logic/panels'
import { Tooltip } from '@molecule/app-ui-solid'

import { Icon } from '../Icon.jsx'
import type { ChatInnerCtx } from './context.js'
import type { RegionMenuState } from './create-chat-pickers.js'
import { RegionFlag } from './RegionFlag.jsx'

/** Props for {@link ChatModelPickerRows}. */
export interface ChatModelPickerRowsProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the model picker's rows: the scrolling list's model entries, the
 * "Older models" disclosure and every row's region control.
 *
 * @param props - The inner ctx (the open picker, the catalog, the derived rows,
 *   the region menu and the section toggle).
 * @returns The row wrappers and the "Older models" disclosure.
 */
export function ChatModelPickerRows(props: ChatModelPickerRowsProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env
  const regionMenu = (): RegionMenuState | null => ctx.pickers.regionMenu()

  return (
    <>
      <For each={ctx.pickers.visibleModels()}>
        {(model, index) => {
          // Everything the row renders before its JSX: React recomputes it on
          // every render, and this memo re-derives it when any of its inputs
          // (theme, tier, scoped mode, catalog, effective region) changes.
          const row = createMemo(() =>
            modelPickerRowView({
              model,
              isLight: ctx.env.isLight(),
              isFreeTier: ctx.models.isFreeTier(),
              mode: ctx.composer.modelPicker()?.mode,
              models: ctx.models.AVAILABLE_MODELS(),
              serverDefaults: ctx.models.serverModelDefaults(),
              freeTierModel: ctx.models.FREE_TIER_MODEL(),
              modelRegion: ctx.pickers.effectiveModelRegion(model),
              t,
            }),
          )

          /**
           * The row's region control, built per render so the Tooltip wrapper
           * can be dropped while the menu is open (the menu replaces it —
           * stacking a hover tooltip on an open menu is noise).
           * @returns The trigger span for this row's region pill.
           */
          const trigger = (): JSX.Element => {
            const pill = row().regionPill
            const interactive = pill.interactive
            const menuOpen = regionMenu()?.modelId === model.id
            return (
              <span
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={pill.hint}
                aria-haspopup={interactive ? 'menu' : undefined}
                aria-expanded={interactive ? menuOpen : undefined}
                data-mol-id={`model-region-${model.id}`}
                onClick={(event) => {
                  event.stopPropagation()
                  if (!interactive) return
                  ctx.pickers.toggleRegionMenu(model.id, event.currentTarget)
                }}
                onKeyDown={(event) => {
                  if (!interactive) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.stopPropagation()
                    event.preventDefault()
                    ctx.pickers.toggleRegionMenu(model.id, event.currentTarget)
                  } else if (event.key === 'Escape' && menuOpen) {
                    event.stopPropagation()
                    ctx.pickers.setRegionMenu(null)
                  }
                }}
                onMouseEnter={(event) => {
                  // Hover affordance beyond the tooltip (same imperative idiom
                  // as the row button's own hover background).
                  if (interactive) event.currentTarget.style.background = 'rgba(128,128,128,0.25)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = menuOpen
                    ? 'rgba(128,128,128,0.25)'
                    : 'transparent'
                }}
                style={{
                  display: 'inline-flex',
                  'align-items': 'center',
                  gap: '4px',
                  padding: '1px 4px',
                  'border-radius': '4px',
                  background: menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent',
                  cursor: interactive ? 'pointer' : 'default',
                }}
              >
                <Show when={interactive}>
                  <Icon name="chevron-down" size={10} aria-hidden="true" className={cm.textMuted} />
                </Show>
                <span class={cm.textMuted} style={{ 'font-size': '10px', 'line-height': '14px' }}>
                  {pill.label}
                </span>
                {/* Rectangular flag from the bonded flag set, sized to the
                    capability pills' 14px height. */}
                <RegionFlag code={MODEL_REGION_FLAGS[pill.region] ?? pill.region} height={14} />
              </span>
            )
          }

          return (
            <>
              <Show
                when={
                  index() === ctx.pickers.currentModels().length &&
                  ctx.pickers.deprecatedModels().length > 0
                }
              >
                <button
                  /* mol-bespoke-button: older-models collapse row — full-width disclosure row inside the model list */
                  type="button"
                  onClick={() => ctx.pickers.setShowDeprecated((s) => !s)}
                  class={cm.cn(cm.textSize('xs'), cm.textMuted, cm.w('full'))}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    'border-top': '1px solid rgba(128,128,128,0.12)',
                    background: 'rgba(128,128,128,0.04)',
                    cursor: 'pointer',
                    'text-align': 'left',
                  }}
                >
                  {t(
                    'ide.chat.olderModelsCollapse',
                    { count: ctx.pickers.deprecatedModels().length },
                    { defaultValue: 'Older models ⌃ ({{count}})' },
                  )}
                </button>
              </Show>
              <div
                /* The row and its region control are SIBLINGS: the pill is a control, and a
                   control cannot sit inside the row button (axe nested-interactive), so it
                   overlays the row bottom-right from this positioning wrapper instead. */
                style={{ position: 'relative' }}
              >
                <button
                  /* mol-bespoke-button: model row — full-width list item in the model picker */
                  type="button"
                  onClick={() => {
                    const view = row()
                    if (view.lockReason === 'paid') {
                      ctx.composer.setModelPicker(null)
                      ctx.renderHandlers.stableSetInputValue('')
                      ctx.renderHandlers.stableAddSystemCard(
                        t(
                          'ide.chat.modelUpgradeRequired',
                          { model: model.label },
                          {
                            defaultValue:
                              '{{model}} is available on Pro. Upgrade to access all models.',
                          },
                        ),
                        // Host owns the upgrade/sign-in button(s) (its routes/copy).
                        { action: ctx.props.buildUpgradeCta?.({}) ?? undefined },
                      )
                    } else if (view.lockReason === 'mode') {
                      // Free-usable in a DIFFERENT mode — a plain one-liner,
                      // never the paid-upgrade pitch.
                      ctx.composer.setModelPicker(null)
                      ctx.renderHandlers.stableSetInputValue('')
                      ctx.renderHandlers.stableAddSystemCard(
                        view.usableMode === 'plan'
                          ? t('ide.chat.modeOnlyPlan', undefined, {
                              defaultValue: 'On the free plan, this model is used in plan mode.',
                            })
                          : view.usableMode === 'execute'
                            ? t('ide.chat.modeOnlyExecute', undefined, {
                                defaultValue:
                                  'On the free plan, this model is used in execute mode.',
                              })
                            : t('ide.chat.modeOnlyCommit', undefined, {
                                defaultValue:
                                  'On the free plan, this model is used for commit messages and compaction.',
                              }),
                      )
                    } else {
                      void ctx.renderHandlers.stableSelectModel(
                        model.id,
                        model.label,
                        ctx.composer.modelPicker()?.mode,
                      )
                    }
                  }}
                  onMouseEnter={(event) => {
                    const view = row()
                    if (!view.locked)
                      event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background =
                      index() === ctx.composer.modelPicker()?.selectedIdx && !row().locked
                        ? 'rgba(128,128,128,0.1)'
                        : 'transparent'
                  }}
                  // The provider color is the row's accent: an inset bar
                  // (DESIGN.md → "Accent bars"); the provider label below
                  // already carries the same color.
                  class={cm.cn(cm.w('full'), cm.accentCard({ tone: 'custom' }))}
                  style={{
                    '--mol-accent': row().accent,
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'flex-start',
                    gap: '2px',
                    padding: '8px 12px 8px 30px',
                    border: 'none',
                    'border-top': '1px solid rgba(128,128,128,0.12)',
                    cursor: row().locked ? 'default' : 'pointer',
                    color: 'inherit',
                    'text-align': 'left',
                    'font-size': '13px',
                    opacity: row().locked
                      ? '0.45'
                      : index() >= ctx.pickers.currentModels().length
                        ? '0.7'
                        : '1',
                    background:
                      index() === ctx.composer.modelPicker()?.selectedIdx && !row().locked
                        ? 'rgba(128,128,128,0.1)'
                        : 'transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '6px',
                      width: '100%',
                    }}
                  >
                    {/* minWidth:0 + ellipsis so a long label yields to the
                      right-aligned current/lock pill instead of pushing it past
                      a narrow (390px) pane's edge. */}
                    <span
                      class={cm.fontWeight('medium')}
                      style={{
                        'min-width': '0px',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap',
                      }}
                    >
                      {model.label}
                    </span>
                    <span
                      style={{
                        'font-size': '10px',
                        color: row().accent,
                        opacity: '0.85',
                        'flex-shrink': '0',
                      }}
                    >
                      {model.provider}
                    </span>
                    <Show when={model.id === ctx.pickers.currentPickerModelId()}>
                      <span
                        data-mol-id={`model-current-${model.id}`}
                        class={cm.fontWeight('medium')}
                        style={{
                          // Right-aligned + primary-tinted so the active model
                          // stands out more than the old flat grey. The hex is
                          // only the var() fallback (theme token wins); same
                          // color-mix idiom as TipCard/UserAvatar.
                          'margin-left': 'auto',
                          'font-size': '10px',
                          color: 'var(--mol-color-primary, #6366f1)',
                          background:
                            'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
                          border:
                            '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                          padding: '1px 7px',
                          'border-radius': '999px',
                        }}
                      >
                        {t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                      </span>
                    </Show>
                    <Show when={row().lockReason === 'paid'}>
                      <span
                        style={{
                          'font-size': '10px',
                          'margin-left': 'auto',
                          background: 'rgba(128,128,128,0.2)',
                          padding: '1px 5px',
                          'border-radius': '3px',
                        }}
                      >
                        {t('ide.chat.proRequired', undefined, { defaultValue: 'Pro' })}
                      </span>
                    </Show>
                    {/* Free-tier model locked here only because it belongs to a
                      DIFFERENT mode — a muted "free in <mode>" pill, never the
                      paid "Pro" claim. */}
                    <Show when={row().lockReason === 'mode'}>
                      <span
                        class={cm.textMuted}
                        style={{
                          'font-size': '10px',
                          'margin-left': 'auto',
                          background: 'rgba(128,128,128,0.2)',
                          padding: '1px 5px',
                          'border-radius': '3px',
                        }}
                      >
                        {row().freeInLabel}
                      </span>
                    </Show>
                  </div>
                  <span style={{ 'font-size': '12px', opacity: '0.7' }}>{model.description}</span>
                  <span style={{ 'font-size': '11px', opacity: '0.65' }}>
                    {formatTokenCount(model.contextWindow)} ctx ·{' '}
                    {formatTokenCount(model.maxOutputTokens)} out ·{' '}
                    <Show
                      when={row().isCustom}
                      fallback={
                        <span
                          style={{ color: row().priceColor }}
                          title={t('ide.chat.models.usageRateHint', undefined, {
                            defaultValue:
                              'How fast this model uses your AI allowance, relative to the most economical model',
                          })}
                        >
                          {t(
                            'ide.chat.models.usageRateValue',
                            { rate: row().usageRate },
                            { defaultValue: '×{{rate}} usage' },
                          )}
                        </span>
                      }
                    >
                      <span
                        title={t('ide.chat.models.usageRateYourKeyHint', undefined, {
                          defaultValue: 'Billed to your own provider key, not your plan.',
                        })}
                      >
                        {t('ide.chat.models.usageRateYourKey', undefined, {
                          defaultValue: 'your key',
                        })}
                      </span>
                    </Show>
                    {/* Peak hours: the rate above already reflects the CURRENT
                      multiplier, so without this the number would change during
                      the day with no explanation. In-window says so plainly;
                      out-of-window warns that it will rise, since finding out
                      later is the surprise worth preventing. Windows are in the
                      user's own clock (modelPeakWindowLabels). */}
                    <Show when={!row().isCustom && modelHasPeakPricing(model, row().modelRegion)}>
                      {' · '}
                      <span
                        style={{
                          color: row().peakNow > 1 ? row().priceColor : undefined,
                          opacity: row().peakNow > 1 ? '1' : '0.8',
                        }}
                        title={t(
                          'ide.chat.models.peakHint',
                          {
                            multiplier: model.peakPricing?.multiplier ?? 2,
                            windows: modelPeakWindowLabels(model).join(', '),
                          },
                          {
                            defaultValue:
                              'This model costs ×{{multiplier}} between {{windows}}. It is the normal rate the rest of the day.',
                          },
                        )}
                      >
                        <Show
                          when={row().peakNow > 1}
                          fallback={t(
                            'ide.chat.models.peakLater',
                            { multiplier: model.peakPricing?.multiplier ?? 2 },
                            { defaultValue: '×{{multiplier}} at peak hours' },
                          )}
                        >
                          {t(
                            'ide.chat.models.peakNow',
                            { multiplier: model.peakPricing?.multiplier ?? 2 },
                            { defaultValue: 'peak ×{{multiplier}} now' },
                          )}
                        </Show>
                      </span>
                    </Show>
                    {/* Custom models synthesize an empty cutoff — skip the segment. */}
                    <Show when={model.knowledgeCutoff}>
                      {' · '}
                      {model.knowledgeCutoff}
                    </Show>
                  </span>
                  <Show when={row().badges.length > 0}>
                    <span
                      style={{
                        display: 'flex',
                        gap: '4px',
                        'flex-wrap': 'wrap',
                        'align-items': 'center',
                        'margin-top': '1px',
                        // Full row width — the button column is
                        // alignItems:flex-start, so without this the line
                        // shrinks to content and the region control's
                        // marginLeft:auto has no space to push it to the right
                        // edge.
                        width: '100%',
                      }}
                    >
                      <For each={row().badges}>
                        {(badge) => (
                          <span
                            style={{
                              'font-size': '10px',
                              color: badge.fg,
                              background: badge.bg,
                              padding: '1px 5px',
                              'border-radius': '3px',
                            }}
                          >
                            {badge.label}
                          </span>
                        )}
                      </For>
                    </span>
                  </Show>
                </button>
                {/* Processing-region dropdown, anchored to the BOTTOM-RIGHT of
                  the row (absolutely positioned against the row wrapper, out of
                  the row button itself). Reads right-to-left: bare flag
                  (pill-height, no chrome) on the far right, region name to its
                  left, and a chevron-down to the left of THAT only when the
                  region is changeable — click opens a menu of the model's
                  available regions (arbitrary count). Single-region models
                  show name + flag only, non-interactive. Rendered as
                  role=button/menu spans, not <button>, because the whole model
                  row is itself a <button> and nesting buttons is invalid;
                  stopPropagation keeps clicks from selecting the row. */}
                <Show when={row().regionPill.show}>
                  <span
                    style={{ position: 'absolute', right: '12px', bottom: '8px', 'z-index': '1' }}
                  >
                    <Show
                      when={regionMenu()?.modelId === model.id}
                      fallback={
                        <Tooltip content={row().regionPill.hint} placement="top">
                          {trigger()}
                        </Tooltip>
                      }
                    >
                      {trigger()}
                    </Show>
                    {/* The menu opens BELOW the trigger at fixed viewport coords
                      (right edges aligned) so the picker's scroll container
                      can't clip it; scroll/resize close it (see the effect). */}
                    <Show when={regionMenu()?.modelId === model.id ? regionMenu() : null}>
                      {(menu) => (
                        <span
                          role="menu"
                          aria-label={t('ide.chat.model.regionMenuLabel', undefined, {
                            defaultValue: 'Processing region',
                          })}
                          class={cm.cn(cm.surface, cm.borderAll)}
                          style={{
                            position: 'fixed',
                            top: `${menu().top}px`,
                            right: `${menu().right}px`,
                            'border-radius': '6px',
                            'box-shadow': '0 4px 12px rgba(0,0,0,0.3)',
                            'z-index': '130',
                            display: 'flex',
                            'flex-direction': 'column',
                            'min-width': '112px',
                            padding: '2px',
                          }}
                        >
                          <For each={row().regionPill.options}>
                            {(region) => {
                              const rLabel = modelRegionLabel(t, region)
                              // Each option carries ITS region's usage
                              // multiplier so the cost of a switch is visible
                              // before making it.
                              const rRate = modelUsageRate(
                                model,
                                ctx.models.AVAILABLE_MODELS(),
                                region,
                              )
                              const active = (): boolean => region === row().regionPill.region
                              return (
                                <span
                                  role="menuitemradio"
                                  aria-checked={active()}
                                  tabIndex={0}
                                  data-mol-id={`model-region-${model.id}-${region}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    ctx.pickers.setRegionMenu(null)
                                    if (!active())
                                      void ctx.renderHandlers.stableSetModelRegion(model.id, region)
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.stopPropagation()
                                      event.preventDefault()
                                      ctx.pickers.setRegionMenu(null)
                                      if (!active())
                                        void ctx.renderHandlers.stableSetModelRegion(
                                          model.id,
                                          region,
                                        )
                                    }
                                  }}
                                  onMouseEnter={(event) => {
                                    if (!active())
                                      event.currentTarget.style.background =
                                        'rgba(128,128,128,0.15)'
                                  }}
                                  onMouseLeave={(event) => {
                                    event.currentTarget.style.background = active()
                                      ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                                      : 'transparent'
                                  }}
                                  class={active() ? cm.fontWeight('medium') : undefined}
                                  style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '6px',
                                    padding: '4px 8px',
                                    'border-radius': '4px',
                                    cursor: active() ? 'default' : 'pointer',
                                    'font-size': '11px',
                                    'white-space': 'nowrap',
                                    background: active()
                                      ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                                      : 'transparent',
                                    color: active()
                                      ? 'var(--mol-color-primary, #6366f1)'
                                      : 'inherit',
                                  }}
                                >
                                  <RegionFlag
                                    code={MODEL_REGION_FLAGS[region] ?? region}
                                    height={12}
                                  />
                                  <span>{rLabel}</span>
                                  <span
                                    class={active() ? undefined : cm.textMuted}
                                    style={{ 'font-size': '10px' }}
                                  >
                                    (
                                    {t(
                                      'ide.chat.models.usageRateMultiplier',
                                      { rate: rRate },
                                      { defaultValue: '×{{rate}}' },
                                    )}
                                    )
                                  </span>
                                </span>
                              )
                            }}
                          </For>
                        </span>
                      )}
                    </Show>
                  </span>
                </Show>
              </div>
            </>
          )
        }}
      </For>
      <Show when={!ctx.pickers.showDeprecated() && ctx.pickers.deprecatedModels().length > 0}>
        <button
          /* mol-bespoke-button: older-models expand row — full-width disclosure row inside the model list */
          type="button"
          onClick={() => ctx.pickers.setShowDeprecated(true)}
          class={cm.cn(cm.textSize('xs'), cm.textMuted, cm.w('full'))}
          style={{
            padding: '6px 12px',
            border: 'none',
            'border-top': '1px solid rgba(128,128,128,0.12)',
            background: 'rgba(128,128,128,0.04)',
            cursor: 'pointer',
            'text-align': 'left',
          }}
        >
          {t(
            'ide.chat.olderModelsExpand',
            { count: ctx.pickers.deprecatedModels().length },
            { defaultValue: 'Older models ⌄ ({{count}})' },
          )}
        </button>
      </Show>
    </>
  )
}
