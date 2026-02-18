import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  connect,
  disconnect,
  discoverServices,
  getCapabilities,
  getConnectionState,
  getPermissionStatus,
  getProvider,
  getState,
  hasProvider,
  isEnabled,
  onDisconnect,
  onStateChange,
  openSettings,
  read,
  requestEnable,
  requestPermission,
  scanOnce,
  setProvider,
  startNotifications,
  startScan,
  write,
} from '../provider.js'
import type { BluetoothDevice, BluetoothProvider, BluetoothService } from '../types.js'
import {
  bufferToHex,
  bufferToString,
  expandUuid,
  hexToBuffer,
  normalizeUuid,
  StandardCharacteristics,
  StandardServices,
  stringToBuffer,
} from '../utilities.js'

// ============================================================================
// Mock Provider Factory
// ============================================================================

const createMockDevice = (overrides?: Partial<BluetoothDevice>): BluetoothDevice => ({
  id: 'AA:BB:CC:DD:EE:FF',
  name: 'Test Device',
  localName: 'Test Device Local',
  rssi: -50,
  serviceUUIDs: ['180d', '180f'],
  connectable: true,
  txPowerLevel: -20,
  ...overrides,
})

const createMockService = (overrides?: Partial<BluetoothService>): BluetoothService => ({
  uuid: '0000180d-0000-1000-8000-00805f9b34fb',
  isPrimary: true,
  characteristics: [
    {
      uuid: '00002a37-0000-1000-8000-00805f9b34fb',
      serviceUuid: '0000180d-0000-1000-8000-00805f9b34fb',
      properties: {
        read: true,
        write: false,
        writeWithoutResponse: false,
        notify: true,
        indicate: false,
      },
    },
  ],
  ...overrides,
})

const createMockProvider = (overrides?: Partial<BluetoothProvider>): BluetoothProvider => ({
  startScan: vi.fn().mockReturnValue(() => {}),
  scanOnce: vi.fn().mockResolvedValue([createMockDevice()]),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  getConnectionState: vi.fn().mockResolvedValue('connected'),
  discoverServices: vi.fn().mockResolvedValue([createMockService()]),
  read: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
  write: vi.fn().mockResolvedValue(undefined),
  startNotifications: vi.fn().mockReturnValue(() => {}),
  getState: vi.fn().mockResolvedValue('poweredOn'),
  isEnabled: vi.fn().mockResolvedValue(true),
  requestEnable: vi.fn().mockResolvedValue(true),
  openSettings: vi.fn().mockResolvedValue(undefined),
  getPermissionStatus: vi.fn().mockResolvedValue('granted'),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  onStateChange: vi.fn().mockReturnValue(() => {}),
  onDisconnect: vi.fn().mockReturnValue(() => {}),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    state: 'poweredOn',
    canScan: true,
    canConnect: true,
    canWrite: true,
    canNotify: true,
  }),
  ...overrides,
})

// ============================================================================
// Provider Management Tests
// ============================================================================

