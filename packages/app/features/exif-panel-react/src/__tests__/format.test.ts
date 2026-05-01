import { describe, expect, it } from 'vitest'

import {
  buildMapLink,
  formatAperture,
  formatCamera,
  formatDms,
  formatFocalLength,
  formatGps,
  formatIso,
  formatShutter,
  formatTimestamp,
} from '../format.js'

describe('formatAperture', () => {
  it('renders whole stops without trailing zero', () => {
    expect(formatAperture(8)).toBe('f/8')
    expect(formatAperture(4)).toBe('f/4')
  })

  it('renders fractional stops with one decimal', () => {
    expect(formatAperture(2.8)).toBe('f/2.8')
    expect(formatAperture(5.6)).toBe('f/5.6')
  })

  it('rounds to one decimal place', () => {
    expect(formatAperture(2.83)).toBe('f/2.8')
    expect(formatAperture(2.85)).toBe('f/2.9')
  })

  it('returns null for missing / invalid values', () => {
    expect(formatAperture(undefined)).toBeNull()
    expect(formatAperture(0)).toBeNull()
    expect(formatAperture(-1)).toBeNull()
    expect(formatAperture(Number.NaN)).toBeNull()
    expect(formatAperture(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('formatShutter', () => {
  it('renders sub-second shutter as 1/N s', () => {
    expect(formatShutter(0.008)).toBe('1/125 s')
    expect(formatShutter(1 / 1000)).toBe('1/1000 s')
    expect(formatShutter(1 / 60)).toBe('1/60 s')
  })

  it('rounds the reciprocal to the nearest integer', () => {
    expect(formatShutter(0.0079)).toBe('1/127 s')
  })

  it('renders one-second exposure as "1 s"', () => {
    expect(formatShutter(1)).toBe('1 s')
  })

  it('renders multi-second exposures in seconds', () => {
    expect(formatShutter(2)).toBe('2 s')
    expect(formatShutter(2.5)).toBe('2.5 s')
    expect(formatShutter(30)).toBe('30 s')
  })

  it('returns null for missing / invalid values', () => {
    expect(formatShutter(undefined)).toBeNull()
    expect(formatShutter(0)).toBeNull()
    expect(formatShutter(-1)).toBeNull()
    expect(formatShutter(Number.NaN)).toBeNull()
  })
})

describe('formatIso', () => {
  it('renders ISO with the value', () => {
    expect(formatIso(100)).toBe('ISO 100')
    expect(formatIso(1600)).toBe('ISO 1600')
  })

  it('rounds to integers', () => {
    expect(formatIso(204.6)).toBe('ISO 205')
  })

  it('returns null for missing / invalid values', () => {
    expect(formatIso(undefined)).toBeNull()
    expect(formatIso(0)).toBeNull()
    expect(formatIso(-100)).toBeNull()
  })
})

describe('formatFocalLength', () => {
  it('renders whole millimetres without decimals', () => {
    expect(formatFocalLength(50)).toBe('50 mm')
    expect(formatFocalLength(200)).toBe('200 mm')
  })

  it('renders fractional millimetres with one decimal', () => {
    expect(formatFocalLength(35.5)).toBe('35.5 mm')
  })

  it('returns null for missing / invalid values', () => {
    expect(formatFocalLength(undefined)).toBeNull()
    expect(formatFocalLength(0)).toBeNull()
    expect(formatFocalLength(-50)).toBeNull()
  })
})

describe('formatDms', () => {
  it('renders positive latitude as N hemisphere', () => {
    expect(formatDms(37.4219983, 'lat')).toBe('37° 25\' 19.19" N')
  })

  it('renders negative latitude as S hemisphere', () => {
    expect(formatDms(-33.8688, 'lat')).toBe('33° 52\' 7.68" S')
  })

  it('renders positive longitude as E hemisphere', () => {
    expect(formatDms(151.2093, 'lon')).toBe('151° 12\' 33.48" E')
  })

  it('renders negative longitude as W hemisphere', () => {
    expect(formatDms(-122.084, 'lon')).toBe('122° 5\' 2.40" W')
  })

  it('treats zero as the positive hemisphere', () => {
    expect(formatDms(0, 'lat')).toBe('0° 0\' 0.00" N')
    expect(formatDms(0, 'lon')).toBe('0° 0\' 0.00" E')
  })

  it('returns null for missing / invalid values', () => {
    expect(formatDms(undefined, 'lat')).toBeNull()
    expect(formatDms(Number.NaN, 'lon')).toBeNull()
  })
})

describe('formatGps', () => {
  it('joins both axes with a comma', () => {
    expect(formatGps(37.4219983, -122.084)).toBe('37° 25\' 19.19" N, 122° 5\' 2.40" W')
  })

  it('returns null when either axis is missing', () => {
    expect(formatGps(37, undefined)).toBeNull()
    expect(formatGps(undefined, -122)).toBeNull()
    expect(formatGps(undefined, undefined)).toBeNull()
  })
})

describe('buildMapLink', () => {
  it('builds an OpenStreetMap URL', () => {
    const url = buildMapLink(37.421998, -122.084)
    expect(url).toContain('openstreetmap.org')
    expect(url).toContain('mlat=37.421998')
    expect(url).toContain('mlon=-122.084000')
  })

  it('returns null when either axis is missing', () => {
    expect(buildMapLink(37, undefined)).toBeNull()
    expect(buildMapLink(undefined, -122)).toBeNull()
  })
})

describe('formatTimestamp', () => {
  it('formats Date instances', () => {
    const d = new Date(Date.UTC(2024, 5, 15, 12, 30, 45))
    const out = formatTimestamp(d)
    expect(out).not.toBeNull()
    expect(typeof out).toBe('string')
  })

  it('formats ISO strings', () => {
    const out = formatTimestamp('2024-06-15T12:30:45Z')
    expect(out).not.toBeNull()
    expect(typeof out).toBe('string')
  })

  it('formats epoch milliseconds', () => {
    const out = formatTimestamp(Date.UTC(2024, 5, 15, 12, 30, 45))
    expect(out).not.toBeNull()
  })

  it('returns null for missing / invalid values', () => {
    expect(formatTimestamp(undefined)).toBeNull()
    expect(formatTimestamp('not-a-date')).toBeNull()
  })
})

describe('formatCamera', () => {
  it('joins make + model with a space', () => {
    expect(formatCamera('Canon', 'EOS R5')).toBe('Canon EOS R5')
  })

  it('drops duplicate make prefix in model', () => {
    expect(formatCamera('Sony', 'Sony a7 III')).toBe('Sony a7 III')
    expect(formatCamera('NIKON', 'NIKON Z 9')).toBe('NIKON Z 9')
  })

  it('returns just one when the other is missing', () => {
    expect(formatCamera('Canon', undefined)).toBe('Canon')
    expect(formatCamera(undefined, 'EOS R5')).toBe('EOS R5')
  })

  it('returns null when both are missing', () => {
    expect(formatCamera(undefined, undefined)).toBeNull()
    expect(formatCamera('', '')).toBeNull()
  })
})
