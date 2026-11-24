/**
 * The elements' boolean ARIA props take React DOM's spellings, `true` and `'true'` alike, so a kit
 * component that moves onto the elements keeps every call its React props accepted. These are type
 * assertions, checked by `npm run typecheck:tests` (vitest runs them as no-ops). When `Icon` moved
 * from React's SVG props to the element props, `<Icon aria-hidden="true">` in
 * `@molecule/app-auth-modal-react` stopped compiling.
 */
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { AriaAttributes, AriaBoolean } from '../elements.js'

describe('element ARIA boolean types', () => {
  it('takes the attribute spelling and the boolean for every boolean ARIA prop', () => {
    const spelled: AriaAttributes = {
      'aria-hidden': 'true',
      'aria-disabled': 'false',
      'aria-expanded': 'true',
      'aria-selected': 'false',
      'aria-busy': 'true',
      'aria-modal': 'true',
      'aria-invalid': 'false',
      'aria-required': 'true',
      'aria-readonly': 'false',
      'aria-checked': 'mixed',
      'aria-pressed': 'true',
      'aria-current': 'page',
      'aria-haspopup': 'menu',
    }
    const booleans: AriaAttributes = {
      'aria-hidden': true,
      'aria-checked': false,
      'aria-current': true,
    }
    expectTypeOf<AriaAttributes['aria-hidden']>().toEqualTypeOf<AriaBoolean | undefined>()
    expect([spelled, booleans].every((props) => typeof props === 'object')).toBe(true)
  })

  it('refuses a string that is not an ARIA boolean', () => {
    // @ts-expect-error: 'yes' is not a boolean ARIA value.
    const wrong: AriaAttributes = { 'aria-hidden': 'yes' }
    expect(wrong).toBeDefined()
  })
})
