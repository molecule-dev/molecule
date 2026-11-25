import type { JSX, ReactNode } from 'react'
import { useCallback, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
    void copyTextWithFallback(secret.value).then((didCopy) => {
      if (!didCopy) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [secret.value])
  const masked = maskChar.repeat(Math.max(8, Math.min(secret.value.length, 24)))
  const expired = secret.daysUntilRotation !== undefined && secret.daysUntilRotation < 0
  return (
    <Box
      as="div"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2), className)}
    >
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <Text as="span" className={cm.cn(cm.fontWeight('semibold'))}>
          {secret.key}
        </Text>
        {secret.description && (
          <Text as="span" className={cm.textSize('xs')}>
            {secret.description}
          </Text>
        )}
      </Box>
      <Text as="code" className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}>
        {revealed ? secret.value : masked}
      </Text>
      {secret.version && (
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          v{secret.version}
        </Text>
      )}
      {expired && (
        <Text
          as="span"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textTone('error'))}
        >
          {t('secretRow.expired', {}, { defaultValue: 'Expired' })}
        </Text>
      )}
      {secret.daysUntilRotation !== undefined && secret.daysUntilRotation >= 0 && (
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {t(
            'secretRow.rotateIn',
            { days: secret.daysUntilRotation },
            { defaultValue: 'Rotate in {{days}}d' },
          )}
        </Text>
      )}
      {secret.lastRotatedAt !== undefined && secret.lastRotatedAt !== null && (
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t('secretRow.lastRotated', {}, { defaultValue: 'Last rotated' })} {secret.lastRotatedAt}
        </Text>
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
    </Box>
  )
}
