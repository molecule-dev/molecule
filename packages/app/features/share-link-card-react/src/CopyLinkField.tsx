/**
 * Local `CopyLinkField` implementation — NOT a re-export. This is a trimmed,
 * diverged copy of the component in `@molecule/app-copy-link-field-react`
 * (the original adds `label`, `onCopy`, `feedbackMs`, `size` props). Kept
 * here so this package is self-contained when apps only need the share
 * card; it is internal to `<ShareLinkCard>` and not exported from the
 * package barrel. Prefer `@molecule/app-copy-link-field-react` for a
 * standalone copy field.
 *
 * @module
 */

import { type JSX, useCallback, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, TextField } from '@molecule/app-ui-react/elements'

/** Props accepted by the {@link CopyLinkField} component. */
export interface CopyLinkFieldProps {
  value: string
  className?: string
}

/**
 * Renders a read-only text input paired with a copy button that copies the given URL through
 * `copyTextWithFallback()` from `@molecule/app-clipboard`, showing "Copied!" only when a copy happened.
 *
 * @param props - Component props (see {@link CopyLinkFieldProps}).
 */
export function CopyLinkField({ value, className }: CopyLinkFieldProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void copyTextWithFallback(value).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [value])
  return (
    <Box as="div" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      <TextField
        as="input"
        type="text"
        readOnly
        value={value}
        aria-label={t('shareLinkCard.aria.url', {}, { defaultValue: 'Share link' })}
        onFocus={(e) => (e.target as HTMLInputElement).select()}
        className={cm.cn(cm.input(), cm.flex1)}
      />
      <Button variant="solid" size="sm" onClick={copy}>
        {copied
          ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
          : t('copyLink.copy', {}, { defaultValue: 'Copy' })}
      </Button>
    </Box>
  )
}
