/**
 * Re-export of `CopyLinkField` from `@molecule/app-copy-link-field-react`.
 * Kept here as a thin local alias so this package is self-contained when
 * apps only need the share card.
 *
 * @module
 */

import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface CopyLinkFieldProps {
  value: string
  className?: string
}

/**
 *
 * @param root0
 * @param root0.value
 * @param root0.className
 */
export function CopyLinkField({ value, className }: CopyLinkFieldProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
  }, [value])
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      <input
        type="text"
        readOnly
        value={value}
        onFocus={(e) => (e.target as HTMLInputElement).select()}
        className={cm.cn(cm.input(), cm.flex1)}
      />
      <Button variant="solid" size="sm" onClick={copy}>
        {copied
          ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
          : t('copyLink.copy', {}, { defaultValue: 'Copy' })}
      </Button>
    </div>
  )
}
