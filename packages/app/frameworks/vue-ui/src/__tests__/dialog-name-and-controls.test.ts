// @vitest-environment jsdom
/**
 * Accessible-name wiring for the framework dialogs and the Tabs
 * `aria-controls` contract (axe `aria-dialog-name` / `aria-valid-attr-value`),
 * mirroring `@molecule/app-ui-react`'s `dialog-name-and-controls` test:
 *
 * - ConfirmDialog and PromptDialog label their dialog element with the
 *   rendered title (and PromptDialog its rendered description) instead of
 *   leaving `<div role="dialog">` unnamed;
 * - SidebarUserCard's settings drawer (a title-less Modal) is named with the
 *   localized `sidebarUserCard.drawer` label;
 * - a Tabs tab only carries `aria-controls` when its panel is actually
 *   rendered (the active tab, when its item has content), and the value
 *   resolves to that panel's id.
 *
 * Rendered with real Vue; only the translation/auth/router hooks are stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The drawer label test reads a TRANSLATED value, so the stub resolves keys
// through a small table before falling back to the defaultValue.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      ({ 'sidebarUserCard.drawer': 'Konto' })[key] ?? opts?.defaultValue ?? key,
  }),
  useAuth: () => ({
    status: { value: 'authenticated' },
    user: { value: { id: 'u1', name: 'Ada', email: 'ada@example.com' } },
  }),
  useLocation: () => ({ value: { pathname: '/', search: '' } }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { createApp, h, nextTick, type RenderFunction } from 'vue'

const { ConfirmDialog } = await import('../components/ConfirmDialog.js')
const { PromptDialog } = await import('../components/PromptDialog.js')
const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
const { Tabs } = await import('../components/Tabs.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a component (real Vue; Modal Teleports to body), runs the
 * assertions, then unmounts.
 * @param render - The component render.
 * @param assert - The assertions (may await Vue's next tick first).
 */
async function withMount(
  render: RenderFunction,
  assert: () => void | Promise<void>,
): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  app.mount(host)
  try {
    await assert()
  } finally {
    app.unmount()
  }
}

