/**
 * `/models` comparison table.
 *
 * Renders the available models in a sortable table: name, context window,
 * combined cost per 1M tokens, knowledge cutoff, and free-tier availability.
 * Clicking a column header sorts ascending, then toggles to descending; every
 * header carries a neutral SVG sort glyph (`chevrons-up-down`) that resolves to
 * an up/down chevron on the active column — never a unicode arrow or emoji.
 * Free-tier-available models are visually highlighted.
 *
 * The "Cutoff" column replaced a former "Speed" column that was fabricated from
 * input price (it duplicated Cost and could be factually wrong). Knowledge
 * cutoff is a real, factual axis genuinely independent of the price/size axes.
 *
 * Styling uses `getClassMap()` (`cm.*`) for structure/typography/spacing and the
 * `--color-primary` theme token for the active-header accent; the only inline
 * styles are the free-tier highlight tint and the provider accent stripe —
 * things the ClassMap can't express.
 *
 * @module
 */

import type { JSX } from 'react'
import { useMemo, useState } from 'react'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { formatTokenCount, PROVIDER_BRAND_COLORS } from '@molecule/app-ai-models'
import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { ModelSortColumn, SortDirection } from './chat-models-utilities.js'
import { modelTotalCost, sortModels } from './chat-models-utilities.js'
import { Icon } from './Icon.js'

/** Column definition for the models table header. */
interface ColumnDef {
  key: ModelSortColumn
  label: string
}

/**
 * Picks the SVG sort glyph for a header: the neutral `chevrons-up-down` when the
 * column is not the active sort, or a single up/down chevron matching the active
 * direction. Keeps one consistent icon family across every header.
 *
 * @param active - Whether this column is the current sort column.
 * @param direction - The current sort direction (only meaningful when `active`).
 * @returns The icon-set glyph name to render.
 */
function sortGlyph(active: boolean, direction: SortDirection): string {
  if (!active) return 'chevrons-up-down'
  return direction === 'asc' ? 'chevron-up' : 'chevron-down'
}

/**
 * Sortable comparison table of available AI models.
 *
 * @param root0 - Component props.
 * @param root0.models - Models to display (already filtered to the current catalog).
 * @param root0.currentModelId - The id of the project's active model, badged as "current".
 * @param root0.isLight - Whether the current theme is light mode (drives highlight tints).
 * @returns The rendered models table.
 */
export function ModelsTable({
  models,
  currentModelId,
  isLight,
}: {
  models: readonly AppModelDefinition[]
  currentModelId?: string
  isLight: boolean
}): JSX.Element {
  const cm = getClassMap()
  const [sort, setSort] = useState<{ column: ModelSortColumn; direction: SortDirection }>({
    column: 'name',
    direction: 'asc',
  })

  const sorted = useMemo(
    () => sortModels(models, sort.column, sort.direction),
    [models, sort.column, sort.direction],
  )

  const columns: ColumnDef[] = [
    { key: 'name', label: t('ide.chat.models.colName', undefined, { defaultValue: 'Model' }) },
    {
      key: 'context',
      label: t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' }),
    },
    {
      key: 'cost',
      label: t('ide.chat.models.colCost', undefined, { defaultValue: 'Cost / 1M' }),
    },
    {
      key: 'cutoff',
      label: t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' }),
    },
    { key: 'free', label: t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' }) },
  ]

  const freeHighlightBg = isLight ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.14)'
  const freeBadgeFg = isLight ? 'rgb(21,128,61)' : 'rgb(74,222,128)'

  const cellPad = cm.sp('px', 2)
  const cellPadY = cm.sp('py', 1)

  return (
    <div
      data-mol-id="models-table"
      className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
      style={{
        margin: '6px 0',
        borderRadius: 6,
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort.column === col.key
              return (
                <th
                  key={col.key}
                  className={cm.cn(cellPad, cellPadY, cm.fontWeight('medium'))}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <button
                    type="button"
                    data-mol-id={`models-sort-${col.key}`}
                    aria-label={t(
                      'ide.chat.models.sortBy',
                      { column: col.label },
                      { defaultValue: 'Sort by {{column}}' },
                    )}
                    onClick={() =>
                      setSort((prev) =>
                        prev.column === col.key
                          ? {
                              column: col.key,
                              direction: prev.direction === 'asc' ? 'desc' : 'asc',
                            }
                          : { column: col.key, direction: 'asc' },
                      )
                    }
                    className={cm.cn(cm.fontWeight('medium'), active ? undefined : cm.textMuted)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: active ? 'var(--color-primary)' : 'inherit',
                      font: 'inherit',
                      padding: 0,
                    }}
                  >
                    {col.label}
                    <Icon
                      name={sortGlyph(active, sort.direction)}
                      size={12}
                      aria-hidden="true"
                      data-mol-id={`models-sort-glyph-${col.key}`}
                      style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}
                    />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((model) => {
            const accent = PROVIDER_BRAND_COLORS[model.provider] ?? '#888'
            const isCurrent = model.id === currentModelId
            return (
              <tr
                key={model.id}
                className={cm.borderT}
                style={model.freeTier ? { background: freeHighlightBg } : undefined}
              >
                <td
                  className={cm.cn(cellPad, cellPadY)}
                  style={{ borderLeft: `3px solid ${accent}` }}
                >
                  <span className={cm.fontWeight('medium')}>{model.label}</span>{' '}
                  <span className={cm.textMuted} style={{ fontSize: 10 }}>
                    {model.provider}
                  </span>
                  {isCurrent && (
                    <span
                      className={cm.textMuted}
                      style={{
                        marginLeft: 4,
                        fontSize: 10,
                        background: 'rgba(128,128,128,0.2)',
                        padding: '0 4px',
                        borderRadius: 3,
                      }}
                    >
                      {t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                    </span>
                  )}
                </td>
                <td className={cm.cn(cellPad, cellPadY)} style={{ whiteSpace: 'nowrap' }}>
                  {formatTokenCount(model.contextWindow)}
                </td>
                <td className={cm.cn(cellPad, cellPadY)} style={{ whiteSpace: 'nowrap' }}>
                  {/*
                    Collapse the wide "$X.XX ($in+$out)" breakdown into a single
                    figure + the framework styled Tooltip, so the cost column
                    stays narrow enough to read in the chat panel. The breakdown
                    is revealed on hover/focus — not crammed inline.
                  */}
                  <Tooltip
                    content={t(
                      'ide.chat.models.costBreakdown',
                      {
                        input: model.inputPricePerMTok.toFixed(2),
                        output: model.outputPricePerMTok.toFixed(2),
                      },
                      { defaultValue: 'Input ${{input}} + output ${{output}} per 1M tokens' },
                    )}
                    placement="top"
                  >
                    <span data-mol-id={`models-cost-${model.id}`}>
                      ${modelTotalCost(model).toFixed(2)}
                    </span>
                  </Tooltip>
                </td>
                <td className={cm.cn(cellPad, cellPadY)} style={{ whiteSpace: 'nowrap' }}>
                  {model.knowledgeCutoff}
                </td>
                <td className={cm.cn(cellPad, cellPadY)}>
                  {model.freeTier ? (
                    <span style={{ color: freeBadgeFg, fontWeight: 600 }}>
                      {t('ide.chat.models.freeYes', undefined, { defaultValue: '✓ Free' })}
                    </span>
                  ) : (
                    <span className={cm.textMuted}>
                      {t('ide.chat.models.freeNo', undefined, { defaultValue: '—' })}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
