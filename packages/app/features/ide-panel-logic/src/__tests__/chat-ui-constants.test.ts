import { describe, expect, it } from 'vitest'

import {
  ACCEPTED_FILE_TYPES,
  APP_VERSION,
  AUTO_SENT_ACCENT,
  CHAT_CARD_CODE_STYLE,
  CHAT_CARD_LINK_STYLE,
  LOAD_EARLIER_THRESHOLD_PX,
  MAX_ATTACHMENT_SIZE,
  NOTICE_TONE,
  NOTICE_TONE_BUTTON_COLOR,
  TIMELINE_ITEM_GAP,
  TIMELINE_ITEM_GAP_DISCOVERY,
  USER_ACCENT_STYLE,
  USER_MSG_COLLAPSE_HEIGHT,
} from '../components/chat-ui-constants.js'

describe('chat UI constants', () => {
  it('keeps the attachment limits', () => {
    expect(MAX_ATTACHMENT_SIZE).toBe(20 * 1024 * 1024)
    expect(ACCEPTED_FILE_TYPES).toBe(
      'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/webm,video/mp4,video/webm',
    )
  })

  it('keeps the collapsible-user-message and load-earlier thresholds', () => {
    expect(USER_MSG_COLLAPSE_HEIGHT).toBe(150)
    expect(LOAD_EARLIER_THRESHOLD_PX).toBe(120)
  })

  it('keeps the timeline rhythm gaps', () => {
    expect(TIMELINE_ITEM_GAP).toBe(16)
    expect(TIMELINE_ITEM_GAP_DISCOVERY).toBe(24)
  })

  it('keeps the reported app version', () => {
    expect(APP_VERSION).toBe('0.1.0')
  })

  it('keeps the auto-sent accent on the theme success token', () => {
    expect(AUTO_SENT_ACCENT).toBe('var(--mol-color-success, #16a34a)')
  })

  it('styles inline code chips as monospace, tinted, no-wrap', () => {
    expect(CHAT_CARD_CODE_STYLE).toEqual({
      fontFamily: 'var(--mol-font-mono, monospace)',
      fontSize: '0.92em',
      padding: '1px 5px',
      borderRadius: 4,
      background: 'rgba(128,128,128,0.16)',
      border: '1px solid rgba(128,128,128,0.18)',
      whiteSpace: 'nowrap',
    })
  })

  it('styles card links with the theme primary and an underline', () => {
    expect(CHAT_CARD_LINK_STYLE).toEqual({
      color: 'var(--color-primary, #4070e0)',
      textDecoration: 'underline',
      cursor: 'pointer',
    })
  })

  it('gates the injected user-accent stylesheet on the chat-user-message row', () => {
    // The selector the injection effect keys on, verbatim — a changed data-mol-id
    // here would silently unstyle every real user row (and style wrong ones).
    expect(USER_ACCENT_STYLE).toContain('[data-mol-id="chat-user-message"]')
    // The animation + its reduced-motion off switch ship together.
    expect(USER_ACCENT_STYLE).toContain('@keyframes mol-chat-accent-flow')
    expect(USER_ACCENT_STYLE).toContain('@media (prefers-reduced-motion: reduce)')
    expect(USER_ACCENT_STYLE).toContain('animation: mol-chat-accent-flow 6s ease-in-out infinite')
    expect(USER_ACCENT_STYLE).toContain('animation: none')
  })
})

describe('notice tone tables', () => {
  it('carries every tone with an accent and an icon', () => {
    for (const tone of ['info', 'gold', 'upgrade', 'success', 'signup'] as const) {
      expect(NOTICE_TONE[tone].accent).toBeTypeOf('string')
      expect(NOTICE_TONE[tone].accent.length).toBeGreaterThan(0)
      expect(NOTICE_TONE[tone].icon).toBeTypeOf('string')
    }
  })

  it('keeps the exact tone values', () => {
    expect(NOTICE_TONE.info).toEqual({
      accent: 'var(--mol-color-primary, #6366f1)',
      icon: 'info-circle',
    })
    expect(NOTICE_TONE.gold).toEqual({ accent: '#e0a100', icon: 'lightbulb' })
    expect(NOTICE_TONE.upgrade).toEqual({
      accent: 'var(--mol-color-warning, #e0a100)',
      icon: 'clock',
    })
    expect(NOTICE_TONE.success).toEqual({ accent: '#3fb950', icon: 'check-circle' })
    expect(NOTICE_TONE.signup).toEqual({
      accent: 'var(--mol-color-primary, #6366f1)',
      icon: 'sign-in',
    })
  })

  it('falls every tone back to a semantic button colour', () => {
    expect(NOTICE_TONE_BUTTON_COLOR).toEqual({
      info: 'primary',
      gold: 'warning',
      upgrade: 'warning',
      success: 'success',
      signup: 'primary',
    })
  })
})
