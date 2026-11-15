import { describe, expect, it } from 'vitest'

import type { ColorVariant, UIClassMap } from '../types.js'

/**
 * Contract test for UIClassMap's semantic tone members (see types.ts). This
 * pins the SIGNATURES — a ColorVariant-keyed resolver set, `bgTone` taking
 * `{ subtle?: boolean }` second — so a bond cannot compile against a drift of
 * the documented shape. The strings are deliberately not styling classes:
 * core packages carry no CSS class names (AGENTS.md rule 5), the bonds own
 * those.
 */
describe('UIClassMap tone members', () => {
  it('accepts the documented tone member signatures', () => {
    const members: Pick<
      UIClassMap,
      'textTone' | 'bgTone' | 'borderTone' | 'textOnTone' | 'bgScrim'
    > = {
      textTone: (tone) => `label:${tone}`,
      bgTone: (tone, opts) => `fill:${tone}:${opts?.subtle ? 'subtle' : 'solid'}`,
      borderTone: (tone) => `edge:${tone}`,
      textOnTone: 'label:on-tone',
      bgScrim: 'fill:scrim',
    }
    const tones: ColorVariant[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info']

    for (const tone of tones) {
      expect(members.textTone(tone)).toBe(`label:${tone}`)
      expect(members.bgTone(tone)).toBe(`fill:${tone}:solid`)
      expect(members.bgTone(tone, { subtle: true })).toBe(`fill:${tone}:subtle`)
      expect(members.borderTone(tone)).toBe(`edge:${tone}`)
    }
    expect(members.textOnTone).toBe('label:on-tone')
    expect(members.bgScrim).toBe('fill:scrim')
  })
})
