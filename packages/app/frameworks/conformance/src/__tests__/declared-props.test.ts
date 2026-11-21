/**
 * Every component whose core props extend `BaseProps` gets a declared-props case, read from the
 * core types themselves: a family that forgets `declaredProps` (or names the wrong kind) fails
 * here, so a framework can never drop `automationId`, `id`, `title` or a DOM handler unnoticed.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { DECLARED_AUTOMATION_ID, uiCaseFamilies, withDeclaredProps } from '../ui/run.js'
import type { UIComponentCases } from '../ui/spec.js'

/** `XProps extends Base` for every props interface `@molecule/app-ui` declares. */
const coreBases = (): Map<string, string> => {
  const types = join(dirname(fileURLToPath(import.meta.resolve('@molecule/app-ui'))), 'types.d.ts')
  const source = readFileSync(types, 'utf8')
  return new Map(
    [...source.matchAll(/export interface (\w+)(?:<[^>]*>)? extends (\w+)/g)].map((m) => [
      m[1],
      m[2],
    ]),
  )
}

/** Whether `name` reaches `ancestor` through its `extends` chain. */
const reaches = (bases: Map<string, string>, name: string, ancestor: string): boolean => {
  for (let at: string | undefined = name; at; at = bases.get(at)) if (at === ancestor) return true
  return false
}

describe('declared props', () => {
  const bases = coreBases()

  it('reads the core props interfaces', () => {
    expect(reaches(bases, 'ButtonProps', 'HTMLElementProps')).toBe(true)
    expect(reaches(bases, 'TabsProps', 'BaseProps')).toBe(true)
    expect(reaches(bases, 'TabsProps', 'HTMLElementProps')).toBe(false)
  })

  it('every family whose core props extend BaseProps names declaredProps of the right kind', () => {
    const wrong = uiCaseFamilies.flatMap((family) => {
      const props = `${family.component}Props`
      if (!bases.has(props) || !reaches(bases, props, 'BaseProps')) return []
      const want = reaches(bases, props, 'HTMLElementProps') ? 'element' : 'base'
      return family.declaredProps?.props === want
        ? []
        : [`${family.component}: want declaredProps { props: '${want}' }`]
    })
    expect(wrong).toEqual([])
  })

  it('derives a case adding automationId, and for element props id, title and a double-click', () => {
    const family: UIComponentCases = {
      component: 'Probe',
      declaredProps: { props: 'element' },
      cases: [{ name: 'defaults', props: { size: 'sm' }, callbacks: ['onClick'] }],
    }
    const derived = withDeclaredProps(family).cases[1]
    expect(derived).toEqual({
      name: 'defaults, with the declared element props',
      props: {
        size: 'sm',
        automationId: DECLARED_AUTOMATION_ID,
        id: 'parity-id',
        title: 'Parity title',
      },
      callbacks: ['onClick', 'onDoubleClick'],
      interactions: [{ type: 'dblclick', selector: `[data-mol-id="${DECLARED_AUTOMATION_ID}"]` }],
    })
    const baseOnly = withDeclaredProps({ ...family, declaredProps: { props: 'base' } }).cases[1]
    expect(baseOnly.props).toEqual({ size: 'sm', automationId: DECLARED_AUTOMATION_ID })
    expect(baseOnly.interactions).toBeUndefined()
  })

  it('refuses a caseName the family does not have', () => {
    expect(() =>
      withDeclaredProps({
        component: 'Probe',
        declaredProps: { props: 'base', caseName: 'nope' },
        cases: [{ name: 'defaults' }],
      }),
    ).toThrow('Probe: declared-props case "nope" not found')
  })
})
