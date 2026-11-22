// @vitest-environment jsdom

/**
 * A long user message is clipped behind a full-width chevron strip. The chevron
 * is the strip's only content, so the button names itself with `aria-label` and
 * reports its state with `aria-expanded`; without them a screen reader announced
 * a bare "button".
 *
 * Vue port of `@molecule/app-ide-react/src/__tests__/CollapsibleUserMessage.test.tsx`
 * with the same test names and the same assertions.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { getByRole, queryByRole } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CollapsibleUserMessage } from '../parts/MessageItem.js'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

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
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the message body with the given content.
 *
 * @param readContent - Reads the body's text at each render (a ref for a growing message).
 * @returns The host element the body mounted into.
 */
function renderBody(readContent: () => string): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.app = createApp({
    render: (): VNodeChild => h(CollapsibleUserMessage, { content: readContent(), isLight: false }),
  })
  mounted.app.mount(host)
  return host
}

describe('CollapsibleUserMessage', () => {
  it('names the expand strip and reports it collapsed', async () => {
    const host = renderBody(() => 'line\n'.repeat(40))
    await nextTick()
    const strip = getByRole(host, 'button', { name: 'Show more' })
    expect(strip.getAttribute('aria-expanded')).toBe('false')
  })

  it('renames the strip and reports it expanded once clicked', async () => {
    const host = renderBody(() => 'line\n'.repeat(40))
    await nextTick()
    getByRole(host, 'button', { name: 'Show more' }).click()
    await nextTick()
    const strip = getByRole(host, 'button', { name: 'Show less' })
    expect(strip.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders no strip for a message that fits', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const host = renderBody(() => 'short')
    await nextTick()
    expect(queryByRole(host, 'button')).toBeNull()
  })

  it('measures again when the message grows past the clip', async () => {
    const height = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const content = shallowRef('short')
    const host = renderBody(() => content.value)
    await nextTick()
    expect(queryByRole(host, 'button')).toBeNull()
    height.mockReturnValue(USER_MSG_COLLAPSE_HEIGHT + 50)
    content.value = 'line\n'.repeat(40)
    await nextTick()
    await nextTick()
    expect(getByRole(host, 'button', { name: 'Show more' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })
})
