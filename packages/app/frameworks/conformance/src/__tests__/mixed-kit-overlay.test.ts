import '../ui/setup.js'
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'

import { Modal as ReactModal } from '@molecule/app-ui-react'
import { Modal as VueModal } from '@molecule/app-ui-vue'

afterEach(() => document.body.removeAttribute('style'))

it.each(['lower', 'upper'])(
  'shares Escape and the body lock between React and Vue when the %s dialog closes first',
  async (first) => {
    const { body } = document
    body.style.setProperty('overflow', 'scroll', 'important')
    const lowerHost = document.createElement('div')
    const upperHost = document.createElement('div')
    body.append(lowerHost, upperHost)
    const lower = createRoot(lowerHost)
    const upperOpen = ref(true)
    const lowerClose = vi.fn()
    const upperClose = vi.fn(() => {
      upperOpen.value = false
    })
    const upper = createApp({
      render: () =>
        h(VueModal, {
          title: 'Upper',
          open: upperOpen.value,
          onClose: upperClose,
          showCloseButton: false,
        }),
    })
    const escape = (): void => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    }
    let lowerMounted = true
    try {
      flushSync(() =>
        lower.render(
          createElement(ReactModal, {
            title: 'Lower',
            open: true,
            onClose: lowerClose,
            showCloseButton: false,
          }),
        ),
      )
      upper.mount(upperHost)
      await nextTick()
      expect(body.querySelectorAll('[role="dialog"]')).toHaveLength(2)
      expect(body.style.overflow).toBe('hidden')

      if (first === 'lower') {
        lower.unmount()
        lowerMounted = false
      } else {
        escape()
        await nextTick()
      }

      const whileOneOpen = body.style.overflow
      expect(body.querySelectorAll('[role="dialog"]')).toHaveLength(1)
      if (lowerMounted) {
        lower.unmount()
        lowerMounted = false
      } else {
        escape()
        await nextTick()
      }

      expect({
        lowerCloseCalls: lowerClose.mock.calls.length,
        upperCloseCalls: upperClose.mock.calls.length,
        whileOneOpen,
        afterBothClose: body.style.overflow,
        restoredPriority: body.style.getPropertyPriority('overflow'),
      }).toEqual({
        lowerCloseCalls: 0,
        upperCloseCalls: 1,
        whileOneOpen: 'hidden',
        afterBothClose: 'scroll',
        restoredPriority: 'important',
      })
      expect(body.querySelectorAll('[role="dialog"]')).toHaveLength(0)
    } finally {
      if (lowerMounted) lower.unmount()
      upper.unmount()
      lowerHost.remove()
      upperHost.remove()
    }
  },
)
