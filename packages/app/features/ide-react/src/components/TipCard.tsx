/**
 * Auto-tip card.
 *
 * A dismissable, non-interrupting info card surfaced on a fresh conversation
 * and periodically thereafter. It is NOT a chat message — it never triggers the
 * model and never blocks the input. The user can dismiss it with the close
 * button.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a single dismissable onboarding tip.
 *
 * @param root0 - Component props.
 * @param root0.text - The tip text to display.
 * @param root0.onDismiss - Called when the user dismisses the tip.
 * @returns The rendered tip card.
 */
export function TipCard({ text, onDismiss }: { text: string; onDismiss: () => void }): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      data-mol-id="chat-tip-card"
      className={cm.cn(cm.textSize('xs'), cm.textMuted)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        margin: '8px 0',
        padding: '8px 10px',
        borderRadius: 8,
        // Tint follows the active theme's primary color (light/dark + per-app
        // brand) via color-mix on the theme token — never a hardcoded indigo, so
        // the card recolors with the theme instead of clashing with it.
        border: '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 28%, transparent)',
        background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 8%, transparent)',
        lineHeight: 1.5,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        style={{
          flexShrink: 0,
          marginTop: 1,
          opacity: 0.7,
          color: 'var(--mol-color-primary, #6366f1)',
        }}
      >
        <path d="M10 2a6 6 0 0 0-3.5 10.9c.3.2.5.6.5 1V15h6v-1.1c0-.4.2-.8.5-1A6 6 0 0 0 10 2zM7 17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.5H7V17z" />
      </svg>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        type="button"
        data-mol-id="chat-tip-dismiss"
        onClick={onDismiss}
        aria-label={t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })}
        title={t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          borderRadius: 4,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.6,
          transition: 'opacity 100ms, background 100ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.6'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
