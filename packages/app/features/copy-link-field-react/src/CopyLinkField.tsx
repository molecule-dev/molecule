import type { ReactElement } from 'react'
import { useCallback, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, Text, TextField } from '@molecule/app-ui-react/elements'

/** Props for {@link CopyLinkField}. */
export interface CopyLinkFieldProps {
  /** Value to display (and copy on click). */
  value: string
  /** Optional label above the field. */
  label?: string
  /** Called after a successful copy. */
  onCopy?: () => void
  /** How long the "Copied!" state lingers (ms). Defaults to 1500. */
  feedbackMs?: number
  /** Size of the copy button. Defaults to `'sm'`. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}

/**
 * Read-only input + copy-to-clipboard button. Common in share-link
 * panels, API-key cards, webhook URLs.
 * @param props - Component props (see {@link CopyLinkFieldProps}).
 */
export function CopyLinkField({
  value,
  label,
  onCopy,
  feedbackMs = 1500,
  size = 'sm',
  className,
}: CopyLinkFieldProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void copyTextWithFallback(value).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), feedbackMs)
    })
  }, [value, feedbackMs, onCopy])
  return (
    <Box as="div" className={cm.cn(cm.stack(1 as const), className)}>
      {label && (
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {label}
        </Text>
      )}
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
        <TextField
          as="input"
          type="text"
          readOnly
          value={value}
          onFocus={({ target }) => {
            if (
              typeof target === 'object' &&
              target &&
              'select' in target &&
              typeof target.select === 'function'
            ) {
              target.select()
            }
          }}
          className={cm.cn(cm.input(), cm.flex1)}
          aria-label={label ?? t('copyLink.field', {}, { defaultValue: 'Link' })}
        />
        <Button variant="solid" size={size} onClick={copy}>
          {copied
            ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
            : t('copyLink.copy', {}, { defaultValue: 'Copy' })}
        </Button>
      </Box>
    </Box>
  )
}
