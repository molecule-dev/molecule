/**
 * Vue vault-style secret / credential row.
 *
 * Vue counterpart of `@molecule/app-secret-row-react`'s `SecretRow` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
} from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { SecretRowData } from './types.js'

/**
 * Secret / credential row for vault UIs. Masked by default; the user toggles
 * reveal, can copy to clipboard, sees an "Expired" tag when
 * `daysUntilRotation` is negative or a "Rotate in {n}d" countdown when it is
 * zero/positive, and a "Last rotated {value}" note when `lastRotatedAt` is
 * set. The Rotate / Delete buttons render only when their handler is passed.
 *
 * Copying goes through `copyTextWithFallback` (`@molecule/app-clipboard`),
 * which never throws — the Copy button shows no feedback when the copy was
 * blocked, exactly like React.
 *
 * @param props - Component props (see {@link SecretRowProps} in `./types.js`).
 * @returns The secret row component.
 */
export const SecretRow = defineComponent({
  name: 'SecretRow',
  props: {
    secret: { type: Object as PropType<SecretRowData>, required: true },
    onRotate: {
      type: Function as PropType<(secret: SecretRowData) => void>,
      default: undefined,
    },
    onDelete: {
      type: Function as PropType<(secret: SecretRowData) => void>,
      default: undefined,
    },
    maskChar: { type: String, default: '•' },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const revealed = ref(false)
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Copies the value, then shows the "Copied!" feedback for 1.5 s. */
    const copy = (): void => {
      void copyTextWithFallback(props.secret.value).then((didCopy) => {
        if (!didCopy) return
        copied.value = true
        timer = setTimeout(() => {
          copied.value = false
        }, 1500)
      })
    }

    onUnmounted(() => clearTimeout(timer))

    return (): VNode => {
      const secret = props.secret
      const masked = props.maskChar.repeat(Math.max(8, Math.min(secret.value.length, 24)))
      const expired = secret.daysUntilRotation !== undefined && secret.daysUntilRotation < 0
      const children: VNodeChild[] = [
        h('div', { class: cm.cn(cm.flex1, cm.stack(0)) }, [
          h('span', { class: cm.cn(cm.fontWeight('semibold')) }, secret.key),
          // React's `{description && <span>…</span>}` renders the value itself
          // when it is falsy but renderable (the number `0`).
          secret.description
            ? h('span', { class: cm.textSize('xs') }, secret.description)
            : secret.description,
        ]),
        h(
          'code',
          { class: cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs')) },
          revealed.value ? secret.value : masked,
        ),
      ]
      if (secret.version) {
        children.push(
          h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
            'v',
            secret.version,
          ]),
        )
      } else {
        // `{version && <span>…</span>}` renders the value itself when falsy but
        // renderable (the number `0`), and nothing for an empty string.
        children.push(secret.version)
      }
      if (expired) {
        children.push(
          h(
            'span',
            { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textTone('error')) },
            t('secretRow.expired', {}, { defaultValue: 'Expired' }),
          ),
        )
      }
      if (secret.daysUntilRotation !== undefined && secret.daysUntilRotation >= 0) {
        children.push(
          h(
            'span',
            { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
            t(
              'secretRow.rotateIn',
              { days: secret.daysUntilRotation },
              { defaultValue: 'Rotate in {{days}}d' },
            ),
          ),
        )
      }
      if (secret.lastRotatedAt !== undefined && secret.lastRotatedAt !== null) {
        children.push(
          h('span', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, [
            t('secretRow.lastRotated', {}, { defaultValue: 'Last rotated' }),
            ' ',
            secret.lastRotatedAt,
          ]),
        )
      }
      children.push(
        h(
          Button,
          {
            variant: 'ghost',
            size: 'sm',
            onClick: () => {
              revealed.value = !revealed.value
            },
          },
          () =>
            revealed.value
              ? t('secretRow.hide', {}, { defaultValue: 'Hide' })
              : t('secretRow.show', {}, { defaultValue: 'Show' }),
        ),
      )
      children.push(
        h(Button, { variant: 'ghost', size: 'sm', onClick: copy }, () =>
          copied.value
            ? t('secretRow.copied', {}, { defaultValue: 'Copied!' })
            : t('secretRow.copy', {}, { defaultValue: 'Copy' }),
        ),
      )
      const onRotate = props.onRotate
      if (onRotate) {
        children.push(
          h(Button, { variant: 'ghost', size: 'sm', onClick: () => onRotate(secret) }, () =>
            t('secretRow.rotate', {}, { defaultValue: 'Rotate' }),
          ),
        )
      }
      const onDelete = props.onDelete
      if (onDelete) {
        children.push(
          h(
            Button,
            { variant: 'ghost', size: 'sm', color: 'error', onClick: () => onDelete(secret) },
            () => t('secretRow.delete', {}, { defaultValue: 'Delete' }),
          ),
        )
      }
      return h(
        'div',
        { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2), props.className) },
        children,
      )
    }
  },
})
