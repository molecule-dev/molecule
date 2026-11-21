// @vitest-environment jsdom
/**
 * The default aria-label goes through i18n — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real mount in jsdom. The
 * label was a prop destructure default (`ariaLabel = 'Typing…'`), so it
 * rendered plain English in every locale; these tests mock `useTranslation`
 * with a `t` that marks every key, so a default that bypassed `t()` would show
 * up as plain English.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import TypingIndicator from '../TypingIndicator.svelte'

/** A mounted indicator. */
interface Mounted {
  host: HTMLElement
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts a {@link TypingIndicator} into the document body.
 *
 * @param props - Props to pass to the component.
 * @returns The mounted host.
 */
function render(props: Record<string, unknown>): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(TypingIndicator, { target: host, props })
  flushSync()
  const entry = {
    host,
    destroy: async () => {
      await unmount(instance)
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

describe('TypingIndicator i18n', () => {
  it('renders the default aria-label through t', () => {
    const { host } = render({})
    const status = host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('«typingIndicator.aria.label»')
  })

  it('an explicit ariaLabel overrides the translated label', () => {
    const { host } = render({ ariaLabel: 'Alice is typing' })
    const status = host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Alice is typing')
  })
})
