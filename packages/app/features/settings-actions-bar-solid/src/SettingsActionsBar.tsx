import { type Component, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { SettingsActionsBarProps } from './types.js'

/**
 * React's sticky inline style (`{ position: 'sticky', bottom: 0, zIndex: 5 }`),
 * written with kebab-case keys and the same values react-dom writes to the
 * CSSOM.
 */
const STICKY_STYLE = { position: 'sticky', bottom: '0', 'z-index': '5' } as const

/**
 * Formats an epoch-ms timestamp as a short human-readable relative string
 * (e.g. "3m ago") — React's `formatRelativeShort`, verbatim.
 *
 * @param epochMs - The timestamp, in epoch milliseconds.
 * @returns The shorthand relative time.
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
 * The "Saved …" badge text for the current `savedAt`, or null when React
 * renders no badge (absent or null).
 *
 * @param savedAt - Epoch ms, or null/undefined.
 * @returns The badge text, or null.
 */
function savedBadgeText(savedAt: number | null | undefined): string | null {
  if (savedAt === null || savedAt === undefined) return null
  return formatRelativeShort(savedAt)
}

/**
 * Sticky bottom / inline Save-Cancel bar for settings and forms.
 *
 * Features:
 * - Primary Save button with loading/disabled state.
 * - Optional Cancel button (hidden when `onCancel` is omitted).
 * - "Saved Xm ago" status when `savedAt` is provided.
 * - Inline error text.
 * - Optional leading slot for custom status badges.
 *
 * This is the Solid counterpart of `@molecule/app-settings-actions-bar-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link SettingsActionsBarProps}).
 * @returns The rendered settings actions bar.
 */
export const SettingsActionsBar: Component<SettingsActionsBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const sticky = (): boolean => props.sticky ?? true

  return (
    <div
      class={cm.cn(
        // A real theme surface + top border so the (sticky) bar is opaque and
        // page content no longer shows through it while scrolling. Both are
        // theme tokens, never hardcoded colors, so light/dark stay correct.
        cm.surface,
        cm.borderT,
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        props.className,
      )}
      style={sticky() ? STICKY_STYLE : undefined}
    >
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {props.leading}
        <Show when={savedBadgeText(props.savedAt)} keyed>
          {(at) => (
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {t('settingsActions.saved', { at }, { defaultValue: 'Saved {{at}}' })}
            </span>
          )}
        </Show>
        <Show when={props.error}>
          <span class={cm.textSize('sm')}>{props.error}</span>
        </Show>
      </div>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <Show when={props.onCancel}>
          <Button
            variant="ghost"
            onClick={(event) => props.onCancel?.(event)}
            disabled={props.loading}
          >
            {t('settingsActions.cancel', {}, { defaultValue: 'Cancel' })}
          </Button>
        </Show>
        <Button
          variant="solid"
          color="primary"
          onClick={() => void props.onSave()}
          disabled={props.loading || props.disabled}
        >
          {props.loading
            ? t('settingsActions.saving', {}, { defaultValue: 'Saving…' })
            : t('settingsActions.save', {}, { defaultValue: 'Save changes' })}
        </Button>
      </div>
    </div>
  )
}
