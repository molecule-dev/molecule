/**
 * Vue read-only code block.
 *
 * Vue counterpart of `@molecule/app-code-block-react`'s `CodeBlock` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, onUnmounted, ref, type VNode, type VNodeChild } from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Read-only code block with an optional header (filename + language tag),
 * optional line numbers, and a copy-to-clipboard button.
 *
 * Does NOT perform syntax highlighting, and `code` is always rendered as
 * escaped plain text — passing pre-highlighted HTML displays literal tags.
 * To highlight, wrap or replace this component with your highlighter's
 * (e.g. `prismjs`, `shiki`) own renderer. The component keeps the
 * no-hidden-dependency contract typical of `@molecule/*` features.
 *
 * @param props - Component props (see {@link CodeBlockProps}).
 * @returns The code block component.
 */
export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  props: {
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: undefined,
    },
    showLineNumbers: {
      type: Boolean,
      default: true,
    },
    showCopy: {
      type: Boolean,
      default: true,
    },
    filename: {
      type: String,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Copies the code, then shows the "Copied!" feedback for 1500 ms. */
    const copy = (): void => {
      void copyTextWithFallback(props.code).then((copiedOk) => {
        if (!copiedOk) return
        copied.value = true
        timer = setTimeout(() => {
          copied.value = false
        }, 1500)
      })
    }

    onUnmounted(() => clearTimeout(timer))

    return (): VNode => {
      const lines = props.code.split('\n')
      const buttonLabel = (): string =>
        copied.value
          ? t('codeBlock.copied', {}, { defaultValue: 'Copied!' })
          : t('codeBlock.copy', {}, { defaultValue: 'Copy' })

      const lineContent: VNodeChild = props.showLineNumbers
        ? h(
            'span',
            null,
            lines.map((line, i) =>
              h('span', null, [
                h(
                  'span',
                  {
                    'aria-hidden': 'true',
                    style: {
                      display: 'inline-block',
                      width: '2.5em',
                      opacity: 0.4,
                      userSelect: 'none',
                    },
                  },
                  String(i + 1),
                ),
                line,
                '\n',
              ]),
            ),
          )
        : props.code

      return h('div', { class: cm.cn(cm.stack(0), props.className) }, [
        props.filename || props.language || props.showCopy
          ? h('header', { class: cm.flex({ justify: 'between', align: 'center', gap: 'sm' }) }, [
              h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                props.filename
                  ? h(
                      'span',
                      { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                      props.filename,
                    )
                  : null,
                props.language ? h('span', { class: cm.textSize('xs') }, props.language) : null,
              ]),
              props.showCopy
                ? h(Button, { variant: 'ghost', size: 'sm', onClick: copy }, () => [buttonLabel()])
                : null,
            ])
          : null,
        h('pre', { class: cm.cn(cm.sp('p', 3), cm.textSize('sm')) }, [
          h('code', null, lineContent),
        ]),
      ])
    }
  },
})
