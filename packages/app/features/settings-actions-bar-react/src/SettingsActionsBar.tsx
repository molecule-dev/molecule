import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface SettingsActionsBarProps {
  /** Called when Save is clicked. */
  onSave: () => void | Promise<void>
  /** Called when Cancel is clicked. Hides Cancel if omitted. */
  onCancel?: () => void
  /** When true, the Save button disables and shows a loading label. */
  loading?: boolean
  /** When true, the Save button is disabled without a loading label. */
  disabled?: boolean
  /** When set, shows a "Saved" badge with the relative time. Epoch ms. */
  savedAt?: number | null
  /** Error text rendered inline. */
  error?: ReactNode
  /** Sticky-to-bottom. Defaults to true. */
  sticky?: boolean
  /** Additional content rendered before the buttons (status indicator, last-edited info). */
  leading?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 *
 * @param epochMs
 */
function formatRelativeShort(epochMs: number): string {
  const s = Math.floor((Date.now() - epochMs) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/**
 * Sticky bottom / inline Save-Cancel bar for settings and forms.
 *
 * Features:
 * - Primary Save button with loading/disabled state.
 * - Optional Cancel button.
 * - "Saved Xm ago" status when `savedAt` is provided.
 * - Inline error text.
 * - Optional leading slot for custom status badges.
 * @param root0
 * @param root0.onSave
 * @param root0.onCancel
 * @param root0.loading
 * @param root0.disabled
 * @param root0.savedAt
 * @param root0.error
 * @param root0.sticky
 * @param root0.leading
 * @param root0.className
 */
export function SettingsActionsBar({
  onSave,
  onCancel,
  loading,
  disabled,
  savedAt,
  error,
  sticky = true,
  leading,
  className,
}: SettingsActionsBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        className,
      )}
      style={sticky ? { position: 'sticky', bottom: 0, zIndex: 5 } : undefined}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {leading}
        {savedAt !== null && savedAt !== undefined && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {t(
              'settingsActions.saved',
              { at: formatRelativeShort(savedAt) },
              { defaultValue: `Saved ${formatRelativeShort(savedAt)}` },
            )}
          </span>
        )}
        {error && <span className={cm.textSize('sm')}>{error}</span>}
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {t('settingsActions.cancel', {}, { defaultValue: 'Cancel' })}
          </Button>
        )}
        <Button
          variant="solid"
          color="primary"
          onClick={() => void onSave()}
          disabled={loading || disabled}
        >
          {loading
            ? t('settingsActions.saving', {}, { defaultValue: 'Saving…' })
            : t('settingsActions.save', {}, { defaultValue: 'Save changes' })}
        </Button>
      </div>
    </div>
  )
}
