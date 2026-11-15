import { type Component, createSignal, onCleanup } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { CodeBlockProps } from './types.js'

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
 * This is the Solid counterpart of `@molecule/app-code-block-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @param props - Component props (see {@link CodeBlockProps}).
 * @returns The rendered code block.
 */
export const CodeBlock: Component<CodeBlockProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** Copies the code, then shows the "Copied!" feedback for 1500 ms. */
  const copy = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(props.code).then(() => {
        setCopied(true)
        timer = setTimeout(() => setCopied(false), 1500)
      })
    }
  }

  onCleanup(() => clearTimeout(timer))

  // React's prop defaults apply only to `undefined`, so an explicit `null`
  // stays `null` (and is falsy) here too.
  const showLineNumbers = (): boolean =>
    props.showLineNumbers === undefined ? true : props.showLineNumbers
  const showCopy = (): boolean => (props.showCopy === undefined ? true : props.showCopy)
  const lines = (): string[] => props.code.split('\n')

  return (
    <div class={cm.cn(cm.stack(0), props.className)}>
      {(props.filename || props.language || showCopy()) && (
        <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            {props.filename && (
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {props.filename}
              </span>
            )}
            {props.language && <span class={cm.textSize('xs')}>{props.language}</span>}
          </div>
          {showCopy() && (
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied()
                ? t('codeBlock.copied', {}, { defaultValue: 'Copied!' })
                : t('codeBlock.copy', {}, { defaultValue: 'Copy' })}
            </Button>
          )}
        </header>
      )}
      <pre class={cm.cn(cm.sp('p', 3), cm.textSize('sm'))}>
        <code>
          {showLineNumbers() ? (
            <span>
              {lines().map((line, i) => (
                <span>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: '2.5em',
                      opacity: 0.4,
                      'user-select': 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                  {line}
                  {'\n'}
                </span>
              ))}
            </span>
          ) : (
            props.code
          )}
        </code>
      </pre>
    </div>
  )
}
