// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: mounted as a real Vue app with the
 * REAL Tailwind ClassMap, molecule icon set and common locale bond — no mocks.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { registerLocaleModule, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import * as commonLocales from '@molecule/app-locales-common'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Alert, Button, Modal } from '../index.js'

setClassMap(classMap)
setIconSet(iconSet)
registerLocaleModule(commonLocales)

const DeleteAccount = defineComponent({
  setup() {
    const open = ref(false)
    const deleted = ref(false)
    return () =>
      deleted.value
        ? h(Alert, { status: 'success' }, () =>
            t('common.completed', undefined, { defaultValue: 'Completed' }),
          )
        : h('div', [
            h(Button, { color: 'error', onClick: () => (open.value = true) }, () =>
              t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }),
            ),
            h(
              Modal,
              {
                open: open.value,
                onClose: () => (open.value = false),
                title: t('settings.deleteAccountModal.title', undefined, {
                  defaultValue: 'Delete Account',
                }),
              },
              () =>
                h(
                  Button,
                  {
                    color: 'error',
                    'data-mol-id': 'confirm-delete-account',
                    onClick: () => (deleted.value = true),
                  },
                  () => t('common.delete', undefined, { defaultValue: 'Delete' }),
                ),
            ),
          ])
  },
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('README @example', () => {
  it('opens the modal, confirms, and shows the success alert', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const app = createApp(DeleteAccount)
    app.mount('#app')

    const trigger = document.querySelector('#app button')
    expect(trigger?.textContent).toBe('Delete account')
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Delete Account')
    expect(dialog?.querySelector('svg')).not.toBeNull()

    dialog
      ?.querySelector('[data-mol-id="confirm-delete-account"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('#app [role="alert"]')?.textContent).toContain('Completed')

    app.unmount()
  })
})
