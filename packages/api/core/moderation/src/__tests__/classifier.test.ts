import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset, validateBonds } from '@molecule/api-bond'

import { getClassifier, hasClassifier, requireClassifier, setClassifier } from '../provider.js'
import type { ContentClassifierProvider } from '../types.js'

const classifier: ContentClassifierProvider = {
  name: 'test-classifier',
  async check() {
    return { flagged: true, categories: [{ category: 'violence', flagged: true, score: 0.9 }] }
  },
}

describe('content classifier slot', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false })
  })

  it('is empty until bonded, and requireClassifier names the fix', () => {
    expect(getClassifier()).toBeNull()
    expect(hasClassifier()).toBe(false)
    expect(() => requireClassifier()).toThrow(/setClassifier/)
  })

  it('bonds and returns the classifier', async () => {
    setClassifier(classifier)
    expect(hasClassifier()).toBe(true)
    expect(requireClassifier()).toBe(classifier)
    expect((await requireClassifier().check('x')).flagged).toBe(true)
  })

  it('is independent of the full moderation provider slot', async () => {
    setClassifier(classifier)
    const { getProvider } = await import('../provider.js')
    expect(getProvider()).toBeNull()
  })

  it('is not a required bond — an app without a classifier still validates', () => {
    expect(() => validateBonds()).not.toThrow(/content-classifier/)
  })
})
