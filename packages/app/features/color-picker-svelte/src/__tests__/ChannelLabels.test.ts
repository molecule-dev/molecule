// @vitest-environment jsdom
/**
 * The RGB channel labels must go through `t` with a LITERAL key per channel —
 * `colorPicker.r` / `.g` / `.b` — the keys the locale bond owns. A provider
 * whose `t` echoes the key it was handed turns every rendered label into an
 * assertion on the exact key the call passed; the bond's own tests prove each
 * key exists in every language.
 *
 * Port of `@molecule/app-color-picker-react/src/__tests__/ChannelLabels.test.tsx`.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
  }),
}))

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `[[${key}]]`,
  }),
}))

import ColorPicker from '../ColorPicker.svelte'

/** The mounted roots, unmounted after each test. */
const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the host container.
 *
 * @param component - The Svelte component to mount.
 * @param props - Its props.
 * @returns The container element the component mounted into.
 */
function render<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

describe('<ColorPicker> RGB channel keys', () => {
  it('renders each RGB channel label through its literal translation key', () => {
    const container = render(ColorPicker, { value: '#3366ff', onChange: () => {} })
    for (const channel of ['r', 'g', 'b'] as const) {
      const input = container.querySelector(
        `[data-mol-id="color-picker-${channel}"]`,
      ) as HTMLInputElement
      expect(input).not.toBeNull()
      const label = input.closest('label')
      expect(label).not.toBeNull()
      expect(label?.querySelector('span')?.textContent).toBe(`[[colorPicker.${channel}]]`)
      expect(input.getAttribute('aria-label')).toBe(`[[colorPicker.${channel}]]`)
    }
  })
})
