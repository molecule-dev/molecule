import { type Component, createUniqueId, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card, Switch } from '@molecule/app-ui-solid'

import { CopyLinkField } from './CopyLinkField.jsx'
import type { ShareLinkCardProps } from './types.js'

/**
 * Share-link card — bundles a read-only URL field + copy button, an
 * optional QR code slot, and an optional password-protect toggle.
 *
 * QR rendering is slot-based so apps can bring their own QR library
 * (`qrcode.vue`-style Solid components, `@molecule/app-qr-code` when it
 * exists, etc.).
 *
 * This is the Solid counterpart of `@molecule/app-share-link-card-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link ShareLinkCardProps}).
 * @returns The rendered share-link card.
 */
export const ShareLinkCard: Component<ShareLinkCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The password switch is named from its visible label; `createUniqueId()` is
  // Solid's per-instance id (React's `useId()`; the conformance normalizer
  // renumbers both).
  const labelId = createUniqueId()

  /**
   * The password row's fallback label text, used when no `label` prop is set —
   * and as the switch's accessible name when the label is an empty string
   * (React's `label ?? default` can still leave one, and it draws nothing).
   *
   * @returns The i18n label text.
   */
  const fallbackPasswordLabel = (): string =>
    t('shareLink.passwordProtect', {}, { defaultValue: 'Password protect' })

  /**
   * The password row's label text or node (React's
   * `label ?? t('shareLink.passwordProtect', …)`); a node-valued label
   * arrives as an accessor.
   *
   * @returns The label to render.
   */
  const passwordLabel = (): JSX.Element | string => {
    const label = props.passwordProtect?.label
    if (typeof label === 'function') return label()
    return label ?? fallbackPasswordLabel()
  }

  /**
   * Whether the label draws any text, so the switch can be named from it.
   *
   * @returns True unless the label is an empty string.
   */
  const hasPasswordLabel = (): boolean => {
    const label = passwordLabel()
    return !(typeof label === 'string' && label.trim() === '')
  }

  return (
    <Card data-mol-id={props.dataMolId} className={props.className}>
      <div class={cm.stack(3)}>
        {(props.title || props.description) && (
          <header class={cm.stack(1 as const)}>
            {props.title && (
              <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
            )}
            {props.description && <p class={cm.textSize('sm')}>{props.description}</p>}
          </header>
        )}
        <CopyLinkField value={props.url} />
        {props.showQR && props.qr && (
          <div class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2))}>
            {props.qr}
          </div>
        )}
        {props.passwordProtect && (
          <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <span id={hasPasswordLabel() ? labelId : undefined} class={cm.textSize('sm')}>
              {passwordLabel()}
            </span>
            <Switch
              checked={props.passwordProtect.enabled}
              onChange={(event) =>
                props.passwordProtect?.onChange((event.target as HTMLInputElement).checked)
              }
              aria-labelledby={hasPasswordLabel() ? labelId : undefined}
              aria-label={hasPasswordLabel() ? undefined : fallbackPasswordLabel()}
            />
          </div>
        )}
      </div>
    </Card>
  )
}
