import { describe, expect, it } from 'vitest'

import type { ComponentShowcase } from '../index.js'
import { generateCombinations, showcaseComponents } from '../index.js'

describe('@molecule/app-ui-showcase', () => {
  describe('showcaseComponents', () => {
    it('exports a non-empty array of component showcases', () => {
      expect(Array.isArray(showcaseComponents)).toBe(true)
      expect(showcaseComponents.length).toBeGreaterThan(0)
    })

    it('every entry has a name and propMatrix', () => {
      for (const entry of showcaseComponents) {
        expect(typeof entry.name).toBe('string')
        expect(entry.name.length).toBeGreaterThan(0)
        expect(typeof entry.propMatrix).toBe('object')
        expect(entry.propMatrix).not.toBeNull()
      }
    })

    it('propMatrix values are arrays', () => {
      for (const entry of showcaseComponents) {
        for (const [key, values] of Object.entries(entry.propMatrix)) {
          expect(Array.isArray(values), `${entry.name}.propMatrix.${key} should be an array`).toBe(
            true,
          )
          expect(
            values.length,
            `${entry.name}.propMatrix.${key} should not be empty`,
          ).toBeGreaterThan(0)
        }
      }
    })

    it('covers the core component set', () => {
      const names = new Set(showcaseComponents.map((c) => c.name))
      const expected = [
        'Button',
        'Input',
        'Textarea',
        'Select',
        'Checkbox',
        'RadioGroup',
        'Switch',
        'Badge',
        'Avatar',
        'Table',
        'Tabs',
        'Accordion',
        'Pagination',
        'Alert',
        'Spinner',
        'Progress',
        'Skeleton',
        'Toast',
        'Card',
        'Separator',
      ]
      for (const name of expected) {
        expect(names.has(name), `Missing showcase for ${name}`).toBe(true)
      }
    })

    it('children is string, false, or undefined', () => {
      for (const entry of showcaseComponents) {
        if (entry.children !== undefined) {
          expect(
            typeof entry.children === 'string' || entry.children === false,
            `${entry.name}.children should be string or false`,
          ).toBe(true)
        }
      }
    })
  })

  describe('generateCombinations', () => {
    it('returns single empty object for empty matrix', () => {
      const result = generateCombinations({})
      expect(result).toEqual([{}])
    })

    it('generates correct combinations for single key', () => {
      const result = generateCombinations({ color: ['red', 'blue'] })
      expect(result).toEqual([{ color: 'red' }, { color: 'blue' }])
    })

    it('generates cartesian product for multiple keys', () => {
      const result = generateCombinations({
        variant: ['solid', 'outline'],
        color: ['primary', 'error'],
      })
      expect(result).toEqual([
        { variant: 'solid', color: 'primary' },
        { variant: 'solid', color: 'error' },
        { variant: 'outline', color: 'primary' },
        { variant: 'outline', color: 'error' },
      ])
    })

    it('handles three keys correctly', () => {
      const result = generateCombinations({
        a: [1, 2],
        b: ['x', 'y'],
        c: [true],
      })
      expect(result).toHaveLength(4)
      expect(result).toEqual([
        { a: 1, b: 'x', c: true },
        { a: 1, b: 'y', c: true },
        { a: 2, b: 'x', c: true },
        { a: 2, b: 'y', c: true },
      ])
    })

    it('produces correct count (product of array lengths)', () => {
      const result = generateCombinations({
        variant: ['solid', 'outline', 'ghost', 'link'],
        color: ['primary', 'secondary', 'success', 'warning', 'error', 'info'],
        size: ['xs', 'sm', 'md', 'lg', 'xl'],
      })
      expect(result).toHaveLength(4 * 6 * 5)
    })

    it('each combination is an independent object', () => {
      const result = generateCombinations({ a: [1, 2] })
      result[0].a = 999
      expect(result[1].a).toBe(2)
    })
  })

  describe('ComponentShowcase type', () => {
    it('can construct a valid ComponentShowcase', () => {
      const showcase: ComponentShowcase = {
        name: 'TestComponent',
        propMatrix: { variant: ['a', 'b'] },
        defaultProps: { required: true },
        children: 'Content',
      }
      expect(showcase.name).toBe('TestComponent')
    })

    it('allows children to be false', () => {
      const showcase: ComponentShowcase = {
        name: 'NoChildren',
        propMatrix: { size: ['sm'] },
        children: false,
      }
      expect(showcase.children).toBe(false)
    })
  })
})