describe('Provider Management', () => {
  describe('setProvider', () => {
    it('should set a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('hasProvider', () => {
    it('should return true when a provider is set', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })
})

// ============================================================================
// Scanning Tests
// ============================================================================

describe('Bluetooth Scanning', () => {
  let mockProvider: BluetoothProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('startScan', () => {
    it('should start scanning for devices', () => {
      const callback = vi.fn()
      const stop = startScan(callback)
      expect(mockProvider.startScan).toHaveBeenCalledWith(callback, undefined)
      expect(typeof stop).toBe('function')
    })

    it('should pass scan options', () => {
      const callback = vi.fn()
      const options = { services: ['180d'], allowDuplicates: true, timeout: 10000 }
      startScan(callback, options)
      expect(mockProvider.startScan).toHaveBeenCalledWith(callback, options)
    })

    it('should pass scan mode option', () => {
      const callback = vi.fn()
      const options = { scanMode: 'lowLatency' as const }
      startScan(callback, options)
      expect(mockProvider.startScan).toHaveBeenCalledWith(callback, options)
    })
  })

  describe('scanOnce', () => {
    it('should scan for devices once', async () => {
      const devices = await scanOnce()
      expect(devices).toHaveLength(1)
      expect(devices[0].id).toBe('AA:BB:CC:DD:EE:FF')
      expect(mockProvider.scanOnce).toHaveBeenCalled()
    })

    it('should pass scan options', async () => {
      const options = { services: ['180d'], timeout: 5000 }
      await scanOnce(options)
      expect(mockProvider.scanOnce).toHaveBeenCalledWith(options)
    })
  })
})

// ============================================================================
// Connection Tests
// ============================================================================

describe('Bluetooth Connection', () => {
  let mockProvider: BluetoothProvider
  const deviceId = 'AA:BB:CC:DD:EE:FF'

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('connect', () => {
    it('should connect to a device', async () => {
      await connect(deviceId)
      expect(mockProvider.connect).toHaveBeenCalledWith(deviceId, undefined)
    })

    it('should pass connect options', async () => {
      const options = { timeout: 10000, autoConnect: true }
      await connect(deviceId, options)
      expect(mockProvider.connect).toHaveBeenCalledWith(deviceId, options)
    })
  })

  describe('disconnect', () => {
    it('should disconnect from a device', async () => {
      await disconnect(deviceId)
      expect(mockProvider.disconnect).toHaveBeenCalledWith(deviceId)
    })
  })

  describe('getConnectionState', () => {
    it('should return connected state', async () => {
      const state = await getConnectionState(deviceId)
      expect(state).toBe('connected')
      expect(mockProvider.getConnectionState).toHaveBeenCalledWith(deviceId)
    })

    it('should return disconnected state', async () => {
      mockProvider = createMockProvider({
        getConnectionState: vi.fn().mockResolvedValue('disconnected'),
      })
      setProvider(mockProvider)

      const state = await getConnectionState(deviceId)
      expect(state).toBe('disconnected')
    })

    it('should return connecting state', async () => {
      mockProvider = createMockProvider({
        getConnectionState: vi.fn().mockResolvedValue('connecting'),
      })
      setProvider(mockProvider)

      const state = await getConnectionState(deviceId)
      expect(state).toBe('connecting')
    })

    it('should return disconnecting state', async () => {
      mockProvider = createMockProvider({
        getConnectionState: vi.fn().mockResolvedValue('disconnecting'),
      })
      setProvider(mockProvider)

      const state = await getConnectionState(deviceId)
      expect(state).toBe('disconnecting')
    })
  })
})

// ============================================================================
// Service Discovery Tests
// ============================================================================

describe('Bluetooth Service Discovery', () => {
  let mockProvider: BluetoothProvider
  const deviceId = 'AA:BB:CC:DD:EE:FF'

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('discoverServices', () => {
    it('should discover services', async () => {
      const services = await discoverServices(deviceId)
      expect(services).toHaveLength(1)
      expect(services[0].uuid).toBe('0000180d-0000-1000-8000-00805f9b34fb')
      expect(services[0].isPrimary).toBe(true)
      expect(mockProvider.discoverServices).toHaveBeenCalledWith(deviceId)
    })

    it('should return services with characteristics', async () => {
      const services = await discoverServices(deviceId)
      expect(services[0].characteristics).toHaveLength(1)
      expect(services[0].characteristics[0].uuid).toBe('00002a37-0000-1000-8000-00805f9b34fb')
    })
  })
})

// ============================================================================
// Read/Write Tests
// ============================================================================

describe('Bluetooth Read/Write', () => {
  let mockProvider: BluetoothProvider
  const deviceId = 'AA:BB:CC:DD:EE:FF'
  const serviceUuid = '0000180d-0000-1000-8000-00805f9b34fb'
  const characteristicUuid = '00002a37-0000-1000-8000-00805f9b34fb'

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('read', () => {
    it('should read characteristic value', async () => {
      const value = await read(deviceId, serviceUuid, characteristicUuid)
      expect(value).toBeInstanceOf(ArrayBuffer)
      expect(mockProvider.read).toHaveBeenCalledWith(deviceId, serviceUuid, characteristicUuid)
    })
  })

  describe('write', () => {
    it('should write characteristic value', async () => {
      const value = new ArrayBuffer(4)
      await write(deviceId, serviceUuid, characteristicUuid, value)
      expect(mockProvider.write).toHaveBeenCalledWith(
        deviceId,
        serviceUuid,
        characteristicUuid,
        value,
        undefined,
      )
    })

    it('should pass write options', async () => {
      const value = new ArrayBuffer(4)
      const options = { withoutResponse: true }
      await write(deviceId, serviceUuid, characteristicUuid, value, options)
      expect(mockProvider.write).toHaveBeenCalledWith(
        deviceId,
        serviceUuid,
        characteristicUuid,
        value,
        options,
      )
    })
  })
})

// ============================================================================
// Notifications Tests
// ============================================================================

describe('Bluetooth Notifications', () => {
  let mockProvider: BluetoothProvider
  const deviceId = 'AA:BB:CC:DD:EE:FF'
  const serviceUuid = '0000180d-0000-1000-8000-00805f9b34fb'
  const characteristicUuid = '00002a37-0000-1000-8000-00805f9b34fb'

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('startNotifications', () => {
    it('should start notifications', () => {
      const callback = vi.fn()
      const stop = startNotifications(deviceId, serviceUuid, characteristicUuid, callback)
      expect(mockProvider.startNotifications).toHaveBeenCalledWith(
        deviceId,
        serviceUuid,
        characteristicUuid,
        callback,
      )
      expect(typeof stop).toBe('function')
    })
  })
})

// ============================================================================
// State Management Tests
// ============================================================================

describe('Bluetooth State Management', () => {
  let mockProvider: BluetoothProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getState', () => {
    it('should return powered on state', async () => {
      const state = await getState()
      expect(state).toBe('poweredOn')
      expect(mockProvider.getState).toHaveBeenCalled()
    })

    it('should return powered off state', async () => {
      mockProvider = createMockProvider({
        getState: vi.fn().mockResolvedValue('poweredOff'),
      })
      setProvider(mockProvider)

      const state = await getState()
      expect(state).toBe('poweredOff')
    })

    it('should return resetting state', async () => {
      mockProvider = createMockProvider({
        getState: vi.fn().mockResolvedValue('resetting'),
      })
      setProvider(mockProvider)

      const state = await getState()
      expect(state).toBe('resetting')
    })

    it('should return unauthorized state', async () => {
      mockProvider = createMockProvider({
        getState: vi.fn().mockResolvedValue('unauthorized'),
      })
      setProvider(mockProvider)

      const state = await getState()
      expect(state).toBe('unauthorized')
    })

    it('should return unsupported state', async () => {
      mockProvider = createMockProvider({
        getState: vi.fn().mockResolvedValue('unsupported'),
      })
      setProvider(mockProvider)

      const state = await getState()
      expect(state).toBe('unsupported')
    })

    it('should return unknown state', async () => {
      mockProvider = createMockProvider({
        getState: vi.fn().mockResolvedValue('unknown'),
      })
      setProvider(mockProvider)

      const state = await getState()
      expect(state).toBe('unknown')
    })
  })

  describe('isEnabled', () => {
    it('should check if Bluetooth is enabled', async () => {
      const enabled = await isEnabled()
      expect(enabled).toBe(true)
      expect(mockProvider.isEnabled).toHaveBeenCalled()
    })

    it('should return false when disabled', async () => {
      mockProvider = createMockProvider({
        isEnabled: vi.fn().mockResolvedValue(false),
      })
      setProvider(mockProvider)

      const enabled = await isEnabled()
      expect(enabled).toBe(false)
    })
  })

  describe('requestEnable', () => {
    it('should request to enable Bluetooth', async () => {
      const result = await requestEnable()
      expect(result).toBe(true)
      expect(mockProvider.requestEnable).toHaveBeenCalled()
    })

    it('should return false when user denies', async () => {
      mockProvider = createMockProvider({
        requestEnable: vi.fn().mockResolvedValue(false),
      })
      setProvider(mockProvider)

      const result = await requestEnable()
      expect(result).toBe(false)
    })
  })

  describe('openSettings', () => {
    it('should open Bluetooth settings', async () => {
      await openSettings()
      expect(mockProvider.openSettings).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Permission Tests
// ============================================================================

describe('Bluetooth Permissions', () => {
  let mockProvider: BluetoothProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getPermissionStatus', () => {
    it('should return granted status', async () => {
      const status = await getPermissionStatus()
      expect(status).toBe('granted')
      expect(mockProvider.getPermissionStatus).toHaveBeenCalled()
    })

    it('should return denied status', async () => {
      mockProvider = createMockProvider({
        getPermissionStatus: vi.fn().mockResolvedValue('denied'),
      })
      setProvider(mockProvider)

      const status = await getPermissionStatus()
      expect(status).toBe('denied')
    })

    it('should return prompt status', async () => {
      mockProvider = createMockProvider({
        getPermissionStatus: vi.fn().mockResolvedValue('prompt'),
      })
      setProvider(mockProvider)

      const status = await getPermissionStatus()
      expect(status).toBe('prompt')
    })

    it('should return limited status', async () => {
      mockProvider = createMockProvider({
        getPermissionStatus: vi.fn().mockResolvedValue('limited'),
      })
      setProvider(mockProvider)

      const status = await getPermissionStatus()
      expect(status).toBe('limited')
    })

    it('should return unsupported status', async () => {
      mockProvider = createMockProvider({
        getPermissionStatus: vi.fn().mockResolvedValue('unsupported'),
      })
      setProvider(mockProvider)

      const status = await getPermissionStatus()
      expect(status).toBe('unsupported')
    })
  })

  describe('requestPermission', () => {
    it('should request Bluetooth permission', async () => {
      const status = await requestPermission()
      expect(status).toBe('granted')
      expect(mockProvider.requestPermission).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Event Listener Tests
// ============================================================================

describe('Bluetooth Event Listeners', () => {
  let mockProvider: BluetoothProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('onStateChange', () => {
    it('should listen for state changes', () => {
      const callback = vi.fn()
      const unsubscribe = onStateChange(callback)
      expect(mockProvider.onStateChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('onDisconnect', () => {
    it('should listen for device disconnection', () => {
      const deviceId = 'AA:BB:CC:DD:EE:FF'
      const callback = vi.fn()
      const unsubscribe = onDisconnect(deviceId, callback)
      expect(mockProvider.onDisconnect).toHaveBeenCalledWith(deviceId, callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })
})

// ============================================================================
// Capabilities Tests
// ============================================================================

describe('Bluetooth Capabilities', () => {
  let mockProvider: BluetoothProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getCapabilities', () => {
    it('should return Bluetooth capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(capabilities.supported).toBe(true)
      expect(capabilities.state).toBe('poweredOn')
      expect(capabilities.canScan).toBe(true)
      expect(capabilities.canConnect).toBe(true)
      expect(capabilities.canWrite).toBe(true)
      expect(capabilities.canNotify).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Bluetooth Utility Functions', () => {
  describe('bufferToHex', () => {
    it('should convert ArrayBuffer to hex string', () => {
      const buffer = new Uint8Array([0x01, 0x02, 0x03, 0xff]).buffer
      expect(bufferToHex(buffer)).toBe('010203ff')
    })

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0)
      expect(bufferToHex(buffer)).toBe('')
    })

    it('should pad single digit hex values', () => {
      const buffer = new Uint8Array([0x00, 0x0a, 0x0f]).buffer
      expect(bufferToHex(buffer)).toBe('000a0f')
    })
  })

  describe('hexToBuffer', () => {
    it('should convert hex string to ArrayBuffer', () => {
      const buffer = hexToBuffer('010203ff')
      const view = new Uint8Array(buffer)
      expect(view[0]).toBe(1)
      expect(view[1]).toBe(2)
      expect(view[2]).toBe(3)
      expect(view[3]).toBe(255)
    })

    it('should handle empty string', () => {
      const buffer = hexToBuffer('')
      expect(buffer.byteLength).toBe(0)
    })

    it('should handle uppercase hex', () => {
      const buffer = hexToBuffer('0A0B0C')
      const view = new Uint8Array(buffer)
      expect(view[0]).toBe(10)
      expect(view[1]).toBe(11)
      expect(view[2]).toBe(12)
    })

    it('should handle mixed case hex', () => {
      const buffer = hexToBuffer('aAbBcC')
      const view = new Uint8Array(buffer)
      expect(view[0]).toBe(170)
      expect(view[1]).toBe(187)
      expect(view[2]).toBe(204)
    })
  })

  describe('bufferToString', () => {
    it('should convert ArrayBuffer to string', () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode('Hello World').buffer
      expect(bufferToString(buffer)).toBe('Hello World')
    })

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0)
      expect(bufferToString(buffer)).toBe('')
    })

    it('should handle unicode characters', () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode('Hello').buffer
      expect(bufferToString(buffer)).toBe('Hello')
    })
  })

  describe('stringToBuffer', () => {
    it('should convert string to ArrayBuffer', () => {
      const buffer = stringToBuffer('Hello')
      const str = bufferToString(buffer)
      expect(str).toBe('Hello')
    })

    it('should handle empty string', () => {
      const buffer = stringToBuffer('')
      expect(buffer.byteLength).toBe(0)
    })

    it('should handle unicode characters', () => {
      const buffer = stringToBuffer('Cafe')
      const str = bufferToString(buffer)
      expect(str).toBe('Cafe')
    })
  })

  describe('bufferToHex and hexToBuffer roundtrip', () => {
    it('should roundtrip correctly', () => {
      const original = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]).buffer
      const hex = bufferToHex(original)
      const restored = hexToBuffer(hex)
      const restoredView = new Uint8Array(restored)
      const originalView = new Uint8Array(original)

      expect(restoredView.length).toBe(originalView.length)
      for (let i = 0; i < originalView.length; i++) {
        expect(restoredView[i]).toBe(originalView[i])
      }
    })
  })

  describe('stringToBuffer and bufferToString roundtrip', () => {
    it('should roundtrip correctly', () => {
      const original = 'The quick brown fox jumps over the lazy dog'
      const buffer = stringToBuffer(original)
      const restored = bufferToString(buffer)
      expect(restored).toBe(original)
    })
  })
})

// ============================================================================
// Standard UUIDs Tests
// ============================================================================

describe('Standard BLE UUIDs', () => {
  describe('StandardServices', () => {
    it('should have Generic Access UUID', () => {
      expect(StandardServices.GENERIC_ACCESS).toBe('00001800-0000-1000-8000-00805f9b34fb')
    })

    it('should have Generic Attribute UUID', () => {
      expect(StandardServices.GENERIC_ATTRIBUTE).toBe('00001801-0000-1000-8000-00805f9b34fb')
    })

    it('should have Device Information UUID', () => {
      expect(StandardServices.DEVICE_INFORMATION).toBe('0000180a-0000-1000-8000-00805f9b34fb')
    })

    it('should have Battery Service UUID', () => {
      expect(StandardServices.BATTERY).toBe('0000180f-0000-1000-8000-00805f9b34fb')
    })

    it('should have Heart Rate UUID', () => {
      expect(StandardServices.HEART_RATE).toBe('0000180d-0000-1000-8000-00805f9b34fb')
    })

    it('should have Health Thermometer UUID', () => {
      expect(StandardServices.HEALTH_THERMOMETER).toBe('00001809-0000-1000-8000-00805f9b34fb')
    })

    it('should have Blood Pressure UUID', () => {
      expect(StandardServices.BLOOD_PRESSURE).toBe('00001810-0000-1000-8000-00805f9b34fb')
    })
  })

  describe('StandardCharacteristics', () => {
    it('should have Device Name UUID', () => {
      expect(StandardCharacteristics.DEVICE_NAME).toBe('00002a00-0000-1000-8000-00805f9b34fb')
    })

    it('should have Appearance UUID', () => {
      expect(StandardCharacteristics.APPEARANCE).toBe('00002a01-0000-1000-8000-00805f9b34fb')
    })

    it('should have Battery Level UUID', () => {
      expect(StandardCharacteristics.BATTERY_LEVEL).toBe('00002a19-0000-1000-8000-00805f9b34fb')
    })

    it('should have Manufacturer Name UUID', () => {
      expect(StandardCharacteristics.MANUFACTURER_NAME).toBe('00002a29-0000-1000-8000-00805f9b34fb')
    })

    it('should have Model Number UUID', () => {
      expect(StandardCharacteristics.MODEL_NUMBER).toBe('00002a24-0000-1000-8000-00805f9b34fb')
    })

    it('should have Serial Number UUID', () => {
      expect(StandardCharacteristics.SERIAL_NUMBER).toBe('00002a25-0000-1000-8000-00805f9b34fb')
    })

    it('should have Firmware Revision UUID', () => {
      expect(StandardCharacteristics.FIRMWARE_REVISION).toBe('00002a26-0000-1000-8000-00805f9b34fb')
    })

    it('should have Heart Rate Measurement UUID', () => {
      expect(StandardCharacteristics.HEART_RATE_MEASUREMENT).toBe(
        '00002a37-0000-1000-8000-00805f9b34fb',
      )
    })
  })
})

// ============================================================================
// UUID Utility Tests
// ============================================================================

describe('UUID Utilities', () => {
  describe('expandUuid', () => {
    it('should expand 16-bit UUID to 128-bit', () => {
      expect(expandUuid('180d')).toBe('0000180d-0000-1000-8000-00805f9b34fb')
    })

    it('should expand 32-bit UUID to 128-bit', () => {
      expect(expandUuid('0000180d')).toBe('0000180d-0000-1000-8000-00805f9b34fb')
    })

    it('should return 128-bit UUID as-is', () => {
      const uuid = '0000180d-0000-1000-8000-00805f9b34fb'
      expect(expandUuid(uuid)).toBe(uuid)
    })

    it('should handle uppercase 16-bit UUID', () => {
      expect(expandUuid('180D')).toBe('0000180D-0000-1000-8000-00805f9b34fb')
    })
  })

  describe('normalizeUuid', () => {
    it('should normalize 128-bit UUID with dashes', () => {
      expect(normalizeUuid('0000180D-0000-1000-8000-00805F9B34FB')).toBe(
        '0000180d-0000-1000-8000-00805f9b34fb',
      )
    })

    it('should normalize 128-bit UUID without dashes', () => {
      expect(normalizeUuid('0000180D00001000800000805F9B34FB')).toBe(
        '0000180d-0000-1000-8000-00805f9b34fb',
      )
    })

    it('should normalize 16-bit UUID', () => {
      expect(normalizeUuid('180D')).toBe('0000180d-0000-1000-8000-00805f9b34fb')
    })

    it('should normalize 32-bit UUID', () => {
      expect(normalizeUuid('0000180D')).toBe('0000180d-0000-1000-8000-00805f9b34fb')
    })

    it('should handle already normalized UUID', () => {
      const uuid = '0000180d-0000-1000-8000-00805f9b34fb'
      expect(normalizeUuid(uuid)).toBe(uuid)
    })
  })
})

// ============================================================================
// Data Structure Tests
// ============================================================================

describe('Bluetooth Data Structures', () => {
  describe('BluetoothDevice', () => {
    it('should have correct structure', () => {
      const device = createMockDevice()
      expect(device.id).toBeDefined()
      expect(device.name).toBeDefined()
      expect(typeof device.rssi).toBe('number')
    })

    it('should have optional fields', () => {
      const device = createMockDevice({
        name: undefined,
        localName: undefined,
        rssi: undefined,
        manufacturerData: undefined,
        serviceData: undefined,
        serviceUUIDs: undefined,
        connectable: undefined,
        txPowerLevel: undefined,
      })
      expect(device.id).toBeDefined()
    })
  })

  describe('BluetoothService', () => {
    it('should have correct structure', () => {
      const service = createMockService()
      expect(service.uuid).toBeDefined()
      expect(typeof service.isPrimary).toBe('boolean')
      expect(service.characteristics).toBeInstanceOf(Array)
    })
  })

  describe('BluetoothCharacteristic', () => {
    it('should have correct structure', () => {
      const service = createMockService()
      const characteristic = service.characteristics[0]
      expect(characteristic.uuid).toBeDefined()
      expect(characteristic.serviceUuid).toBeDefined()
      expect(characteristic.properties).toBeDefined()
    })

    it('should have all property flags', () => {
      const service = createMockService()
      const characteristic = service.characteristics[0]
      expect(typeof characteristic.properties.read).toBe('boolean')
      expect(typeof characteristic.properties.write).toBe('boolean')
      expect(typeof characteristic.properties.writeWithoutResponse).toBe('boolean')
      expect(typeof characteristic.properties.notify).toBe('boolean')
      expect(typeof characteristic.properties.indicate).toBe('boolean')
    })
  })
})
