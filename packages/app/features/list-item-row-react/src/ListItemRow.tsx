import { type JSX, type ReactNode, useId } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { OptimisticToggleButton, type OptimisticToggleButtonProps } from '@molecule/app-ui-react'

/** Props for {@link ListItemRow}. */
export interface ListItemRowProps {
  /** Title — first line. */
  title: ReactNode
  /** Optional second line (excerpt, description). */
  subtitle?: ReactNode
  /** Optional third line (metadata — timestamps, counts, tags). */
  metadata?: ReactNode
  /** Optional leading slot — icon, avatar, thumbnail image. */
  leading?: ReactNode
  /** Optional right-side actions (buttons, action menu). */
  actions?: ReactNode
  /** Loaded boolean action rendered as a native button, independently of read-only metadata. */
  toggle?: OptimisticToggleButtonProps
  /**
   * Called when the row is activated. The whole row is clickable through a
   * transparent native button over it, named by the title; the inner controls
   * (the `actions` slot) sit above it and keep their own clicks.
   */
  onClick?: () => void
  /** When true, sets `aria-current="true"` on the row — no built-in visual highlight; style it via `className` or host CSS. */
  selected?: boolean
  /** When true, renders in a disabled visual state and disables the open button. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'`. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string
}

/**
 * Generic "thumbnail + text + actions" row — used everywhere:
 * navigation lists, mobile menus, inbox-style threads, search
 * results, picker dialogs, bookmark lists, etc.
 *
 * With `onClick` the whole row is clickable through a transparent native
 * `<button type="button">` stretched over it — named by the title
 * (`aria-labelledby`) — so mouse and keyboard users get the same action and
 * the hit area is the whole row, not just the text. The `actions` slot sits above that button (a
 * `position: relative` wrapper), so its clicks stay its own; everything else
 * sits under it, so a click anywhere else on the row runs the handler.
 * `disabled` disables the button and drops the pointer cursor.
 * Unstyled apart from the transparent button, so the row looks as it did.
 *
 * Different from `<RowWithActions>` in `@molecule/app-data-table-ui-react`
 * in NOT being a `<tr>` — use this for non-table lists.
 * @param props - Component props (see {@link ListItemRowProps}).
 */
export function ListItemRow({
  title,
  subtitle,
  metadata,
  leading,
  actions,
  toggle,
  onClick,
  selected,
  disabled,
  density = 'comfortable',
  className,
}: ListItemRowProps): JSX.Element {
  const cm = getClassMap()
  const nameId = useId()
  const padY = density === 'compact' ? 2 : 3

  return (
    <div
      aria-current={selected ? 'true' : undefined}
      aria-disabled={disabled}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', padY as 2 | 3),
        onClick ? cm.position('relative') : undefined,
        className,
      )}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {onClick && (
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="list-item-row-open"
          disabled={disabled}
          onClick={() => {
            if (!disabled) onClick()
          }}
          /* mol-bespoke-button: the whole row is the hit area, not a CTA — an
             empty, transparent button over the row; the inline background/
             border/padding are native resets. */
          className={cm.cn(
            cm.position('absolute'),
            cm.inset0,
            disabled ? undefined : cm.cursorPointer,
          )}
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        />
      )}
      {leading && <div className={cm.shrink0}>{leading}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <div
          id={onClick ? nameId : undefined}
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        >
          {title}
        </div>
        {subtitle && <div className={cm.textSize('sm')}>{subtitle}</div>}
        {metadata && <div className={cm.textSize('xs')}>{metadata}</div>}
      </div>
      {(toggle || actions) && (
        <div className={cm.cn(cm.shrink0, cm.position('relative'))}>
          {toggle && <OptimisticToggleButton {...toggle} />}
          {actions}
        </div>
      )}
    </div>
  )
}
