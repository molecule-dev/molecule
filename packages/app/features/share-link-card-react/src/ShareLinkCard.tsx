import { type JSX, type ReactNode, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Card, Switch } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import { CopyLinkField } from './CopyLinkField.js'

/** Props accepted by the {@link ShareLinkCard} component. */
export interface ShareLinkCardProps {
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
 * (`@molecule/app-qr-code-react`, `qrcode.react`, etc.).
 * @param props - Component props (see {@link ShareLinkCardProps}).
 */
export function ShareLinkCard({
  title: titleProp,
  description: descriptionProp,
  url,
  qr,
  showQR,
  passwordProtect,
  className,
  dataMolId,
}: ShareLinkCardProps): JSX.Element {
  const title = slot(titleProp)
  const description = slot(descriptionProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  // The password switch is named from its visible label; `useId()` keeps the
  // reference unique per instance (each port's own generator does the same,
  // and the conformance normalizer renumbers them so the DOMs compare equal).
  const passwordLabelId = useId()
  const fallbackPasswordLabel = t(
    'shareLink.passwordProtect',
    {},
    {
      defaultValue: 'Password protect',
    },
  )
  // React's `label ?? default` can still leave an EMPTY string: a label of
  // `''` draws nothing, and an `aria-labelledby` pointing at an empty element
  // gives the switch an empty accessible name. That case names the switch from
  // i18n instead.
  const passwordLabel = passwordProtect?.label ?? fallbackPasswordLabel
  const hasPasswordLabel = !(typeof passwordLabel === 'string' && passwordLabel.trim() === '')
  return (
    <Card data-mol-id={dataMolId} className={className}>
      <Box as="div" className={cm.stack(3)}>
        {(title || description) && (
          <Box as="header" className={cm.stack(1 as const)}>
            {title && (
              <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {title}
              </Text>
            )}
            {description && (
              <Text as="p" className={cm.textSize('sm')}>
                {description}
              </Text>
            )}
          </Box>
        )}
        <CopyLinkField value={url} />
        {showQR && qr && (
          <Box
            as="div"
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2))}
          >
            {qr}
          </Box>
        )}
        {passwordProtect && (
          <Box as="div" className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <Text
              as="span"
              id={hasPasswordLabel ? passwordLabelId : undefined}
              className={cm.textSize('sm')}
            >
              {passwordLabel}
            </Text>
            <Switch
              checked={passwordProtect.enabled}
              onChange={(e) => passwordProtect.onChange((e.target as HTMLInputElement).checked)}
              aria-labelledby={hasPasswordLabel ? passwordLabelId : undefined}
              aria-label={hasPasswordLabel ? undefined : fallbackPasswordLabel}
            />
          </Box>
        )}
      </Box>
    </Card>
  )
}
