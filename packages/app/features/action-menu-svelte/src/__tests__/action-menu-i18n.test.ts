// @vitest-environment jsdom
/**
 * The trigger's aria-label goes through i18n — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount in
 * jsdom. The default label was a prop destructure default
 * (`triggerAriaLabel = 'Actions'`), so it rendered plain English in every
 * locale; these tests mock `useTranslation` with a `t` that marks every key,
 * so a default that bypassed `t()` would show up as plain English.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import ActionMenu from '../ActionMenu.svelte'
import type { ActionMenuProps } from '../types.js'

/** A mounted menu. */
interface Mounted {
  host: HTMLElement
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts an {@link ActionMenu} into the document body.
 *
 * @param props - Props to pass to the component.
 * @returns The mounted host.
 */
function render(props: ActionMenuProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(ActionMenu, { target: host, props })
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
