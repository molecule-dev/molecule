/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written against the real showcase specs.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { generateCombinations, showcaseComponents } from '../index.js'

interface ShowcaseCase {
  component: string
  specIndex: number
  props: Record<string, unknown>
  children?: string
}

describe('README @example', () => {
  it('expands every spec into render jobs with defaults merged under each combination', () => {
    const cases: ShowcaseCase[] = showcaseComponents.flatMap((spec, specIndex) =>
      generateCombinations(spec.propMatrix).map((combo) => ({
        component: spec.name,
        specIndex,
        props: { ...spec.defaultProps, ...combo },
        children: spec.children === false ? undefined : spec.children,
      })),
    )

    const buttons = cases.filter((c) => c.component === 'Button')
    expect(buttons).toHaveLength(120)
    expect(buttons[0]?.props).toEqual({ variant: 'solid', color: 'primary', size: 'xs' })
    expect(buttons[0]?.children).toBe('Button')

    const inputs = cases.filter((c) => c.component === 'Input')
    expect(new Set(inputs.map((c) => c.specIndex)).size).toBeGreaterThan(1)
    expect(inputs.every((c) => c.children === undefined)).toBe(true)

    expect(generateCombinations({})).toEqual([{}])
    expect(generateCombinations({ size: [] })).toEqual([])
  })
})