describe('dialog and drawer accessible names', () => {
  it("ConfirmDialog's dialog aria-labelledby resolves to the title text", async () => {
    await withMount(
      () =>
        h(ConfirmDialog, {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: 'Delete vault?',
          description: 'This action cannot be undone.',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog).not.toBeNull()
        const labelledby = dialog.getAttribute('aria-labelledby')
        expect(labelledby).toBeTruthy()
        const title = document.getElementById(labelledby!)
        expect(title?.tagName.toLowerCase()).toBe('h2')
        expect(title?.textContent).toBe('Delete vault?')
      },
    )
  })

  it("ConfirmDialog's dialog aria-describedby resolves to the description text", async () => {
    await withMount(
      () =>
        h(ConfirmDialog, {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: 'Delete vault?',
          description: 'This action cannot be undone.',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        const describedby = dialog.getAttribute('aria-describedby')
        expect(describedby).toBeTruthy()
        const description = document.getElementById(describedby!)
        expect(description?.tagName.toLowerCase()).toBe('p')
        expect(description?.textContent).toBe('This action cannot be undone.')
      },
    )
  })

  it('ConfirmDialog carries no aria-describedby without a description', async () => {
    await withMount(
      () =>
        h(ConfirmDialog, {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: 'Delete vault?',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog.getAttribute('aria-describedby')).toBeNull()
      },
    )
  })

  it("PromptDialog's dialog aria-labelledby resolves to the title text", async () => {
    await withMount(
      () =>
        h(PromptDialog, {
          open: true,
          onClose: () => {},
          onSubmit: () => {},
          title: 'Rename board',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        const labelledby = dialog.getAttribute('aria-labelledby')
        expect(labelledby).toBeTruthy()
        const title = document.getElementById(labelledby!)
        expect(title?.tagName.toLowerCase()).toBe('h2')
        expect(title?.textContent).toBe('Rename board')
      },
    )
  })

  it("PromptDialog's dialog aria-describedby resolves to the rendered description", async () => {
    await withMount(
      () =>
        h(PromptDialog, {
          open: true,
          onClose: () => {},
          onSubmit: () => {},
          title: 'Rename board',
          description: 'The slug updates automatically.',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        const describedby = dialog.getAttribute('aria-describedby')
        expect(describedby).toBeTruthy()
        const description = document.getElementById(describedby!)
        expect(description?.tagName.toLowerCase()).toBe('p')
        expect(description?.textContent).toBe('The slug updates automatically.')
      },
    )
  })

  it('ConfirmDialog points its dialog at no heading when the title renders nothing', async () => {
    await withMount(
      () =>
        h(ConfirmDialog, {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: [false, null],
          description: 'This action cannot be undone.',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog.getAttribute('aria-labelledby')).toBeNull()
        expect(document.querySelector('h2')).not.toBeNull()
        expect(document.querySelector('h2')!.id).toBe('')
      },
    )
  })

  it('PromptDialog points its dialog at no heading when the title renders nothing', async () => {
    await withMount(
      () =>
        h(PromptDialog, {
          open: true,
          onClose: () => {},
          onSubmit: () => {},
          title: [false, null],
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog.getAttribute('aria-labelledby')).toBeNull()
        expect(document.querySelector('h2')).not.toBeNull()
        expect(document.querySelector('h2')!.id).toBe('')
      },
    )
  })

  it('PromptDialog carries no aria-describedby without a description', async () => {
    await withMount(
      () =>
        h(PromptDialog, {
          open: true,
          onClose: () => {},
          onSubmit: () => {},
          title: 'Rename board',
        }),
      () => {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog.getAttribute('aria-describedby')).toBeNull()
      },
    )
  })

  it('the SidebarUserCard drawer has the translated label', async () => {
    await withMount(
      () => h(SidebarUserCard, () => h('div', 'panel')),
      async () => {
        const trigger = document.querySelector('[data-mol-id="sidebar-user-card"]') as HTMLElement
        expect(trigger).not.toBeNull()
        trigger.click()
        await nextTick()
        const drawer = document.querySelector('[role="dialog"]') as HTMLElement
        expect(drawer).not.toBeNull()
        expect(drawer.getAttribute('aria-label')).toBe('Konto')
      },
    )
  })
})

describe('Tabs aria-controls', () => {
  const ITEMS = [
    { value: 'account', label: 'Account', content: 'Account settings' },
    { value: 'profile', label: 'Profile', content: 'Profile settings' },
  ]

  it('the active tab with content has an aria-controls that resolves to the rendered panel', async () => {
    await withMount(
      () => h(Tabs, { items: ITEMS }),
      () => {
        const active = [...document.querySelectorAll('[role="tab"]')].find(
          (tab) => tab.textContent === 'Account',
        ) as HTMLElement
        const controls = active.getAttribute('aria-controls')
        expect(controls).toBeTruthy()
        const panel = document.getElementById(controls!)
        expect(panel?.getAttribute('role')).toBe('tabpanel')
        expect(panel?.textContent).toContain('Account settings')
      },
    )
  })

  it('a tab whose panel is not rendered has no aria-controls', async () => {
    await withMount(
      () => h(Tabs, { items: ITEMS }),
      () => {
        const inactive = [...document.querySelectorAll('[role="tab"]')].find(
          (tab) => tab.textContent === 'Profile',
        ) as HTMLElement
        expect(inactive.getAttribute('aria-controls')).toBeNull()
      },
    )
  })

  it('an active tab without content has no aria-controls', async () => {
    await withMount(
      () =>
        h(Tabs, {
          items: [
            { value: 'a', label: 'A', content: 'A body' },
            { value: 'b', label: 'B' },
          ],
          value: 'b',
        }),
      () => {
        const active = [...document.querySelectorAll('[role="tab"]')].find(
          (tab) => tab.textContent === 'B',
        ) as HTMLElement
        expect(active.getAttribute('aria-controls')).toBeNull()
        expect(document.querySelector('[role="tabpanel"]')).toBeNull()
      },
    )
  })

  it('no tab carries aria-controls when no item has content', async () => {
    await withMount(
      () => h(Tabs, { items: ITEMS.map(({ value, label }) => ({ value, label })) }),
      () => {
        for (const tab of document.querySelectorAll('[role="tab"]'))
          expect(tab.getAttribute('aria-controls')).toBeNull()
      },
    )
  })
})
