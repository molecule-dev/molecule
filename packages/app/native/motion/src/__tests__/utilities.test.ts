import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { AccelerometerData, MotionProvider } from '../types.js'
import {
  createShakeDetector,
  createStepCounter,
  createTiltDetector,
  cross,
  dot,
  magnitude,
  normalize,
} from '../utilities.js'

const createMockProvider = (overrides?: Partial<MotionProvider>): MotionProvider => ({
  startAccelerometer: vi.fn().mockReturnValue(() => {}),
  startGyroscope: vi.fn().mockReturnValue(() => {}),
  startMagnetometer: vi.fn().mockReturnValue(() => {}),
  startOrientation: vi.fn().mockReturnValue(() => {}),
  startMotion: vi.fn().mockReturnValue(() => {}),
  getAccelerometer: vi.fn().mockResolvedValue({
    x: 0,
    y: 0,
    z: 9.8,
    timestamp: Date.now(),
    includesGravity: true,
  }),
  getGyroscope: vi.fn().mockResolvedValue({
    x: 0,
    y: 0,
    z: 0,
    timestamp: Date.now(),
  }),
  getOrientation: vi.fn().mockResolvedValue({
    alpha: 0,
    beta: 0,
    gamma: 0,
    timestamp: Date.now(),
    absolute: false,
  }),
  getPermissionStatus: vi.fn().mockResolvedValue('granted'),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    hasAccelerometer: true,
    hasGyroscope: true,
    hasMagnetometer: true,
    hasOrientation: true,
    requiresPermission: false,
  }),
  ...overrides,
})

