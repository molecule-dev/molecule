/**
 * Right-side aside container: title row with close button, scrollable
 * body, sticky footer for save bar + status messages.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props for {@link NodeEditorPanel}. */
export interface NodeEditorPanelProps {
  title: ReactNode
  children?: ReactNode
  /** Footer slot — typically the save bar + status row. */
  footer?: ReactNode
  /** Click handler for the close button (omitted if `onClose` is null). */
  onClose?: () => void
  closeAriaLabel?: string
  /** Tailwind width class fragment; defaults to `w-80` (20rem). */
  widthClass?: string
}

/** Properties panel chrome. */
export function NodeEditorPanel({
  title,
  children,
  footer,
  onClose,
  closeAriaLabel = 'Close panel',
  widthClass,
}: NodeEditorPanelProps): JSX.Element {
  const cm = getClassMap()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        widthClass ? widthClass : cm.w(80),
        'bg-surface-container-low border-l border-white/5',
      )}
    >
      <div
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between' }),
          'border-b border-white/5',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('bold'), 'font-headline text-on-surface')}>{title}</h2>
        {onClose ? (
          <button
            type="button"
            data-mol-id="node-editor-panel-close"
            // Icon-only chrome: the design system's dialog-close token carries
            // the muted → foreground hover, and the 44px floor makes it
            // tappable without changing how it looks on a pointer device.
            className={cm.cn(cm.dialogClose, cm.touchTarget)}
            aria-label={closeAriaLabel}
            onClick={onClose}
          >
            <span className={cm.cn('material-symbols-outlined')}>close</span>
          </button>
        ) : null}
      </div>
      <div className={cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(8), 'overflow-y-auto')}>
        {children}
      </div>
      {footer ? (
        <div className={cm.cn(cm.sp('p', 6), 'border-t border-white/5')}>{footer}</div>
      ) : null}
    </aside>
  )
}

export default NodeEditorPanel
