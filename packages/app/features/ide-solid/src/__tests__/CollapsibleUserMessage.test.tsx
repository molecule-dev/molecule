// @vitest-environment jsdom

/**
 * A long user message is clipped behind a full-width chevron strip. The chevron
 * is the strip's only content, so the button names itself with `aria-label` and
 * reports its state with `aria-expanded`; without them a screen reader announced
 * a bare "button".
 *
 * Solid port of `@molecule/app-ide-react/src/__tests__/CollapsibleUserMessage.test.tsx`
 * with the same test names and the same assertions.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { getByRole, queryByRole } from '@testing-library/dom'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CollapsibleUserMessage } from '../parts/MessageItem.jsx'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom lays nothing out, so every element reports a scrollHeight of 0: give
  // the message body a height past the clip so the strip renders.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    USER_MSG_COLLAPSE_HEIGHT + 50,
  )
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the message body with the given content.
 *
 * @param readContent - Reads the body's text at each render (a signal for a growing message).
 * @returns The host element the body mounted into.
 */
function renderBody(readContent: () => string): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => <CollapsibleUserMessage content={readContent()} isLight={false} />,
    container,
  )
  return container
}

describe('CollapsibleUserMessage', () => {
  it('names the expand strip and reports it collapsed', () => {
    const container = renderBody(() => 'line\n'.repeat(40))
    const strip = getByRole(container, 'button', { name: 'Show more' })
    expect(strip.getAttribute('aria-expanded')).toBe('false')
  })

  it('renames the strip and reports it expanded once clicked', () => {
    const container = renderBody(() => 'line\n'.repeat(40))
    getByRole(container, 'button', { name: 'Show more' }).click()
    const strip = getByRole(container, 'button', { name: 'Show less' })
    expect(strip.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders no strip for a message that fits', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const container = renderBody(() => 'short')
    expect(queryByRole(container, 'button')).toBeNull()
  })

  it('measures again when the message grows past the clip', () => {
    const height = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const [content, setContent] = createSignal('short')
    const container = renderBody(() => content())
    expect(queryByRole(container, 'button')).toBeNull()
    height.mockReturnValue(USER_MSG_COLLAPSE_HEIGHT + 50)
    setContent('line\n'.repeat(40))
    expect(
      getByRole(container, 'button', { name: 'Show more' }).getAttribute('aria-expanded'),
    ).toBe('false')
  })
})
