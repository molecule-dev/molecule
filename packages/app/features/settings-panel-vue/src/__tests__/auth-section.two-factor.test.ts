// @vitest-environment jsdom
/**
 * An API without a two-factor provider serves no `verify-two-factor` route, so a scaffold without
 * one renders the section with `:two-factor="false"`: an Enable button there only answers 404.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { AuthSection } from '../AuthSection.js'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: ref({ id: 'user-1' }) }),
  useChangePassword: () => ({
    status: ref('idle'),
    error: ref(null),
    changePassword: vi.fn(),
    reset: vi.fn(),
  }),
  useHttpClient: () => http,
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy({} as Record<string, unknown>, {
      get: () => () => '',
    }),
}))
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const slot = (tag: string) =>
    defineComponent({
      setup:
        (_props, { slots }) =>
        () =>
          h(tag, slots.default?.()),
    })
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Alert: slot('div'),
    Button: slot('button'),
    Flex: slot('div'),
    Input: slot('input'),
    Modal: defineComponent({
      props: { open: Boolean },
      setup:
        (props, { slots }) =>
        () =>
          props.open ? h('div', slots.default?.()) : null,
    }),
  }
})

const unmounts: Array<() => void> = []

/**
 * Mount the section.
 *
 * @param props - The section's props.
 * @returns The container it renders into.
 */
async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp({ render: () => h(AuthSection, props) })
  app.mount(container)
  unmounts.push(() => {
    app.unmount()
    container.remove()
  })
  await nextTick()
  return container
}

afterEach(() => {
  for (const unmount of unmounts.splice(0)) unmount()
  vi.resetAllMocks()
})

describe('AuthSection two-factor row', () => {
  it('shows the row and reads the 2FA status by default', async () => {
    http.get.mockReturnValue(new Promise(() => {}))
    const container = await mount()
    expect(container.textContent).toContain('Two-factor authentication')
    expect(http.get).toHaveBeenCalledWith('/api/users/me')
  })

  it('shows only the password change when twoFactor is false', async () => {
    const container = await mount({ twoFactor: false })
    expect(container.textContent).toContain('Change password')
    expect(container.textContent).not.toContain('Two-factor authentication')
    expect(http.get).not.toHaveBeenCalled()
  })
})
