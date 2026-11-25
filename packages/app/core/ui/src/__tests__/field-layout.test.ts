import { describe, expect, it, vi } from 'vitest'

import { fieldLayout } from '../field-layout.js'
import type { ClassMapValue, UIClassMap } from '../types.js'

/** The ClassMap members the layout reads. */
type FieldSource = Pick<UIClassMap, 'cn' | 'inputWrapper' | 'inputInner' | 'formFieldWrapper'>

/** A ClassMap holding only what the layout reads, recording every member read and every join. */
function recordingClassMap(): { cm: UIClassMap; joins: string[][]; reads: string[] } {
  const joins: string[][] = []
  const reads: string[] = []
  const source: FieldSource = {
    inputWrapper: 'full-width',
    inputInner: 'positioning',
    formFieldWrapper: 'column',
    cn: vi.fn((...classes: ClassMapValue[]): string => {
      const given = classes.filter((value) => typeof value === 'string' && value).map(String)
      joins.push(given)
      return given.join(' ')
    }),
  }
  const cm = new Proxy(source, {
    get(target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)
      reads.push(prop)
      return target[prop as keyof FieldSource]
    },
    // The helper accepts the whole contract; this fake carries the members under test.
  }) as unknown as UIClassMap
  return { cm, joins, reads }
}

describe('fieldLayout', () => {
  it('joins the outer wrapper token with the field column for root', () => {
    const { cm } = recordingClassMap()
    expect(fieldLayout(cm).root).toBe('full-width column')
  })

  it('joins the inner wrapper token with the field column for inner', () => {
    const { cm } = recordingClassMap()
    expect(fieldLayout(cm).inner).toBe('positioning column')
  })

  it('joins through the cn of the ClassMap, so the class merger of a bond decides conflicts', () => {
    const { cm, joins } = recordingClassMap()
    fieldLayout(cm)
    expect(joins).toEqual([
      ['full-width', 'column'],
      ['positioning', 'column'],
    ])
  })

  it('reads only the two wrapper tokens, the field column and cn', () => {
    const { cm, reads } = recordingClassMap()
    fieldLayout(cm)
    expect([...new Set(reads)].sort()).toEqual([
      'cn',
      'formFieldWrapper',
      'inputInner',
      'inputWrapper',
    ])
  })

  it('returns a new object on every call', () => {
    const { cm } = recordingClassMap()
    expect(fieldLayout(cm)).not.toBe(fieldLayout(cm))
  })
})
