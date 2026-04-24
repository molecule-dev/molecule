import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Card, Switch } from '@molecule/app-ui-react'

import { CopyLinkField } from './CopyLinkField.js'

interface ShareLinkCardProps {
  /** Card title. */
  title?: ReactNode
  /** Supporting copy under the title. */
  description?: ReactNode
  /** The URL users can copy/share. */
  url: string
  /** Optional QR rendering slot — pass your own QR component from the app side. */
  qr?: ReactNode
  /** Whether the QR is visible. Defaults to false. */
  showQR?: boolean
  /** Password-protect toggle — pass to render the toggle row. */
  passwordProtect?: {
    enabled: boolean
    onChange: (enabled: boolean) => void
    label?: ReactNode
  }
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Share-link card — bundles a read-only URL field + copy button, an
 * optional QR code slot, and an optional password-protect toggle.
 *
 * QR rendering is slot-based so apps can bring their own QR library
 * (`qrcode.react`, `@molecule/app-qr-code` when it exists, etc.).
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.url
 * @param root0.qr
 * @param root0.showQR
 * @param root0.passwordProtect
 * @param root0.className
 * @param root0.dataMolId
 */
export function ShareLinkCard({
  title,
  description,
  url,
  qr,
  showQR,
  passwordProtect,
  className,
  dataMolId,
}: ShareLinkCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Card data-mol-id={dataMolId} className={className}>
      <div className={cm.stack(3)}>
        {(title || description) && (
          <header className={cm.stack(1 as const)}>
            {title && (
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
            )}
            {description && <p className={cm.textSize('sm')}>{description}</p>}
          </header>
        )}
        <CopyLinkField value={url} />
        {showQR && qr && (
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2))}>
            {qr}
          </div>
        )}
        {passwordProtect && (
          <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <span className={cm.textSize('sm')}>
              {passwordProtect.label ??
                t('shareLink.passwordProtect', {}, { defaultValue: 'Password protect' })}
            </span>
            <Switch
              checked={passwordProtect.enabled}
              onChange={(e) => passwordProtect.onChange((e.target as HTMLInputElement).checked)}
            />
          </div>
        )}
      </div>
    </Card>
  )
}
