/**
 * Tests for the preview device-frame data + sizing helpers.
 *
 * The preview selector is a dropdown (one entry per frame) plus a "Rotate"
 * control that swaps fixed-frame devices between portrait and landscape, so
 * these guard the frame list, per-frame metadata, the fixed pixel dimensions,
 * and the orientation-aware size resolver.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { DeviceFrame } from '@molecule/app-live-preview'

import {
  DEVICE_DIMENSIONS,
  DEVICE_FRAMES,
  DEVICE_META,
  deviceIconName,
  isDeviceRotatable,
  resolveDeviceSize,
} from '../components/device-cycle.js'

describe('device frames', () => {
  it('lists every frame in display order (responsive, desktop, tablet, mobile)', () => {
    expect([...DEVICE_FRAMES]).toEqual(['none', 'desktop', 'tablet', 'mobile'])
  })

  it('maps each frame to a registered icon-set glyph', () => {
    expect(deviceIconName('none')).toBe('browser')
    expect(deviceIconName('desktop')).toBe('device-desktop')
    expect(deviceIconName('tablet')).toBe('device-tablet')
    expect(deviceIconName('mobile')).toBe('device-mobile')
  })

  it('has icon + label metadata for every frame', () => {
    for (const frame of DEVICE_FRAMES) {
      const meta = DEVICE_META[frame]
      expect(meta.icon, `${frame} icon`).toBeTruthy()
      expect(meta.labelKey, `${frame} labelKey`).toMatch(/^ide\.device\./)
      expect(meta.label, `${frame} label`).toBeTruthy()
    }
  })
})

describe('device dimensions + rotation', () => {
  it('marks only fixed-frame devices (tablet, mobile) rotatable', () => {
    expect(isDeviceRotatable('none')).toBe(false)
    expect(isDeviceRotatable('desktop')).toBe(false)
    expect(isDeviceRotatable('tablet')).toBe(true)
    expect(isDeviceRotatable('mobile')).toBe(true)
  })

  it('defines a fixed pixel frame for the rotatable devices', () => {
    expect(DEVICE_DIMENSIONS.tablet).toEqual({ width: '768px', height: '1024px', rotatable: true })
    expect(DEVICE_DIMENSIONS.mobile).toEqual({ width: '375px', height: '667px', rotatable: true })
  })

  it('keeps responsive + desktop fluid (full width, no fixed height to rotate)', () => {
    for (const frame of ['none', 'desktop'] as DeviceFrame[]) {
      expect(DEVICE_DIMENSIONS[frame].width).toBe('100%')
      expect(DEVICE_DIMENSIONS[frame].height).toBeNull()
      expect(DEVICE_DIMENSIONS[frame].rotatable).toBe(false)
    }
  })

  it('fills the preview area for fluid frames regardless of orientation', () => {
    for (const frame of ['none', 'desktop'] as DeviceFrame[]) {
      expect(resolveDeviceSize(frame, 'portrait')).toEqual({ width: '100%', height: '100%' })
      expect(resolveDeviceSize(frame, 'landscape')).toEqual({ width: '100%', height: '100%' })
    }
  })

  it('renders a fixed frame at its portrait pixel size in portrait', () => {
    expect(resolveDeviceSize('tablet', 'portrait')).toEqual({ width: '768px', height: '1024px' })
    expect(resolveDeviceSize('mobile', 'portrait')).toEqual({ width: '375px', height: '667px' })
  })

  it('swaps width and height for a fixed frame in landscape', () => {
    expect(resolveDeviceSize('tablet', 'landscape')).toEqual({ width: '1024px', height: '768px' })
    expect(resolveDeviceSize('mobile', 'landscape')).toEqual({ width: '667px', height: '375px' })
  })
})
