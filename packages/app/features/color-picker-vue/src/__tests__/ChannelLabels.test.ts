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

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
  }),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `[[${key}]]`,
  }),
}))

import { createApp, defineComponent, h } from 'vue'

import { ColorPicker } from '../ColorPicker.js'
import type { ColorPickerProps } from '../types.js'

/** Tear-downs of the apps mounted by {@link render}, run after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const dispose of mounted.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts a `<ColorPicker>` with the given props.
 *
 * @param props - The picker's props.
 * @returns The host container the app mounted into.
 */
function render(props: ColorPickerProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ColorPicker, props) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  return host
}

describe('<ColorPicker> RGB channel keys', () => {
  it('renders each RGB channel label through its literal translation key', () => {
    const container = render({ value: '#3366ff', onChange: () => {} })
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
