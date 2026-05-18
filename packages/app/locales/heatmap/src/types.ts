/** Translation keys for the heatmap locale package. */
export type HeatmapTranslationKey =
  | 'heatmap.aria.grid'
  | 'heatmap.cell.tooltip'
  | 'heatmap.month.jan'
  | 'heatmap.month.feb'
  | 'heatmap.month.mar'
  | 'heatmap.month.apr'
  | 'heatmap.month.may'
  | 'heatmap.month.jun'
  | 'heatmap.month.jul'
  | 'heatmap.month.aug'
  | 'heatmap.month.sep'
  | 'heatmap.month.oct'
  | 'heatmap.month.nov'
  | 'heatmap.month.dec'
  | 'heatmap.weekday.sun'
  | 'heatmap.weekday.mon'
  | 'heatmap.weekday.tue'
  | 'heatmap.weekday.wed'
  | 'heatmap.weekday.thu'
  | 'heatmap.weekday.fri'
  | 'heatmap.weekday.sat'

/** Translation record mapping heatmap keys to translated strings. */
export type HeatmapTranslations = Record<HeatmapTranslationKey, string>
