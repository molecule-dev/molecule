// @vitest-environment jsdom
/**
 * An API without a two-factor provider serves no `verify-two-factor` route, so a scaffold without
 * one renders the section with `twoFactor={false}`: an Enable button there only answers 404.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AuthSection from '../AuthSection.svelte'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { readable } = await import('svelte/store')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useAuth: () => ({ user: readable({ id: 'user-1' }) }),
    useChangePassword: () => ({
      status: readable('idle'),
      error: readable(null),
      changePassword: vi.fn(),
      reset: vi.fn(),
    }),
    useHttpClient: () => http,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  }
})

const mounted: Array<() => void> = []

/**
 * Mount the section.
 *
 * @param props - The section's props.
 * @returns The container it renders into.
 */
function mountSection(props: { twoFactor?: boolean } = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(AuthSection, { target: container, props })
  flushSync()
  mounted.push(() => {
    void unmount(instance)
    container.remove()
  })
  return container
}

afterEach(() => {
  for (const dispose of mounted.splice(0)) dispose()
  vi.resetAllMocks()
})

describe('AuthSection two-factor row', () => {
  it('shows the row and reads the 2FA status by default', () => {
    http.get.mockReturnValue(new Promise(() => {}))
    const container = mountSection()
    expect(container.textContent).toContain('Two-factor authentication')
    expect(http.get).toHaveBeenCalledWith('/api/users/me')
  })

  it('shows only the password change when twoFactor is false', () => {
    const container = mountSection({ twoFactor: false })
    expect(container.textContent).toContain('Change password')
    expect(container.textContent).not.toContain('Two-factor authentication')
    expect(http.get).not.toHaveBeenCalled()
  })
})
