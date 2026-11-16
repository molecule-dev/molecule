// @vitest-environment jsdom
/**
 * The trigger's aria-label goes through i18n — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. The default
 * label was a prop default (`'Actions'`), so it rendered plain English in
 * every locale; these tests mock `useTranslation` with a `t` that marks every
 * key, so a default that bypassed `t()` would show up as plain English.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the Vue suite uses.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
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

// A Button marker that forwards every pass-through attribute (aria-*,
// data-mol-id) onto a native <button>, as the Vue suite's Button mock does.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      inheritAttrs: false,
      emits: ['click'],
      setup(_props, { attrs, slots, emit }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              onClick: (event: MouseEvent) => emit('click', event),
              'aria-label': attrs['aria-label'],
              'aria-haspopup': attrs['aria-haspopup'],
              'aria-expanded': attrs['aria-expanded'],
              'data-mol-id': attrs['data-mol-id'],
            },
            slots.default?.(),
          )
      },
    }),
  }
})
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { createApp, defineComponent, h } from 'vue'

import { ActionMenu } from '../ActionMenu.js'
import type { ActionMenuProps } from '../types.js'

/** A mounted menu: its host element and a teardown. */
interface Mounted {
  host: HTMLElement
  unmount(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
})

/**
 * Renders an {@link ActionMenu}.
 *
 * @param props - Props to pass to `<ActionMenu>`.
 * @returns The mounted host.
 */
function render(props: ActionMenuProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ActionMenu, props) }))
  app.mount(host)
  const entry = {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

describe('ActionMenu i18n', () => {
  it('renders the trigger aria-label through t', () => {
    const { host } = render({ items })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«actionMenu.aria.trigger»')
  })

  it('an explicit triggerAriaLabel overrides the translated label', () => {
    const { host } = render({ items, triggerAriaLabel: 'Row actions' })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })
})