describe('Vector Math Functions', () => {
  describe('magnitude', () => {
    it('should calculate magnitude of a zero vector', () => {
      expect(magnitude({ x: 0, y: 0, z: 0 })).toBe(0)
    })

    it('should calculate magnitude of a unit vector', () => {
      expect(magnitude({ x: 1, y: 0, z: 0 })).toBe(1)
      expect(magnitude({ x: 0, y: 1, z: 0 })).toBe(1)
      expect(magnitude({ x: 0, y: 0, z: 1 })).toBe(1)
    })

    it('should calculate magnitude of arbitrary vectors', () => {
      expect(magnitude({ x: 3, y: 4, z: 0 })).toBe(5)
      expect(magnitude({ x: 1, y: 2, z: 2 })).toBe(3)
    })

    it('should handle negative values', () => {
      expect(magnitude({ x: -3, y: -4, z: 0 })).toBe(5)
    })
  })

  describe('normalize', () => {
    it('should return zero vector for zero input', () => {
      const result = normalize({ x: 0, y: 0, z: 0 })
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.z).toBe(0)
    })

    it('should normalize unit vectors to themselves', () => {
      const result = normalize({ x: 1, y: 0, z: 0 })
      expect(result.x).toBe(1)
      expect(result.y).toBe(0)
      expect(result.z).toBe(0)
    })

    it('should normalize arbitrary vectors to unit length', () => {
      const result = normalize({ x: 3, y: 4, z: 0 })
      expect(result.x).toBeCloseTo(0.6)
      expect(result.y).toBeCloseTo(0.8)
      expect(result.z).toBe(0)

      const mag = magnitude(result)
      expect(mag).toBeCloseTo(1)
    })

    it('should handle negative values', () => {
      const result = normalize({ x: -3, y: 4, z: 0 })
      expect(result.x).toBeCloseTo(-0.6)
      expect(result.y).toBeCloseTo(0.8)
    })
  })

  describe('dot', () => {
    it('should return 0 for orthogonal vectors', () => {
      expect(dot({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0)
      expect(dot({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })).toBe(0)
    })

    it('should return 1 for parallel unit vectors', () => {
      expect(dot({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(1)
    })

    it('should return -1 for anti-parallel unit vectors', () => {
      expect(dot({ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 })).toBe(-1)
    })

    it('should calculate dot product of arbitrary vectors', () => {
      expect(dot({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toBe(32)
    })
  })

  describe('cross', () => {
    it('should return correct cross product for x and y', () => {
      const result = cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.z).toBe(1)
    })

    it('should return correct cross product for y and x (opposite direction)', () => {
      const result = cross({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 })
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.z).toBe(-1)
    })

    it('should return zero for parallel vectors', () => {
      const result = cross({ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 })
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.z).toBe(0)
    })

    it('should calculate cross product of arbitrary vectors', () => {
      const result = cross({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })
      expect(result.x).toBe(-3) // 2*6 - 3*5 = 12 - 15 = -3
      expect(result.y).toBe(6) // 3*4 - 1*6 = 12 - 6 = 6
      expect(result.z).toBe(-3) // 1*5 - 2*4 = 5 - 8 = -3
    })
  })
})

describe('Shake Detector', () => {
  let mockProvider: MotionProvider
  let accelerometerCallback: ((data: AccelerometerData) => void) | null = null

  beforeEach(() => {
    mockProvider = createMockProvider({
      startAccelerometer: vi.fn().mockImplementation((callback) => {
        accelerometerCallback = callback
        return () => {
          accelerometerCallback = null
        }
      }),
    })
    setProvider(mockProvider)
  })

  afterEach(() => {
    accelerometerCallback = null
  })

  it('should create a shake detector', () => {
    const onShake = vi.fn()
    const detector = createShakeDetector(onShake)
    expect(detector).toHaveProperty('start')
    expect(detector).toHaveProperty('stop')
  })

  it('should start accelerometer when started', () => {
    const onShake = vi.fn()
    const detector = createShakeDetector(onShake)
    detector.start()
    expect(mockProvider.startAccelerometer).toHaveBeenCalled()
  })

  it('should stop accelerometer when stopped', () => {
    const onShake = vi.fn()
    const detector = createShakeDetector(onShake)
    detector.start()
    detector.stop()
    // The stop function returned by startAccelerometer should have been called
    // which sets accelerometerCallback to null
    expect(accelerometerCallback).toBeNull()
  })

  it('should detect shake when threshold is exceeded multiple times', () => {
    vi.useFakeTimers()
    const onShake = vi.fn()
    const detector = createShakeDetector(onShake, { threshold: 10, minShakes: 3, timeWindow: 1000 })
    detector.start()

    // Simulate shake events
    const timestamp = Date.now()
    accelerometerCallback?.({ x: 0, y: 0, z: 0, timestamp, includesGravity: true })
    accelerometerCallback?.({
      x: 20,
      y: 0,
      z: 0,
      timestamp: timestamp + 100,
      includesGravity: true,
    })
    accelerometerCallback?.({ x: 0, y: 0, z: 0, timestamp: timestamp + 200, includesGravity: true })
    accelerometerCallback?.({
      x: 20,
      y: 0,
      z: 0,
      timestamp: timestamp + 300,
      includesGravity: true,
    })
    accelerometerCallback?.({ x: 0, y: 0, z: 0, timestamp: timestamp + 400, includesGravity: true })
    accelerometerCallback?.({
      x: 20,
      y: 0,
      z: 0,
      timestamp: timestamp + 500,
      includesGravity: true,
    })

    expect(onShake).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('should not detect shake for small movements', () => {
    const onShake = vi.fn()
    const detector = createShakeDetector(onShake, { threshold: 15 })
    detector.start()

    const timestamp = Date.now()
    accelerometerCallback?.({ x: 0, y: 0, z: 9.8, timestamp, includesGravity: true })
    accelerometerCallback?.({
      x: 1,
      y: 0,
      z: 9.8,
      timestamp: timestamp + 100,
      includesGravity: true,
    })
    accelerometerCallback?.({
      x: 2,
      y: 0,
      z: 9.8,
      timestamp: timestamp + 200,
      includesGravity: true,
    })

    expect(onShake).not.toHaveBeenCalled()
  })
})

describe('Tilt Detector', () => {
  let mockProvider: MotionProvider
  let accelerometerCallback: ((data: AccelerometerData) => void) | null = null

  beforeEach(() => {
    mockProvider = createMockProvider({
      startAccelerometer: vi.fn().mockImplementation((callback) => {
        accelerometerCallback = callback
        return () => {
          accelerometerCallback = null
        }
      }),
    })
    setProvider(mockProvider)
  })

  it('should create a tilt detector', () => {
    const onChange = vi.fn()
    const detector = createTiltDetector(onChange)
    expect(detector).toHaveProperty('start')
    expect(detector).toHaveProperty('stop')
  })

  it('should report tilt angles', () => {
    const onChange = vi.fn()
    const detector = createTiltDetector(onChange)
    detector.start()

    accelerometerCallback?.({ x: 0, y: 0, z: 9.8, timestamp: Date.now(), includesGravity: true })

    expect(onChange).toHaveBeenCalled()
    const [[{ pitch, roll }]] = onChange.mock.calls
    expect(typeof pitch).toBe('number')
    expect(typeof roll).toBe('number')
  })

  it('should calculate correct pitch for tilted device', () => {
    const onChange = vi.fn()
    const detector = createTiltDetector(onChange)
    detector.start()

    // Tilted forward - positive y, positive z
    accelerometerCallback?.({ x: 0, y: 5, z: 8.5, timestamp: Date.now(), includesGravity: true })

    const [[{ pitch }]] = onChange.mock.calls
    expect(pitch).toBeGreaterThan(0) // Positive pitch for forward tilt
  })
})

describe('Step Counter', () => {
  let mockProvider: MotionProvider
  let accelerometerCallback: ((data: AccelerometerData) => void) | null = null

  beforeEach(() => {
    mockProvider = createMockProvider({
      startAccelerometer: vi.fn().mockImplementation((callback) => {
        accelerometerCallback = callback
        return () => {
          accelerometerCallback = null
        }
      }),
    })
    setProvider(mockProvider)
  })

  it('should create a step counter', () => {
    const onStep = vi.fn()
    const counter = createStepCounter(onStep)
    expect(counter).toHaveProperty('start')
    expect(counter).toHaveProperty('stop')
    expect(counter).toHaveProperty('getCount')
    expect(counter).toHaveProperty('reset')
  })

  it('should start with zero count', () => {
    const onStep = vi.fn()
    const counter = createStepCounter(onStep)
    expect(counter.getCount()).toBe(0)
  })

  it('should reset count', () => {
    const onStep = vi.fn()
    const counter = createStepCounter(onStep)
    counter.reset()
    expect(counter.getCount()).toBe(0)
  })

  it('should stop accelerometer when stopped', () => {
    const onStep = vi.fn()
    const counter = createStepCounter(onStep)
    counter.start()
    counter.stop()
    expect(accelerometerCallback).toBeNull()
  })
})
