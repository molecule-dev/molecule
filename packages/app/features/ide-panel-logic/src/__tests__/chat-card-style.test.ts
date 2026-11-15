import { describe, expect, it } from 'vitest'

import {
  CHAT_CARD_ICON_SIZE,
  CHAT_CARD_NEUTRAL_ACCENT,
  chatCardBg,
  chatCardBorder,
  chatCardStyle,
} from '../components/chat-card-style.js'

describe('chat card style', () => {
  it('tints the frame and the background from one accent', () => {
    expect(chatCardBorder('#22c55e')).toBe('color-mix(in srgb, #22c55e 40%, transparent)')
    expect(chatCardBg('#22c55e')).toBe('color-mix(in srgb, #22c55e 10%, transparent)')
    expect(chatCardBorder('#22c55e', 60)).toBe('color-mix(in srgb, #22c55e 60%, transparent)')
  })

  it("defaults to the theme's primary colour, never a flat gray surface", () => {
    expect(CHAT_CARD_NEUTRAL_ACCENT).toBe('var(--mol-color-primary, #6366f1)')
    expect(chatCardBg()).toBe(`color-mix(in srgb, ${CHAT_CARD_NEUTRAL_ACCENT} 10%, transparent)`)
  })

  it('is one padding, one radius and a 1px frame on all sides', () => {
    expect(chatCardStyle('var(--accent)')).toEqual({
      padding: '10px 12px',
      borderRadius: 8,
      border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    })
    expect(Object.keys(chatCardStyle())).not.toContain('borderLeft')
    expect(CHAT_CARD_ICON_SIZE).toBe(18)
  })
})
