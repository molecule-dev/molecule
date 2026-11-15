/**
 * Pure helpers for {@link WorkspaceLayout} panel sizing and resize clamping.
 *
 * Kept side-effect-free (no React, no DOM) so the resize math is unit-testable.
 * The layout reads the LIVE size from `layout.sizes` — the same place
 * `WorkspaceProvider.resizePanel` writes — so a drag is reflected and persisted
 * (the previous code read `defaultSize`, which resize never updated, so drags
 * silently did nothing).
 *
 * @module
 */

import type { PanelConfig, WorkspaceLayout } from '@molecule/app-ide'

/** Smallest a panel may shrink to, as a percentage of the container. */
export const MIN_PANEL_PERCENT = 10
/** Largest a panel may grow to, as a percentage of the container. */
export const MAX_PANEL_PERCENT = 80

/**
 * Clamp a panel's new size after a pixel drag delta.
 * @param currentSize - The panel's current size as a percentage.
 * @param deltaPx - The drag delta in pixels (positive = grow the left panel).
 * @param containerWidth - The layout container width in pixels.
 * @param min - Minimum allowed percentage. Defaults to {@link MIN_PANEL_PERCENT}.
 * @param max - Maximum allowed percentage. Defaults to {@link MAX_PANEL_PERCENT}.
 * @returns The new size as a percentage, clamped to `[min, max]`.
 */
export function clampPanelSize(
  currentSize: number,
  deltaPx: number,
  containerWidth: number,
  min = MIN_PANEL_PERCENT,
  max = MAX_PANEL_PERCENT,
): number {
  const width = containerWidth > 0 ? containerWidth : 1
  const percentDelta = (deltaPx / width) * 100
  return Math.max(min, Math.min(max, currentSize + percentDelta))
}

/**
 * The live size (percentage) of the visible panel at `index`, read from
 * `layout.sizes` keyed by the panel's position group (where `resizePanel`
 * writes), falling back to the panel's `defaultSize`, then to an equal split.
 * @param layout - The current workspace layout.
 * @param panelConfigs - The visible panel configs, in render order.
 * @param index - The index of the panel within `panelConfigs`.
 * @returns The panel size as a percentage.
 */
export function livePanelSize(
  layout: WorkspaceLayout,
  panelConfigs: PanelConfig[],
  index: number,
): number {
  const equal = Math.floor(100 / Math.max(panelConfigs.length, 1))
  const config = panelConfigs[index]
  if (!config) return equal

  const group = layout.sizes?.[config.position]
  if (group) {
    // Index within the position group = count of preceding configs sharing it.
    let idxInGroup = 0
    for (let i = 0; i < index; i++) {
      if (panelConfigs[i]?.position === config.position) idxInGroup++
    }
    const size = group[idxInGroup]
    if (typeof size === 'number' && Number.isFinite(size)) return size
  }

  return config.defaultSize ?? equal
}
