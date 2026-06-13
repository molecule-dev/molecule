/**
 * Tests for the preview device-frame cycle helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { DeviceFrame } from '@molecule/app-live-preview'

import {
  DEVICE_CYCLE,
  DEVICE_META,
  deviceIconName,
  nextDevice,
} from '../components/device-cycle.js'

describe('device cycle', () => {
  it('cycles responsive → desktop → tablet → mobile → responsive', () => {
    expect([...DEVICE_CYCLE]).toEqual(['none', 'desktop', 'tablet', 'mobile'])
    expect(nextDevice('none')).toBe('desktop')
    expect(nextDevice('desktop')).toBe('tablet')
    expect(nextDevice('tablet')).toBe('mobile')
    expect(nextDevice('mobile')).toBe('none')
  })

  it('visits every frame exactly once before wrapping', () => {
    const visited: DeviceFrame[] = []
    let frame: DeviceFrame = 'none'
    for (let i = 0; i < DEVICE_CYCLE.length; i++) {
      visited.push(frame)
      frame = nextDevice(frame)
    }
    expect(new Set(visited).size).toBe(DEVICE_CYCLE.length)
    // Full loop returns to the start.
    expect(frame).toBe('none')
  })

  it('falls back to the first frame for an unknown value', () => {
    expect(nextDevice('phablet' as DeviceFrame)).toBe('none')
  })

  it('maps each frame to a registered icon-set glyph', () => {
    expect(deviceIconName('none')).toBe('browser')
    expect(deviceIconName('desktop')).toBe('device-desktop')
    expect(deviceIconName('tablet')).toBe('device-tablet')
    expect(deviceIconName('mobile')).toBe('device-mobile')
  })

  it('has icon + label metadata for every frame in the cycle', () => {
    for (const frame of DEVICE_CYCLE) {
      const meta = DEVICE_META[frame]
      expect(meta.icon, `${frame} icon`).toBeTruthy()
      expect(meta.labelKey, `${frame} labelKey`).toMatch(/^ide\.device\./)
      expect(meta.label, `${frame} label`).toBeTruthy()
    }
  })
})
