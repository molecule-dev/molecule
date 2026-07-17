import type { JSX, ReactNode } from 'react'
import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/** Data model for a single secret/credential entry in a vault UI. */
export interface SecretRowData {
  id: string
  key: string
  /** Current value (revealed only after the user clicks "Show"). */
  value: string
  /** Version number / label. */
  version?: ReactNode
  /**
   * Days until the secret should be rotated. A negative value renders an
   * "Expired" tag; zero or a positive value renders a "Rotate in {n}d"
   * countdown.
   */
  daysUntilRotation?: number
  /** Last-rotation timestamp (ISO string or any node); rendered as "Last rotated {value}". */
  lastRotatedAt?: ReactNode
  /** Additional description (e.g. "Stripe API key"). */
  description?: ReactNode
}

/** Props accepted by the {@link SecretRow} component. */
export interface SecretRowProps {
  secret: SecretRowData
  /** Called when the user clicks Rotate. */
  onRotate?: (secret: SecretRowData) => void
  /** Called when the user clicks Delete. */
  onDelete?: (secret: SecretRowData) => void
  /** Mask character for the hidden value. Defaults to `'•'`. */
  maskChar?: string
  /** Extra classes. */
  className?: string
}

/**
 * Secret / credential row for vault UIs. Masked by default; the user
 * toggles reveal, can copy to clipboard, sees an "Expired" tag when
 * `daysUntilRotation` is negative or a "Rotate in {n}d" countdown when it is
 * zero/positive, and a "Last rotated {value}" note when `lastRotatedAt` is set.
 * @param props - Component props (see {@link SecretRowProps}).
 */
export function SecretRow({
  secret,
  onRotate,
  onDelete,
  maskChar = '•',
  className,
}: SecretRowProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(secret.value).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
  }, [secret.value])
  const masked = maskChar.repeat(Math.max(8, Math.min(secret.value.length, 24)))
  const expired = secret.daysUntilRotation !== undefined && secret.daysUntilRotation < 0
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2), className)}>
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <span className={cm.cn(cm.fontWeight('semibold'))}>{secret.key}</span>
        {secret.description && <span className={cm.textSize('xs')}>{secret.description}</span>}
      </div>
      <code className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}>
        {revealed ? secret.value : masked}
      </code>
      {secret.version && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          v{secret.version}
        </span>
      )}
      {expired && (
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          style={{ color: '#ef4444' }}
        >
          {t('secretRow.expired', {}, { defaultValue: 'Expired' })}
        </span>
      )}
      {secret.daysUntilRotation !== undefined && secret.daysUntilRotation >= 0 && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {t(
            'secretRow.rotateIn',
            { days: secret.daysUntilRotation },
            { defaultValue: 'Rotate in {{days}}d' },
          )}
        </span>
      )}
      {secret.lastRotatedAt !== undefined && secret.lastRotatedAt !== null && (
        <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t('secretRow.lastRotated', {}, { defaultValue: 'Last rotated' })} {secret.lastRotatedAt}
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={() => setRevealed((x) => !x)}>
        {revealed
          ? t('secretRow.hide', {}, { defaultValue: 'Hide' })
          : t('secretRow.show', {}, { defaultValue: 'Show' })}
      </Button>
      <Button variant="ghost" size="sm" onClick={copy}>
        {copied
          ? t('secretRow.copied', {}, { defaultValue: 'Copied!' })
          : t('secretRow.copy', {}, { defaultValue: 'Copy' })}
      </Button>
      {onRotate && (
        <Button variant="ghost" size="sm" onClick={() => onRotate(secret)}>
          {t('secretRow.rotate', {}, { defaultValue: 'Rotate' })}
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="sm" color="error" onClick={() => onDelete(secret)}>
          {t('secretRow.delete', {}, { defaultValue: 'Delete' })}
        </Button>
      )}
    </div>
  )
}
