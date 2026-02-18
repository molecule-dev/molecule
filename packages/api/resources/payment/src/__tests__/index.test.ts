/**
 * Tests for the Payment resource package exports.
 */

import { describe, expect, it, vi } from 'vitest'

// Mock @molecule/api-database
vi.mock('@molecule/api-database', () => ({
  query: vi.fn(),
}))

// Mock @molecule/api-bond (recordService uses getLogger and getAnalytics from api-bond)
vi.mock('@molecule/api-bond', () => ({
  getAnalytics: () => ({
    identify: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    page: vi.fn().mockResolvedValue(undefined),
  }),
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  }),
  get: vi.fn(),
  set: vi.fn(),
  getAll: vi.fn(),
}))

// Mock the i18n module to avoid dynamic import of unbuilt locale packages
vi.mock('../i18n.js', () => ({
  i18nRegistered: true,
}))

import * as PaymentModule from '../index.js'

describe('Payment package exports', () => {
  it('should export resource', () => {
    expect(PaymentModule.resource).toBeDefined()
    expect(PaymentModule.resource.name).toBe('Payment')
    expect(PaymentModule.resource.tableName).toBe('payments')
  })

  it('should export plans', () => {
    expect(PaymentModule.plans).toBeDefined()
    expect(typeof PaymentModule.plans).toBe('object')
  })

  it('should export individual plan definitions', () => {
    expect(PaymentModule.stripeMonthly).toBeDefined()
    expect(PaymentModule.stripeYearly).toBeDefined()
    expect(PaymentModule.appleMonthly).toBeDefined()
    expect(PaymentModule.appleYearly).toBeDefined()
    expect(PaymentModule.googleMonthly).toBeDefined()
    expect(PaymentModule.googleYearly).toBeDefined()
  })

  it('should export getPeriodTime utility', () => {
    expect(PaymentModule.getPeriodTime).toBeDefined()
    expect(typeof PaymentModule.getPeriodTime).toBe('function')
  })

  it('should export types namespace', () => {
    expect(PaymentModule.types).toBeDefined()
  })

  it('should export propsSchema', () => {
    expect(PaymentModule.propsSchema).toBeDefined()
    expect(PaymentModule.propsSchema.safeParse).toBeDefined()
  })

  it('should export createPropsSchema', () => {
    expect(PaymentModule.createPropsSchema).toBeDefined()
    expect(PaymentModule.createPropsSchema.safeParse).toBeDefined()
  })

  it('should export updatePropsSchema', () => {
    expect(PaymentModule.updatePropsSchema).toBeDefined()
    expect(PaymentModule.updatePropsSchema.safeParse).toBeDefined()
  })

  it('should export planService', () => {
    expect(PaymentModule.planService).toBeDefined()
    expect(typeof PaymentModule.planService.findPlan).toBe('function')
    expect(typeof PaymentModule.planService.findPlanByProductId).toBe('function')
    expect(typeof PaymentModule.planService.getDefaultPlan).toBe('function')
    expect(typeof PaymentModule.planService.getAllPlans).toBe('function')
  })

  it('should export paymentRecordService', () => {
    expect(PaymentModule.paymentRecordService).toBeDefined()
    expect(typeof PaymentModule.paymentRecordService.store).toBe('function')
    expect(typeof PaymentModule.paymentRecordService.findByTransaction).toBe('function')
    expect(typeof PaymentModule.paymentRecordService.findByCustomerData).toBe('function')
    expect(typeof PaymentModule.paymentRecordService.findByUserId).toBe('function')
    expect(typeof PaymentModule.paymentRecordService.deleteByUserId).toBe('function')
  })
})
