import { beforeEach, describe, expect, it } from 'vitest'

import { TEMPLATE_KEYS } from '../defaults.js'
import {
  clearRegistry,
  getTemplate,
  listTemplates,
  registerTemplate,
  registerTemplates,
} from '../registry.js'
import type { EmailTemplate } from '../types.js'

const sample: EmailTemplate = {
  key: 'test.sample',
  subjectKey: 'test.sample.subject',
  defaultSubject: 'Hello',
  textKey: 'test.sample.text',
  defaultText: 'Body',
}

describe('email template registry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  it('returns built-in defaults when no override is registered', () => {
    const template = getTemplate(TEMPLATE_KEYS.subscriptionStarted)

    expect(template).toBeDefined()
    expect(template?.key).toBe(TEMPLATE_KEYS.subscriptionStarted)
    expect(template?.defaultSubject).toMatch(/Welcome/i)
  })

  it('returns the override when one is registered for the same key', () => {
    registerTemplate({
      ...sample,
      key: TEMPLATE_KEYS.subscriptionStarted,
      defaultSubject: 'Branded subject',
    })

    const template = getTemplate(TEMPLATE_KEYS.subscriptionStarted)

    expect(template?.defaultSubject).toBe('Branded subject')
  })

  it('returns undefined for unknown keys', () => {
    expect(getTemplate('nope')).toBeUndefined()
  })

  it('registers multiple templates at once', () => {
    registerTemplates([
      { ...sample, key: 'a' },
      { ...sample, key: 'b' },
    ])

    expect(getTemplate('a')?.key).toBe('a')
    expect(getTemplate('b')?.key).toBe('b')
  })

  it('listTemplates returns overrides + remaining built-ins without duplicates', () => {
    registerTemplate({ ...sample, key: TEMPLATE_KEYS.subscriptionStarted, defaultSubject: 'X' })
    registerTemplate({ ...sample, key: 'app.welcome', defaultSubject: 'Welcome to our app' })

    const all = listTemplates()
    const keys = all.map((tpl) => tpl.key)

    expect(keys).toContain(TEMPLATE_KEYS.subscriptionStarted)
    expect(keys).toContain(TEMPLATE_KEYS.subscriptionRenewed)
    expect(keys).toContain('app.welcome')
    expect(new Set(keys).size).toBe(keys.length)

    const overridden = all.find((tpl) => tpl.key === TEMPLATE_KEYS.subscriptionStarted)
    expect(overridden?.defaultSubject).toBe('X')
  })

  it('clearRegistry removes overrides but leaves defaults intact', () => {
    registerTemplate({ ...sample, key: 'app.custom' })
    expect(getTemplate('app.custom')?.key).toBe('app.custom')

    clearRegistry()
    expect(getTemplate('app.custom')).toBeUndefined()
    expect(getTemplate(TEMPLATE_KEYS.subscriptionStarted)).toBeDefined()
  })

  it('all built-in templates have subject + text + html bodies', () => {
    for (const key of Object.values(TEMPLATE_KEYS)) {
      const template = getTemplate(key)
      expect(template, `missing default for ${key}`).toBeDefined()
      expect(template?.defaultSubject?.length).toBeGreaterThan(0)
      expect(template?.defaultText?.length).toBeGreaterThan(0)
      expect(template?.defaultHtml?.length).toBeGreaterThan(0)
    }
  })
})
