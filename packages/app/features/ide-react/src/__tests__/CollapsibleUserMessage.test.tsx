// @vitest-environment jsdom

/**
 * A long user message is clipped behind a full-width chevron strip. The chevron is the strip's
 * only content, so the button names itself with `aria-label` and reports its state with
 * `aria-expanded`; without them a screen reader announced a bare "button".
 *
 * @module
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CollapsibleUserMessage } from '../components/chat-panel/CollapsibleUserMessage.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom lays nothing out, so every element reports a scrollHeight of 0: give the message
  // body a height past the clip so the strip renders.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    USER_MSG_COLLAPSE_HEIGHT + 50,
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CollapsibleUserMessage', () => {
  it('names the expand strip and reports it collapsed', () => {
    render(<CollapsibleUserMessage content={'line\n'.repeat(40)} isLight={false} />)
    const strip = screen.getByRole('button', { name: 'Show more' })
    expect(strip.getAttribute('aria-expanded')).toBe('false')
  })

  it('renames the strip and reports it expanded once clicked', () => {
    render(<CollapsibleUserMessage content={'line\n'.repeat(40)} isLight={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    const strip = screen.getByRole('button', { name: 'Show less' })
    expect(strip.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders no strip for a message that fits', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    render(<CollapsibleUserMessage content="short" isLight={false} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('measures again when the message grows past the clip', () => {
    const height = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const { rerender } = render(<CollapsibleUserMessage content="short" isLight={false} />)
    expect(screen.queryByRole('button')).toBeNull()
    height.mockReturnValue(USER_MSG_COLLAPSE_HEIGHT + 50)
    rerender(<CollapsibleUserMessage content={'line\n'.repeat(40)} isLight={false} />)
    expect(screen.getByRole('button', { name: 'Show more' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })
})
