/**
 * Tests for the WorkspaceLayout panel-sizing + resize-clamp helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { PanelConfig, WorkspaceLayout } from '@molecule/app-ide'

import {
  clampPanelSize,
  livePanelSize,
  MAX_PANEL_PERCENT,
  MIN_PANEL_PERCENT,
} from '../components/workspace-layout-utilities.js'

function makeLayout(sizes: Partial<WorkspaceLayout['sizes']> = {}): WorkspaceLayout {
  return {
    panels: [
      { id: 'chat', position: 'left', defaultSize: 25, resizable: true, visible: true },
      { id: 'editor', position: 'center', defaultSize: 50, resizable: true, visible: true },
      { id: 'preview', position: 'right', defaultSize: 25, resizable: true, visible: true },
    ],
    sizes: { left: [25], center: [50], right: [25], bottom: [], ...sizes },
  }
}

describe('clampPanelSize', () => {
  it('applies the pixel delta as a percentage of the container width', () => {
    // +100px of 1000px = +10%.
    expect(clampPanelSize(25, 100, 1000)).toBe(35)
    expect(clampPanelSize(25, -100, 1000)).toBe(15)
  })

  it('clamps to the maximum', () => {
    expect(clampPanelSize(75, 200, 1000)).toBe(MAX_PANEL_PERCENT)
  })

  it('clamps to the minimum', () => {
    expect(clampPanelSize(15, -200, 1000)).toBe(MIN_PANEL_PERCENT)
  })

  it('respects custom min/max bounds', () => {
    expect(clampPanelSize(50, 1000, 1000, 20, 60)).toBe(60)
    expect(clampPanelSize(50, -1000, 1000, 20, 60)).toBe(20)
  })

  it('never divides by zero when the container has no width', () => {
    expect(clampPanelSize(50, 0, 0)).toBe(50)
    expect(Number.isFinite(clampPanelSize(50, 10, 0))).toBe(true)
  })
})

describe('livePanelSize', () => {
  it('reads the live size from layout.sizes by position group', () => {
    const layout = makeLayout()
    const configs = layout.panels
    expect(livePanelSize(layout, configs, 0)).toBe(25) // chat / left
    expect(livePanelSize(layout, configs, 1)).toBe(50) // editor / center
    expect(livePanelSize(layout, configs, 2)).toBe(25) // preview / right
  })

  it('reflects an updated size (what resizePanel writes)', () => {
    const layout = makeLayout({ left: [40] })
    expect(livePanelSize(layout, layout.panels, 0)).toBe(40)
  })

  it('falls back to defaultSize when the position group has no entry', () => {
    const layout = makeLayout({ left: [] })
    expect(livePanelSize(layout, layout.panels, 0)).toBe(25)
  })

  it('indexes within a shared position group', () => {
    const configs: PanelConfig[] = [
      { id: 'files', position: 'left', defaultSize: 20, visible: true },
      { id: 'chat', position: 'left', defaultSize: 30, visible: true },
    ]
    const layout: WorkspaceLayout = {
      panels: configs,
      sizes: { left: [22, 33], center: [], right: [], bottom: [] },
    }
    expect(livePanelSize(layout, configs, 0)).toBe(22)
    expect(livePanelSize(layout, configs, 1)).toBe(33)
  })

  it('falls back to an equal split with no size and no defaultSize', () => {
    const configs: PanelConfig[] = [
      { id: 'a', position: 'left', visible: true },
      { id: 'b', position: 'center', visible: true },
    ]
    const layout: WorkspaceLayout = {
      panels: configs,
      sizes: { left: [], center: [], right: [], bottom: [] },
    }
    expect(livePanelSize(layout, configs, 0)).toBe(50)
  })

  it('returns an equal split for an out-of-range index', () => {
    const layout = makeLayout()
    expect(livePanelSize(layout, layout.panels, 99)).toBe(33)
  })
})
