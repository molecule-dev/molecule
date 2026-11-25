import '../ui/setup.js'
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'

import { VideoScrubber } from '@molecule/app-feature-video-scrubber-vue'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

/** Presses and releases the primary pointer on a mounted host. */
function press(host: Element): void {
  const init = { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true }
  host.dispatchEvent(new PointerEvent('pointerdown', init))
  window.dispatchEvent(new PointerEvent('pointerup', init))
}

it('lets a Vue scrubber claim a press inside a React drag host', () => {
  const mount = document.createElement('div')
  document.body.append(mount)
  const react = createRoot(mount)
  const onStart = vi.fn()
  const onSeek = vi.fn()
  const vue = createApp({
    render: () => h(VideoScrubber, { duration: 60, currentTime: 0, onSeek }),
  })
  try {
    flushSync(() =>
      react.render(
        createElement(Box, { as: 'div', drag: { onStart } }, createElement('div', { id: 'vue' })),
      ),
    )
    const vueHost = mount.querySelector('#vue')
    if (!vueHost) throw new Error('React did not render the Vue mount host')
    vue.mount(vueHost)
    const strip = vueHost.querySelector('[role="slider"]')
    if (!strip) throw new Error('Vue did not render the scrubber strip')
    press(strip)
    expect(onSeek).toHaveBeenCalledExactlyOnceWith(0)
    expect(onStart).not.toHaveBeenCalled()

    press(vueHost)
    expect(onStart).toHaveBeenCalledTimes(1)
  } finally {
    vue.unmount()
    react.unmount()
    mount.remove()
  }
})

it.each(['drag', 'press'])(
  'leaves an inner React %s target to React inside a Vue scrubber',
  (kind) => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onSeek = vi.fn()
    const vue = createApp({
      render: () => h(VideoScrubber, { duration: 60, currentTime: 0, onSeek }),
    })
    let react: ReturnType<typeof createRoot> | undefined
    try {
      vue.mount(mount)
      const strip = mount.querySelector('[role="slider"]')
      if (!strip) throw new Error('Vue did not render the scrubber strip')
      const reactHost = document.createElement('div')
      strip.append(reactHost)
      const root = createRoot(reactHost)
      react = root
      const activate = vi.fn()
      flushSync(() =>
        root.render(
          kind === 'drag'
            ? createElement(Box, { as: 'div', drag: { onStart: activate } })
            : createElement(Pressable, { as: 'div', onClick: activate }),
        ),
      )
      const inner = reactHost.firstElementChild
      if (!inner) throw new Error('React did not render the inner host')
      press(inner)
      if (kind === 'press') inner.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(activate).toHaveBeenCalledTimes(1)
      expect(onSeek).not.toHaveBeenCalled()

      press(strip)
      expect(onSeek).toHaveBeenCalledExactlyOnceWith(0)
    } finally {
      react?.unmount()
      vue.unmount()
      mount.remove()
    }
  },
)
