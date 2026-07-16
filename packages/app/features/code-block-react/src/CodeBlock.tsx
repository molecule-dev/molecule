import { type JSX, useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

export interface CodeBlockProps {
  /** Source code to display. */
  code: string
  /** Language tag (`"ts"`, `"bash"`, …). Shown in the header and used as a hint by external highlighters. */
  language?: string
  /** Show line numbers. Defaults to true. */
  showLineNumbers?: boolean
  /** Show a copy-to-clipboard button. Defaults to true. */
  showCopy?: boolean
  /** Optional custom filename / caption shown left of the language. */
  filename?: string
  /** Extra classes. */
  className?: string
}

/**
 * Read-only code block with an optional header (filename + language tag),
 * optional line numbers, and a copy-to-clipboard button.
 *
 * Does NOT perform syntax highlighting, and `code` is always rendered as
 * escaped plain text — passing pre-highlighted HTML displays literal tags.
 * To highlight, wrap or replace this component with your highlighter's
 * (e.g. `prismjs`, `shiki`) own renderer. The
 * component keeps the no-hidden-dependency contract typical of
 * `@molecule/*` features.
 * @param props - Component props (see {@link CodeBlockProps}).
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers = true,
  showCopy = true,
  filename,
  className,
}: CodeBlockProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
  }, [code])
  const lines = code.split('\n')
  return (
    <div className={cm.cn(cm.stack(0 as const), className)}>
      {(filename || language || showCopy) && (
        <header className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {filename && (
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {filename}
              </span>
            )}
            {language && <span className={cm.textSize('xs')}>{language}</span>}
          </div>
          {showCopy && (
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied
                ? t('codeBlock.copied', {}, { defaultValue: 'Copied!' })
                : t('codeBlock.copy', {}, { defaultValue: 'Copy' })}
            </Button>
          )}
        </header>
      )}
      <pre className={cm.cn(cm.sp('p', 3), cm.textSize('sm'))}>
        <code>
          {showLineNumbers ? (
            <span>
              {lines.map((line, i) => (
                <span key={i}>
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: '2.5em',
                      opacity: 0.4,
                      userSelect: 'none',
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
            code
          )}
        </code>
      </pre>
    </div>
  )
}
