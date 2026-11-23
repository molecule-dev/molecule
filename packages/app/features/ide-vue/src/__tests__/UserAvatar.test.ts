// @vitest-environment jsdom
/**
 * `UserAvatar` rendered for real: the avatar-level assertions of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.user-avatar.test.tsx`,
 * mounted on the component itself (the React suite drives them through
 * `ChatPanel`, which the Vue package does not carry — the same render
 * contract is asserted at the component boundary here). Mounted through Vue's
 * own `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { UserAvatar } from '../components/UserAvatar.js'

/** A 1×1 transparent PNG data-URI — a safe, renderable avatar source. */
const AVATAR_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the avatar with the given props.
 *
 * @param props - The props (`userAvatar`, `name`, `size`, `onClick`).
 * @returns The host element the avatar mounted into.
 */
function renderAvatar(props: Record<string, unknown> = {}): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  mounted.app = createApp(
    defineComponent({
      render: (): VNodeChild => h(UserAvatar, props),
    }),
  )
  mounted.app.mount(host)
  return host
}

describe('UserAvatar — the avatar beside a user message (SOC1)', () => {
  it('renders the real avatar image when userAvatar is supplied', () => {
    const host = renderAvatar({ userAvatar: AVATAR_DATA_URI })
    const avatar = host.querySelector('[data-mol-id="chat-user-avatar"]')
    expect(avatar, 'a user-avatar element should render').not.toBeNull()
    // The wiring the audit found missing: a real <img> with the safe src.
    expect((avatar as HTMLElement).tagName).toBe('IMG')
    expect(avatar?.getAttribute('src')).toBe(AVATAR_DATA_URI)
    expect(avatar?.getAttribute('alt')).toBe('You')
  })

  it('falls back to the generic user icon when no avatar is supplied', () => {
    const host = renderAvatar({ userAvatar: null })
    const avatar = host.querySelector('[data-mol-id="chat-user-avatar"]')
    expect(avatar).not.toBeNull()
    // No image — the accessible icon fallback instead.
    expect((avatar as HTMLElement).tagName).not.toBe('IMG')
    expect(avatar?.getAttribute('role')).toBe('img')
    expect(avatar?.getAttribute('aria-label')).toBe('You')
    expect(avatar!.querySelector('svg'), 'the fallback renders the user glyph').not.toBeNull()
    expect(host.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
  })

  it("shows a TEAMMATE's initial — never the viewer's own avatar — when the author has none", () => {
    const host = renderAvatar({ name: 'Test' })
    const avatar = host.querySelector('[data-mol-id="chat-user-avatar"]')
    expect(avatar).not.toBeNull()
    // Not an image at all (the author has none — no avatar leaks onto them),
    // and the tile shows the author's initial with their name as the label.
    expect((avatar as HTMLElement)!.tagName).not.toBe('IMG')
    expect(host.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
    expect(avatar?.getAttribute('aria-label')).toBe('Test')
    expect(avatar?.textContent).toBe('T')
  })

  it('keeps the glyph decorative for a whitespace-only name', () => {
    // A whitespace-only name initials to nothing, so the generic glyph shows —
    // and with no name to announce, the glyph is decorative chrome (axe
    // `role-img-alt`): no image role, no label, hidden from assistive tech.
    const host = renderAvatar({ name: '   ' })
    const avatar = host.querySelector('[data-mol-id="chat-user-avatar"]') as HTMLElement
    expect(avatar).not.toBeNull()
    expect(avatar.tagName).not.toBe('IMG')
    // The glyph renders (not an initial)…
    expect(avatar.querySelector('svg')).not.toBeNull()
    expect(avatar.textContent).toBe('')
    // …as decoration: no name to announce, so no image role and no label.
    expect(avatar.getAttribute('role')).toBeNull()
    expect(avatar.getAttribute('aria-label')).toBeNull()
    expect(avatar.getAttribute('aria-hidden')).toBe('true')
  })

  it('never places an unsafe avatar value into an <img src>', () => {
    const host = renderAvatar({ userAvatar: 'javascript:alert(1)' })
    expect(host.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    // The unsafe scheme must be rejected → icon fallback, never an <img>.
    expect(host.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
    const avatar = host.querySelector('[data-mol-id="chat-user-avatar"]') as HTMLElement
    expect(avatar.tagName).not.toBe('IMG')
    expect(avatar.querySelector('svg')).not.toBeNull()
  })
})

describe('UserAvatar clickability', () => {
  it('is NOT interactive when no onClick is supplied (backward-compatible)', () => {
    const host = renderAvatar({ userAvatar: AVATAR_DATA_URI })
    // No button wrapper — the avatar renders as the bare image, exactly as
    // before.
    expect(host.querySelector('[data-mol-id="chat-user-avatar-button"]')).toBeNull()
  })

  it('fires onClick when the clickable avatar is clicked', () => {
    const onClick = vi.fn()
    const host = renderAvatar({ userAvatar: AVATAR_DATA_URI, onClick })
    const button = host.querySelector('[data-mol-id="chat-user-avatar-button"]') as HTMLElement
    // Real button — keyboard-focusable and screen-reader-labelled.
    expect(button).not.toBeNull()
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-label')).toBe('View profile')
    // It still renders the real avatar image inside.
    expect(button.querySelector('img[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('makes the icon-fallback avatar clickable too (no real avatar set)', () => {
    const onClick = vi.fn()
    const host = renderAvatar({ userAvatar: null, onClick })
    const button = host.querySelector('[data-mol-id="chat-user-avatar-button"]') as HTMLElement
    // The fallback glyph is wrapped in the same accessible button.
    expect(button.querySelector('svg')).not.toBeNull()
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
