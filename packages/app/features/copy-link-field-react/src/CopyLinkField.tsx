import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface CopyLinkFieldProps {
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
 * @param root0
 * @param root0.value
 * @param root0.label
 * @param root0.onCopy
 * @param root0.feedbackMs
 * @param root0.size
 * @param root0.className
 */
export function CopyLinkField({
  value,
  label,
  onCopy,
  feedbackMs = 1500,
  size = 'sm',
  className,
}: CopyLinkFieldProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value).then(() => {
        setCopied(true)
        onCopy?.()
        setTimeout(() => setCopied(false), feedbackMs)
      })
    }
  }, [value, feedbackMs, onCopy])
  return (
    <div className={cm.cn(cm.stack(1 as const), className)}>
      {label && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{label}</span>
      )}
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <input
          type="text"
          readOnly
          value={value}
          onFocus={(e) => (e.target as HTMLInputElement).select()}
          className={cm.cn(cm.input(), cm.flex1)}
          aria-label={label ?? t('copyLink.field', {}, { defaultValue: 'Link' })}
        />
        <Button variant="solid" size={size} onClick={copy}>
          {copied
            ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
            : t('copyLink.copy', {}, { defaultValue: 'Copy' })}
        </Button>
      </div>
    </div>
  )
}
