// @vitest-environment jsdom
/**
 * `UserAvatar` rendered for real: the avatar-level assertions of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.user-avatar.test.tsx`,
 * mounted on the component itself (the React suite drives them through
 * `ChatPanel`, which the Angular package does not carry — the same render
 * contract is asserted at the component boundary here). Mounted through
 * Angular's own `createApplication`.
 *
 * @module
 */
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { UserAvatar } from '../components/user-avatar.component.js'

/** A 1×1 transparent PNG data-URI — a safe, renderable avatar source. */
const AVATAR_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/** One mounted avatar, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof UserAvatarHost>>
  container: HTMLElement
}

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the inputs are set through real bindings (a bare
 * `createComponent` + `setInput` writes nothing the component can read).
 */
const UserAvatarHost = Component({
  selector: 'mol-user-avatar-host',
  standalone: true,
  imports: [UserAvatar],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-user-avatar [userAvatar]="p['userAvatar']" [name]="p['name']" [size]="p['size']" [onClick]="p['onClick']"></div>`,
})(
  class UserAvatarHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle, without timers. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  current.appRef.tick()
}

/**
 * Mounts the avatar with fixed inputs.
 *
 * @param props - The inputs (userAvatar, name, size, onClick).
 * @returns The mount.
 */
async function renderAvatar(props: Record<string, unknown>): Promise<Mounted> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<InstanceType<typeof UserAvatarHost>> = createComponent(UserAvatarHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

describe('UserAvatar — the avatar beside a user message (SOC1)', () => {
  it('renders the real avatar image when userAvatar is supplied', async () => {
    const { container } = await renderAvatar({ userAvatar: AVATAR_DATA_URI })
    const avatar = container.querySelector('[data-mol-id="chat-user-avatar"]')
    expect(avatar, 'a user-avatar element should render').not.toBeNull()
    // The wiring the audit found missing: a real <img> with the safe src.
    expect((avatar as HTMLElement).tagName).toBe('IMG')
    expect(avatar?.getAttribute('src')).toBe(AVATAR_DATA_URI)
    expect(avatar?.getAttribute('alt')).toBe('You')
  })

  it('falls back to the generic user icon when no avatar is supplied', async () => {
    const { container } = await renderAvatar({ userAvatar: null })
    const avatar = container.querySelector('[data-mol-id="chat-user-avatar"]')
    expect(avatar).not.toBeNull()
    // No image — the accessible icon fallback instead.
    expect((avatar as HTMLElement).tagName).not.toBe('IMG')
    expect(avatar?.getAttribute('role')).toBe('img')
    expect(avatar?.getAttribute('aria-label')).toBe('You')
    expect(avatar?.querySelector('svg'), 'the fallback renders the user glyph').not.toBeNull()
    expect(container.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
  })

  it("shows a TEAMMATE's initial — never the viewer's own avatar — when the author has none", async () => {
    const { container } = await renderAvatar({ name: 'Test' })
    const avatar = container.querySelector('[data-mol-id="chat-user-avatar"]')
    // Not an image at all (the author has none — no avatar leaks onto them),
    // and the tile shows the author's initial with their name as the label.
    expect((avatar as HTMLElement)?.tagName).not.toBe('IMG')
    expect(container.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
    expect(avatar?.getAttribute('aria-label')).toBe('Test')
    expect(avatar?.textContent).toBe('T')
  })

  it('keeps the glyph decorative for a whitespace-only name', async () => {
    // A whitespace-only name initials to nothing, so the generic glyph shows —
    // and with no name to announce, the glyph is decorative chrome (axe
    // `role-img-alt`): no image role, no label, hidden from assistive tech.
    const { container } = await renderAvatar({ name: '   ' })
    const avatar = container.querySelector('[data-mol-id="chat-user-avatar"]') as HTMLElement
    expect(avatar).not.toBeNull()
    expect(avatar.tagName).not.toBe('IMG')
    expect(avatar.getAttribute('role')).toBeNull()
    expect(avatar.getAttribute('aria-label')).toBeNull()
    expect(avatar.getAttribute('aria-hidden')).toBe('true')
    expect(avatar.querySelector('svg'), 'the fallback renders the user glyph').not.toBeNull()
    expect(avatar.textContent).toBe('')
  })

  it('never places an unsafe avatar value into an <img src>', async () => {
    const { container } = await renderAvatar({ userAvatar: 'javascript:alert(1)' })
    expect(container.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    // The unsafe scheme must be rejected → icon fallback, never an <img>.
    expect(container.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
    const avatar = container.querySelector('[data-mol-id="chat-user-avatar"]') as HTMLElement
    expect(avatar.tagName).not.toBe('IMG')
    expect(avatar.querySelector('svg')).not.toBeNull()
  })
})

describe('UserAvatar clickability', () => {
  it('is NOT interactive when no onClick is supplied (backward-compatible)', async () => {
    const { container } = await renderAvatar({ userAvatar: AVATAR_DATA_URI })
    // No button wrapper — the avatar renders as the bare image, exactly as
    // before.
    expect(container.querySelector('[data-mol-id="chat-user-avatar-button"]')).toBeNull()
  })

  it('fires onClick when the clickable avatar is clicked', async () => {
    const onClick = vi.fn()
    const { container, appRef } = await renderAvatar({
      userAvatar: AVATAR_DATA_URI,
      onClick,
    })
    const button = container.querySelector('[data-mol-id="chat-user-avatar-button"]') as HTMLElement
    // Real button — keyboard-focusable and screen-reader-labelled.
    expect(button).not.toBeNull()
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-label')).toBe('View profile')
    // It still renders the real avatar image inside.
    expect(button.querySelector('img[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    button.click()
    await flush()
    appRef.tick()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('makes the icon-fallback avatar clickable too (no real avatar set)', async () => {
    const onClick = vi.fn()
    const { container, appRef } = await renderAvatar({ userAvatar: null, onClick })
    const button = container.querySelector('[data-mol-id="chat-user-avatar-button"]') as HTMLElement
    // The fallback glyph is wrapped in the same accessible button.
    expect(button.querySelector('svg')).not.toBeNull()
    button.click()
    await flush()
    appRef.tick()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
